"""Mission-control API over the existing renderer, database and reference cache."""
import csv, io, json, logging, time, uuid
from datetime import datetime, timezone
from threading import RLock
from typing import Literal
import numpy as np
from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import Field
from rasterio.errors import RasterioError
from . import db, indexing, experiments, preferences
from .config import settings, ROOT
from .schemas import Strict, IndexInput, ExperimentInput
from .terrain import Terrain
from .matching import match

router=APIRouter(prefix='/api')
lock=RLock()
STATE=settings.state/'mission.json'
BUNDLED=ROOT/'data/processed/LDEM_80S_80MPP_ADJ_crop_20480m.tif'
VERSION='lunatrail-horizon-2.0'

def now(): return datetime.now(timezone.utc).isoformat()
def fresh(): return dict(index_id=None,tests=[],result=None,observation=None,truth=None,evaluation=None,activity=[],initialized=False)
state=fresh()
if STATE.exists(): state.update(json.loads(STATE.read_text()))
# Only opaque upload identifiers generated on this server may select storage files.
if state.get('upload_id'):
    token=state['upload_id']
    if len(token)==32 and all(c in '0123456789abcdef' for c in token):
        saved=settings.state/'uploads'/f'{token}.tif'
        if saved.exists(): settings.dem=saved

def persist():
    payload=dict(state)
    if not preferences.read().autosave:
        payload.update(result=None,observation=None,truth=None,evaluation=None)
    preferences.atomic_json(STATE,payload)
def event(message):
    state['activity']=(state['activity']+[dict(time=now(),message=message)])[-30:]
    persist()
def clear_profiles():
    state.update(index_id=None,tests=[],result=None,observation=None,truth=None,evaluation=None,initialized=True)
def generate_refs():
    pref=preferences.read()
    params=IndexInput(geometry=pref.geometry,spacing=pref.spacing)
    if not pref.cache_enabled:
        # Recompute through the same renderer; leave existing database artifacts intact.
        idx=indexing.index_key(params)
        try:
            record, arrays=indexing.index_data(idx)
            from .rendering import render
            started=time.perf_counter()
            arrays['profiles']=np.asarray([render(indexing.terrain(),x,y,pref.geometry) for x,y in arrays['points']])
            info=indexing.artifact(idx,**arrays)
            with db.session() as session:
                row=session.get(db.ReferenceIndex,idx)
                row.details=dict(record.details,artifact=info,generated_at=now(),build_seconds=time.perf_counter()-started)
        except KeyError: pass
    state['index_id']=indexing.build(params)
    state.update(tests=[],result=None,observation=None,truth=None,evaluation=None,initialized=True)
    event('Reference profiles ready')
    return indexing.summary(state['index_id'])
def generate_tests():
    if not state['index_id']: raise ValueError('Generate reference profiles first')
    pref=preferences.read(); started=time.perf_counter(); tests=[]
    for i in range(pref.test_count):
        obs=experiments.create(ExperimentInput(index_id=state['index_id'],seed=pref.seed+i,mode='unknown' if pref.circular_alignment else 'known',noise=pref.noise))
        tests.append(dict(id=obs['id'],label=f'T-{i+1:02d}',seed=pref.seed+i))
    state.update(tests=tests,result=None,observation=None,truth=None,evaluation=None,last_generation=now(),generation_ms=(time.perf_counter()-started)*1000)
    event(f'{len(tests)} held-out observations generated; coordinates private')
    return tests

def current_dataset():
    t=indexing.terrain()
    return dict(id=t.fingerprint,**db.get(db.Dataset,t.fingerprint).details)
def public_tests(): return [dict(id=t['id'],label=t['label']) for t in state['tests']]
def snapshot():
    return dict(dataset=current_dataset(),index=indexing.summary(state['index_id']) if state['index_id'] else None,
        tests=public_tests(),observation=state['observation'],result=state['result'],truth=state['truth'],evaluation=state['evaluation'],
        settings=preferences.read().model_dump(),status=status())

@router.get('/mission')
def mission():
    with lock:
        if not state['initialized']:
            generate_refs();generate_tests()
        return snapshot()

