import uuid
import numpy as np
from sqlalchemy import select
from .db import Experiment, Localization, session, get, lock
from .indexing import index_data, terrain, artifact, load_artifact
from .rendering import render
from .matching import match
from .schemas import Geometry
LIMITATION='Shared-DEM simulated observations are an optimistic benchmark; this does not validate real camera performance. Grid discretization, 80 m terrain, finite horizon and ideal camera geometry limit results.'

def create(params):
    idx,data=index_data(params.index_id); g=Geometry(**idx.details['parameters']['geometry'])
    rng=np.random.default_rng(params.seed); t=terrain(); a,b,c,d=t.usable(g.radius)
    for _ in range(100):
        x,y=rng.uniform([a,b],[c,d]); nearest=float(np.linalg.norm(data['points']-[x,y],axis=1).min())
        if nearest<1: continue
        try: profile=render(t,x,y,g); break
        except ValueError: continue
    else: raise ValueError('Unable to find a valid held-out viewpoint')
    shift=int(rng.integers(g.samples)) if params.mode=='unknown' else 0
    obs=np.roll(profile,-shift)+rng.normal(0,params.noise,g.samples)
    if np.max(np.abs(obs))>90: raise ValueError('Noise produced invalid angular values; use another seed')
    id=uuid.uuid4().hex
    info=artifact(id,observed=obs)
    public=dict(id=id,index_id=idx.id,mode=params.mode,geometry=g.model_dump(),noise=params.noise,
                artifact=info,limitation=LIMITATION)
    private=dict(position=t.position(x,y),heading=shift*360/g.samples,seed=params.seed,nearest_candidate_m=nearest)
    with session() as s: s.add(Experiment(id=id,index_id=idx.id,public=public,private=private))
    return observation(id)

def observation(id):
    e=get(Experiment,id)
    return {k:v for k,v in e.public.items() if k!='artifact'} | {'observed':load_artifact(e.public['artifact'])['observed'].tolist()}

def hydrate(result):
    if 'artifact' not in result: return result
    values=load_artifact(result['artifact'])['aligned']
    return {k:v for k,v in result.items() if k!='artifact'} | {'candidates':[dict(row,values=values[i].tolist()) for i,row in enumerate(result['candidates'])]}

def localize(id,top_k=5):
    # Serialize idempotent run creation, including simultaneous browser retries.
    with lock: return _localize(id,top_k)

def _localize(id,top_k=5):
    with session() as s:
        old=s.scalar(select(Localization).where(Localization.experiment_id==id))
        if old: return hydrate(old.result)
    # Only public observation enters matching. No private truth is passed to the algorithm.
    obs=observation(id); idx,data=index_data(obs['index_id'])
    result=match(obs['observed'],data['profiles'],obs['mode'],obs['geometry'],idx.details['parameters']['geometry'],20)
    for row in result['candidates']:
        i=row.pop('candidate'); row.update(id=str(i),position=terrain().position(*data['points'][i]))
    result.update(id=uuid.uuid4().hex,experiment_id=id,mode=obs['mode'])
    info=artifact(result['id'],aligned=np.asarray([r['values'] for r in result['candidates']]))
    stored=dict(result,artifact=info,candidates=[{k:v for k,v in r.items() if k!='values'} for r in result['candidates']])
    with session() as s: s.add(Localization(id=result['id'],experiment_id=id,result=stored))
    return result

def reveal(id):
    with session() as s:
        run=s.scalar(select(Localization).where(Localization.experiment_id==id))
        if not run: raise ValueError('Complete localization before revealing truth')
        result=run.result
    e=get(Experiment,id); best=result['candidates'][0]; true=e.private['position']; predicted=best['position']
    return dict(true_position=true,predicted_position=predicted,
        position_error_m=float(np.hypot(true['x']-predicted['x'],true['y']-predicted['y'])),
        heading_error_deg=abs((best['heading']-e.private['heading']+180)%360-180),
        observation_parameters=dict(seed=e.private['seed'],heading=e.private['heading'],noise=e.public['noise'],geometry=e.public['geometry']),
        nearest_candidate_m=e.private['nearest_candidate_m'],limitation=LIMITATION)
