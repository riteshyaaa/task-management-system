# Enterprise Task Management & Workflow Automation System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748.svg)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Jest Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](https://jestjs.io/)

A full-stack, enterprise-grade Task Management and Workflow Automation Platform. Built with clean architecture, strict TypeScript typing across the stack, dual-token cryptographic authentication, Role-Based and Attribute-Based Access Control (RBAC/ABAC), a Directed Acyclic Graph (DAG) workflow state machine, an event-driven automation rule engine, multi-mode recurrence scheduling, append-only JSONB audit trails, and user engagement gamification.

---

## 🌟 Key Features

### 1. Security, Identity & Workspace Tenancy
- **Dual-Token Cryptographic Authentication**: 15-minute RS/HS256 JWT access tokens paired with 7-day cryptographic refresh tokens stored in PostgreSQL.
- **Refresh Token Rotation & Automatic Reuse Detection**: Immediate revocation of the entire token family upon detection of compromised or replayed refresh tokens.
- **Hybrid RBAC + Workspace ABAC Security**:
  - Global system roles (`SUPER_ADMIN`, `ADMIN`, `MEMBER`, `GUEST`).
  - Granular permission checking (`requirePermission('tasks:create')`).
  - Multi-tenant team workspace isolation (`OWNER`, `MAINTAINER`, `MEMBER`) preventing unauthorized cross-workspace data access.
- **Enterprise Middleware Suite**: Centralized RFC 7807 problem details error handling, Helmet security headers, CORS origin whitelisting, and brute-force rate limiting.

### 2. Directed Acyclic Graph (DAG) Workflow State Machine
- **Configurable State Machine**: Custom workflow pipelines with designated initial and terminal states.
- **Transition Guard Conditions**: Enforces role requirements (`ROLE_CHECK`), assignee presence, and subtask completion rules before permitting state transitions.
- **Side-Effect Hooks**: Automated notification dispatch and checklist generation triggered upon state changes.
- **Transition Duration Tracking**: Append-only transition history with microsecond-accurate state residency metrics.

### 3. Concurrency Control & Real-Time Kanban Board
- **Optimistic Concurrency Control (OCC)**: Zero-data-loss protection using integer `version` columns on mutable entities. Concurrent edits trigger `409 Conflict` responses with state reconciliation.
- **Interactive Drag-and-Drop Kanban Board**: Real-time column transitions, priority filters, label tags, and full-text search.
- **Task Detail Drawer**: Rich markdown descriptions, hierarchical subtask checklists, comment threads, and live activity feeds.

