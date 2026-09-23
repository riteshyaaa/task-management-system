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

```
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │     User     │1       *│   UserRole   │*       1│     Role     │
 │ (Auth/Status)├─────────┤ (Assign Map) ├─────────┤(ADMIN/MEMBER)│
 └──────┬───────┘         └──────────────┘         └──────┬───────┘
        │1                                                │1
        │*                                                │*
 ┌──────▼───────┐         ┌──────────────┐         ┌──────▼───────┐
 │ RefreshToken │         │ ClientMember │*       1│PermissionGate│
 │ (SHA-256 Hsh)│         │ (ADMIN/MEMBR)├─────────┤ (Granular)   │
 └──────────────┘         └──────▲───────┘         └──────────────┘
                                 │*
                                 │1
 ┌──────────────┐         ┌──────┴───────┐         ┌──────────────┐
 │    Client    │1       *│     Task     │1       *│   Subtask    │
 │ (Workspace)  ├─────────┤(OCC Version, ├─────────┤ (Checklist)  │
 └──────┬───────┘         │ Priority/St) │         └──────────────┘
        │1                └──────┬───────┘
        │*                       │1
 ┌──────▼───────┐                │*
 │  Engagement  │         ┌──────▼───────┐         ┌──────────────┐
 │(Comp. Unique)│         │   AuditLog   │         │ TaskHistory  │
 └──────┬───────┘         │(JSONB Diffs) │         │ (Transitions)│
        │1                └──────────────┘         └──────────────┘
        │*
 ┌──────▼───────┐         ┌──────────────┐         ┌──────────────┐
 │  WorkflowDef │1       *│ WorkflowState│1       *│WorkflowTrans │
 │(4-State DAG) ├─────────┤(Init/Termnl) ├─────────┤(Role Guards) │
 └──────────────┘         └──────────────┘         └──────────────┘
```

### Core Entities & Relationships
- **Users & Auth**: `User` stores account profiles and authentication state. `Role` and `UserRole` assign global permissions. `RefreshToken` tracks active sessions with hashed tokens.
- **Client Workspaces**: `Client` represents individual client accounts/workspaces. `ClientMember` associates users with clients and determines their workspace-level access.
- **Engagements & Service Types**: `ServiceType` defines offerings per client. `Engagement` tracks active agreements, deliverables, target dates, and assigned managers.
- **Tasks & Subtasks**: `Task` holds core task attributes (status, priority, due date, assignee, client association, and version number for optimistic concurrency). `Subtask` tracks smaller checklist items.
- **Workflow State Machine**: `WorkflowDefinition` holds configured workflows. `WorkflowState`, `WorkflowTransition`, and `WorkflowCondition` define allowed status transitions, review requirements, and role gates.
- **Recurrence Engine**: `RecurrenceRule`, `RecurrenceWeeklyDay`, and `RecurrenceMonthlyConfig` define schedule patterns. `RecurringTaskInstance` records each generated task instance to prevent duplicates.
- **Audit Logging**: `AuditLog` captures user actions, storing previous and updated values in JSONB format for change tracking.

### Key Database Constraints & Indexes
1. **Duplicate Engagement Prevention**:
   `@@unique([clientId, serviceTypeId, periodStart, periodEnd])` ensures that identical client engagements for the same service type and date range cannot be created twice.
2. **Optimistic Concurrency Control**:
   `Task.version` is incremented on every update (`WHERE id = :id AND version = :version`) to safely detect and reject conflicting concurrent writes.
3. **Targeted Indexes**:
   - `Task`: Compound index on `[clientId, status, priority]` for board filtering and dashboard summaries.
   - `Task`: Index on `[assigneeId, status]` for quick "My Tasks" queries.
   - `RefreshToken`: Index on `[userId, expiresAt, isRevoked]` for fast token validation and cleanup.
   - `AuditLog`: Index on `[clientId, entityType, entityId]` for activity history queries.

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

$$\text{NOT\_STARTED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{READY\_FOR\_REVIEW} \longrightarrow \text{COMPLETED}$$

- **State Transition Rules**:
  - Tasks must follow allowed transitions defined in the workflow configuration. Direct skips (e.g., `NOT_STARTED` straight to `COMPLETED`) are rejected.
  - If review feedback requires revisions, managers can move a task back from `READY_FOR_REVIEW` to `IN_PROGRESS`.
- **Review Guards**:
  - Moving from `READY_FOR_REVIEW` to `COMPLETED` requires an `ADMIN` or `MANAGER` role.
  - **Anti-Self-Approval**: Assignees cannot approve their own work (`assigneeId !== currentUserId`).
- **Transition History**: Each state change is recorded with timestamps, acting user, and optional reviewer notes.

---

## 7. Automated Test Coverage

The test suite includes **82 tests** across 9 unit and integration test suites:

| Test Suite | Type | Key Areas Tested |
|---|---|---|
| `tasks.api.test.ts` | Integration | Task CRUD, Kanban queries, optimistic concurrency conflicts, role guards |
| `engagement-system.test.ts` | Integration | Engagement creation, composite uniqueness constraints, anti-self-approval |
| `auth.api.test.ts` | Integration | Registration, login, token rotation, token family invalidation |
| `health.api.test.ts` | Integration | Uptime checks, version endpoint, 404 handler |
| `recurrence-calculator.test.ts` | Unit | Daily, weekly, monthly date math, leap year clamping, cron expressions |
| `workflow-validator.test.ts` | Unit | Workflow graph validation, start/end states, cycle detection |
| `workflow-engine.test.ts` | Unit | State transition logic, role requirement checks, subtask completion gates |
| `streak-calculator.test.ts` | Unit | Daily streak calculation, same-day activity idempotency, streak resets |
| `error-handler.test.ts` | Unit | Error formatting, validation errors, database constraint mapping |

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
   - *Choice*: Used OCC with an integer `version` field.
   - *Reason*: Avoids holding locks open during client interactions or network latency, keeping database operations fast and preventing lock contention.
2. **Database-Backed Workflow Rules vs. Hardcoded Status Enum**:
   - *Choice*: Stored workflow states and transition rules in relational tables.
   - *Reason*: Allows workflows and review policies to be configured per client without requiring code changes or service redeployment.
3. **In-Process Scheduler vs. Heavy External Queue**:
   - *Choice*: Implemented a clean, transaction-safe in-process poller for recurring schedules.
   - *Reason*: Keeps development and deployment simple with zero extra infrastructure requirements, while isolating the logic cleanly so it can easily plug into an external message queue if needed.
