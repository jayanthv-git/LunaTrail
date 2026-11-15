import csv, io, uuid, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
import struct, zlib
import numpy as np
from sqlalchemy import select
from . import db, indexing, experiments, evaluation, jobs
from .schemas import IndexInput, ExperimentInput, EvaluationInput, MatchInput
from .config import settings

@asynccontextmanager
async def lifespan(app):
    db.migrate(); indexing.initialize(); jobs.recover()
    yield
    jobs.pool.shutdown(wait=True)
app=FastAPI(title='LunaTrail local DEM simulation',version='1.0',lifespan=lifespan)
class BodyLimit:
    def __init__(self,app): self.app=app
    async def __call__(self,scope,receive,send):
        if scope['type']!='http': return await self.app(scope,receive,send)
        chunks=[]; size=0
        while True:
            msg=await receive()
            if msg['type']=='http.disconnect': return
            size+=len(msg.get('body',b'')); chunks.append(msg.get('body',b''))
            if size>65536:
                return await JSONResponse({'error':{'message':'Request exceeds 64 KiB'}},413)(scope,receive,send)
            if not msg.get('more_body'): break
        async def replay(): return {'type':'http.request','body':b''.join(chunks),'more_body':False}
        await self.app(scope,replay,send)
app.add_middleware(BodyLimit)
@app.exception_handler(ValueError)
@app.exception_handler(KeyError)
async def domain_error(request,e):
    return JSONResponse({'error':{'message':str(e)}},status_code=404 if isinstance(e,KeyError) else 409)
@app.exception_handler(RequestValidationError)
async def validation_error(request,e): return JSONResponse({'error':{'message':str(e)}},status_code=422)
@app.exception_handler(HTTPException)
async def http_error(request,e): return JSONResponse({'error':{'message':str(e.detail)}},status_code=e.status_code)
@app.exception_handler(Exception)
async def unexpected(request,e):
    logging.exception('Request failed')
    return JSONResponse({'error':{'message':'Internal error; inspect backend logs'}},status_code=500)
p='/api/v1'
@app.get(p+'/health')
def health(): return {'status':'ok'}
@app.get(p+'/ready')
def ready():
    indexing.terrain(); return {'status':'ready'}
@app.get(p+'/datasets')
def datasets():
    with db.session() as s:
        records=[dict(id=d.id,**d.details) for d in s.scalars(select(db.Dataset))]
        return sorted(records,key=lambda d:d['id']!=indexing.terrain().fingerprint)
@app.get(p+'/datasets/{id}')
def dataset(id:str): return dict(id=id,**db.get(db.Dataset,id).details)
@app.get(p+'/datasets/{id}/preview.png')
def preview(id:str):
    if id!=indexing.terrain().fingerprint: raise KeyError('Dataset unavailable')
    path=settings.state/f'{id}-preview.png'
    if not path.exists():
        z=indexing.terrain().z; valid=np.isfinite(z); lo,hi=np.nanpercentile(z,[1,99]); gray=np.nan_to_num(np.clip((z-lo)/(hi-lo),0,1))
        rgb=np.stack([gray*.7,gray*.85,gray],axis=-1)
        rgba=np.dstack([rgb,valid.astype(float)])
        pixels=(rgba*255).astype('uint8')
        def chunk(kind,data):
            return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data))
        h,w=pixels.shape[:2]
        raw=b''.join(b'\x00'+row.tobytes() for row in pixels)
        path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
    return Response(path.read_bytes(),media_type='image/png',headers={'Cache-Control':'public,max-age=3600'})
@app.get(p+'/datasets/{id}/usable-bounds')
def bounds(id:str):
    db.get(db.Dataset,id); return {'bounds':indexing.terrain().usable(4000),'radius_m':4000}
@app.post(p+'/indexes',status_code=202)
def create_index(params:IndexInput):
    key=indexing.index_key(params)
    with db.session() as s:
        if s.get(db.ReferenceIndex,key): return {'index_id':indexing.summary(key)['id'],'status':'ready'}
        for j in s.scalars(select(db.Job)):
            if j.details['kind']=='index' and j.details['parameters']==params.model_dump() and j.details['status'] in ('queued','running'):
                return {'job_id':j.id,'index_id':key}
    id=jobs.submit('index',params.model_dump(),lambda progress:indexing.build(params,progress))
    return {'job_id':id,'index_id':key}
@app.get(p+'/indexes/{id}')
def index(id:str): return indexing.summary(id)
@app.get(p+'/jobs/{id}')
def job(id:str): return dict(id=id,**db.get(db.Job,id).details)
@app.post(p+'/experiments',status_code=201)
def experiment(params:ExperimentInput): return experiments.create(params)
@app.get(p+'/experiments/{id}')
def observation(id:str): return experiments.observation(id)
@app.post(p+'/localizations')
def localize(params:MatchInput):
    r=experiments.localize(params.experiment_id,params.top_k)
    return dict(r,candidates=r['candidates'][:params.top_k])
@app.post(p+'/experiments/{id}/reveal')
def reveal(id:str): return experiments.reveal(id)
@app.post(p+'/evaluations',status_code=202)
def create_evaluation(params:EvaluationInput):
    indexing.index_data(params.index_id); id=uuid.uuid4().hex
    with db.session() as s: s.add(db.Evaluation(id=id,details={'status':'queued','parameters':params.model_dump()}))
    try:
        job=jobs.submit('evaluation',dict(params.model_dump(),evaluation_id=id),lambda progress:evaluation.evaluate(id,params,progress))
    except ValueError as e:
        with db.session() as s: s.get(db.Evaluation,id).details={'status':'failed','error':str(e),'parameters':params.model_dump()}
        raise
    return {'evaluation_id':id,'job_id':job}
@app.get(p+'/evaluations/{id}')
def get_evaluation(id:str): return dict(id=id,**db.get(db.Evaluation,id).details)
@app.get(p+'/evaluations/{id}/export')
def export_evaluation(id:str,format:str='json'):
    data=get_evaluation(id)
    if data['status']!='complete': raise ValueError('Evaluation is not complete')
    if format=='json': return JSONResponse(data,headers={'Content-Disposition':'attachment; filename="evaluation.json"'})
    if format!='csv': raise ValueError('Use json or csv')
    output=io.StringIO(); keys=['trial','experiment_id','position_error_m','heading_error_deg','nearest_candidate_m','runtime_ms','error']
    writer=csv.DictWriter(output,fieldnames=keys); writer.writeheader(); writer.writerows(data['trials'])
    return Response(output.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="evaluation.csv"'})
@app.get(p+'/experiments/{id}/export')
def export_experiment(id:str):
    with db.session() as s: run=s.scalar(select(db.Localization).where(db.Localization.experiment_id==id))
    if not run: raise ValueError('Complete localization first')
    return {'observation':experiments.observation(id),'result':experiments.hydrate(run.result)}
