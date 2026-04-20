# FEMMTO BCS15 Smart Scale Web App

A full-stack web application for the **FEMMTO BCS15 Bluetooth body composition scale**. Connect directly from your Chrome/Edge browser via Web Bluetooth API — no app installation required.

## Features

- **Web Bluetooth API** — connects directly to the BCS15 BLE scale from Chrome/Edge browser
- **70+ user profiles** with height, age and gender
- **16 body metrics**: weight, BMI, body fat %, muscle mass, skeletal muscle %, visceral fat, subcutaneous fat %, protein %, body water %, BMR, body age, standard weight, fat mass, fat loss, muscle frequency, skeletal mass
- **Standards-based assessment** — color-coded normal/warning/danger per gender/age
- **Measurement history** — all readings saved per profile with timestamps
- **Excel export** — export selected profiles' full history to `.xlsx`
- **Responsive UI** — works on desktop and tablet (Chrome/Edge required for BLE)

## Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Frontend   | React 18 + Vite 5 + Tailwind CSS 3               |
| Backend    | Python FastAPI + SQLAlchemy 2                    |
| Database   | PostgreSQL (Neon serverless recommended)         |
| BLE        | Web Bluetooth API (browser-native, no plugin)    |
| Deploy     | Render.com (both frontend and backend)           |

---

## Project Structure

```
femmto-scale-app/
├── backend/                  # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models.py         # Profile + Measurement ORM models
│   │   ├── schemas.py        # Pydantic v2 schemas
│   │   └── routers/
│   │       ├── profiles.py   # Profile CRUD (/api/profiles)
│   │       ├── measurements.py  # Measurement CRUD (/api/measurements)
│   │       └── export.py     # Excel export (/api/export/profiles)
│   ├── requirements.txt
│   ├── Procfile
│   └── render.yaml
└── frontend/                 # React + Vite + Tailwind
    ├── src/
    │   ├── App.jsx            # Main layout, state management
    │   ├── components/
    │   │   ├── ProfileList.jsx       # Searchable profile sidebar
    │   │   ├── ProfileForm.jsx       # Create/edit profile modal
    │   │   ├── BluetoothConnect.jsx  # BLE connect/disconnect UI
    │   │   ├── MeasurementDisplay.jsx # 16-metric grid cards
    │   │   ├── HistoryTable.jsx      # Measurement history table
    │   │   └── ExportModal.jsx       # Excel export dialog
    │   └── utils/
    │       ├── bleParser.js    # Web Bluetooth API + BCS15 packet parser
    │       ├── bodyMetrics.js  # Body composition calculations
    │       └── api.js          # Axios API client
    ├── package.json
    └── render.yaml
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (or a free [Neon](https://neon.tech) database)
- Chrome or Edge browser (for Web Bluetooth)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set environment variable
export DATABASE_URL="postgresql://user:password@host/dbname"

# Run development server
uvicorn app.main:app --reload --port 8000
```

API will be available at `http://localhost:8000`.  
Swagger UI: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env: set VITE_API_URL=http://localhost:8000

npm run dev
```

Frontend will be available at `http://localhost:5173`.

---

## Deployment on Render

### Backend (Web Service)

1. Create a new **Web Service** on Render.com
2. Connect your GitHub repository, set root directory to `backend/`
3. Configure:
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable:
   - `DATABASE_URL` — your PostgreSQL connection string (e.g., from [Neon](https://neon.tech))

### Frontend (Static Site or Web Service)

1. Create a new **Static Site** on Render.com
2. Connect your GitHub repository, set root directory to `frontend/`
3. Configure:
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL` — URL of your deployed backend (e.g., `https://your-api.onrender.com`)

---

## BLE Scale Protocol (BCS15)

The app supports multiple BLE service protocols automatically:

| Service UUID | Protocol |
|---|---|
| `0000181b-...` | GATT Body Composition Service (standard) |
| `0000181d-...` | GATT Weight Scale Service (standard) |
| `0000fff0-...` | Vendor-specific (common on Chinese BCS scales) |
| `0000ffe0-...` | Vendor-specific (alternative) |

**Browser requirement**: Web Bluetooth API requires Chrome 56+ or Edge 79+ on Windows/Mac/Linux/Android. iOS Safari is not supported.

---

## Body Metrics Formulas

| Metric | Formula |
|---|---|
| BMI | weight / (height_m)² |
| Standard Weight | 22 × (height_m)² |
| Body Fat % | BIA (with impedance) or Deurenberg (BMI-based) |
| BMR | Mifflin-St Jeor equation |
| Body Water | Watson formula |
| Visceral Fat | Estimated from BMI + age + gender (1–59 scale) |
| Body Age | Age adjusted by body fat deviation from ideal |

---

## License

MIT — see [LICENSE](LICENSE)
