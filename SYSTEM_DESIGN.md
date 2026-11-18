# 🏛️ SupportDesk — System Design & Architecture Specification

This document details the internal architecture, database schema, concurrency controls, security implementation, and credential configuration for **SupportDesk**.

---

## 📑 Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [Database Schema & ERD](#2-database-schema--erd)
3. [Deep Dive: Concurrency & Race-Condition Prevention](#3-deep-dive-concurrency--race-condition-prevention)
4. [Security & Authentication (RBAC + JWT)](#4-security--authentication-rbac--jwt)
5. [Credentials & Environment Configuration Guide](#5-credentials--environment-configuration-guide)
6. [2+ YOE Technical Justification Matrix](#6-2-yoe-technical-justification-matrix)

---

## 1. High-Level Architecture

SupportDesk is structured around the **Layered Clean Architecture** pattern in Go:

```
[ HTTP Requests from React 19 Frontend ]
                 │
                 ▼
     ┌────────────────────────┐
     │      Gin Router        │  <-- Route registration & CORS handling
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │ Middleware Pipeline    │  <-- JWT validation, Claims extraction, RBAC gates
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │     Controllers        │  <-- Request binding, input validation, HTTP response formatting
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │       Services         │  <-- Business logic, workload balancing, auto-assignment algorithms
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │     Repositories       │  <-- GORM queries, database transactions, row-level locks
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │  PostgreSQL (Neon DB)  │  <-- ACID compliant relational data store
     └────────────────────────┘
```

---

## 2. Database Schema & ERD

```mermaid
erDiagram
    USERS ||--o{ TICKETS : "creates (customer)"
    USERS ||--o{ TICKETS : "assigned to (agent)"
    USERS ||--o{ COMMENTS : "writes"
    USERS ||--o{ TICKET_HISTORIES : "triggers"
    TICKETS ||--o{ COMMENTS : "contains"
    TICKETS ||--o{ TICKET_HISTORIES : "tracks"

    USERS {
        uint id PK
        string name "NOT NULL"
        string email "UNIQUE, NOT NULL"
        string password "NOT NULL (bcrypt)"
        string role "customer | agent | admin"
        string skills "e.g. Technical,Payment"
        int max_capacity "default: 5"
        boolean is_available "default: true"
        datetime created_at
        datetime updated_at
    }

    TICKETS {
        uint id PK
        string subject "NOT NULL"
        string description "NOT NULL"
        string category "NOT NULL"
        string priority "low | normal | high | urgent"
        string status "open | in_progress | resolved"
        uint customer_id FK "REFERENCES users(id)"
        uint agent_id FK "REFERENCES users(id), NULLABLE"
        datetime created_at
        datetime updated_at
    }

    COMMENTS {
        uint id PK
        uint ticket_id FK "REFERENCES tickets(id)"
        uint author_id FK "REFERENCES users(id)"
        string body "NOT NULL"
        boolean is_internal "default: false"
        datetime created_at
    }

    TICKET_HISTORIES {
        uint id PK
        uint ticket_id FK "REFERENCES tickets(id)"
        uint user_id FK "REFERENCES users(id)"
        string action "created | status_change | assigned"
        string details "Human-readable diff"
        datetime created_at
    }
```

### Table Indexing Strategy
* `users(email)`: Unique B-tree index for $O(1)$ authentication lookups.
* `tickets(customer_id)`: Foreign-key index for instant customer dashboard queries.
* `tickets(agent_id)`: Foreign-key index for agent workload calculations.
* `comments(ticket_id)`: Index for fast chronologically-ordered conversation loads.
* `ticket_histories(ticket_id)`: Index for audit trail timeline aggregation.

---

## 3. Deep Dive: Concurrency & Race-Condition Prevention

### The Problem (The Classic Race Condition)
In high-traffic support desks, multiple tickets can arrive within milliseconds of each other. If two concurrent HTTP requests query for the "least loaded agent" at the exact same moment:
1. **Request A** reads Agent Alex with 2 tickets.
2. **Request B** reads Agent Alex with 2 tickets.
3. Both assign their ticket to Alex.
4. Alex now has 4 tickets, violating workload distribution while other agents sit idle.

### The Solution: Row-Level Locking (`SELECT ... FOR UPDATE`)
SupportDesk wraps the assignment logic in an **atomic database transaction** (`tx`) using PostgreSQL's row-level locking:

```go
// From backend/services/assignment_service.go
err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
    Where("role = ? AND is_available = ?", models.RoleAgent, true).
    Find(&agents).Error
```

#### How it works under the hood:
1. When **Request A** acquires the row lock on candidate agents, PostgreSQL places an exclusive lock on those rows.
2. If **Request B** tries to assign another ticket concurrently, PostgreSQL forces Request B to wait until Request A's transaction commits.
3. Request B then re-evaluates the updated workloads with complete consistency ($ACID$).

---

## 4. Security & Authentication (RBAC + JWT)

### Token Generation
* **Algorithm:** HMAC-SHA256 (`HS256`)
* **Payload Claims:**
  ```json
  {
    "user_id": 104,
    "email": "jane@example.com",
    "role": "agent",
    "exp": 1731998400
  }
  ```
* **Lifespan:** 72 hours with expiration enforcement.

### Role-Based Access Control (RBAC) Matrix

| Resource / Action | Customer | Support Agent | Admin |
| :--- | :---: | :---: | :---: |
| Register / Login | ✅ | ✅ | ✅ |
| Create Ticket | ✅ | ✅ | ✅ |
| View Own Tickets | ✅ | ✅ | ✅ |
| View All Tickets Across Org | ❌ | ❌ | ✅ |
| Update Ticket Status | ❌ | ✅ | ✅ |
| Post Public Reply | ✅ | ✅ | ✅ |
| Post Private Internal Note | ❌ | ✅ | ✅ |
| View Audit Trail History | ✅ | ✅ | ✅ |

---

## 5. Credentials & Environment Configuration Guide

To deploy or run the project in any environment (Local, Docker, Render, AWS), you only need **two environment variables**:

| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string with SSL mode | `postgres://user:password@ep-xyz.us-east-1.aws.neon.tech/supportdesk?sslmode=require` |
| `JWT_SECRET` | Cryptographically random string (min 32 chars) | `e9f2d1a3c7b8495a6e2f1d0b8c7a6e5d4...` |
| `PORT` | Port the Go backend listens on (Default: `8080`) | `8080` |

### Setting Up Free Cloud PostgreSQL (Neon DB)
1. Go to [neon.tech](https://neon.tech) and create a free serverless PostgreSQL database.
2. Copy the Connection String (`postgres://username:password@ep-name.region.aws.neon.tech/neondb?sslmode=require`).
3. Paste it into your backend `.env` file as `DATABASE_URL`.
4. Run `go run main.go` — GORM's `AutoMigrate()` will automatically create all tables, foreign keys, and indexes on startup!

---

## 6. 2+ YOE Technical Justification Matrix

When an interviewer asks you: *"Why did you make these technical choices?"*, here are your architectural justifications:

| Decision | Why this choice over alternatives? |
| :--- | :--- |
| **Go (Golang) vs Node.js** | Static typing, built-in concurrency with lightweight goroutines (2KB per goroutine vs 1MB per thread), compiled native binary execution with microsecond latency and minimal memory footprint (<25MB RAM). |
| **Row Locks vs Redis Distributed Lock** | PostgreSQL's native `FOR UPDATE` avoids introducing external distributed lock managers (like Redlock) and network hops for single-database transactional consistency. |
| **Stateless JWT vs Server Sessions** | Eliminates server-side session stores (like Redis) for auth validation, enabling horizontal scaling across multiple container instances with zero shared state. |
| **Immutable Audit Log vs In-place Updates** | In-place updates destroy history. The `ticket_histories` table provides complete regulatory compliance, traceability, and historical analytics without altering original ticket records. |
