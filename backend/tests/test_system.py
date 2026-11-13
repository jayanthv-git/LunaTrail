import json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from rasterio.transform import from_origin
from sqlalchemy import select, func
from app.terrain import Terrain
from app.rendering import render
from app.schemas import Geometry, IndexInput
from app.matching import match
from app import db, indexing, experiments, jobs
from app.main import app

def simple_terrain(z):
    t=Terrain.__new__(Terrain);t.z=z;t.h,t.w=z.shape;t.transform=from_origin(-10040,10040,80,80);t.radius=1737400
    t.bounds=[-10000,-10000,10000,10000]
    return t

def test_coordinates_and_boundaries():
    t=indexing.terrain()
    for c,r in [(0,0),(120.25,150.75),(254,254)]:
        assert np.allclose(t.world_to_pixel(*t.pixel_to_world(c,r)),[c,r])
    assert np.isnan(t.sample(-99999,0))
    assert np.isfinite(t.sample(0,0))
    with pytest.raises(ValueError): render(t,10000,0,Geometry())

def test_flat_negative_angles_and_known_ridge():
    t=simple_terrain(np.zeros((251,251)))
    g=Geometry(radius=4000)
    flat=render(t,0,0,g)
    d=np.arange(80,4001,80);a=d/t.radius
    expected=np.degrees(np.arctan2(t.radius*np.cos(a)-t.radius-1.5,t.radius*np.sin(a))).max()
    assert np.allclose(flat,expected,atol=1e-8);assert (flat<0).all()
    # Horizontal ridge 800 m north of observer, exactly on sample grid.
    t.z[115,:]=100
    ridge=render(t,0,0,g)
    expected=np.degrees(np.arctan2((t.radius+100)*np.cos(800/t.radius)-(t.radius+1.5),(t.radius+100)*np.sin(800/t.radius)))
    assert ridge[0]==pytest.approx(expected);assert ridge[180]<0
    t.z[115,125]=np.nan
    with pytest.raises(ValueError,match='coverage'):render(t,0,0,g)
    t.z[125,125]=np.nan
    with pytest.raises(ValueError,match='observer'):render(t,0,0,g)

def test_ranking_heading_and_validation():
    rng=np.random.default_rng(7);refs=rng.normal(0,2,(8,360));g=Geometry().model_dump()
    known=match(refs[3],refs,'known',g,g)
    assert known['candidates'][0]['candidate']==3
    for shift in [1,47,180,359]:
        r=match(np.roll(refs[3],-shift),refs,'unknown',g,g)['candidates'][0]
        assert r['candidate']==3;assert r['heading']==shift;assert r['score']<1e-6
        assert np.allclose(r['values'],np.roll(refs[3],-shift))
    with pytest.raises(ValueError):match(refs[0],refs,'known',g,dict(g,height=3))
    with pytest.raises(ValueError):match(refs[0,:180],refs,'unknown',g,g)
    with pytest.raises(ValueError):match(np.full(360,np.nan),refs,'known',g,g)

def test_real_api_flow_persistence_and_cache():
    with TestClient(app) as c:
        assert c.get('/api/v1/ready').status_code==200
        params=IndexInput(spacing=1600)
        id=indexing.build(params)
        before=indexing.summary(id)
        assert indexing.build(params)==id
        db.migrate();indexing.initialize()
        with db.session() as s: assert s.scalar(select(func.count()).select_from(db.Dataset))==1
        assert c.get('/api/v1/datasets').json()[0]['active_shape']==[256,256]
        dataset=c.get('/api/v1/datasets').json()[0]['id']
        assert c.get(f'/api/v1/datasets/{dataset}/preview.png').content.startswith(b'\x89PNG')
        o=c.post('/api/v1/experiments',json={'index_id':id,'seed':123,'mode':'unknown'}).json()
        assert set(o)=={'id','index_id','mode','geometry','noise','limitation','observed'}
        assert 'seed' not in json.dumps(o)
        assert c.post(f"/api/v1/experiments/{o['id']}/reveal").status_code==409
        private=db.get(db.Experiment,o['id']).private
        assert private['nearest_candidate_m']>=1
        obs2=experiments.create(__import__('app.schemas',fromlist=['ExperimentInput']).ExperimentInput(index_id=id,seed=123))
        assert o['observed']==obs2['observed']
        result=c.post('/api/v1/localizations',json={'experiment_id':o['id']}).json()
        assert len(result['candidates'])==5
        truth=c.post(f"/api/v1/experiments/{o['id']}/reveal").json()
        assert truth['position_error_m']>=truth['nearest_candidate_m']-1e-6
        assert c.post('/api/v1/localizations',json={'experiment_id':o['id']}).json()['id']==result['id']
        assert c.post('/api/v1/experiments',json={'index_id':id,'noise':-1}).status_code==422
        assert c.post('/api/v1/experiments',json={'index_id':'missing'}).status_code==404
        assert c.post('/api/v1/indexes',content='x'*70000).status_code==413
        assert indexing.index_key(IndexInput(spacing=1600,geometry=Geometry(height=2)))!=id
        t=indexing.terrain();old=t.fingerprint;t.fingerprint='changed'
        try:
            with pytest.raises(ValueError,match='Stale'):indexing.index_data(id)
        finally:t.fingerprint=old
        from app.config import settings
        path=settings.state/before['artifact']['path'];original=path.read_bytes();path.write_bytes(b'corrupt')
        try:
            with pytest.raises(ValueError,match='checksum'):indexing.index_data(id)
        finally:path.write_bytes(original)
        # Exercise the actual asynchronous evaluation API and both exports.
        import time
        request=c.post('/api/v1/evaluations',json={'index_id':id,'seed':77,'trials':3,'noise':.1})
        assert request.status_code==202
        ids=request.json()
        for _ in range(100):
            job=c.get('/api/v1/jobs/'+ids['job_id']).json()
            if job['status'] in ('complete','failed'): break
            time.sleep(.02)
        assert job['status']=='complete',job
        report=c.get('/api/v1/evaluations/'+ids['evaluation_id']).json()
        assert report['failed']==0 and len(report['trials'])==3
        assert c.get('/api/v1/evaluations/'+ids['evaluation_id']+'/export?format=csv').text.count('\n')==4
        assert c.get('/api/v1/evaluations/'+ids['evaluation_id']+'/export?format=json').json()['position_m']['mean']>=0
        with db.session() as s:
            runs=s.scalars(select(db.Localization)).all()
            assert all('values' not in r.result['candidates'][0] for r in runs)
        with db.session() as s:s.add(db.Job(id='interrupted-test',details={'status':'running'}))
        jobs.recover();assert db.get(db.Job,'interrupted-test').details['status']=='interrupted'
