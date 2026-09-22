# Enterprise Task Management & Workflow Automation System
## Technical Design Document & Architecture Specification

**Author:** DeepMind Advanced Agentic Coding / Enterprise Engineering Team  
**Date:** September 2026  
**Version:** 1.0.0-PROD  
**Target Environment:** Node.js 18+ LTS, PostgreSQL 15, React 18, Docker  

---

## 1. Executive Summary & System Overview

The **Enterprise Task Management & Workflow Automation System** is a distributed, multi-tenant task orchestration platform designed for high-concurrency engineering organizations. The system unifies project task tracking, customizable Directed Acyclic Graph (DAG) state machine workflows, trigger-condition-action event automations, multi-mode calendar recurrence scheduling, append-only regulatory audit logging, and developer gamification metrics into a cohesive, strictly-typed full-stack architecture.

### High-Level System Architecture Diagram

```
                              ┌────────────────────────────────────────────────────────┐
                              │               React 18 + Tailwind SPA                  │
                              │       (Kanban, DAG Designer, Audit, Metrics)           │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │ HTTPS / JSON / WSS
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │                    Nginx Reverse Proxy                 │
                              │                 (Port 80 / Port 3000)                  │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │ /api/v1/*
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             Node.js Express TypeScript API Server                                       │
│                                                                                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Security Middleware │  │  JWT Auth & RBAC     │  │  Client ABAC Tenancy │  │  RFC 7807 Centralized Error Handler │  │
│  │  (Helmet, RateLimit) │  │  (Dual-Token Engine) │  │  (Workspace Isolation│  │  (AppError & Zod Validation)        │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘  └──────────────────┬──────────────────┘  │
│             │                         │                         │                                 │                     │
│  ┌──────────▼─────────────────────────▼─────────────────────────▼─────────────────────────────────▼──────────────────┐  │
│  │                                             Domain-Driven Module Layer                                            │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │  │
│  │  │   Auth Module    │  │   Task Engine    │  │  DAG State Mach  │  │ Recurrence Engine│  │  Engagement & Metric│  │  │
│  │  │  (Token Rotation)│  │ (OCC Versioning) │  │ (Guards & Hooks) │  │ (Bitmask / Cron) │  │  (Streaks & Velocity│  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────────┘  │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │  │
│  │  │ Automation Rules │  │ Template Engine  │  │ Audit Trail Svc  │  │ Notification Svc │  │ Dashboard Aggregatr │  │  │
│  │  │ (Event Evaluator)│  │ (Var Interpolate)│  │ (JSONB Mutation) │  │ (Alert Pipeline) │  │ (Metric Pipelines)  │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘  │
│                                                        │                                                                │
│  ┌─────────────────────────────────────────────────────▼─────────────────────────────────────────────────────────────┐  │
│  │                     Prisma ORM Layer (Parameterized SQL Queries, Transaction Isolation, Connection Pool)          │  │
│  └─────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
                               ┌──────────────────────────────────────────────────┐
                               │           PostgreSQL 15 Relational DB            │
                               │  (30 Normalized Models, B-Tree & JSONB Indexes)  │
                               └──────────────────────────────────────────────────┘
```

---

## 2. Database Design & Relational Data Modeling

The underlying database schema consists of **30 interconnected models** engineered using Prisma ORM with strict referential integrity, foreign key cascades, and compound indexing for multi-tenant query performance.

### Core Entity Relationship Groups

