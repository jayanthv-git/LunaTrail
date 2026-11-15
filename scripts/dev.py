"""Run both local services, forwarding termination to both process groups."""
import os, signal, subprocess, time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
children=[]
def stop(*_):
    for child in children:
        if child.poll() is None: os.killpg(child.pid,signal.SIGTERM)
    for child in children:
        try: child.wait(timeout=30)
        except subprocess.TimeoutExpired: os.killpg(child.pid,signal.SIGKILL)
    raise SystemExit(0)
signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
try:
    children.append(subprocess.Popen([str(root/'backend/.venv/bin/python'),'-m','uvicorn','app.main:app','--app-dir',str(root/'backend'),'--host','127.0.0.1','--port','8000'],cwd=root,start_new_session=True))
    children.append(subprocess.Popen(['npm','run','dev','--','--port','5173','--strictPort'],cwd=root,start_new_session=True))
    while all(c.poll() is None for c in children): time.sleep(.3)
finally: stop()
