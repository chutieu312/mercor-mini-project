# Task Manager — Angular + Tailwind | FastAPI | MongoDB

A full-stack Task Manager CRUD app.

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19 + Tailwind CSS v4 |
| Backend | FastAPI + Python |
| Database | MongoDB |

---

## Prerequisites

Make sure the following are installed before running the app.

### 1. Node.js (v18+)
```bash
node --version
```
Download: https://nodejs.org

### 2. Angular CLI
```bash
npm install -g @angular/cli
ng version
```

### 3. Python (3.10+)
```bash
python --version
```
Download: https://python.org

### 4. MongoDB (running as a service on port 27017)

**Install via Chocolatey** (PowerShell as Administrator):
```
choco install mongodb -y
```

**Verify MongoDB is running:**
```bash
sc query MongoDB
```
Should show `STATE: RUNNING`.

**If stopped, start it** (PowerShell as Administrator):
```
net start MongoDB
```

### 5. MongoDB Compass (optional — visual DB viewer)
```
choco install mongodb-compass -y
```
Open it and connect to `mongodb://localhost:27017` to browse the database.

---

## Project Structure

```
angular+tailwind-fastapi-mongodb/
├── backend/       # FastAPI app
└── frontend/      # Angular app
```

---

## Backend Setup

```bash
cd backend
```

**1. Create and activate a virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Configure environment variables**
```bash
cp .env.example .env
```

The default `.env` works out of the box for local MongoDB:
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=taskmanager
```

**4. Run the backend**
```bash
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`
Swagger API docs: `http://localhost:8000/docs`

---

## Frontend Setup

Open a second terminal:

```bash
cd frontend
```

**1. Install dependencies**
```bash
npm install
```

**2. Run the frontend**
```bash
ng serve
```

App runs at: `http://localhost:4200`

> All `/api` requests are automatically proxied to `http://localhost:8000` via `proxy.conf.json` — no CORS issues during development.

---

## Running Both Together

You need **two terminals** open simultaneously:

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 | `uvicorn main:app --reload` (in `backend/`) | http://localhost:8000/docs |
| Terminal 2 | `ng serve` (in `frontend/`) | http://localhost:4200 |

MongoDB runs automatically as a Windows service in the background.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks/{id}` | Get one task |
| `POST` | `/api/tasks` | Create task |
| `PUT` | `/api/tasks/{id}` | Update task |
| `DELETE` | `/api/tasks/{id}` | Delete task |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Task list — all tasks with status badges |
| `/create` | Create a new task |
| `/edit/:id` | Edit an existing task |
