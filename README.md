# DataLens

### Your data has a story to tell.

DataLens is a full-stack analytics workspace for exploring CSV and Excel files. Upload a dataset, review its quality, apply cleaning options, and ask questions in plain language. DataLens turns supported questions into read-only SQL and presents the results with tables, charts, and analysis tools.

---

## What you can do

- **Upload datasets** — Work with CSV and XLSX files up to 20 MB.
- **Review data quality** — Preview rows and inspect column types, missing values, and duplicates.
- **Clean with control** — Trim text, treat blank cells as missing, remove duplicate rows, and optionally drop rows with missing values. Each cleaning run starts from the original file and is saved as a separate version.
- **Ask questions in plain language** — Explore a cleaned dataset without writing SQL yourself. Inspect the generated SQL and returned results.
- **Analyze and visualize** — Review numeric summaries, category counts, missing-value patterns, correlations, potential unusual values, and time trends.
- **Keep your work organized** — Sign in to view your saved datasets and query history, and generate data-quality recommendations.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI, Python, Pandas, NumPy, DuckDB |
| Data and storage | Parquet, PyArrow, MongoDB |
| Natural-language SQL | Ollama Cloud |

## Project structure

```text
.
├── backend/
│   ├── main.py                 # FastAPI app and dataset endpoints
│   ├── database.py             # MongoDB connection
│   ├── routes/                 # Authentication, analysis, trends, history, and more
│   ├── services/               # Dataset, SQL, analysis, and recommendation logic
│   └── data/                   # Uploaded files and cleaned Parquet versions
└── frontend/
    └── src/
        ├── app/                # Next.js pages and layouts
        ├── components/         # Dashboard and analytics UI
        └── lib/                # API and authentication clients
```

## Requirements

- Python 3.10 or later
- Node.js and npm
- A MongoDB connection string
- An Ollama Cloud API key and model for natural-language questions

## Run locally

### 1. Configure the backend

Create `backend/.env` with your own credentials:

```dotenv
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=big_data_ai_lens
OLLAMA_API_KEY=your_ollama_cloud_api_key
OLLAMA_MODEL=your_ollama_cloud_model
COOKIE_SECURE=false
```

`COOKIE_SECURE=false` is for local HTTP development. Set it to `true` when serving the application over HTTPS.

Create a virtual environment and install the backend dependencies.

**Windows PowerShell**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**macOS / Linux**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API is available at [http://localhost:8000](http://localhost:8000), with interactive API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Configure and run the frontend

In another terminal:

```bash
cd frontend
npm install
```

The frontend defaults to `http://localhost:8000` for the API. To use a different backend URL, create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use DataLens.

## Development commands

Run these from `frontend/`:

```bash
npm run dev       # Start the frontend development server
npm run lint      # Run ESLint
npm run build     # Create a production build
npm run start     # Serve the production build
```

The backend dependency list is maintained in `backend/requirements.txt`. Start the API locally with `uvicorn main:app --reload --port 8000` from `backend/`.

## Data and security notes

- Uploaded source files and cleaned Parquet versions are stored under `backend/data/`.
- Dataset ownership, user accounts, and sessions use MongoDB.
- Natural-language queries are restricted to read-only `SELECT` statements against the selected dataset; external file and network access is disabled for query execution.
- Keep credentials in local environment files. Never commit API keys, database credentials, or user data.
- The default CORS and allowed-origin settings are for local development. Review them before deploying the application.

## License

No license is currently specified for this project.
