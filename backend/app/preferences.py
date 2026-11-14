"""Validated, atomic mission configuration; browser paths are never accepted."""
import json, os
from typing import Literal
from pydantic import Field
from .schemas import Strict, Geometry
from .config import settings

class Preferences(Strict):
    geometry: Geometry = Field(default_factory=Geometry)
    spacing: int = Field(640, ge=320, le=2400)
    algorithm: Literal['normalized-correlation', 'angular-rmse'] = 'normalized-correlation'
    circular_alignment: bool = True
    top_k: int = Field(5, ge=1, le=2000)
    coordinate_format: Literal['geographic','projected'] = 'geographic'
    autosave: bool = True
    contours: bool = True
    hillshade: bool = True
    palette: Literal['lunar','blue'] = 'lunar'
    quality: Literal['native','half'] = 'native'
    test_count: int = Field(8, ge=1, le=40)
    seed: int = Field(20261113, ge=0, le=2**32-100)
    noise: float = Field(0, ge=0, le=2)
    success_threshold: float = Field(640, ge=1, le=20000)
    cache_enabled: bool = True
    logging_level: Literal['WARNING','INFO','DEBUG'] = 'INFO'

PREF_FILE=settings.state/'preferences.json'
def atomic_json(path, data):
    temp=path.with_suffix('.tmp')
    temp.write_text(json.dumps(data,allow_nan=False))
    os.replace(temp,path)
def read():
    return Preferences.model_validate_json(PREF_FILE.read_text()) if PREF_FILE.exists() else Preferences()
def save(value):
    atomic_json(PREF_FILE,value.model_dump())
    return value
