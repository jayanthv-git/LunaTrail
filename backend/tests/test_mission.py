import importlib, json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app import indexing, mission, preferences, db
from app.main import app
from app.matching import match
from app.rendering import render
from app.schemas import Geometry

def test_normalized_alignment_and_viewpoint_variation():
    t=indexing.terrain();g=Geometry();a=render(t,0,0,g);b=render(t,1000,2000,g)
    assert not np.allclose(a,b)
    refs=np.asarray([a,b]);geometry=g.model_dump()
    result=match(np.roll(b,-43),refs,'unknown',geometry,geometry,2,'normalized-correlation')
    best=result['candidates'][0]
    assert best['candidate']==1 and best['heading']==43
    assert best['similarity']==pytest.approx(1)
    assert result['candidates'][0]['similarity']>=result['candidates'][1]['similarity']

def test_mission_workflow_upload_settings_and_reproducibility(monkeypatch):
    with TestClient(app) as client:
        client.post('/api/demo/reset')
        data=client.get('/api/mission').json()
        assert data['status']['overall']=='Operational'
        assert len(data['tests'])==8
        test=data['tests'][0]
        obs=client.post('/api/skyline/generate',json={'test_id':test['id']}).json()
        assert 'position' not in obs and 'private' not in obs
        original=mission.match
        def spy(observed,profiles,mode,geometry,reference_geometry,top_k,algorithm):
            assert isinstance(observed,list) and all(isinstance(v,float) for v in observed)
            assert set(geometry)=={'radius','step','samples','height','renderer'}
            return original(observed,profiles,mode,geometry,reference_geometry,top_k,algorithm)
        monkeypatch.setattr(mission,'match',spy)
        result=client.post('/api/localize',json={'test_id':test['id'],'profile':obs['observed']}).json()
        rows=result['result']['candidates']
        assert len(rows)==data['index']['count']
        assert all(rows[i]['similarity']>=rows[i+1]['similarity'] for i in range(len(rows)-1))
        truth=result['truth'];a=truth['true_position'];b=truth['predicted_position']
        assert truth['position_error_m']==pytest.approx(np.hypot(a['x']-b['x'],a['y']-b['y']))
        assert db.get(db.Experiment,test['id']).private['nearest_candidate_m']>=1
        req={'test_ids':[t['id'] for t in data['tests'][:3]]}
        first=client.post('/api/evaluation/run',json=req).json()
        second=client.post('/api/evaluation/run',json=req).json()
        assert [r['error_m'] for r in first['rows']]==[r['error_m'] for r in second['rows']]
        assert 'dataset_id' in client.get('/api/evaluation/export?format=csv').text
        assert client.get('/api/evaluation/export?format=json').json()['settings']['seed']==20261113
        assert client.post('/api/localize',json={'test_id':test['id'],'profile':[0]*360,'x':5}).status_code==422
        assert client.post('/api/localize',json={'test_id':test['id'],'profile':[0]*360}).status_code==409
        assert client.post('/api/datasets/upload',content=b'garbage',headers={'content-type':'image/tiff'}).status_code==409
        assert client.post('/api/datasets/upload',content=b'x'*(32*1024*1024+1),headers={'content-type':'image/tiff'}).status_code==413
        assert client.post('/api/datasets/upload',content=b'x',headers={'content-type':'text/plain'}).status_code==409
        old=client.get('/api/settings').json()
        assert client.put('/api/settings',json=dict(old,storage_path='/tmp')).status_code==422
        assert client.put('/api/settings',json=dict(old,success_threshold=-1)).status_code==422
        update=dict(old,success_threshold=800,geometry=dict(old['geometry'],height=2))
        assert client.put('/api/settings',json=update).json()['regeneration_required']
        assert importlib.reload(preferences).read().geometry.height==2
        assert client.get('/api/status').json()['overall']=='Degraded'
        # Import the real bundled TIFF through the same validated upload endpoint.
        with mission.BUNDLED.open('rb') as file:
            response=client.post('/api/datasets/upload',content=file.read(),headers={'content-type':'image/tiff'})
        assert response.status_code==201,response.text
        assert 'unverified' in response.json()['description']
        assert response.json()['crs']==data['dataset']['crs']
        client.post('/api/demo/reset')
        assert client.get('/api/status').json()['overall']=='Operational'
