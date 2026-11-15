import argparse, json, uuid, csv
from . import db, indexing, evaluation
from .schemas import IndexInput, EvaluationInput
from .config import ROOT

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('command',choices=['init','prepare','benchmark'])
    args=parser.parse_args(); db.migrate(); indexing.initialize()
    if args.command=='init': return
    id=indexing.build(IndexInput()); print(json.dumps(indexing.summary(id) | {'points':'omitted'},indent=2))
    if args.command=='benchmark':
        out=ROOT/'reports';out.mkdir(exist_ok=True)
        results=[]
        for mode in ['known','unknown']:
            for noise in [0,.1]:
                params=EvaluationInput(index_id=id,seed=20261113,mode=mode,noise=noise,trials=20)
                eid=uuid.uuid4().hex
                with db.session() as s: s.add(db.Evaluation(id=eid,details={'status':'running'}))
                evaluation.evaluate(eid,params,lambda p:None)
                result=db.get(db.Evaluation,eid).details;results.append(dict(id=eid,**result))
                with (out/f'{mode}-{noise}.csv').open('w') as f:
                    w=csv.DictWriter(f,fieldnames=list(result['trials'][0]));w.writeheader();w.writerows(result['trials'])
                print(mode,noise,result['position_m'],result['failed'])
        (out/'benchmark.json').write_text(json.dumps(results,indent=2))
        (out/'index.json').write_text(json.dumps(indexing.summary(id),indent=2))
if __name__=='__main__': main()