### 4. Template Engine & Event-Driven Automation
- **Dynamic Task Templates**: Reusable task blueprints with variable interpolation (`{{client_name}}`, `{{release_version}}`) and checklist instantiation.
- **Trigger-Condition-Action Automation Engine**: Event-driven rules supporting triggers (`TASK_CREATED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `DUE_DATE_APPROACHING`), multi-criteria condition filters, and automated actions (`ASSIGN_USER`, `SET_PRIORITY`, `ADD_LABEL`, `TRIGGER_NOTIFICATION`).

### 5. Multi-Mode Recurrence Engine & Background Scheduler
- **Calculation Capabilities**:
  - **Daily**: Fixed interval step counts.
  - **Weekly**: Bitmask weekday selections (e.g., Monday, Wednesday, Friday).
  - **Monthly (Day-of-Month)**: Intelligent month-end clamping (e.g., Jan 31 -> Feb 28 in common years, Feb 29 in leap years).
  - **Monthly (Nth-Weekday)**: Dynamic calculations (e.g., "2nd Tuesday" or "Last Friday" of every month).
  - **Custom 5-Field Cron**: High-precision cron expressions powered by `cron-parser`.
- **Background Cron Poller**: Asynchronous cron worker running without blocking HTTP thread execution.

### 6. Append-Only Audit Trail & Compliance Subsystem
- **JSONB Mutation Diff Interceptor**: Captures pre-execution (`oldValues`) and post-execution (`newValues`) states with automatic changed field extraction.
- **Bulk Operation Tracking**: Correlates multi-record updates under unique batch execution IDs.
- **Filterable Audit Inspector**: Query by entity, action, user, workspace, and timestamp range.

### 7. Engagement Gamification & Analytics Dashboard
- **Daily Login Streak Calculator**: Calendar-day tracking measuring consecutive daily activity, same-day no-op idempotency, and inactivity resets.
- **Team Velocity & Performance Metrics**: Aggregates completed story points, average cycle time, overdue ratios, and member leaderboards.
- **Customizable Dashboard Grid**: Metric summary cards, velocity charts, and personalized widget layouts.

---

## 🏗️ Architecture & Tech Stack

```
task_management/
├── backend/                        # Node.js + Express + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma           # 30 relational models with foreign keys & indexes
│   │   └── seed.ts                 # Database seeder (Roles, Permissions, Workflows, Admin)
│   ├── src/
│   │   ├── config/                 # Environment, Database client, Structured Logger
│   │   ├── middleware/             # Auth, RBAC, ABAC, Validation, Error Handling
│   │   ├── modules/                # Domain-Driven Modules (Auth, Tasks, Workflows, etc.)
│   │   ├── scheduler/              # Background recurrence cron workers
│   │   └── shared/                 # RFC Error classes, response utilities, date-fns math
│   └── tests/
│       ├── unit/                   # Pure unit tests (Recurrence, DAG, OCC, Streaks)
│       └── integration/            # Supertest API tests (Health, Auth, Tasks)
├── frontend/                       # React 18 + TypeScript + Vite + TailwindCSS SPA
│   ├── src/
│   │   ├── components/             # Reusable UI kit (Buttons, Modals, Badges, Layout)
│   │   ├── features/               # Domain components (Kanban, WorkflowDesigner, Dashboard)
│   │   ├── hooks/                  # Custom React hooks (useAuth, useTasks, useWorkflows)
│   │   ├── pages/                  # Route views (Dashboard, Tasks, Templates, Audit, etc.)
│   │   └── services/               # Axios/Fetch API client layer
│   └── nginx.conf                  # Production reverse proxy configuration
└── docker-compose.yml              # Multi-container orchestration (PostgreSQL, Backend, Frontend)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher (or Docker)

### Quick Start (Local Setup)

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/your-org/task-management-system.git
   cd task-management-system
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` in `backend/` and configure your database connection:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Sample `backend/.env`*:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/task_mgmt_dev?schema=public"
   JWT_ACCESS_SECRET="your_32_character_super_secure_access_secret_key!"
   JWT_REFRESH_SECRET="your_32_character_super_secure_refresh_secret_key!"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
   LOG_LEVEL="debug"
   ENABLE_SCHEDULER="true"
   ```

3. **Initialize Database & Seed Data**:
   ```bash
   npm run setup
   ```
   *This generates Prisma client, runs migrations, and seeds default roles, permissions, workflow templates, and test users.*

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend Application**: [http://localhost:5173](http://localhost:5173)
   - **Backend REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
   - **API Health Endpoint**: [http://localhost:5000/health](http://localhost:5000/health)

### Default Seed Credentials
| Role | Email | Password |
|---|---|---|
| **System Administrator** | `admin@taskmgmt.com` | `Admin123!` |
| **Engineering Member** | `developer@taskmgmt.com` | `Password123!` |

---

## 🐳 Docker Deployment

To launch the full production stack using Docker Compose:

```bash
docker-compose up -d --build
```

Services will be available at:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **REST API**: [http://localhost:5000](http://localhost:5000)
- **PGAdmin Web Interface**: [http://localhost:5050](http://localhost:5050) (`admin@taskmgmt.com` / `adminpassword`)

---

## 🧪 Testing Suite

The codebase features comprehensive unit and integration test coverage:

```bash
# Run all unit tests (State machine, Recurrence math, Streaks, Error handling)
npm test --workspace=backend -- --testPathPattern="unit"

# Run integration tests (Health, Auth lifecycle, OCC mutation protection)
npm test --workspace=backend -- --testPathPattern="integration"

# Run full test suite
npm test
```

### Verified Test Suites:
- `tests/unit/recurrence-calculator.test.ts` (Daily, Weekly bitmask, Leap-year month clamping, Nth-weekday, 5-field Cron)
- `tests/unit/workflow-validator.test.ts` (DAG verification, Initial/Terminal state checks, Reachability analysis)
- `tests/unit/workflow-engine.test.ts` (State mapping, `ROLE_CHECK`, `FIELD_VALUE`, `ALL_SUBTASKS_COMPLETED` guards)
- `tests/unit/streak-calculator.test.ts` (New user init, Same-day idempotency, Consecutive-day increment, Inactivity reset)
- `tests/unit/error-handler.test.ts` (AppError formatting, Zod schema validation errors, Prisma constraint mapping)
- `tests/integration/health.api.test.ts` (System uptime & version checks)

---

## 📖 API Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password | No |
| `POST` | `/api/v1/auth/refresh` | Rotate access & refresh tokens | No |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token | Yes |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & permissions | Yes |

### Task Management (`/api/v1/tasks`)
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | List & filter tasks (search, status, priority, team) | `tasks:read` |
| `POST` | `/api/v1/tasks` | Create new task | `tasks:create` |
| `GET` | `/api/v1/tasks/:id` | Get task details with subtasks, comments, labels | `tasks:read` |
| `PUT` | `/api/v1/tasks/:id` | Update task (Guarded with OCC `version`) | `tasks:update` |
| `DELETE` | `/api/v1/tasks/:id` | Soft/Hard delete task | `tasks:delete` |
| `POST` | `/api/v1/tasks/:id/subtasks` | Add subtask checklist item | `tasks:update` |
| `PUT` | `/api/v1/tasks/:id/subtasks/:subtaskId` | Toggle subtask completion status | `tasks:update` |
| `POST` | `/api/v1/tasks/:id/comments` | Add comment thread to task | `tasks:read` |

### Workflow State Machine (`/api/v1/workflows`)
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/workflows` | List team workflow definitions | `workflows:read` |
| `POST` | `/api/v1/workflows` | Create custom DAG workflow definition | `workflows:create` |
| `POST` | `/api/v1/workflows/tasks/:taskId/transition` | Execute state transition with guard evaluation | `tasks:update` |
| `GET` | `/api/v1/workflows/tasks/:taskId/history` | Fetch task transition timeline & durations | `workflows:read` |

### Recurring Schedules & Automation (`/api/v1/recurring` & `/api/v1/automation-rules`)
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/recurring` | List active recurrence rules | `tasks:read` |
| `POST` | `/api/v1/recurring` | Create recurrence rule (Daily/Weekly/Monthly/Cron) | `tasks:create` |
| `POST` | `/api/v1/recurring/:id/trigger` | Manually trigger recurring task generation | `tasks:create` |
| `GET` | `/api/v1/automation-rules` | List workspace automation rules | `workflows:read` |
| `POST` | `/api/v1/automation-rules` | Create event-driven automation rule | `workflows:create` |

### Audit & Engagement (`/api/v1/audit` & `/api/v1/engagement`)
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/audit` | Query append-only audit trail with JSONB diffs | `audit:read` |
| `GET` | `/api/v1/engagement/streaks/me` | Fetch user daily login streak & metrics | Authenticated |
| `GET` | `/api/v1/engagement/velocity` | Fetch team velocity & sprint completion metrics | `teams:read` |
| `GET` | `/api/v1/engagement/leaderboard` | Fetch team member engagement leaderboard | `teams:read` |

---

## 🔒 Security Architecture

1. **Password Hashing**: Salted bcrypt hashing with 12 cost factor rounds.
2. **Token Rotation & Invalidation**: Cryptographic SHA-256 hash validation on refresh token lookup; token reuse triggers immediate family-wide cascade revocation.
3. **Database Input Sanitization**: Parameterized queries via Prisma ORM eliminating SQL injection vectors.
4. **Input Schema Validation**: Deep payload validation on all route boundaries via Zod.
5. **Optimistic Concurrency Control (OCC)**: Protects against silent data overwrites in distributed multi-user environments.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
