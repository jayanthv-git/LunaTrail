"""Continuation regressions: evaluation, settings, isolation, concurrency and restart."""
import importlib
import json
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app import db, indexing, mission, preferences
from app.main import app
from app.schemas import IndexInput

@pytest.fixture
def client():
    with TestClient(app) as c:
        assert c.post('/api/demo/reset').status_code == 200
        yield c

@pytest.mark.parametrize('payload,code', [
    ({'test_ids':[]},422), ({'test_ids':['missing']},409),
    ({'test_ids':['missing','missing']},409), ({'unexpected':True},422),
    ({'test_ids':['x']*41},422), ({'test_ids':[42]},422),
])
def test_invalid_evaluation_preserves_results(client,payload,code):
    before=client.get('/api/evaluation/results').json()
    assert client.post('/api/evaluation/run',json=payload).status_code==code
    assert client.get('/api/evaluation/results').json()==before


def test_truth_is_used_only_after_prediction(client,monkeypatch):
    d=client.get('/api/mission').json();id=d['tests'][0]['id']
    obs=client.post('/api/skyline/generate',json={'test_id':id}).json()
    assert client.get('/api/mission').json()['truth'] is None
    assert client.get('/api/candidates').json()==[]
    assert client.post(f'/api/v1/experiments/{id}/reveal').status_code==409
    # Changing private truth cannot change the winning candidate or any score.
    first=client.post('/api/localize',json={'test_id':id,'profile':obs['observed']}).json()
    with db.session() as s:
        e=s.get(db.Experiment,id); original=e.private
        e.private=dict(original,position=dict(original['position'],x=original['position']['x']+5000))
    second=client.post('/api/localize',json={'test_id':id,'profile':obs['observed']}).json()
    assert [(r['id'],r['score'],r['heading']) for r in first['result']['candidates']]==[(r['id'],r['score'],r['heading']) for r in second['result']['candidates']]
    assert first['truth']['position_error_m']!=second['truth']['position_error_m']
    with db.session() as s:s.get(db.Experiment,id).private=original
    client.post('/api/skyline/generate',json={'test_id':d['tests'][1]['id']})
    fresh=client.get('/api/mission').json()
    assert fresh['truth'] is None and fresh['result'] is None


def test_evaluation_metrics_failure_denominator_and_exports(client,monkeypatch):
    ids=[t['id'] for t in client.get('/api/tests').json()[:3]]
    original=mission.run_match
    def fail_one(id,profile):
        if id==ids[1]:raise ValueError('Injected invalid profile')
        return original(id,profile)
    monkeypatch.setattr(mission,'run_match',fail_one)
    result=client.post('/api/evaluation/run',json={'test_ids':ids}).json()
    rows=result['rows'];good=[r for r in rows if r['status']=='complete'];errors=[r['error_m'] for r in good];m=result['metrics']
    assert len(rows)==3 and m['failed']==1
    assert m['median']==pytest.approx(np.median(errors))
    assert m['mean']==pytest.approx(np.mean(errors))
    assert m['maximum']==max(errors)
    assert m['success_rate']==sum(e<=m['threshold'] for e in errors)/3
    for r in good:
        assert r['error_m']==pytest.approx(np.hypot(r['actual']['x']-r['predicted']['x'],r['actual']['y']-r['predicted']['y']))
    assert 'Injected invalid profile' in client.get('/api/evaluation/export?format=csv').text
    assert client.get('/api/evaluation/export?format=json').json()==result
    assert client.get('/api/evaluation/export?format=xml').status_code==422
    client.post('/api/evaluation/reset')
    assert client.get('/api/evaluation/export').status_code==409


def test_settings_persist_and_invalidate_exact_dependencies(client):
    data=client.get('/api/mission').json();id=data['tests'][0]['id']
    obs=client.post('/api/skyline/generate',json={'test_id':id}).json()
    client.post('/api/localize',json={'test_id':id,'profile':obs['observed']})
    client.post('/api/evaluation/run',json={'test_ids':[id]})
    pref=data['settings'];pref.update(coordinate_format='projected',palette='blue',contours=False)
    assert not client.put('/api/settings',json=pref).json()['regeneration_required']
    assert client.get('/api/mission').json()['result'] is not None
    pref['success_threshold']=123
    assert client.put('/api/settings',json=pref).status_code==200
    data=client.get('/api/mission').json()
    assert data['evaluation'] is None and data['result'] is not None
    pref['geometry']['height']=2
    assert client.put('/api/settings',json=pref).json()['regeneration_required']
    data=client.get('/api/mission').json()
    assert data['index'] is None and data['tests']==[] and data['truth'] is None and data['result'] is None
    assert importlib.reload(preferences).read().geometry.height==2
    assert json.loads(mission.STATE.read_text())['index_id'] is None
    assert client.post('/api/references/generate').status_code==200
    assert client.post('/api/tests/generate').status_code==200
    assert client.get('/api/mission').json()['index']['parameters']['geometry']['height']==2


