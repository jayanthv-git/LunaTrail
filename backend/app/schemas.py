from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
class Geometry(Strict):
    radius: int = Field(4000, ge=800, le=6000)
    step: int = Field(80, ge=40, le=160)
    samples: Literal[180,360,720] = 360
    height: float = Field(1.5, ge=.1, le=10)
    renderer: Literal['lunar-curvature-v1'] = 'lunar-curvature-v1'
class IndexInput(Strict):
    geometry: Geometry = Field(default_factory=Geometry)
    spacing: int = Field(640, ge=320, le=2400)
class ExperimentInput(Strict):
    index_id: str = Field(max_length=64)
    seed: int = Field(42, ge=0, le=2**32-1)
    mode: Literal['known','unknown'] = 'unknown'
    noise: float = Field(0, ge=0, le=2)
class EvaluationInput(ExperimentInput):
    trials: int = Field(20, ge=1, le=100)
class MatchInput(Strict):
    experiment_id: str = Field(max_length=64)
    top_k: int = Field(5, ge=1, le=20)
