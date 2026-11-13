import uuid
import numpy as np
from .db import Evaluation, Trial, session, get
from .schemas import ExperimentInput
from . import experiments

def evaluate(id,params,progress):
    rows=[]
    for i in range(params.trials):
        try:
            p=ExperimentInput(index_id=params.index_id,seed=(params.seed+i)%(2**32),mode=params.mode,noise=params.noise)
            obs=experiments.create(p); run=experiments.localize(obs['id']); truth=experiments.reveal(obs['id'])
            row=dict(trial=i,experiment_id=obs['id'],position_error_m=truth['position_error_m'],heading_error_deg=truth['heading_error_deg'],
                     nearest_candidate_m=truth['nearest_candidate_m'],runtime_ms=run['processingMs'],error=None)
        except Exception as e: row=dict(trial=i,error=str(e))
        rows.append(row)
        with session() as s: s.add(Trial(id=uuid.uuid4().hex,evaluation_id=id,number=i,details=row))
        progress((i+1)/params.trials)
    good=[r for r in rows if r['error'] is None]
    def stats(key):
        a=[r[key] for r in good]
        return dict(mean=float(np.mean(a)),median=float(np.median(a)),p90=float(np.percentile(a,90))) if a else None
    from .indexing import index_data
    idx,_=index_data(params.index_id)
    result=dict(status='complete',parameters=params.model_dump(),trials=rows,failed=len(rows)-len(good),
        position_m=stats('position_error_m'),heading_deg=stats('heading_error_deg'),runtime_ms=stats('runtime_ms'),
        nearest_candidate_m=stats('nearest_candidate_m'),candidate_spacing_m=idx.details['parameters']['spacing'],
        success_rates={str(t):sum(r['position_error_m']<=t for r in good)/len(rows) for t in [100,320,640,1000]},
        limitation=experiments.LIMITATION)
    with session() as s: s.get(Evaluation,id).details=result
    return id