```
 ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
 │        User          │1       *│      UserRole        │*       1│        Role          │
 │  (Auth, Status)      ├─────────┤  (Assignment Map)    ├─────────┤ (SUPER_ADMIN, etc.)  │
 └──────────┬───────────┘         └──────────────────────┘         └──────────┬───────────┘
            │1                                                                │1
            │*                                                                │*
 ┌──────────▼───────────┐         ┌──────────────────────┐         ┌──────────▼───────────┐
 │     RefreshToken     │         │     ClientMember     │*       1│    RolePermission    │
 │ (Cryptographic Hash) │         │ (OWNER, MAINTAINER)  ├─────────┤  (Granular Matrix)   │
 └──────────────────────┘         └──────────▲───────────┘         └──────────────────────┘
                                             │*
                                             │1
 ┌──────────────────────┐         ┌──────────┴───────────┐         ┌──────────────────────┐
 │     Workspace /      │1       *│        Task          │1       *│       Subtask        │
 │        Client        ├─────────┤ (OCC Version Column, ├─────────┤  (Hierarchy Tree)    │
 └──────────┬───────────┘         │  Priority, Status)   │         └──────────────────────┘
            │1                    └──────────┬───────────┘
            │*                               │1
 ┌──────────▼───────────┐                    │*
 │  WorkflowDefinition  │         ┌──────────▼───────────┐         ┌──────────────────────┐
 │ (DAG Pipeline Graph) │         │      AuditLog        │         │   TaskTransition     │
 └──────────┬───────────┘         │(Pre/Post JSONB Diffs)│         │       History        │
            │1                    └──────────────────────┘         └──────────────────────┘
            │*
 ┌──────────▼───────────┐
 │    WorkflowState     │1       *┌──────────────────────┐
 │  (Initial, Terminal) ├─────────┤  WorkflowTransition  │
 └──────────────────────┘         │ (Guards & Hooks)     │
                                  └──────────────────────┘
```

### Key Data Architecture Decisions
1. **Integer Version Column for Optimistic Concurrency Control (OCC)**:
   - The `Task` entity incorporates an integer `version` field (default `1`).
   - Every mutation checks `WHERE id = :id AND version = :version`, incrementing `version` atomically to `version + 1`.
2. **Append-Only JSONB Audit Trail**:
   - `AuditLog` stores `oldValues`, `newValues`, and `changedFields` as binary JSON (`jsonb`).
   - GIN indexing enables instant sub-millisecond filtering across arbitrarily nested property mutations.
3. **Compound Indexes**:
   - `@@index([clientId, status, priority])` on `Task` ensures performant Kanban filtering across millions of records.
   - `@@index([userId, expiresAt, isRevoked])` on `RefreshToken` accelerates token rotation and validation pipelines.

---

## 3. Security Architecture & Threat Model (STRIDE)

