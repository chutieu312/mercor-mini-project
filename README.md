# Mercor Mini Project — 6 Full-Stack Task Manager Apps

Build the **same Task Manager app** across 6 different tech stacks. Start minimal CRUD, then layer Auth, then search/filter/pagination. Each app in its own folder.

---

## App Concept: Task Manager

Entity with `id`, `title`, `description`, `status` (`todo` / `in-progress` / `done`), `created_at`, `updated_at`. Full CRUD with clean UI.

---

## Workspace Structure

```
mercor-mini-project/
├── task-2/          # Vue + Bootstrap | Django | MySQL
│   ├── frontend/
│   └── backend/
├── task-3/          # Angular + Tailwind | FastAPI | MongoDB
│   ├── frontend/
│   └── backend/
├── task-5/          # Svelte + Tailwind | Flask | SQLite
│   ├── frontend/
│   └── backend/
├── task-6/          # Solid.js + Bootstrap | FastAPI | Redis
│   ├── frontend/
│   └── backend/
├── task-7/          # Vue + Tailwind | Django | MySQL
│   ├── frontend/
│   └── backend/
└── task-8/          # Angular + Bootstrap | Fastify | MongoDB
    ├── frontend/
    └── backend/
```

---

## Build Order *(optimized for pattern reuse)*

1. **Task 3** — Angular + Tailwind | FastAPI | MongoDB *(start here)*
2. **Task 5** — Svelte + Tailwind | Flask | SQLite *(simplest backend)*
3. **Task 2** — Vue + Bootstrap | Django | MySQL
4. **Task 7** — Vue + Tailwind | Django | MySQL *(reuse Task 2 backend, swap CSS)*
5. **Task 6** — Solid.js + Bootstrap | FastAPI | Redis *(reuse Task 3 FastAPI, swap DB)*
6. **Task 8** — Angular + Bootstrap | Fastify | MongoDB *(reuse Task 3 Angular, swap backend)*

---

## Per-App Steps (Phase 1: Minimal CRUD)

**Backend — 5 REST endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks/{id}` | Get one task |
| `POST` | `/api/tasks` | Create task |
| `PUT` | `/api/tasks/{id}` | Update task |
| `DELETE` | `/api/tasks/{id}` | Delete task |

**Frontend — 2 pages**

- Task list — cards with status badges, delete button
- Task form — create/edit, reused via route param

---

## Phases

| Phase | Scope | When |
|-------|-------|------|
| **1** | Minimal CRUD | Now |
| **2** | + Auth (JWT, login/register, user-scoped tasks) | Later |
| **3** | + Search, filter by status, pagination | Later |

---

## Verification (per app)

- [ ] Backend starts without errors
- [ ] API testable via Swagger UI or curl
- [ ] Frontend builds and serves
- [ ] Full CRUD flow: create → list → edit → delete
- [ ] Responsive at mobile + desktop

---

## Key Decisions

- Same app concept across all 6 (confirmed)
- Incremental complexity: CRUD → Auth → Search (confirmed)
- Each app fully independent (no shared code between folders)
- Build order groups similar stacks to maximize reuse
