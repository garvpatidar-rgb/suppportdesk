# SupportDesk – Customer Support & Ticket Management System
## Complete Project Context, Architecture & Progress Summary

---

### 1. Executive Summary & Project Intent
**SupportDesk** is an enterprise-grade full-stack customer support and ticket management platform designed to reflect real-world production engineering practices expected from a 2–3 year experienced developer.

The system solves critical business bottlenecks for customer-facing organizations:
- Preventing lost customer complaints through centralized tracking.
- Eliminating duplicate responses and agent conflicts through **concurrency-safe auto-assignment**.
- Providing complete visibility into ticket lifecycle through an **immutable audit trail**.
- Segregating sensitive internal communications via **role-restricted private notes**.

---

### 2. Technology Stack & Architecture

| Tier | Technologies Used | Key Responsibilities |
| :--- | :--- | :--- |
| **Backend** | **Go (Golang 1.26+)**, **Gin-Gonic** | High-performance REST APIs, route grouping, middleware chain. |
| **Database** | **PostgreSQL (Neon Cloud Serverless)**, **GORM** | Relational data persistence, row-level locking (`SELECT ... FOR UPDATE`), automated schema migrations. |
| **Auth & Security** | **JWT (golang-jwt/v5)**, **bcrypt**, **CORS** | Stateless authentication, role-based access control (RBAC), password hashing. |
| **Frontend** | **React 18**, **TypeScript**, **Vite**, **Lucide React** | Reactive UI, customer ticket portal, agent queue drawer, real-time messaging tabs. |
| **Repository** | **GitHub** (`garvpatidar-rgb/suppportdesk`) | Production Git hygiene with `.gitignore` protecting secrets. |

---

### 3. Database Schema & Data Models

1. **`users`**
   - `id`, `name`, `email` (unique index), `password` (bcrypt hashed), `role` (`customer`, `agent`, `admin`).
   - `skills` (e.g. `Payment,Technical`), `max_capacity` (default 5), `is_available` (boolean).
2. **`tickets`**
   - `id`, `subject`, `description`, `category` (`Payment`, `Technical`, `Delivery`, `Account`).
   - `priority` (`low`, `normal`, `high`, `urgent`), `status` (`open`, `in_progress`, `resolved`).
   - `customer_id` (foreign key -> `users`), `agent_id` (foreign key -> `users`, nullable).
3. **`comments`**
   - `id`, `ticket_id`, `author_id`, `body`.
   - `is_internal` (boolean: true = hidden from customers, visible only to agents/admins).
4. **`ticket_histories` (Audit Trail)**
   - `id`, `ticket_id`, `user_id`, `action` (`created`, `status_change`, `assigned`), `details`, `created_at`.

---

### 4. Standout Engineering Features (Resume Highlights)

#### A. Intelligent Concurrency-Safe Hybrid Auto-Assignment
- **Implementation:** [`backend/services/assignment_service.go`](file:///home/dell/Desktop/support%20desk/backend/services/assignment_service.go)
- **Algorithm:**
  1. Opens a database transaction and applies a row-level lock (`clause.Locking{Strength: "UPDATE"}`) on eligible agents (`role = 'agent' AND is_available = true`).
  2. Evaluates agent domain skills against the ticket category.
  3. Checks active workload count against `max_capacity`.
  4. Selects the agent with matching skills and the lowest active ticket load.
  5. Fallback: If no direct skill match exists, routes to the least loaded available agent or leaves unassigned for admin triage.

#### B. Two-Way Conversation with Private Internal Notes
- **Implementation:** [`backend/controllers/ticket_controller.go`](file:///home/dell/Desktop/support%20desk/backend/controllers/ticket_controller.go)
- Supports customer-agent messaging.
- Agents can toggle `is_internal = true` to leave private notes. The query explicitly filters these notes out when requested by a user with the `customer` role.

#### C. Immutable Lifecycle Audit Trail
- Every critical event (ticket creation, status transition, assignment changes) writes an immutable record to `ticket_histories`.
- Frontend provides an interactive "Audit Trail & History" tab displaying the complete timeline.

---

### 5. API Endpoints Map

All endpoints use prefix: `/api/v1`

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Service health verification |
| `POST` | `/auth/register` | Public | Register customer, agent, or admin |
| `POST` | `/auth/login` | Public | Authenticate and obtain JWT |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `POST` | `/tickets` | Authenticated | Create ticket & trigger auto-assignment |
| `GET` | `/tickets` | Authenticated | List tickets (filtered by role) |
| `GET` | `/tickets/:id` | Authenticated | Get ticket details |
| `PATCH`| `/tickets/:id/status` | Agent / Admin | Update ticket status (`open`, `in_progress`, `resolved`) |
| `POST` | `/tickets/:id/comments` | Authenticated | Post public reply or private internal note |
| `GET` | `/tickets/:id/comments` | Authenticated | Fetch conversation history (internal notes filtered for customer) |
| `GET` | `/tickets/:id/history` | Authenticated | Fetch lifecycle audit logs |

---

### 6. Current Project State & Next Milestones

- **Phase 1 (Backend Foundation):** Complete ✅
- **Phase 2 (Auth, RBAC & Cloud Database):** Complete ✅ (Neon Serverless PostgreSQL integration)
- **Phase 3 (Ticket Management & Comments):** Complete ✅
- **Phase 4 (Concurrency-Safe Auto-Assignment):** Complete ✅
- **Phase 5 (React + TypeScript Frontend UI):** Complete ✅
- **Git & GitHub Integration:** Complete ✅ (`main` branch synced with remote)

#### Next Recommended Roadmap Items:
1. **SLA Monitoring & Analytics Dashboard:** Visual timers for SLA breaches, average resolution time, tickets resolved per agent.
2. **File Attachments (AWS S3 / Cloud Storage):** Uploading error screenshots/logs.
3. **AI Enhancement (Gemini / OpenAI API):** Automatic category/priority classification and suggested agent reply drafts.

---

### 7. Resume Bullet Points

```markdown
• SupportDesk – Full-Stack Enterprise Customer Support Platform (Go, Gin, GORM, PostgreSQL, React, TypeScript)
  - Engineered a concurrency-safe hybrid auto-assignment engine in Go using PostgreSQL row-level locking (`SELECT ... FOR UPDATE`), allocating tickets dynamically based on agent domain skill matching and active workload capacity.
  - Implemented stateless JWT authentication and role-based access control (RBAC) across Customer, Support Agent, and Admin roles with bcrypt password hashing.
  - Developed a two-way messaging architecture supporting customer communication alongside role-restricted private internal notes.
  - Designed an immutable audit trail system tracking end-to-end ticket lifecycle events and assignment transitions.
  - Integrated Neon Cloud serverless PostgreSQL with GORM auto-migrations and optimized connection pooling.
```
