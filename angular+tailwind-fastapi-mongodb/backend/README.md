# Backend — FastAPI + MongoDB

> **For new contributors:** This document explains not just how to run the service, but why it is structured the way it is, what each file does, how data flows through the system, and how to extend it. Read it top to bottom before touching the code.

---

## Table of Contents

1. [What This Service Does](#1-what-this-service-does)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture & Data Flow](#4-architecture--data-flow)
5. [File-by-File Breakdown](#5-file-by-file-breakdown)
   - [main.py](#mainpy)
   - [database.py](#databasepy)
   - [models.py](#modelspy)
   - [routes/tasks.py](#routestaskspy)
6. [Data Model](#6-data-model)
7. [API Reference](#7-api-reference)
8. [Error Handling](#8-error-handling)
9. [Environment Configuration](#9-environment-configuration)
10. [Local Development Setup](#10-local-development-setup)
11. [Testing](#11-testing)
12. [How to Add a New Feature](#12-how-to-add-a-new-feature)

---

## 1. What This Service Does

This is the **REST API backend** for the Task Manager application. It is responsible for:

- Exposing a clean HTTP API that the Angular frontend consumes
- Validating all incoming request data before it reaches the database
- Persisting task data to MongoDB and retrieving it
- Translating MongoDB documents (which use `_id`) into JSON-friendly shapes (which use `id`)

It does **not** handle authentication, file uploads, caching, or any frontend rendering — those concerns are separated out by design.

---

## 2. Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| **FastAPI** | 0.115.0 | Web framework — handles routing, validation, OpenAPI docs |
| **Uvicorn** | 0.30.6 | ASGI server — runs the FastAPI app |
| **Motor** | ≥3.6 | Async MongoDB driver — all DB calls are non-blocking |
| **Pydantic** | 2.8.2 | Data validation and serialization — models are defined here |
| **python-dotenv** | 1.0.1 | Loads `.env` file into `os.environ` at startup |
| **MongoDB** | 8.x | Document database — stores tasks as BSON documents |

**Why FastAPI?**
FastAPI automatically generates Swagger (OpenAPI) docs, enforces type safety via Pydantic, and natively supports async/await — a perfect match for Motor's async MongoDB driver.

**Why Motor instead of PyMongo?**
PyMongo is synchronous — it blocks the thread while waiting for MongoDB. Motor is the async version, so the server can handle other requests while waiting for a DB response instead of sitting idle.

---

## 3. Project Structure

```
backend/
├── main.py            # App entry point — creates FastAPI instance, registers middleware and routers
├── database.py        # Database connection — Motor client and collection reference
├── models.py          # Pydantic models — defines the shape of request and response data
├── routes/
│   ├── __init__.py    # Makes 'routes' a Python package (empty file)
│   └── tasks.py       # All 5 CRUD route handlers for /tasks
├── requirements.txt   # Python package dependencies with pinned versions
├── .env               # Local environment variables (gitignored — never commit this)
├── .env.example       # Safe-to-commit template showing what .env variables are needed
└── .gitignore         # Tells git to ignore __pycache__, venv, and .env
```

The `routes/` folder is a Python **package** (a folder with `__init__.py`). This allows `main.py` to import from it cleanly with `from routes.tasks import router`. As the app grows, you'd add new route files here (e.g., `routes/users.py`, `routes/projects.py`).

---

## 4. Architecture & Data Flow

```
Angular Frontend (port 4200)
        │
        │  HTTP request  e.g. POST /api/tasks
        ▼
FastAPI App  (main.py)
        │
        │  Route matched → handler in routes/tasks.py called
        ▼
Pydantic Model  (models.py)
        │
        │  Validates + parses the JSON body
        │  Rejects invalid data with 422 before it reaches the DB
        ▼
Route Handler  (routes/tasks.py)
        │
        │  Calls Motor async methods
        ▼
Motor Driver  (database.py)
        │
        │  Sends async query to MongoDB
        ▼
MongoDB  (port 27017)
        │
        │  Returns BSON document with _id field
        ▼
task_serializer()  (routes/tasks.py)
        │
        │  Converts _id (ObjectId) → id (string)
        ▼
FastAPI  serializes response → JSON sent back to frontend
```

**Key insight — why `task_serializer` exists:**
MongoDB stores document IDs as `ObjectId` (a BSON type), not as plain strings. JSON does not know how to serialize `ObjectId`. The `task_serializer` function manually converts `_id` → `id` as a string so the response is clean JSON that any HTTP client can use.

---

## 5. File-by-File Breakdown

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.tasks import router

app = FastAPI(title="Task Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    ...
)

app.include_router(router, prefix="/api")
```

This is the **entry point** — the first file Uvicorn loads.

- `FastAPI(title=...)` — Creates the app. The title appears in the Swagger docs at `/docs`.
- `CORSMiddleware` — Browsers enforce Same-Origin Policy: a page on `localhost:4200` cannot call an API on `localhost:8000` unless that API explicitly allows it. CORS middleware adds the required `Access-Control-Allow-Origin` headers. **Only `localhost:4200` is whitelisted** — this is intentional. For production you would replace this with your actual frontend domain.
- `include_router(router, prefix="/api")` — All routes defined in `routes/tasks.py` are mounted under `/api`. So a route defined as `/tasks` becomes `/api/tasks`.

---

### `database.py`

```python
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]
tasks_collection = db["tasks"]
```

This file is responsible for **one thing only**: establishing the MongoDB connection and exposing the `tasks_collection` object that route handlers import.

- `AsyncIOMotorClient` — Motor's async client. It is created once at module load time and reused for all requests (connection pooling). You do **not** open and close connections per-request.
- `db["tasks"]` — Selects (or lazily creates) the `tasks` collection inside the database. MongoDB creates collections and databases automatically the first time you write to them — no migration scripts needed.
- Environment variables are read here via `os.getenv()` with sensible defaults, so the app works out of the box without a `.env` file for local dev.

---

### `models.py`

Pydantic models define the **shape and validation rules** for data entering and leaving the system. There are three distinct models — each serving a different purpose:

```python
class TaskCreate(BaseModel):
    title: str                                          # required, no default
    description: str = ""                               # optional, defaults to empty string
    status: Literal["todo", "in-progress", "done"] = "todo"  # enum with default
```
Used for `POST /api/tasks` request body. FastAPI reads this model, automatically parses the JSON body, and rejects the request with HTTP 422 if `title` is missing or `status` is not one of the three allowed values.

```python
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["todo", "in-progress", "done"]] = None
```
Used for `PUT /api/tasks/{id}` request body. All fields are `Optional` because a PATCH-style update should allow changing only one field at a time (e.g., just update `status` without re-sending `title`). The route handler filters out `None` values before writing to the database.

```python
class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
```
Used as the `response_model` on routes. FastAPI uses this to:
1. Filter the response — any fields on the database document that are **not** in this model are stripped out before sending to the client.
2. Serialize the response — `datetime` fields are converted to ISO 8601 strings.
3. Generate the OpenAPI schema shown in Swagger docs.

**Why three separate models?**
Because the data you receive (create), the data you accept for edits (update), and the data you send back (response) have different shapes and rules. Using one model for all three would either make required fields optional or expose internal fields to clients.

---

### `routes/tasks.py`

This file contains all **route handlers** — the functions that execute when an HTTP request matches a path.

**`task_serializer(task) -> dict`**
A plain helper function (not a route). MongoDB returns documents where the primary key field is named `_id` and typed as `ObjectId`. This converts it to the client-friendly form:
```python
{ "_id": ObjectId("..."), ... }  →  { "id": "...", ... }
```

**Route handlers** follow a consistent pattern:
1. Validate the `task_id` with `ObjectId.is_valid()` — if the string is not a valid MongoDB ObjectId format, return `400 Bad Request` immediately without hitting the DB.
2. Perform the async Motor operation (`await tasks_collection.find_one(...)`)
3. If the document is not found, raise `HTTPException(404)`
4. Return the serialized result

**`GET /tasks`** — streams all documents from the collection using `async for` (non-blocking iteration), serializes each one, returns a list.

**`POST /tasks`** — stamps `created_at` and `updated_at` with `datetime.utcnow()`, inserts the document, then immediately re-fetches it by `inserted_id` to return the full record including the generated `_id`.

**`PUT /tasks/{id}`** — filters out `None` fields from the update payload (so clients can send partial updates), stamps `updated_at`, uses MongoDB `$set` operator to update only the specified fields without overwriting the entire document.

**`DELETE /tasks/{id}`** — returns `204 No Content` (no response body) on success, which is the HTTP convention for a successful delete.

---

## 6. Data Model

### MongoDB Document Shape

Each task is stored as a BSON document in the `tasks` collection:

```json
{
  "_id": ObjectId("661f1234abcd5678ef901234"),
  "title": "Write project docs",
  "description": "Cover setup, models, and API",
  "status": "in-progress",
  "created_at": ISODate("2026-04-06T09:00:00Z"),
  "updated_at": ISODate("2026-04-06T10:30:00Z")
}
```

### Field Reference

| Field | Type | Notes |
|-------|------|-------|
| `_id` | `ObjectId` | Auto-generated by MongoDB. Converted to string `id` in responses. |
| `title` | `string` | Required. Human-readable task name. |
| `description` | `string` | Optional. Defaults to empty string. |
| `status` | `string` | Enum: `"todo"`, `"in-progress"`, `"done"`. Defaults to `"todo"`. |
| `created_at` | `datetime` | Set once on creation. Never updated. UTC. |
| `updated_at` | `datetime` | Set on creation and updated on every PUT. UTC. |

### Status Lifecycle

```
todo  →  in-progress  →  done
 ↑                         │
 └─────────────────────────┘  (can move back)
```

The API does not enforce state machine transitions — any status value can be set directly. If stricter transitions are needed in the future, add validation logic in the `update_task` route handler.

---

## 7. API Reference

Base URL: `http://localhost:8000/api`
Interactive docs (Swagger UI): `http://localhost:8000/docs`
JSON schema (ReDoc): `http://localhost:8000/redoc`

---

### `GET /tasks`
Returns all tasks.

**Response `200 OK`**
```json
[
  {
    "id": "661f1234abcd5678ef901234",
    "title": "Write project docs",
    "description": "Cover setup, models, and API",
    "status": "in-progress",
    "created_at": "2026-04-06T09:00:00",
    "updated_at": "2026-04-06T10:30:00"
  }
]
```

---

### `GET /tasks/{id}`
Returns a single task by ID.

**Path params:** `id` — MongoDB ObjectId as string

**Response `200 OK`** — same shape as a single item from the list above

**Errors:**
- `400` — `id` is not a valid ObjectId format
- `404` — no task with that ID exists

---

### `POST /tasks`
Creates a new task.

**Request body:**
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "status": "todo"
}
```
- `title` is required
- `description` defaults to `""`
- `status` defaults to `"todo"`, must be one of `"todo" | "in-progress" | "done"`

**Response `201 Created`** — the created task with `id`, `created_at`, `updated_at` filled in

**Errors:**
- `422` — validation failed (e.g., missing `title`, invalid `status` value)

---

### `PUT /tasks/{id}`
Updates an existing task. All fields are optional — send only the fields you want to change.

**Request body (partial update example):**
```json
{
  "status": "done"
}
```

**Response `200 OK`** — the updated task

**Errors:**
- `400` — invalid ObjectId format, or request body has no fields to update
- `404` — no task with that ID

---

### `DELETE /tasks/{id}`
Deletes a task permanently.

**Response `204 No Content`** — empty body

**Errors:**
- `400` — invalid ObjectId format
- `404` — no task with that ID

---

## 8. Error Handling

The API uses standard HTTP status codes consistently:

| Status | Meaning | When it happens |
|--------|---------|----------------|
| `200` | OK | Successful GET or PUT |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid ObjectId format, or PUT with empty body |
| `404` | Not Found | Task ID does not exist in DB |
| `422` | Unprocessable Entity | Pydantic validation failed (wrong types, missing required fields) |

All error responses follow FastAPI's standard format:
```json
{
  "detail": "Task not found"
}
```

The `422` error from Pydantic is more detailed and lists which fields failed and why — this is automatically generated by FastAPI and is very helpful during frontend development.

---

## 9. Environment Configuration

The app reads configuration from environment variables, loaded from `.env` at startup via `python-dotenv`.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | Full MongoDB connection string |
| `DB_NAME` | `taskmanager` | Name of the database to use |

**`.env`** (gitignored — your local copy, never commit)
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=taskmanager
```

**`.env.example`** (committed — shows teammates what variables exist)
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=taskmanager
```

If a variable is missing from `.env`, the `os.getenv(..., "default")` fallback in `database.py` keeps the app working — useful for CI environments where no `.env` file is present.

---

## 10. Local Development Setup

### Prerequisites
- Python 3.10+
- MongoDB running on `localhost:27017` (see root README for install instructions)

### Steps

```bash
# 1. Navigate to this folder
cd backend

# 2. Create a virtual environment (keeps dependencies isolated from your system Python)
python -m venv venv

# 3. Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy environment config
cp .env.example .env
# Edit .env if your MongoDB runs on a different URL or port

# 6. Start the development server (--reload restarts on every file save)
uvicorn main:app --reload
```

The server starts at `http://localhost:8000`. Open `http://localhost:8000/docs` in your browser — you'll see the Swagger UI where you can call every endpoint interactively without needing curl or Postman.

### Verify MongoDB is running (Windows)
```bash
sc query MongoDB
```
If `STATE: STOPPED`, start it with (PowerShell as Admin): `net start MongoDB`

---

## 11. Testing

> There are no automated tests in the codebase yet. This section documents the conventions to follow when we add them.

### Manual Testing
Use the Swagger UI at `http://localhost:8000/docs` — every endpoint is listed with a "Try it out" button. This is the fastest way to test individual routes during development.

### Writing Automated Tests

The recommended stack is **pytest + httpx** (async test client):

```bash
pip install pytest pytest-asyncio httpx
```

Test file location: `backend/tests/test_tasks.py`

Pattern for a route test:
```python
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_task():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/tasks", json={
            "title": "Test task",
            "status": "todo"
        })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test task"
    assert "id" in data
```

**What to test per endpoint:**
- `POST /tasks` — happy path, missing required `title`, invalid `status` value
- `GET /tasks/{id}` — valid ID, invalid ObjectId format, non-existent ID
- `PUT /tasks/{id}` — partial update, empty body (should 400), non-existent ID
- `DELETE /tasks/{id}` — happy path, non-existent ID

---

## 12. How to Add a New Feature

### Example: Add a `priority` field to tasks

**Step 1 — Update `models.py`**

Add `priority` to all three models:
```python
# TaskCreate
priority: Literal["low", "medium", "high"] = "medium"

# TaskUpdate
priority: Optional[Literal["low", "medium", "high"]] = None

# TaskResponse
priority: str
```

**Step 2 — No database migration needed**

MongoDB is schemaless. Existing documents without `priority` will simply not have the field. Decide whether this is acceptable or whether you need a script to backfill existing records.

**Step 3 — The route handlers need no changes**

`TaskCreate.model_dump()` will automatically include the new field, and the `task_serializer` re-read from DB after insert/update returns whatever is stored.

**Step 4 — Add `priority` to `task_serializer`**

```python
def task_serializer(task) -> dict:
    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "description": task["description"],
        "status": task["status"],
        "priority": task.get("priority", "medium"),  # default for old records
        "created_at": task["created_at"],
        "updated_at": task["updated_at"],
    }
```

**Step 5 — Update the frontend** to send and display the new field.

---

### Example: Add a new resource (e.g., `projects`)

1. Create `routes/projects.py` — define an `APIRouter` with CRUD handlers
2. Add the `Project*` Pydantic models to `models.py` (or a new `project_models.py`)
3. Add `projects_collection = db["projects"]` to `database.py`
4. In `main.py`: `from routes.projects import router as projects_router` and `app.include_router(projects_router, prefix="/api")`