@router.get('/health')
@router.get('/status')
def status():
    components={}
    try:
        t=indexing.terrain()
        components['dem']=dict(ready=True,detail=f'{t.w} × {t.h} grid · {t.z.nbytes} bytes in elevation array')
    except Exception as exc: components['dem']=dict(ready=False,detail=str(exc))
    refs=False; count=0
    try:
        if state['index_id']:
            idx,_=indexing.index_data(state['index_id']);count=idx.details['count'];refs=True
        components['matcher']=dict(ready=refs,detail=f'{count} validated reference profiles',last_duration_ms=state.get('result',{}).get('processingMs') if state.get('result') else None)
    except Exception as exc: components['matcher']=dict(ready=False,detail=str(exc))
    from .rendering import render
    components['renderer']=dict(ready=callable(render) and components['dem']['ready'],detail='Bilinear rays with lunar curvature',last_success=state.get('last_generation'),last_duration_ms=state.get('generation_ms'))
    tests=bool(state['tests']) and refs
    components['evaluation']=dict(ready=tests,detail=f"{len(state['tests'])} held-out tests",last_success=(state.get('evaluation') or {}).get('generated_at'),results_available=state['evaluation'] is not None)
    return dict(overall='Operational' if all(c['ready'] for c in components.values()) else 'Degraded',components=components,checked_at=now(),activity=state['activity'],api_connected=True)

@router.get('/settings',response_model=preferences.Preferences)
def read_settings(): return preferences.read()
@router.put('/settings')
def update_settings(value:preferences.Preferences):
    with lock:
        old=preferences.read()
        if old.geometry!=value.geometry or old.spacing!=value.spacing:
            a,b,c,d=indexing.terrain().usable(value.geometry.radius)
            if a>=c or b>=d:
                raise ValueError('DEM extent is too small for the configured horizon radius')
            count=len(np.arange(a,c+1,value.spacing))*len(np.arange(b,d+1,value.spacing))
            if not 2<=count<=2000:
                raise ValueError(f'Geometry produces {count} reference points; choose spacing/radius giving 2–2000 points')
        generation=['geometry','spacing','seed','noise','test_count','circular_alignment']
        changed=any(getattr(old,k)!=getattr(value,k) for k in generation)
        preferences.save(value);logging.getLogger().setLevel(value.logging_level)
        if changed: clear_profiles()
        elif old.algorithm!=value.algorithm: state.update(result=None,truth=None,evaluation=None)
        elif old.success_threshold!=value.success_threshold: state['evaluation']=None
        event('Settings saved'+('; regenerate reference and test profiles' if changed else ''))
        return dict(settings=value.model_dump(),regeneration_required=changed)
@router.post('/settings/reset')
def reset_settings(): return update_settings(preferences.Preferences())

@router.get('/datasets')
def datasets():
    with db.session() as s:
        from sqlalchemy import select
        return [dict(id=d.id,**d.details,active=d.id==indexing.terrain().fingerprint) for d in s.scalars(select(db.Dataset))]
@router.get('/terrain/metadata')
def terrain_metadata(): return current_dataset()
@router.get('/terrain/grid')
def terrain_grid():
    t=indexing.terrain();z=t.z
    return dict(elevations=np.where(np.isfinite(z),z,None).tolist(),bounds=t.metadata['active_bounds'],resolution=t.metadata['resolution'],shape=list(z.shape),dataset_id=t.fingerprint)
class PointInput(Strict):
    x:float
    y:float
@router.post('/terrain/inspect')
def inspect_point(point:PointInput):
    t=indexing.terrain(); z=float(t.sample(point.x,point.y))
    if not np.isfinite(z): raise ValueError('Point falls outside valid interpolation coverage')
    return dict(position=t.position(point.x,point.y),elevation=z)

@router.post('/datasets/upload',status_code=201)
async def upload(request:Request):
    # Raw GeoTIFF body avoids multipart parser ambiguity. Upload is capped by middleware.
    if request.headers.get('content-type','').split(';')[0] not in ('image/tiff','application/octet-stream'):
        raise ValueError('Upload a GeoTIFF as image/tiff or application/octet-stream')
    body=await request.body()
    if not body or len(body)>32*1024*1024: raise ValueError('GeoTIFF must be between 1 byte and 32 MiB')
    from starlette.concurrency import run_in_threadpool
    return await run_in_threadpool(accept_upload,body)
