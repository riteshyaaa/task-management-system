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

### Main Entities & Foreign Key Relationships
- **User & Authentication**: `User` (PK `id`), `Role`, `UserRole` (FK `userId`, `roleId`), `RefreshToken` (FK `userId`).
- **Client Workspaces**: `Client` (PK `id`), `ClientMember` (FK `clientId`, `userId`).
- **Service Types & Engagements**: `ServiceType` (FK `clientId`), `Engagement` (FK `clientId`, `serviceTypeId`, `managerId`).
- **Tasks & Subtasks**: `Task` (FK `clientId`, `engagementId`, `reporterId`, `assigneeId`, `parentTaskId`), `Subtask` (FK `taskId`).
- **Workflow State Machine**: `WorkflowDefinition` (FK `clientId`), `WorkflowState` (FK `workflowId`), `WorkflowTransition` (FK `workflowId`, `fromStateId`, `toStateId`), `WorkflowCondition` (FK `transitionId`), `WorkflowAssignment` (FK `taskId`, `workflowId`, `currentStateId`).
- **Recurrence Engine**: `RecurrenceRule` (FK `taskTemplateId`), `RecurrenceWeeklyDay`, `RecurrenceMonthlyConfig`, `RecurringTaskInstance` (FK `ruleId`, `generatedTaskId`).
- **Audit Logging**: `AuditLog` (FK `userId`, `clientId`, stores `oldValues`/`newValues` as JSONB).

### Critical Constraints & Indexes
1. **Engagement Composite Uniqueness**:
   `@@unique([clientId, serviceTypeId, periodStart, periodEnd])` prevents duplicate client engagements across matching date ranges.
2. **Optimistic Concurrency Control**:
   `Task.version` integer column increments on every mutation (`WHERE id = :id AND version = :version`).
3. **Compound B-Tree Indexes**:
   - `Task`: `@@index([clientId, status, priority])` for sub-millisecond Kanban board queries.
   - `Task`: `@@index([assigneeId, status])` for fast "Assigned to Me" filtering.
   - `RefreshToken`: `@@index([userId, expiresAt, isRevoked])` for token validation pipelines.
   - `AuditLog`: GIN index on `changedFields` JSONB for audit inspections.

---

## 3. Backend Design & Architecture

```
HTTP Request ──> Express Route ──> Validate Middleware (Zod) ──> Controller ──> Domain Service ──> Prisma ORM ──> PostgreSQL
                                                                                     │
                                                                           AppError / Exception
                                                                                     │
                                                                                     ▼
                                                                        Centralized Error Handler ──> RFC 7807 JSON Response
```

- **API & Service Structure**: Strict separation of concerns following Domain-Driven Design (DDD). Controllers handle HTTP routing, parameter extraction, and status codes. Services encapsulate transactional business logic, entity orchestration, and audit recording.
- **Validation Pipeline**: Request boundaries are protected by Zod schemas executed via `validate()` middleware. Inputs are sanitized, trimmed, and transformed (e.g., date formats, optional UUIDs, empty string normalization) before reaching controllers.
- **Business Logic Placement**: Resides entirely in domain services (`EngagementService`, `TaskService`, `WorkflowEngine`, `RecurrenceService`, `AuthService`). Controllers and database models remain lean.
- **Centralized Error Handling**: Intercepts custom `AppError` subclasses (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) and translates Prisma exceptions (e.g., `P2002` uniqueness, `P2025` record not found) into structured RFC 7807 problem responses with correlation IDs.

---

## 4. Authentication & Authorization (RBAC / ABAC)

- **Dual-Token Lifecycle**:
  - **Access Token**: Stateless RS256/HS256 signed JWT (15-minute expiration) bearing `userId`, `email`, and system `roles`.
  - **Refresh Token**: 7-day cryptographically random string hashed with SHA-256 in the database.
  - **Reuse Detection**: Rotating a refresh token revokes the previous token and creates a new one in the same token family. If a revoked token is replayed, the entire token family is immediately revoked.
- **Backend Role Enforcement**:
  - **Global RBAC**: Express middleware `requireRole('ADMIN', 'MANAGER')` evaluates permissions attached to the verified JWT.
  - **Workspace ABAC**: `abac-client.middleware.ts` inspects route parameters (`:clientId`), querying `ClientMember` to enforce tenant isolation so users only interact with data belonging to their authorized workspace.
  - **Role Permissions**:
    - `ADMIN`: Full global control, workspace member creation/invitation, template/task deletion, deliverable approval.
    - `MANAGER`: Workspace management, engagement creation, deliverable review, approval, and task mutation.
    - `MEMBER`: Task execution, progressing assigned tasks from `IN_PROGRESS` to `READY_FOR_REVIEW`. Blocked from creating members, deleting tasks, or approving deliverables.

---

## 5. Recurring Task Generation & Scheduling

```
Cron Poller (Every 60s) ──> Query Active Rules (nextOccurrence <= NOW()) ──> Prisma $transaction
                                                                                    │
                                                          ┌─────────────────────────┴─────────────────────────┐
                                                          ▼                                                   ▼
                                              Spawn Task from Template                           Advance nextOccurrence Date
                                                          │                                                   │
                                                          └─────────────────────────┬─────────────────────────┘
                                                                                    ▼
                                                                Create Generated Instance Log
```

