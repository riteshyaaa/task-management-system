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

- **Multi-Tenant Client Workspaces**: Isolated client organizations with dedicated task, engagement, and team scoping.
- **Standardized 4-State Review Workflow**: Linear progression (`NOT_STARTED` → `IN_PROGRESS` → `READY_FOR_REVIEW` → `COMPLETED`) with manager approval gates and anti-self-approval rules.
- **Engagement & Deliverable Tracking**: Service types, recurring and fixed engagements, SLA milestones, and duplicate prevention.
- **Role-Based Access Control (RBAC)**: Role hierarchies (`Admin`, `Manager`, `Member`), dual-token JWT authentication, and Optimistic Concurrency Control (OCC).
- **Automated Recurrence Engine**: Scheduled task generation supporting daily, weekly, monthly, and cron-based intervals.
- **Audit Logging & Analytics**: Append-only JSONB audit trails with field-level diffs, operational dashboard widgets, and member streak tracking.

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
   Copy `.env.example` to `.env` in `backend/`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Set your `DATABASE_URL` in `backend/.env`*:
   > **Note on Database**: You can use your own **local PostgreSQL instance** (e.g., `postgresql://postgres:password@localhost:5432/task_management?schema=public`) or create a **free cloud PostgreSQL database** on [Neon](https://neon.tech) and paste the connection string.

   ```env
   NODE_ENV=development
   PORT=5000
   
   # Option A: Local PostgreSQL
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/task_management?schema=public"
   
   # Option B: Neon Cloud PostgreSQL (https://neon.tech)
   # DATABASE_URL="postgresql://<user>:<password>@<ep-pooler-host>.neon.tech/neondb?sslmode=require"

   JWT_ACCESS_SECRET="your_32_character_super_secure_access_secret_key!"
   JWT_REFRESH_SECRET="your_32_character_super_secure_refresh_secret_key!"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   CLIENT_URL="http://localhost:5173"
   ```

3. **Initialize Database & Seed Test Fixtures**:
   ```bash
   npm run setup
   ```
   *Generates Prisma Client, pushes schema to your database, and seeds demo roles, client workspaces, engagements, workflows, and tasks.*

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
