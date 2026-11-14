"""Run both local services with consistent .env configuration and clean shutdown."""
import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT / 'backend/.venv/bin/python'


def main():
    if Path(sys.prefix).resolve() != (ROOT / 'backend/.venv').resolve():
        if not PYTHON.exists():
            print('Run npm run setup first.', file=sys.stderr)
            return 1
        os.execv(str(PYTHON), [str(PYTHON), str(Path(__file__).resolve())])
    from dotenv import load_dotenv
    load_dotenv(ROOT / '.env', override=False)
    try:
        api_port = int(os.environ.get('LUNATRAIL_API_PORT', '8000'))
        web_port = int(os.environ.get('LUNATRAIL_WEB_PORT', '5173'))
        if not 1 <= api_port <= 65535 or not 1 <= web_port <= 65535 or api_port == web_port:
            raise ValueError()
    except ValueError:
        print('API and web ports must be distinct numbers from 1 to 65535.', file=sys.stderr)
        return 1
    # Refuse a partial launch that might accidentally proxy to an older backend.
    for port in (api_port, web_port):
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(('127.0.0.1', port))
            except OSError:
                print(f'Port {port} is occupied. Stop the earlier LunaTrail service before starting.', file=sys.stderr)
                return 1
    children = []
    stopping = False

    def stop(*_):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        env = dict(os.environ, LUNATRAIL_API_PORT=str(api_port))
        children.append(subprocess.Popen([str(PYTHON), '-m', 'uvicorn', 'app.main:app', '--app-dir', str(ROOT / 'backend'), '--host', '127.0.0.1', '--port', str(api_port)], cwd=ROOT, env=env, start_new_session=True))
        children.append(subprocess.Popen(['npm', 'run', 'dev', '--', '--port', str(web_port), '--strictPort'], cwd=ROOT, env=env, start_new_session=True))
        while not stopping and all(child.poll() is None for child in children):
            time.sleep(.3)
        return 0 if stopping else next((child.returncode or 1 for child in children if child.poll() is not None), 1)
    finally:
        for child in children:
            if child.poll() is None:
                try:
                    os.killpg(child.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
        for child in children:
            try:
                child.wait(timeout=30)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


if __name__ == '__main__':
    raise SystemExit(main())
