import hashlib, json, time
import numpy as np
from functools import lru_cache
from .config import settings
from .terrain import Terrain, fingerprint, metadata
from .schemas import IndexInput, Geometry
from .rendering import render
from .db import Dataset, ReferenceIndex, Candidate, session, get

@lru_cache(maxsize=1)
def _terrain(stamp): return Terrain(settings.dem)
def terrain():
    stat=settings.dem.stat()
    return _terrain((stat.st_mtime_ns,stat.st_size))

def initialize():
    t=terrain()
    from .config import ROOT
    source=ROOT/'data/source/LDEM_80S_80MPP_ADJ.TIF'
    details=dict(t.metadata, source_metadata=metadata(source) if source.exists() else None,source_url='https://pgda.gsfc.nasa.gov/products/90',
                 description='NASA LOLA real terrain; shared-DEM simulated observations',active_file=settings.dem.name)
    with session() as s:
        record=s.get(Dataset,t.fingerprint)
        if record: record.details=details
        else: s.add(Dataset(id=t.fingerprint,details=details))
    return details

def index_key(params):
    payload=dict(params.model_dump(),dem=terrain().fingerprint,region=terrain().bounds)
    return hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()

def artifact(name, **arrays):
    path=settings.state/f'{name}.npz'
    np.savez_compressed(path,**arrays)
    return dict(path=path.name,sha256=fingerprint(path),shapes={k:list(v.shape) for k,v in arrays.items()},bytes=path.stat().st_size)

def load_artifact(info):
    path=settings.state/info['path']
    if fingerprint(path)!=info['sha256']: raise ValueError('Artifact checksum mismatch; rebuild cache')
    with np.load(path,allow_pickle=False) as data: return {k:data[k] for k in data.files}

def build(params: IndexInput, progress=lambda p:None):
    t=terrain(); key=index_key(params)
    with session() as s:
        old=s.get(ReferenceIndex,key)
        if old:
            load_artifact(old.details['artifact']); return key
    started=time.perf_counter(); a,b,c,d=t.usable(params.geometry.radius)
    points=[]; profiles=[]
    grid=[(x,y) for y in np.arange(b,d+1,params.spacing) for x in np.arange(a,c+1,params.spacing)]
    if len(grid)>2000: raise ValueError('Too many candidates')
    for i,(x,y) in enumerate(grid):
        try: profile=render(t,x,y,params.geometry)
        except ValueError: continue
        points.append((x,y)); profiles.append(profile)
        if i%20==0: progress(i/len(grid))
    if len(points)<2: raise ValueError('Insufficient valid candidates')
    info=artifact(key,points=np.asarray(points),profiles=np.asarray(profiles))
    details=dict(parameters=params.model_dump(),artifact=info,count=len(points),build_seconds=time.perf_counter()-started,
                 usable_bounds=[a,b,c,d],fingerprint=t.fingerprint,status='ready')
    with session() as s:
        s.add(ReferenceIndex(id=key,dataset_id=t.fingerprint,details=details)); s.flush()
        for i,(x,y) in enumerate(points):
            s.add(Candidate(id=f'{key}:{i}',index_id=key,details=dict(row=i,position=t.position(x,y),artifact=info['path'])))
    return key

def index_data(id):
    index=get(ReferenceIndex,id)
    params=IndexInput(**index.details['parameters'])
    if index.id!=index_key(params): raise ValueError('Stale index: DEM, region or renderer changed')
    return index,load_artifact(index.details['artifact'])

def summary(id):
    idx,data=index_data(id)
    return dict(id=id,**idx.details,points=[dict(id=str(i),**terrain().position(x,y)) for i,(x,y) in enumerate(data['points'])])