```
==================================================================================================
THREAT CATEGORY (STRIDE)  THREAT VECTOR MITIGATION IN SYSTEM ARCHITECTURE
==================================================================================================
Spoofing Identity         - Dual-token JWT (15-min RS256/HS256 access token + 7-day refresh token).
                          - Cryptographic SHA-256 hash validation for database refresh token lookup.
--------------------------------------------------------------------------------------------------
Tampering with Data       - Optimistic Concurrency Control (OCC) prevents race condition data overwrites.
                          - Parameterized Prisma queries eliminate SQL injection vectors.
                          - Immutable append-only audit trail captures all structural entity mutations.
--------------------------------------------------------------------------------------------------
Repudiation               - Comprehensive audit subsystem records actor ID, IP address, user agent,
                            timestamps, and exact pre/post JSONB mutation diffs for all writes.
--------------------------------------------------------------------------------------------------
Information Disclosure    - Workspace-level ABAC (`abac-client.middleware.ts`) isolates multi-tenant data.
                          - Passwords hashed using bcrypt with salt cost factor of 12.
                          - Sensitive token signatures never logged to Winston / Morgan output streams.
--------------------------------------------------------------------------------------------------
Denial of Service (DoS)   - Memory-store / Redis brute-force rate limiters on `/api/v1/auth/*`.
                          - Maximum payload size constraints on Express body parser.
                          - Pagination limits enforced across all listing endpoints (`limit <= 100`).
--------------------------------------------------------------------------------------------------
Elevation of Privilege    - Hybrid RBAC: Global role checks + granular permission gates (`tasks:create`).
                          - Workspace roles (`OWNER`, `MAINTAINER`, `MEMBER`) strictly partition access.
                          - Refresh token reuse detection revokes entire token family upon breach detection.
==================================================================================================
```

### Refresh Token Rotation & Token Family Revocation Lifecycle

```
Client (SPA)                      API Gateway / Auth Controller                  Database (PostgreSQL)
     │                                         │                                           │
     │ 1. POST /api/v1/auth/refresh            │                                           │
     │    { refreshToken: "RT_ABC_123" }       │                                           │
     │────────────────────────────────────────>│                                           │
     │                                         │ 2. Compute SHA-256 Hash                   │
     │                                         │    Find token record by hash              │
     │                                         │──────────────────────────────────────────>│
     │                                         │                                           │
     │                                         │ 3. CASE A: Valid Active Token             │
     │                                         │    - Revoke "RT_ABC_123"                  │
     │                                         │    - Generate "RT_DEF_456"                │
     │                                         │    - Issue new Access JWT (15m)           │
     │                                         │──────────────────────────────────────────>│
     │ 4. Return { accessToken, refreshToken } │                                           │
     │<────────────────────────────────────────│                                           │
     │                                         │                                           │
     │                                         │ 4. CASE B: Token ALREADY Revoked (REPLAY) │
     │                                         │    - Security Breach Alert!               │
     │                                         │    - Revoke ALL tokens in family          │
     │                                         │      matching userId session              │
     │                                         │──────────────────────────────────────────>│
     │ 5. Return 401 Unauthorized              │                                           │
     │    "Token reuse detected. Family revoked"                                           │
     │<────────────────────────────────────────│                                           │
```

---

## 4. Directed Acyclic Graph (DAG) State Machine Engine

The workflow engine enforces strict lifecycle pipelines on tasks using customizable Directed Acyclic Graphs.

```
       ┌────────────────────────┐
       │   BACKLOG (Initial)    │
       └───────────┬────────────┘
                   │
                   ▼ (Condition: Has Assignee)
       ┌────────────────────────┐
       │      IN_PROGRESS       │
       └───────────┬────────────┘
                   │
                   ▼ (Condition: All Subtasks Completed)
       ┌────────────────────────┐
       │      CODE_REVIEW       │
       └─────┬────────────┬─────┘
             │            │
  (Approved) │            │ (Rejected)
             ▼            ▼
 ┌──────────────┐     ┌────────────────┐
 │     QA       │     │   IN_PROGRESS  │
 └──────┬───────┘     └────────────────┘
        │
        ▼ (Role Check: Maintainer / Owner)
 ┌──────────────┐
 │ DONE (Term.) │
 └──────────────┘
```

### State Machine Verification Algorithm (BFS Reachability & Cycle Check)
1. **Single Initial State**: Graph validation ensures exactly one node has `isInitial = true`.
2. **Terminal Node Enforcement**: At least one node has `isTerminal = true`; terminal nodes are strictly prohibited from having outbound transitions (`transitions.length === 0`).
3. **Graph Reachability**: Breadth-First Search (BFS) starting from the initial state traverses all adjacency lists. Unreachable states trigger validation rejection.
4. **Guard Condition Evaluation Pipeline**:
   - `ROLE_CHECK`: Verifies acting user has sufficient client workspace role (`OWNER`, `MAINTAINER`, `MEMBER`).
   - `ALL_SUBTASKS_COMPLETED`: Inspects associated `subtasks` array, ensuring `status === 'COMPLETED'` on all children.
   - `HAS_ASSIGNEE`: Validates `task.assigneeId !== null`.
   - `FIELD_VALUE`: Evaluates dynamic field equality predicates against current task attributes.
5. **Side-Effect Hooks**:
   - `NOTIFY_ASSIGNEE`: Dispatches real-time notification alerts.
   - `CREATE_SUBTASK`: Dynamically instantiates checklist items upon state entry.
   - `UPDATE_FIELD`: Mutates designated task fields automatically.

---

## 5. Optimistic Concurrency Control (OCC) & Conflict Resolution

In collaborative multi-user environments, race conditions occur when two users edit the same task concurrently. The system eliminates dirty writes using mathematical Optimistic Concurrency Control.

```
User A (Client 1)                    PostgreSQL Database                     User B (Client 2)
       │                                      │                                      │
       │ 1. Fetch Task #42 (Version: 1)       │                                      │
       │<─────────────────────────────────────│ 1. Fetch Task #42 (Version: 1)       │
       │                                      │─────────────────────────────────────>│
       │                                      │                                      │
       │ 2. Submit Update (Version: 1)        │                                      │
       │    SET title = "New Title A", v = 2  │                                      │
       │    WHERE id = 42 AND version = 1     │                                      │
       │─────────────────────────────────────>│                                      │
       │                                      │                                      │
       │ 3. Row updated successfully! (v: 2)  │                                      │
       │<─────────────────────────────────────│                                      │
       │                                      │ 4. Submit Update (Version: 1)        │
       │                                      │    SET title = "New Title B", v = 2  │
       │                                      │    WHERE id = 42 AND version = 1     │
       │                                      │─────────────────────────────────────>│
       │                                      │                                      │
       │                                      │ 5. 0 rows affected! (Current v: 2)   │
       │                                      │    Throw OCC_CONFLICT (409)          │
       │                                      │─────────────────────────────────────>│
       │                                      │                                      │
       │                                      │ 6. Frontend receives 409 Conflict    │
       │                                      │    Prompts user to refresh & merge   │
```

---

## 6. Multi-Mode Recurrence Engine & Background Scheduler

The recurrence engine calculates exact future timestamps across complex business calendars without third-party blackbox dependencies.

### Recurrence Calculation Strategies

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Recurrence Calculation Matrix                                    │
├─────────────────────┬─────────────────────────────────┬────────────────────────────────────────────────┤
│ PATTERN TYPE        │ ALGORITHM STRATEGY              │ BOUNDARY HANDLING / LEAP-YEAR CLAMPING         │
├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────┤
│ DAILY               │ Step count addition             │ Preserves exact time-of-day offsets across DST  │
├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────┤
│ WEEKLY (Bitmask)    │ SetDay modulo target weekdays   │ Evaluates multi-day selections (e.g. Mon/Wed/Fri│
├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────┤
│ MONTHLY (Day-of-Mo) │ Day clamping to month end       │ Jan 31 -> Feb 28 (Common) / Feb 29 (Leap Year) │
├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────┤
│ MONTHLY (Nth-Day)   │ Nth-occurrence day scan         │ Resolves "2nd Tuesday" or "Last Friday"        │
├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────┤
│ CRON EXPRESSION     │ 5-Field Cron Parser             │ Evaluates minute/hour/dom/month/dow cadence    │
└─────────────────────┴─────────────────────────────────┴────────────────────────────────────────────────┘
```

### Background Poller Execution Cycle
1. **Poll Query**: Background worker executes every 60 seconds querying:
   `WHERE isActive = true AND nextOccurrence <= NOW() AND (endDate IS NULL OR nextOccurrence <= endDate)`.
2. **Instance Spawning**: Instantiates task from parent template / recurrence definition.
3. **Advance Timestamp**: Evaluates next occurrence using `RecurrenceCalculator.calculateNext(...)`.
4. **Idempotency Guarantee**: If `nextOccurrence === null`, sets `isActive = false`, terminating the rule.

---

## 7. Append-Only Audit Trail & Compliance Subsystem

The audit engine tracks every write operation across the entire platform.

```json
{
  "id": "audit_cl93847291048",
  "entityType": "TASK",
  "entityId": "task_cl93849102",
  "action": "UPDATE",
  "userId": "user_cl91823712",
  "clientId": "client_cl81726354",
  "ipAddress": "192.168.1.104",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "oldValues": {
    "status": "IN_PROGRESS",
    "priority": "MEDIUM",
    "version": 3
  },
  "newValues": {
    "status": "CODE_REVIEW",
    "priority": "HIGH",
    "version": 4
  },
  "changedFields": [
    "status",
    "priority",
    "version"
  ],
  "createdAt": "2026-09-20T14:32:01.482Z"
}
```

---

## 8. Gamification & Engagement Subsystem

The gamification engine calculates consecutive calendar-day login streaks, velocity points, and client leaderboards.

```
Day 1: User Logins ───────> Streak = 1 (LastLogin: Day 1)
Day 1: User Logins Again ──> Streak = 1 (Same-Day Idempotent No-Op)
Day 2: User Logins ───────> Streak = 2 (Consecutive Day Increment)
Day 3: User Active ───────> Streak = 3 (Longest Streak = 3)
Day 5: User Logins ───────> Streak = 1 (48h+ Inactivity Reset)
```

---

## 9. Deployment, Performance & Scalability Considerations

1. **Multi-Stage Docker Images**:
   - Backend Alpine runner produces a lightweight ~140MB container.
   - Frontend multi-stage Nginx container serves optimized static assets with gzip compression.
2. **Database Connection Pooling**:
   - Configured with connection pooling limits (`connection_limit=20`) to prevent socket exhaustion under high concurrent load.
3. **Stateless API Tier**:
   - REST API is completely stateless; JWT verification is decentralized, allowing horizontal auto-scaling behind an AWS ALB or Nginx load balancer.
4. **Horizontal Scalability Roadmap**:
   - Ingest audit events asynchronously via Redis Streams / Apache Kafka.
   - Introduce Redis read-through caching for client workspaces and workflow definition graphs.
