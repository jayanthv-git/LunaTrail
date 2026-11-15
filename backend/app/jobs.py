import logging, uuid
from concurrent.futures import ThreadPoolExecutor
from threading import BoundedSemaphore
from sqlalchemy import select
from .db import Job, Evaluation, session
pool=ThreadPoolExecutor(max_workers=1,thread_name_prefix='lunatrail')
slots=BoundedSemaphore(3)
def recover():
    with session() as s:
        for job in s.scalars(select(Job)):
            if job.details['status'] in ('queued','running'):
                job.details=dict(job.details,status='interrupted',error='Server stopped; retry job')
                eid=job.details.get('parameters',{}).get('evaluation_id')
                if eid and (record:=s.get(Evaluation,eid)):
                    record.details=dict(record.details,status='interrupted',error='Server stopped; retry job')
def submit(kind,parameters,fn):
    if not slots.acquire(blocking=False): raise ValueError('Job queue full; retry after completion')
    id=uuid.uuid4().hex
    with session() as s: s.add(Job(id=id,details=dict(kind=kind,parameters=parameters,status='queued',progress=0,error=None)))
    def update(**kwargs):
        with session() as s:
            j=s.get(Job,id); j.details=dict(j.details,**kwargs)
    def work():
        try:
            update(status='running'); resource=fn(lambda p:update(progress=p))
            update(status='complete',progress=1,resource_id=resource)
        except Exception as e:
            logging.exception('Background job failed'); update(status='failed',error=str(e))
            eid=parameters.get('evaluation_id')
            if eid:
                with session() as s:
                    record=s.get(Evaluation,eid)
                    if record: record.details=dict(record.details,status='failed',error=str(e))
        finally: slots.release()
    pool.submit(work)
    return id
