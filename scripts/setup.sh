#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm ci
PYTHONPATH=backend backend/.venv/bin/python -m app.cli init
