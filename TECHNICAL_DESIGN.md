# Technical Design Note: Professional Services Engagement & Task Management Platform

**Document Version:** 1.1.0  
**Target Architecture:** Node.js 18+ (Express / TypeScript), PostgreSQL 15, React 18 (Vite / TailwindCSS), Docker  

---

## 1. System Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           React 18 + Vite + TailwindCSS SPA                       │
│     (Client Context, Role-Aware UI, Kanban Board, Workflows, Engagement Dashboard) │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ HTTPS (REST API)
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 Nginx Reverse Proxy                               │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ /api/v1/*
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      Node.js Express + TypeScript REST API                        │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ Security & Auth Middleware: Helmet, CORS, RateLimit, JWT Verify, RBAC / ABAC  │ │
│ ├───────────────────────────────────────────────────────────────────────────────┤ │
│ │ Zod Validation Middleware ──> Domain Controllers ──> Domain Services          │ │
│ ├───────────────────────────────────────────────────────────────────────────────┤ │
│ │ Recurrence Engine (Cron Worker) │ DAG State Machine │ Audit Log Interceptor   │ │
│ └───────────────────────────────────────┬───────────────────────────────────────┘ │
└─────────────────────────────────────────┼─────────────────────────────────────────┘
                                          │ Prisma ORM (Connection Pool)
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL 15 Relational Database                        │
│    (30 Relational Tables, Composite Indexes, Unique Constraints, JSONB Diffs)     │
└───────────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: Single Page Application built with React 18, TypeScript, and TailwindCSS. Uses React Context (`AuthContext`, `ClientContext`, `ToastContext`) for global state management, role-aware component rendering, and responsive data displays.
- **Backend**: Layered REST API built on Express and TypeScript. Encapsulates business logic within decoupled domain modules (`auth`, `clients`, `engagements`, `tasks`, `workflows`, `dashboard`, `recurrence`).
- **Database**: PostgreSQL 15 with Prisma ORM providing compile-time type safety, automated migrations, foreign key cascades, and connection pooling.
- **Authentication**: Dual-token architecture using 15-minute stateless JWT access tokens and 7-day cryptographic refresh tokens stored with SHA-256 hashes in PostgreSQL.
- **Deployment**: Containerized using multi-stage Docker builds orchestrating Frontend (Nginx), Backend (Node.js Alpine), and PostgreSQL via `docker-compose.yml`.

---

## 2. Database Schema & Entity Relationship Model

<img width="1536" height="1024" alt="ERD_diagram" src="https://github.com/user-attachments/assets/c091a0e7-06b5-41c8-b13c-26a516145306" />



### Core Entities

- **Users & Access Control**: `User`, `Role`, `UserRole`, and `Permission` manage users, roles, and server-side permissions. `RefreshToken` stores hashed refresh tokens for session management.
- **Client Workspaces**: `Client` and `ClientMember` provide workspace-level organization and membership/role control.
- **Services & Engagements**: `ServiceType` defines the type of professional service, while `Engagement` connects a client to a service, manager, status, and service period.
- **Tasks & Subtasks**: `Task` stores work items, assignments, status, priority, deadlines, and engagement relationships. `Subtask` supports checklist-style work items.
- **Workflows**: `WorkflowDefinition`, `WorkflowState`, and `WorkflowTransition` define configurable task state transitions and role-based review rules.
- **Templates & Recurrence**: `TaskTemplate` and `TemplateItem` define reusable task structures. `RecurrenceRule` defines recurring schedules, while `RecurringTaskInstance` tracks each scheduled occurrence and its generated task.
- **Audit & History**: `AuditLog` and workflow history records provide traceability for important changes and state transitions.

### Key Constraints & Indexes

- **No Duplicate Engagements**: A unique constraint on `(clientId, serviceTypeId, periodStart, periodEnd)` prevents duplicate engagements for the same client, service, and period.
- **Safe Concurrent Edits**: `Task.version` supports optimistic concurrency control so conflicting updates can be detected instead of silently overwriting changes.
- **Unique Workspace Membership**: `(clientId, userId)` is unique in `ClientMember`, preventing the same user from being added to a client workspace more than once.
- **Fast Task Queries**: Indexes on `(clientId, status, position)`, `(assigneeId, status)`, `engagementId`, and `dueDate` support common task-board, assignment, engagement, and deadline queries.
- **Referential Integrity**: Foreign-key relationships maintain consistency between clients, engagements, tasks, templates, recurrence rules, and workflow records.

---

## 3. Backend Architecture & Request Flow

```
HTTP Request ──> Route ──> Validation (Zod) ──> Controller ──> Service Layer ──> Prisma ORM ──> PostgreSQL
                                                                     │
                                                           Throws AppError
                                                                     │
                                                                     ▼
                                                        Central Error Middleware ──> JSON Response
```

- **Layered Structure**:
  - **Routes & Middleware**: Handle request routing, rate limiting, authentication checks, workspace authorization, and input validation.
  - **Controllers**: Parse request params, pass data to services, and format HTTP responses.
  - **Services**: Contain the core business rules, transactional logic, and audit logging.
  - **Data Access**: Prisma ORM manages queries, relationships, migrations, and database connection pooling.
- **Input Validation**: Request bodies and query parameters are validated using Zod schemas before hitting controllers. Invalid inputs return clear, structured 400 error messages.
- **Error Handling**: Custom `AppError` classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) are caught by a central error middleware, returning standard error payloads with meaningful messages.

---

## 4. Authentication & Access Control

- **Token Management**:
  - **Access Token**: Short-lived (15 minutes) JWT containing basic user info (`userId`, `email`, roles) for fast stateless verification.
  - **Refresh Token**: Long-lived (7 days) random string stored securely in PostgreSQL as a SHA-256 hash.
  - **Rotation**: Refreshing tokens issues a new access/refresh pair and revokes the old refresh token to prevent replay.
- **Role Permissions**:
  - **Admin**: Full access across all workspaces, user management, task deletion, and deliverable approvals.
  - **Manager**: Manages client engagements, creates and assigns tasks, reviews deliverables, and approves transitions to `COMPLETED`.
  - **Member**: Works on assigned tasks, updates progress, and submits items for review (`IN_PROGRESS` → `READY_FOR_REVIEW`). Cannot create members, delete tasks, or approve their own deliverables.
- **Workspace Scoping**: The client middleware checks that the authenticated user belongs to the target workspace (`clientId`) before granting access to workspace data.

---

## 5. Recurring Task Engine

```
Cron Poller (Every 60s) ──> Query Due Rules (nextOccurrence <= NOW()) ──> Database Transaction
                                                                                  │
                                                        ┌─────────────────────────┴─────────────────────────┐
                                                        ▼                                                   ▼
                                            Create Task from Template                           Update nextOccurrence Date
                                                        │                                                   │
                                                        └─────────────────────────┬─────────────────────────┘
                                                                                  ▼
                                                                      Save Instance Record
```

- **Schedule Processing**: A lightweight interval runner checks for active recurrence rules where `nextOccurrence <= NOW()`.
- **Interval Calculations**: Supports Daily intervals, Weekly schedules (specific days of the week), Monthly dates (with end-of-month clamping), and standard 5-field Cron expressions.
- **Duplicate Prevention**: Before creating a task, the engine checks `RecurringTaskInstance` for that rule and scheduled date, ensuring runs are idempotent.
- **Transactional Safety**: Task creation and schedule date advancement run inside a database transaction (`prisma.$transaction`). If an error occurs, changes roll back cleanly and can retry on the next cycle.

---

## 6. Review Workflow & State Machine

The workflow uses a 4-state progression designed for structured quality checks:

```
NOT_STARTED ──> IN_PROGRESS ──> READY_FOR_REVIEW ──> COMPLETED
```

- **State Transition Rules**:
  - Tasks must follow allowed transitions defined in the workflow configuration. Direct skips (e.g., `NOT_STARTED` straight to `COMPLETED`) are rejected.
  - If review feedback requires revisions, managers can move a task back from `READY_FOR_REVIEW` to `IN_PROGRESS`.
- **Review Guards**:
  - Moving from `READY_FOR_REVIEW` to `COMPLETED` requires an `ADMIN` or `MANAGER` role.
  - **Anti-Self-Approval**: Assignees cannot approve their own work (`assigneeId !== currentUserId`).
- **Transition History**: Each state change is recorded with timestamps, acting user, and optional reviewer notes.

---

## 7. Automated Test Coverage

The test suite includes **82 automated tests** across unit and integration test suites:

| Category | Type | Key Areas Tested |
|---|---|---|
| **Authentication & Access Control** | Integration | User login, JWT access/refresh token rotation, role permissions, workspace isolation |
| **Tasks & Concurrency** | Integration | Task CRUD, Kanban queries, optimistic concurrency conflicts (`version` checks) |
| **Engagements & Clients** | Integration | Client workspaces, duplicate engagement prevention, anti-self-approval |
| **Workflow State Machine** | Unit | Graph validation, 4-state review transitions, role approval gates |
| **Recurrence Scheduler** | Unit | Daily, weekly, monthly schedule calculations, leap-year handling, duplicate prevention |
| **System & Error Handling** | Unit / Integration | Service health checks, RFC 7807 error responses, input validation |

---

## 8. Scalability & Operational Considerations

When scaling the application to handle higher volumes of tasks and concurrent users:

1. **Database Indexing & Partitioning**:
   - Maintain targeted compound indexes for active tasks by client and status.
   - For very large datasets, range-partition historical tasks and audit logs by date (`created_at`) to keep active working tables compact.
2. **Pagination Strategy**:
   - Use cursor-based pagination (`WHERE (created_at, id) < (:cursorDate, :cursorId)`) on high-volume endpoints to ensure consistent query performance regardless of page depth.
3. **Background Job Queue**:
   - For multi-instance horizontal deployments, transition the in-process cron worker to a distributed queue like BullMQ (backed by Redis) with job locking and retries.
4. **Caching & Aggregations**:
   - Cache frequently read, rarely changed data (such as workflow definitions and client metadata) in Redis.
   - Use materialized views or periodically computed summary tables for heavy dashboard reporting metrics.
5. **Monitoring & Observability**:
   - Standardize JSON application logs for log aggregators.
   - Track key health metrics: API response times, database query durations, and connection pool utilization.

---

## 9. Key Engineering Trade-offs

1. **Optimistic Concurrency Control (OCC) vs. Database Row Locks**:
   - **Choice**: Use a simple `version` number on task records instead of locking database rows.
   - **Reason**: Avoids holding database locks open while a user is typing or on slow connections, keeping queries fast while safely catching and rejecting conflicting simultaneous edits.

2. **Database-Driven Workflow Rules vs. Hardcoded Status Enums**:
   - **Choice**: Store workflow states, transitions, and approval rules in database tables.
   - **Reason**: Allows different client workspaces to configure custom review steps and role rules without requiring backend code changes or redeployments.

3. **In-Process Scheduler vs. Heavy External Queue**:
   - **Choice**: Run a clean, transaction-safe background interval worker for recurring tasks.
   - **Reason**: Keeps local setup and single-server deployment simple with zero extra infrastructure (no extra Redis or queue servers needed), while organizing the logic modularly so it can easily move to a distributed queue when needed.

4. **Dual-Token Authentication vs. Server-Side Session Storage**:
   - **Choice**: Combine short-lived (15 min) JWT access tokens with long-lived (7 day) hashed refresh tokens stored in the database.
   - **Reason**: Lets API routes verify user requests quickly without querying the database every time, while still keeping full control to revoke refresh tokens on logout or security events.
