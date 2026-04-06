# Frontend — Angular + Tailwind CSS

> **For new contributors:** This document explains not just how to run the app, but how it is structured, how data flows through the component tree, why certain patterns were used, and how to extend the codebase confidently. Read it top to bottom before touching the code.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture & Data Flow](#4-architecture--data-flow)
5. [File-by-File Breakdown](#5-file-by-file-breakdown)
   - [Entry Point](#entry-point--maints--appconfig--apphtml)
   - [app.ts](#appts)
   - [app.config.ts](#appconfigts)
   - [app.routes.ts](#approutests)
   - [models/task.model.ts](#modelstaskmodelts)
   - [services/task.service.ts](#servicestaskservicets)
   - [components/task-list](#componentstask-listtask-list-componentts)
   - [components/task-form](#componentstask-formtask-form-componentts)
6. [Styling — Tailwind CSS v4](#6-styling--tailwind-css-v4)
7. [API Proxy](#7-api-proxy)
8. [Change Detection — Important Angular 19+ Gotcha](#8-change-detection--important-angular-19-gotcha)
9. [Pages & Routing Reference](#9-pages--routing-reference)
10. [Local Development Setup](#10-local-development-setup)
11. [Building for Production](#11-building-for-production)
12. [Testing](#12-testing)
13. [How to Add a New Feature](#13-how-to-add-a-new-feature)

---

## 1. What This App Does

This is the **Single Page Application (SPA)** frontend for the Task Manager. It is responsible for:

- Rendering the task list, create form, and edit form
- Making HTTP calls to the FastAPI backend to perform CRUD operations
- Reflecting the latest data state in the UI after each operation

It does **not** handle authentication, routing guards, or server-side rendering — those are out of scope for the current phase.

---

## 2. Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| **Angular** | 19 | SPA framework — components, routing, dependency injection, HTTP client |
| **Tailwind CSS** | v4 | Utility-first CSS — all styling is done via Tailwind classes inline in templates |
| **TypeScript** | 5.x | Typed superset of JavaScript — all source files are `.ts` |
| **Node.js** | 18+ | Required to run the Angular CLI and build tools |
| **esbuild** (`@angular/build:application`) | - | Angular's modern builder — faster builds than the legacy webpack builder |

**Why Angular standalone components?**
Angular 19 defaults to **standalone** components — components that declare their own imports rather than relying on `NgModule`. This removes a layer of boilerplate and makes each component self-contained and easier to reason about. There are no `NgModule` files in this project.

**Why Tailwind CSS v4?**
Tailwind v4 removes the `tailwind.config.js` file entirely. All configuration is CSS-native. The only setup needed is importing `@tailwindcss/postcss` as a PostCSS plugin. This is simpler and faster than v3.

---

## 3. Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.ts                        # Root component — renders <router-outlet />
│   │   ├── app.config.ts                 # App-wide providers (router, HttpClient)
│   │   ├── app.routes.ts                 # Route definitions
│   │   ├── models/
│   │   │   └── task.model.ts             # TypeScript interfaces for Task data
│   │   ├── services/
│   │   │   └── task.service.ts           # HTTP wrapper for all API calls
│   │   └── components/
│   │       ├── task-list/
│   │       │   └── task-list.component.ts  # Page: task list with edit/delete actions
│   │       └── task-form/
│   │           └── task-form.component.ts  # Page: shared create/edit form
│   ├── styles.css                        # Global styles — imports Tailwind
│   └── main.ts                           # Bootstrap entry point (auto-generated)
├── proxy.conf.json                       # Dev server proxy: /api → localhost:8000
├── postcss.config.mjs                    # Tailwind v4 PostCSS plugin config
├── angular.json                          # Angular workspace config (builder, proxy, etc.)
├── tsconfig.json                         # TypeScript compiler config
└── package.json                          # npm dependencies and scripts
```

---

## 4. Architecture & Data Flow

```
Browser
  │
  │  User visits http://localhost:4200
  ▼
Angular Router  (app.routes.ts)
  │
  │  Matches URL → activates the right component
  ▼
Component  (task-list or task-form)
  │
  │  Calls a method on TaskService
  ▼
TaskService  (task.service.ts)
  │
  │  Calls Angular HttpClient → makes HTTP request
  │  URL: /api/tasks (relative path)
  ▼
Dev Server Proxy  (proxy.conf.json)
  │
  │  Rewrites /api/tasks → http://localhost:8000/api/tasks
  ▼
FastAPI Backend  (port 8000)
  │
  │  Returns JSON response
  ▼
TaskService Observable
  │
  │  Emits the typed response data
  ▼
Component .subscribe() callback
  │
  │  Updates component state (this.tasks = ...)
  │  Calls this.cdr.detectChanges()  ← required in Angular 19+ (see section 8)
  ▼
Angular re-renders template with new data
  │
  ▼
Updated UI visible to user
```

---

## 5. File-by-File Breakdown

### Entry Point — `main.ts` + `app.config.ts` + `app.html`

Angular's `main.ts` (auto-generated, rarely touched) calls `bootstrapApplication(App, appConfig)` — this boots the Angular application with the root `App` component and the providers defined in `app.config.ts`.

---

### `app.ts`

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
```

The root component is intentionally empty — it only renders `<router-outlet />`. This is a placeholder that Angular Router replaces with whichever component matches the current URL. All real UI lives in the page components.

---

### `app.config.ts`

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
  ]
};
```

This is where **app-wide providers** are registered:

- `provideRouter(routes)` — activates the Angular Router with the route definitions from `app.routes.ts`
- `provideHttpClient()` — registers Angular's `HttpClient` for use via dependency injection. Without this, injecting `HttpClient` into `TaskService` would throw a runtime error.
- `provideBrowserGlobalErrorListeners()` — hooks into browser global error events for better error reporting

---

### `app.routes.ts`

```typescript
export const routes: Routes = [
  { path: '',        component: TaskListComponent },
  { path: 'create',  component: TaskFormComponent },
  { path: 'edit/:id', component: TaskFormComponent },
  { path: '**',      redirectTo: '' },
];
```

Four route rules:

| Pattern | Component | Notes |
|---------|-----------|-------|
| `''` (root) | `TaskListComponent` | Task list page |
| `'create'` | `TaskFormComponent` | Form in "create" mode |
| `'edit/:id'` | `TaskFormComponent` | Same form, "edit" mode — `:id` is a dynamic segment read via `ActivatedRoute` |
| `'**'` | redirect to `''` | Catch-all — unknown URLs fall back to the task list |

Note that `TaskFormComponent` is reused for both create and edit. The component detects which mode it is in by checking whether `route.snapshot.paramMap.get('id')` returns a value.

---

### `models/task.model.ts`

```typescript
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task { ... }          // shape of a response from the API
export interface TaskCreate { ... }    // shape of a POST request body
export interface TaskUpdate { ... }    // shape of a PUT request body (all optional)
```

Three separate types — each matching the corresponding Pydantic model on the backend:

| Frontend type | Backend Pydantic model | Used for |
|--------------|----------------------|---------|
| `Task` | `TaskResponse` | Typing API responses, component state |
| `TaskCreate` | `TaskCreate` | Typing the POST body in `TaskService.create()` |
| `TaskUpdate` | `TaskUpdate` | Typing the PUT body in `TaskService.update()` |

`TaskStatus` is a **union type** — TypeScript will error at compile time if you try to assign any string that isn't one of the three valid values. This mirrors the `Literal` constraint on the backend and catches typos early.

---

### `services/task.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = '/api/tasks';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Task[]>             { return this.http.get<Task[]>(this.base); }
  getOne(id: string): Observable<Task>     { return this.http.get<Task>(`${this.base}/${id}`); }
  create(task: TaskCreate): Observable<Task> { return this.http.post<Task>(this.base, task); }
  update(id: string, task: TaskUpdate): Observable<Task> { return this.http.put<Task>(...); }
  delete(id: string): Observable<void>     { return this.http.delete<void>(...); }
}
```

`TaskService` is a **singleton service** (due to `providedIn: 'root'`) — Angular creates one instance and injects the same instance into every component that asks for it.

Key design decisions:
- **Relative URL `/api/tasks`** — no hardcoded `localhost:8000`. The dev server proxy rewrites this at the network level (see section 7). In production, the backend would be served from the same domain, making this work without any code changes.
- **Returns `Observable`** — Angular's `HttpClient` is RxJS-based. Observables are lazy — the HTTP request is **not sent** until someone calls `.subscribe()` on the returned Observable. The component is responsible for subscribing.
- **No error handling here** — errors flow through the Observable's error channel to the component's `.subscribe({ error: ... })` handler. Centralised error handling (e.g., an HTTP interceptor) can be added later without changing service code.

---

### `components/task-list/task-list.component.ts`

This is the **task list page** — the default view at `/`.

**State properties:**
```typescript
tasks: Task[] = [];   // array of all tasks from the API
loading = true;       // controls "Loading tasks..." spinner
errorMsg = '';        // shown if the API call fails
```

**Lifecycle:**
1. `ngOnInit()` fires when Angular mounts this component
2. Calls `loadTasks()` → calls `taskService.getAll()` → subscribes
3. On success: stores tasks in `this.tasks`, sets `loading = false`, calls `cdr.detectChanges()`
4. On error: stores the error message in `errorMsg`, sets `loading = false`

**`deleteTask(id)`:**
1. Shows a browser `confirm()` dialog — user must confirm before deletion
2. Calls `taskService.delete(id)` → subscribes
3. On success: filters the deleted task out of `this.tasks` **locally** (no full re-fetch needed) — this is an optimistic UI update

**`statusClass(status)`:**
A pure helper that maps a status string to Tailwind CSS class names for the badge colour:
```
'todo'        → grey badge
'in-progress' → yellow badge
'done'        → green badge
```

**Template highlights:**
- `*ngIf="loading"` — shows spinner while fetching
- `*ngIf="errorMsg"` — shows error message in red if fetch failed
- `*ngFor="let task of tasks"` — renders one card per task
- `[class]="statusClass(task.status)"` — dynamic class binding for the status badge
- `{{ task.created_at | date:'medium' }}` — Angular's `date` pipe formats the ISO string

---

### `components/task-form/task-form.component.ts`

This is a **shared form component** used for both creating and editing tasks. The same component handles two modes:

| Mode | URL | Behaviour |
|------|-----|-----------|
| Create | `/create` | Empty form, calls `taskService.create()` on submit |
| Edit | `/edit/:id` | Pre-fills form with existing task data, calls `taskService.update()` on submit |

**Mode detection in `ngOnInit()`:**
```typescript
this.taskId = this.route.snapshot.paramMap.get('id');
this.isEditMode = !!this.taskId;
```
If `taskId` is non-null, the component is in edit mode and immediately fetches the existing task to pre-fill the form fields. If the fetch fails (invalid ID, deleted task), it redirects to `/`.

**Form fields (plain class properties, bound with `[(ngModel)]`):**
```typescript
title = '';
description = '';
status: TaskStatus = 'todo';
```
Template-driven forms (`FormsModule` + `[(ngModel)]`) are used here — straightforward two-way binding suitable for a simple form.

**`onSubmit()`:**
1. Guards against empty title
2. Builds the payload object
3. Decides which service method to call based on `isEditMode`
4. On success: navigates to `/` (task list)
5. On error: re-enables the submit button

**`submitting` flag:**
Set to `true` when the request is in flight. The submit button is `[disabled]="submitting || !title.trim()"` — this prevents duplicate submissions while the request is pending.

---

## 6. Styling — Tailwind CSS v4

This project uses **Tailwind CSS v4**, which is meaningfully different from v3.

### How it's configured

**`src/styles.css`**
```css
@import "tailwindcss";
```
One line. This replaces the v3 `@tailwind base; @tailwind components; @tailwind utilities;` directives.

**`postcss.config.mjs`**
```js
export default {
  plugins: { "@tailwindcss/postcss": {} }
};
```
Tailwind v4 runs entirely as a PostCSS plugin. There is **no `tailwind.config.js`** — content detection and configuration are handled automatically or via CSS custom properties.

### How styling works in components

All styling is **inline in HTML templates** using Tailwind utility classes. There are no separate `.css` files per component. For example:

```html
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start justify-between hover:shadow-md transition">
```

This is intentional — co-locating styles with structure makes components self-contained.

### Common patterns used

| Pattern | Classes | What it does |
|---------|---------|---|
| Page container | `min-h-screen bg-gray-50` | Full-height grey background |
| Content width limit | `max-w-4xl mx-auto px-4 py-8` | Centred, padded content column |
| Card | `bg-white rounded-xl shadow-sm border border-gray-100 p-5` | White card with subtle border and shadow |
| Primary button | `bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition` | Blue button with hover state |
| Status badge | `text-xs font-medium px-2.5 py-0.5 rounded-full` + colour classes | Pill-shaped badge |

---

## 7. API Proxy

During development, Angular's dev server runs on port `4200` and the FastAPI backend runs on port `8000`. Without a proxy, the browser would block requests from `4200` to `8000` due to **CORS** (Cross-Origin Resource Sharing) restrictions.

To avoid this, `proxy.conf.json` tells the Angular dev server to forward matching requests:

```json
{
  "/api": {
    "target": "http://localhost:8000",
    "secure": false
  }
}
```

This means any request to `/api/tasks` from the Angular app is transparently rewritten to `http://localhost:8000/api/tasks` **at the network level** before it ever leaves the machine. The browser never sees a cross-origin request.

`angular.json` wires this up:
```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

**In production:** the Angular app would typically be deployed behind the same reverse proxy (nginx, etc.) as the backend, so `/api` would naturally route to the backend without any proxy config needed.

---

## 8. Change Detection — Important Angular 19+ Gotcha

Angular 19 introduced **zoneless change detection** as the default. In earlier Angular versions, a library called `zone.js` monkey-patched every browser async API (setTimeout, Promise, fetch, etc.) and notified Angular after each one completed, triggering automatic UI re-renders.

In Angular 19+, **zone.js is no longer active by default**. This means Angular does not automatically know when an async operation (like an HTTP response) has completed. If you don't tell it, the UI will not update even though the data has changed.

**The fix used in this project:** inject `ChangeDetectorRef` into every component that does async work and call `this.cdr.detectChanges()` after updating state:

```typescript
constructor(private cdr: ChangeDetectorRef) {}

this.taskService.getAll().subscribe({
  next: (tasks) => {
    this.tasks = tasks;       // update state
    this.loading = false;
    this.cdr.detectChanges(); // ← tell Angular to re-render NOW
  }
});
```

**This is required in every async callback** inside components — `next`, `error`, and anywhere you mutate component state after an async operation.

If you add a new component that uses `TaskService` and forget to call `cdr.detectChanges()`, you will see stale or blank UI — even though the data arrived correctly. This is the most common bug in this codebase for anyone unfamiliar with zoneless Angular.

---

## 9. Pages & Routing Reference

| URL | Component | Mode | What happens |
|-----|-----------|------|-------------|
| `/` | `TaskListComponent` | - | Fetches and displays all tasks on mount |
| `/create` | `TaskFormComponent` | create | Empty form; POST to `/api/tasks` on submit |
| `/edit/:id` | `TaskFormComponent` | edit | Fetches task by `:id`; pre-fills form; PUT on submit |
| `/*` (any unknown) | — | — | Redirected to `/` |

Navigation is done via Angular Router — no full page reloads:
- `routerLink="/create"` — declarative navigation in templates
- `this.router.navigate(['/'])` — programmatic navigation in component code

---

## 10. Local Development Setup

### Prerequisites
- Node.js 18+ (includes npm) — https://nodejs.org
- Angular CLI: `npm install -g @angular/cli`
- Backend running at `http://localhost:8000` (see `../backend/README.md`)

### Steps

```bash
# 1. Navigate to this folder
cd frontend

# 2. Install all npm dependencies (reads package.json)
npm install

# 3. Start the dev server
ng serve
```

App is available at `http://localhost:4200`. The dev server watches for file changes and hot-reloads automatically — you rarely need to restart it.

### Verify the backend is reachable

Open `http://localhost:4200` — if the task list shows "Loading tasks..." forever, the backend is not running or the proxy is not working. Check:

1. Is the backend running? → `http://localhost:8000/docs` should open
2. Is MongoDB running? → `sc query MongoDB` in PowerShell

---

## 11. Building for Production

```bash
npm run build
```

Output goes to `dist/frontend/browser/`. These are static files (HTML, CSS, JS) that can be served by any static file server (nginx, Apache, Vercel, Netlify, etc.).

For production, configure your server to redirect all routes to `index.html` so Angular's router handles them client-side (standard SPA deployment pattern).

---

## 12. Testing

> There are no automated tests in the codebase yet. This section documents the conventions to follow when we add them.

### Manual Testing
Open `http://localhost:4200` with the backend running and walk through the UI:
1. Create a task → it appears in the list
2. Edit a task → changes are reflected immediately
3. Delete a task → it disappears from the list

### Writing Automated Tests

Angular's default test runner is **Karma + Jasmine** (included via `@angular/cli`). Run with:
```bash
ng test
```

**Unit testing a component:**
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../services/task.service';
import { of } from 'rxjs';

it('should display tasks returned by TaskService', () => {
  const mockService = { getAll: () => of([{ id: '1', title: 'Test', ... }]) };
  TestBed.configureTestingModule({
    imports: [TaskListComponent],
    providers: [{ provide: TaskService, useValue: mockService }]
  });
  const fixture = TestBed.createComponent(TaskListComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement;
  expect(el.textContent).toContain('Test');
});
```

**What to test:**
- `TaskListComponent` — renders tasks, shows loading state, handles empty list, delete calls service
- `TaskFormComponent` — create mode renders empty form, edit mode pre-fills fields, submit calls correct service method
- `TaskService` — each method sends the correct HTTP verb and URL (use `HttpClientTestingModule`)

---

## 13. How to Add a New Feature

### Example: Add a `priority` field to the form

**Step 1 — Update `models/task.model.ts`**
```typescript
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  ...
  priority: TaskPriority;
}
export interface TaskCreate {
  ...
  priority: TaskPriority;
}
```

**Step 2 — Add form state to `TaskFormComponent`**
```typescript
priority: TaskPriority = 'medium';
```

**Step 3 — Add the `<select>` to the form template**
```html
<select [(ngModel)]="priority" name="priority" class="...">
  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
</select>
```

**Step 4 — Include `priority` in the submit payload**
```typescript
const payload = { title: this.title.trim(), description: this.description.trim(), status: this.status, priority: this.priority };
```

**Step 5 — Display `priority` in `TaskListComponent`** — add a badge similar to the status badge using `statusClass`-style logic.

---

### Example: Add a new page (e.g., a task detail view)

1. Create `components/task-detail/task-detail.component.ts` (standalone component)
2. Add a route in `app.routes.ts`: `{ path: 'tasks/:id', component: TaskDetailComponent }`
3. Inject `ActivatedRoute` to read `:id` and `TaskService` to fetch the task
4. Remember to call `cdr.detectChanges()` after the fetch completes (see section 8)