def accept_upload(body):
    with lock:
        folder=settings.state/'uploads';folder.mkdir(exist_ok=True)
        token=uuid.uuid4().hex;path=folder/f'{token}.tif';path.write_bytes(body)
        try:
            t=Terrain(path)
            if not np.isfinite(t.z).all(): raise ValueError('Active DEM crop contains NoData or invalid elevations; provide a complete region')
            a,b,c,d=t.usable(preferences.read().geometry.radius)
            if a>=c or b>=d: raise ValueError('DEM extent is too small for the configured horizon radius')
        except (ValueError,RasterioError,OverflowError) as exc:
            path.unlink(missing_ok=True);raise ValueError(f'Invalid lunar GeoTIFF: {exc}') from exc
        settings.dem=path;indexing._terrain.cache_clear();indexing.initialize()
        clear_profiles();state['upload_id']=token
        event('Validated imported DEM selected; generate reference and test profiles')
        return current_dataset()

@router.post('/references/generate')
def references_generate():
    with lock:return generate_refs()
@router.post('/tests/generate')
def tests_generate():
    with lock:return generate_tests()
@router.get('/tests')
def tests_list():return public_tests()
class TestInput(Strict):
    test_id:str=Field(min_length=1,max_length=64)
def require_test(id):
    if id not in {t['id'] for t in state['tests']}:raise ValueError('Select an observation from the active held-out set')
@router.post('/skyline/generate')
def skyline_generate(value:TestInput):
    with lock:
        require_test(value.test_id)
        state.update(observation=experiments.observation(value.test_id),result=None,truth=None)
        event('Unknown skyline loaded; ground truth hidden')
        return state['observation']

class LocalizeInput(TestInput):
    profile:list[float]=Field(min_length=180,max_length=720)

def match_profile(profile,geometry):
    if not state['index_id']: raise ValueError('Generate reference profiles first')
    idx,data=indexing.index_data(state['index_id']);pref=preferences.read()
    # This function receives only angular values, reference profiles, geometry and method.
    # No Experiment.private values are accessed until after the prediction has returned.
    result=match(profile,data['profiles'],'unknown' if pref.circular_alignment else 'known',geometry,idx.details['parameters']['geometry'],len(data['points']),pref.algorithm)
    for rank,row in enumerate(result['candidates']):
        i=row.pop('candidate');row.update(id=str(i),rank=rank+1,position=indexing.terrain().position(*data['points'][i]))
    return result

def run_match(test_id,profile):
    require_test(test_id);obs=experiments.observation(test_id)
    if profile!=obs['observed']: raise ValueError('Submitted profile does not match the held-out observation')
    result=match_profile(profile,obs['geometry'])
    predicted=result['candidates'][0]['position']
    private=db.get(db.Experiment,test_id).private
    true=private['position']
    truth=dict(true_position=true,predicted_position=predicted,position_error_m=float(np.hypot(true['x']-predicted['x'],true['y']-predicted['y'])),nearest_candidate_m=private['nearest_candidate_m'],heading_error_deg=abs((result['candidates'][0]['heading']-private['heading']+180)%360-180))
    for row in result['candidates']:
        row['error_m']=float(np.hypot(true['x']-row['position']['x'],true['y']-row['position']['y']))
    result.update(test_id=test_id,algorithm_version=VERSION)
    return result,truth
@router.post('/localize')
def localize(value:LocalizeInput):
    with lock:
        result,truth=run_match(value.test_id,value.profile)
        state.update(result=result,truth=truth,observation=experiments.observation(value.test_id))
        event('Localization complete; ground truth revealed by evaluation layer')
        return dict(result=result,truth=truth)
class ManualInput(Strict):
    index_id:str=Field(min_length=1,max_length=64)
    profile:list[float]=Field(min_length=180,max_length=720)

@router.post('/localize/manual')
def localize_manual(value:ManualInput):
    with lock:
        if value.index_id!=state['index_id']:
            raise ValueError('Reference set changed; reload the mission before submitting a manual profile')
        geometry=preferences.read().geometry.model_dump()
        result=match_profile(value.profile,geometry)
        id='manual-'+uuid.uuid4().hex
        for row in result['candidates']: row['error_m']=None
        result.update(test_id=id,algorithm_version=VERSION,source='manual')
        observation=dict(id=id,observed=value.profile,geometry=geometry,
                         mode='unknown' if preferences.read().circular_alignment else 'known',
                         noise=None,source='manual')
        state.update(result=result,truth=None,observation=observation)
        event('Manual skyline matched; ground truth and localization error unavailable')
        return dict(result=result,truth=None,observation=observation)

