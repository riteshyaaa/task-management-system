# Professional Services Engagement & Task Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748.svg)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-82%20Passing-brightgreen.svg)](https://jestjs.io/)

A full-stack, enterprise-grade Professional Services Engagement Management and Workflow Automation Platform. Built with strict TypeScript typing across the stack, dual-token cryptographic authentication, Role-Based Access Control (RBAC), multi-tenant client workspace isolation, a Directed Acyclic Graph (DAG) 4-state workflow engine, multi-mode recurrence scheduling, optimistic concurrency control, append-only audit logging, and operational analytics.

---

## 🌟 Key Features

### 1. Client Engagement & Deliverable Management
- **Multi-Tenant Client Workspaces**: Complete data isolation across client workspaces (e.g., *Acme Corporation* and *TechStart Inc*).
- **Engagement Lifecycles & Duplicate Prevention**: Track recurring and fixed-period client engagements with composite uniqueness checks preventing duplicate engagements across matching date ranges.
- **Task & Deliverable Tracking**: Real-time status management, priority filters, label taxonomy, hierarchical subtasks, and comment threads.

### 2. Standardized 4-State Workflow State Machine
- **Strict Linear Review Workflow**: Enforces deliverable progression:
  $$\text{NOT\_STARTED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{READY\_FOR\_REVIEW} \longrightarrow \text{COMPLETED}$$
- **Role-Guarded Transitions**: Members progress tasks to review; deliverable sign-off and completion is strictly guarded to `ADMIN` and `MANAGER` roles.
- **Anti-Self-Approval**: Prevents task assignees from approving their own deliverables.
- **Transition History**: Append-only transition audit logs with reviewer feedback.

### 3. Security, RBAC & Workspace Access
- **Dual-Token Cryptographic Authentication**: Short-lived JWT access tokens paired with 7-day cryptographic refresh tokens stored in PostgreSQL.
- **Refresh Token Rotation & Reuse Detection**: Immediate family-wide revocation if a compromised refresh token is replayed.
- **Role-Based Permissions**: Role hierarchies (`ADMIN`, `MANAGER`, `MEMBER`) with restricted member management (admin only) and granular mutation gates.
- **Optimistic Concurrency Control (OCC)**: Zero-data-loss protection using integer `version` columns to prevent race conditions during concurrent updates.

### 4. Recurrence Engine & Background Scheduling
- **Multi-Mode Recurrence Rules**: Daily intervals, weekly bitmask days (e.g., Mon/Fri), monthly day-of-month (with leap-year clamping), and 5-field Cron expressions.
- **Idempotent Instance Generation**: Transaction-isolated background scheduler prevents duplicate task instantiation on re-runs.

### 5. Audit Logging & Operational Analytics
- **Append-Only JSONB Audit Trails**: Captures actor, IP address, pre/post mutation states (`oldValues` vs `newValues`), and changed fields.
- **Engagement Operational Dashboard**: Real-time operational metrics (Open Tasks, Overdue, Due Today, Waiting for Client, Waiting for Review, Completed This Period, Active Engagements) alongside sprint velocity and member leaderboards.

---

## 🏗️ Project Structure

```
task_management/
├── backend/                        # Node.js + Express + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma           # 30 relational models with constraints & indexes
│   │   └── seed.ts                 # Database seeder (Roles, Workspaces, Workflows, Fixtures)
│   ├── src/
│   │   ├── config/                 # Environment, Prisma client, Winston logger
│   │   ├── middleware/             # Auth, RBAC, ABAC, Zod validation, Error handler
│   │   ├── modules/                # Domain modules (Auth, Clients, Engagements, Tasks, Workflows)
│   │   ├── scheduler/              # Recurrence cron workers & recurrence engine
│   │   └── shared/                 # RFC 7807 AppErrors, response utilities, date helpers
│   └── tests/
│       ├── unit/                   # Unit tests (Recurrence math, DAG validation, OCC, Streaks)
│       └── integration/            # Supertest API tests (Auth, Engagements, Tasks, Health)
├── frontend/                       # React 18 + TypeScript + Vite + TailwindCSS SPA
│   ├── src/
│   │   ├── components/             # Reusable UI kit (Buttons, Cards, Modals, Badges, Layout)
│   │   ├── context/                # AuthContext, ClientContext, ToastContext
│   │   ├── pages/                  # Route views (Dashboard, Tasks, Engagements, Workflows, etc.)
│   │   ├── services/               # Axios API client services
│   │   └── types/                  # Shared TypeScript interfaces & enums
│   └── nginx.conf                  # Production reverse proxy configuration
├── docker-compose.yml              # Multi-container orchestration (Postgres, Backend, Frontend)
└── README.md                       # Project overview and setup guide
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14.0` or higher (or Docker)

### Local Quickstart

1. **Clone the repository and install root dependencies**:
   ```bash
   git clone https://github.com/riteshyaaa/task-management-system.git
   cd task-management-system
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` in `backend/`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Verify `backend/.env` settings*:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/task_mgmt_dev?schema=public"
   JWT_ACCESS_SECRET="your_32_character_super_secure_access_secret_key!"
   JWT_REFRESH_SECRET="your_32_character_super_secure_refresh_secret_key!"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
   ENABLE_SCHEDULER="true"
   ```

3. **Initialize Database & Seed Test Fixtures**:
   ```bash
   npm run setup
   ```
   *Generates Prisma Client, pushes schema migrations, and seeds roles, client workspaces, engagements, workflows, tasks, and recurring rules.*

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend App**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
   - **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Administrator** | `admin@example.com` | `Password123!` | Full global access, client/member management, all approvals |
| **Manager 1** | `manager@example.com` | `Password123!` | Acme Corp manager, creates engagements, reviews/approves deliverables |
| **Manager 2** | `manager2@example.com` | `Password123!` | TechStart manager, creates engagements, reviews/approves deliverables |
| **Member (Dev)** | `dev@example.com` | `Password123!` | Works on tasks, progresses `IN_PROGRESS` → `READY_FOR_REVIEW` |
| **Member (QA)** | `qa@example.com` | `Password123!` | Works on tasks, progresses `IN_PROGRESS` → `READY_FOR_REVIEW` |

*Note: Quick login buttons are available directly on the login screen for 1-click credential autofill.*

---

## 🧪 Running Tests

The test suite contains **82 automated tests** across 9 unit and integration test suites:

```bash
# Run all backend tests
cd backend
npm test

# Run frontend production build check
cd ../frontend
npm run build
```

---

## 🐳 Docker Deployment

To launch the complete containerized stack:

```bash
docker-compose up -d --build
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **REST API Server**: [http://localhost:5000](http://localhost:5000)
- **PostgreSQL Database**: `localhost:5432`

---

## 📄 License
MIT License.