- **Generation Algorithm**: A background scheduler checks active `RecurrenceRule` records where `nextOccurrence <= NOW()`. `RecurrenceCalculator` computes exact target dates for Daily intervals, Weekly bitmask days, Monthly day-of-month (handling leap-year 28/29 day clamping), and 5-field Cron expressions.
- **Duplicate Prevention**: Every generation creates a `RecurringTaskInstance` record linked to the rule and timestamp. Before spawning, the service checks for existing instances for that scheduled date.
- **Idempotency on Re-Runs**: If the worker runs multiple times or overlaps, existence checks on `RecurringTaskInstance` and timestamp boundaries skip already-generated periods.
- **Transactional Failure Recovery**: Task generation and recurrence advancement execute inside atomic Prisma interactive transactions (`prisma.$transaction`). If any step fails, all changes roll back completely, allowing safe retries on the next polling cycle.

---

## 6. Workflow State Machine & Review Rules

The system implements a deterministic Directed Acyclic Graph (DAG) 4-state workflow:

$$\text{NOT\_STARTED} \xrightarrow{\text{Start Work}} \text{IN\_PROGRESS} \xrightarrow{\text{Submit for Review}} \text{READY\_FOR\_REVIEW} \xrightarrow[\text{Approve (Manager/Admin)}]{\text{Request Changes (Manager)}} \text{COMPLETED}$$

- **Valid Transition Enforcement**:
  - Transitions must follow edges explicitly registered in `WorkflowTransition`. Direct jumps from `NOT_STARTED` to `COMPLETED` are rejected with `400 Bad Request`.
- **Manager Review Guards**:
  - The `READY_FOR_REVIEW` $\rightarrow$ `COMPLETED` transition is protected by a `ROLE_CHECK` condition requiring `ADMIN` or `MANAGER` roles.
  - **Anti-Self-Approval**: Assignees cannot approve their own deliverables (`assigneeId !== currentUserId`).
- **Audit & History**: Every transition creates an immutable `WorkflowTransitionHistory` record capturing the prior state, target state, acting user, and reviewer comments.

---

## 7. Backend Test Suite

The backend contains **82 passing tests** across 9 automated test suites:

| Test Suite | Test Type | Coverage Areas |
|---|---|---|
| `tasks.api.test.ts` | Integration | Task CRUD, Kanban queries, OCC version conflict handling, RBAC gates |
| `engagement-system.test.ts` | Integration | Engagement creation, composite duplicate prevention, anti-self-approval |
| `auth.api.test.ts` | Integration | Registration, login, token rotation, reuse detection, token family revocation |
| `health.api.test.ts` | Integration | Service uptime, system versioning, unhandled route 404 responses |
| `recurrence-calculator.test.ts` | Unit | Daily, weekly bitmask, leap-year month clamping, Nth-weekday, Cron |
| `workflow-validator.test.ts` | Unit | DAG graph verification, initial/terminal state rules, cycle detection |
| `workflow-engine.test.ts` | Unit | Transition evaluation, `ROLE_CHECK`, subtask completion guards |
| `streak-calculator.test.ts` | Unit | Daily login streaks, same-day idempotency, inactivity resets |
| `error-handler.test.ts` | Unit | RFC 7807 error formatting, Zod validation errors, Prisma constraint mapping |

---

## 8. Production Considerations at Scale (5 Million Tasks)

1. **Database Indexing**:
   - Add **partial indexes** on active tasks: `CREATE INDEX idx_tasks_active ON tasks (client_id, status) WHERE status != 'COMPLETED'`.
   - Add **composite B-Tree indexes** on `(client_id, engagement_id, due_date)`.
   - Utilize PostgreSQL **declarative table partitioning** by `client_id` (hash) or `created_at` (range by year/quarter) to keep index working sets in RAM.
2. **Pagination**:
   - Replace `OFFSET / LIMIT` with **keyset (cursor-based) pagination**:  
     `WHERE client_id = :id AND (created_at, id) < (:cursorCreatedAt, :cursorId) ORDER BY created_at DESC, id DESC LIMIT 50`. Avoids $O(N)$ sequential table scans on deep offsets.
3. **Background Jobs & Worker Fleet**:
   - Decouple in-process `node-cron` into dedicated worker processes using **BullMQ with Redis** or **AWS SQS**.
   - Implement **distributed lock leasing** (Redlock) to prevent duplicate execution across horizontal worker instances.
   - Configure exponential backoff retry policies and Dead Letter Queues (DLQ) for failed task generation.
4. **Dashboard Queries & Analytics**:
   - Replace real-time aggregate table scans with **materialized views** refreshed concurrently (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) or maintain real-time counter caches in **Redis** with write-through invalidation on task state changes.
5. **Observability, Logging & Monitoring**:
   - Route structured JSON logs to OpenTelemetry / Elasticsearch / Datadog.
   - Implement Prometheus metrics exporting request duration histograms, active database connection pool usage, and scheduler queue lag.
   - Inject W3C `traceparent` headers for distributed tracing across microservices.

---

## 9. Key Technical Trade-offs & Decisions

1. **Optimistic Concurrency Control (OCC) vs. Pessimistic Row Locking**:
   - *Decision*: Implemented OCC using integer `version` columns.
   - *Rationale*: Avoids holding open database row locks during user think-time or network latency, maximizing database throughput and preventing deadlocks in high-concurrency environments.
2. **Database-Driven DAG State Machine vs. Hardcoded Status Enum**:
   - *Decision*: Built a configurable database-backed workflow graph with explicit transition rules and condition hooks.
   - *Rationale*: Enables multi-tenant customization and complex review policies per client workspace without requiring application redeployment or code modifications.
3. **Modular In-Process Scheduler vs. Heavy External Queue**:
   - *Decision*: Packaged recurrence engine using transactional database isolation and modular interfaces.
   - *Rationale*: Keeps local development and evaluation zero-dependency while maintaining strict atomicity, with clean service abstractions ready to swap into BullMQ/Redis for large-scale multi-node production deployment.