@router.get('/candidates')
def candidates():return (state['result'] or {}).get('candidates',[])
@router.post('/localize/reset')
def reset_match():
    with lock:
        state.update(observation=None,result=None,truth=None);persist()
        return {'status':'reset'}

class EvaluationInput(Strict):
    test_ids:list[str]|None=Field(default=None,min_length=1,max_length=40)
@router.post('/evaluation/run')
def evaluate(value:EvaluationInput):
    with lock:
        ids=value.test_ids or [t['id'] for t in state['tests']]
        if not ids or len(ids)!=len(set(ids)):raise ValueError('Select a non-empty, unique held-out test set')
        for id in ids:require_test(id)
        rows=[];pref=preferences.read()
        for id in ids:
            test=next(t for t in state['tests'] if t['id']==id)
            row=dict(test_id=id,label=test['label'],seed=test['seed'])
            try:
                obs=experiments.observation(id);result,truth=run_match(id,obs['observed'])
                row.update(predicted=result['candidates'][0]['position'],actual=truth['true_position'],error_m=truth['position_error_m'],similarity=result['candidates'][0]['similarity'],processing_ms=result['processingMs'],status='complete')
            except (ValueError,KeyError) as exc:row.update(status='failed',error=str(exc))
            rows.append(row)
        good=[r for r in rows if r['status']=='complete'];errors=[r['error_m'] for r in good]
        metrics=dict(count=len(rows),failed=len(rows)-len(good),median=float(np.median(errors)) if good else None,mean=float(np.mean(errors)) if good else None,maximum=max(errors) if good else None,success=sum(e<=pref.success_threshold for e in errors),threshold=pref.success_threshold,success_rate=sum(e<=pref.success_threshold for e in errors)/len(rows),average_ms=float(np.mean([r['processing_ms'] for r in good])) if good else None)
        state['evaluation']=dict(rows=rows,metrics=metrics,dataset_id=indexing.terrain().fingerprint,index_id=state['index_id'],settings=pref.model_dump(),algorithm_version=VERSION,generated_at=now(),limitation=experiments.LIMITATION)
        event(f'Evaluated {len(rows)} held-out tests; {metrics["failed"]} failed')
        return state['evaluation']
@router.get('/evaluation/results')
def results():return state['evaluation']
@router.post('/evaluation/reset')
def reset_evaluation():
    with lock:
        state['evaluation']=None;persist();return {'status':'reset'}
@router.get('/evaluation/export')
def export(format:Literal['json','csv']='json'):
    data=state['evaluation']
    if data is None:raise ValueError('Run evaluation before exporting')
    if format=='json':body=json.dumps(data,indent=2);mime='application/json'
    else:
        rows=[]
        for r in data['rows']:
            row={k:v for k,v in r.items() if k not in ('predicted','actual')}
            for kind in ['predicted','actual']:
                row.update({kind+'_'+k:v for k,v in r.get(kind,{}).items()})
            row.update(dataset_id=data['dataset_id'],index_id=data['index_id'],algorithm_version=data['algorithm_version'],settings=json.dumps(data['settings']),generated_at=data['generated_at'])
            rows.append(row)
        stream=io.StringIO();writer=csv.DictWriter(stream,fieldnames=list(dict.fromkeys(k for r in rows for k in r)));writer.writeheader();writer.writerows(rows);body=stream.getvalue();mime='text/csv'
    return Response(body,media_type=mime,headers={'Content-Disposition':f'attachment; filename="lunatrail-evaluation.{format}"'})
@router.post('/demo/reset')
def reset_demo():
    with lock:
        preferences.save(preferences.Preferences());settings.dem=BUNDLED;indexing._terrain.cache_clear();indexing.initialize()
        state.clear();state.update(fresh());generate_refs();generate_tests();event('Reproducible bundled demo reset')
        return snapshot()
