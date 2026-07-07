from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./upjao.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200   # 30 days — sessions persist; token
    # lives in sessionStorage (clears on browser close), so users aren't logged
    # out mid-work and only sign in again after fully closing the browser.

    # SLA engine config (override via .env)
    SLA_HOURS_LIMIT: int = 48       # business hours before sample-request breach
    SLA_STALL_DAYS: int = 5         # calendar days before any open ticket is stalled
    SLA_BIZ_START_H: int = 9        # IST hour (inclusive) — scheduler window start
    SLA_BIZ_END_H: int = 18         # IST hour (exclusive) — scheduler window end

    UPLOAD_DIR: str = "./uploads"   # relative to where uvicorn runs (backend/)

    # Comma-separated list of allowed frontend origins (override via .env in prod,
    # e.g. ALLOWED_ORIGINS=https://upjao-leads.vercel.app)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"

    class Config:
        env_file = ".env"


settings = Settings()
