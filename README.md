# Upjao Leads

Internal webapp connecting Sales and Product teams around crop grading Leads.

## Stack
- **Backend:** FastAPI (Python), SQLAlchemy + Alembic, SQLite (dev) / Postgres (prod)
- **Frontend:** React + Vite

---

## Local Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # edit SECRET_KEY for production

alembic upgrade head              # create/migrate the database
uvicorn app.main:app --reload     # starts on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                       # starts on http://localhost:5173
```

---

## Environment Variables (backend `.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./upjao.db` | SQLite for dev; set to `postgresql://...` for prod |
| `SECRET_KEY` | `change-me-in-production` | JWT signing secret — change in prod |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token lifetime (8 hours) |

---

## Verify

- `GET http://localhost:8000/health` → `{"status":"ok"}`
- Frontend at `http://localhost:5173` shows **Backend: ok** in green
