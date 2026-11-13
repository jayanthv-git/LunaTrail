from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
ROOT = Path(__file__).resolve().parents[2]
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix='LUNATRAIL_', env_file=ROOT / '.env', extra='ignore')
    dem: Path = ROOT / 'data/processed/LDEM_80S_80MPP_ADJ_crop_20480m.tif'
    state: Path = ROOT / 'backend/var'
settings = Settings()
settings.dem = (ROOT / settings.dem).resolve()
settings.state = (ROOT / settings.state).resolve()
settings.state.mkdir(parents=True, exist_ok=True)
