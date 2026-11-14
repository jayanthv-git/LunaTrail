"""Real HTTP check: launch, save, terminate both services, restart, verify persistence.
Uses temporary state and free loopback ports; never touches the user's mission store.
"""
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        return sock.getsockname()[1]

def main():
    api,web=free_port(),free_port()
    while web==api:web=free_port()
    with tempfile.TemporaryDirectory(prefix='lunatrail-lifecycle-') as folder:
        env=dict(os.environ,LUNATRAIL_STATE=folder,LUNATRAIL_API_PORT=str(api),LUNATRAIL_WEB_PORT=str(web))
        def request(path,body=None,method=None):
            data=None if body is None else json.dumps(body).encode()
            with urlopen(Request(f'http://127.0.0.1:{web}'+path,data=data,method=method,headers={'Content-Type':'application/json'}),timeout=15) as response:
                return json.load(response)
        def start():
            log=open(Path(folder)/'launcher.log','a')
            process=subprocess.Popen([sys.executable,'scripts/dev.py'],cwd=ROOT,env=env,stdout=log,stderr=log)
            log.close()
            for _ in range(100):
                if process.poll() is not None:break
                try:
                    if request('/api/v1/ready')['status']=='ready':return process
                except (OSError,ValueError):pass
                time.sleep(.1)
            process.terminate();process.wait(timeout=35)
            raise AssertionError((Path(folder)/'launcher.log').read_text())
        def stop(process):
            process.send_signal(signal.SIGTERM);process.wait(timeout=35)
            assert process.returncode==0,process.returncode
            for port in (api,web):
                with socket.socket() as sock:
                    assert sock.connect_ex(('127.0.0.1',port))!=0,f'Port {port} left open'
        process=start()
        try:
            mission=request('/api/mission');id=mission['tests'][0]['id']
            obs=request('/api/skyline/generate',{'test_id':id})
            result=request('/api/localize',{'test_id':id,'profile':obs['observed']})
            pref=mission['settings'];pref['coordinate_format']='projected'
            request('/api/settings',pref,'PUT')
            evaluation=request('/api/evaluation/run',{'test_ids':[id]})
            # A second launcher must fail without terminating either existing service.
            collision=subprocess.run([sys.executable,'scripts/dev.py'],cwd=ROOT,env=env,capture_output=True,text=True,timeout=10)
            assert collision.returncode!=0 and 'occupied' in collision.stderr
        finally:stop(process)
        process=start()
        try:
            restored=request('/api/mission')
            assert restored['settings']['coordinate_format']=='projected'
            assert restored['result']['test_id']==id
            assert restored['truth']==result['truth']
            assert restored['evaluation']==evaluation
            with urlopen(f'http://127.0.0.1:{web}/settings') as response:assert response.status==200
        finally:stop(process)
        print('PASS: real frontend proxy + API, match, evaluation, settings and result persistence, occupied-port failure, two clean startups/shutdowns, both ports released.')

if __name__=='__main__':main()