def test_autosave_persists_results_only_when_enabled(client):
    data=client.get('/api/mission').json();id=data['tests'][0]['id']
    pref=data['settings'];pref['autosave']=False
    client.put('/api/settings',json=pref)
    obs=client.post('/api/skyline/generate',json={'test_id':id}).json()
    client.post('/api/localize',json={'test_id':id,'profile':obs['observed']})
    assert client.get('/api/mission').json()['result'] is not None
    assert json.loads(mission.STATE.read_text())['result'] is None
    pref['autosave']=True;client.put('/api/settings',json=pref)
    assert json.loads(mission.STATE.read_text())['result']['test_id']==id


def test_concurrent_reference_build_reuses_one_index(client):
    params=IndexInput(spacing=1337)
    with ThreadPoolExecutor(max_workers=4) as pool:
        ids=list(pool.map(lambda _:indexing.build(params),range(4)))
    assert len(set(ids))==1
    summary=indexing.summary(ids[0]);assert summary['count']>2


def test_concurrent_mission_requests_are_consistent(client):
    ids=[t['id'] for t in client.get('/api/tests').json()[:3]]
    def run(id):
        response=client.post('/api/evaluation/run',json={'test_ids':[id]})
        assert response.status_code==200
        return response.json()['rows'][0]['test_id']
    with ThreadPoolExecutor(max_workers=3) as pool:assert list(pool.map(run,ids))==ids
    assert json.loads(mission.STATE.read_text())['evaluation']['metrics']['count']==1


def test_worker_pool_can_restart():
    import time
    for _ in range(2):
        with TestClient(app) as client:
            from app import jobs
            id=jobs.submit('restart-regression',{},lambda progress:'done')
            for _ in range(100):
                row=client.get('/api/v1/jobs/'+id).json()
                if row['status'] in ('complete','failed'):break
                time.sleep(.01)
            assert row['status']=='complete'


def test_invalid_combined_geometry_does_not_destroy_mission(client):
    old=client.get('/api/settings').json();before=client.get('/api/mission').json()
    invalid=dict(old,spacing=320,geometry=dict(old['geometry'],radius=800))
    response=client.put('/api/settings',json=invalid)
    assert response.status_code==409
    assert 'reference points' in response.json()['error']['message']
    assert client.get('/api/settings').json()==old
    assert client.get('/api/mission').json()['index']['id']==before['index']['id']


def test_manual_profile_matching_has_no_truth_and_preserves_evaluation(client):
    data=client.get('/api/mission').json();id=data['tests'][0]['id']
    original=client.post('/api/skyline/generate',json={'test_id':id}).json()['observed']
    evaluation=client.post('/api/evaluation/run',json={'test_ids':[id]}).json()
    edited=[v+.05*np.sin(i/10) for i,v in enumerate(original)]
    body={'index_id':data['index']['id'],'profile':edited}
    response=client.post('/api/localize/manual',json=body)
    assert response.status_code==200,response.text
    result=response.json()
    assert result['truth'] is None
    assert result['observation']['source']=='manual'
    assert result['observation']['observed']==edited
    assert all(c['error_m'] is None for c in result['result']['candidates'])
    snapshot=client.get('/api/mission').json()
    assert snapshot['truth'] is None and snapshot['evaluation']==evaluation
    assert json.loads(mission.STATE.read_text())['observation']['source']=='manual'
    assert client.post('/api/localize',json={'test_id':id,'profile':edited}).status_code==409
    client.post('/api/skyline/generate',json={'test_id':id})
    restored=client.get('/api/mission').json()
    assert restored['observation']['observed']==original and restored['result'] is None


@pytest.mark.parametrize('change,code',[
    ({'profile':[0]*180},409),({'profile':[91]*360},409),
    ({'profile':[0]*360},409),({'index_id':'stale'},409),
    ({'profile':[0]*10},422),({'profile':['invalid']*360},422),
    ({'private_position':{'x':0,'y':0}},422),
])
def test_manual_validation_keeps_current_observation(client,change,code):
    data=client.get('/api/mission').json();id=data['tests'][0]['id']
    obs=client.post('/api/skyline/generate',json={'test_id':id}).json()
    body=dict(index_id=data['index']['id'],profile=obs['observed']);body.update(change)
    assert client.post('/api/localize/manual',json=body).status_code==code
    assert client.get('/api/mission').json()['observation']==obs
