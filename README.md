# 🎫 SupportDesk — Production-Grade Helpdesk & Ticket Management Platform

[![CI - Build & Lint](https://github.com/garvpatidar-rgb/suppportdesk/actions/workflows/ci.yml/badge.svg)](https://github.com/garvpatidar-rgb/suppportdesk/actions/workflows/ci.yml)
[![CD - GitHub Pages](https://github.com/garvpatidar-rgb/suppportdesk/actions/workflows/deploy.yml/badge.svg)](https://github.com/garvpatidar-rgb/suppportdesk/actions/workflows/deploy.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_DB-4169E1?style=flat&logo=postgresql)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> A modern, high-concurrency Helpdesk and Customer Support ticketing platform engineered with a **Go (Golang) REST API backend**, a **React 19 + TypeScript frontend**, and **PostgreSQL**. Designed with enterprise-grade concurrency controls, role-based security, automated agent assignment, and zero-downtime CI/CD pipelines.

---

## 🌟 Key Engineering Highlights (Resume / Portfolio Highlights)

- **⚡ Concurrency-Safe Auto-Assignment Engine:**  
  Engineered an intelligent round-robin/workload-balancing agent assignment algorithm using **PostgreSQL row-level locking (`SELECT ... FOR UPDATE`)** inside database transactions. Eliminates race conditions and prevents multiple tickets from being assigned to overloaded agents simultaneously under high concurrent traffic.

- **🛡️ Strict Role-Based Access Control (RBAC):**  
  Implemented custom Gin middleware enforcing hierarchical access control (`Admin`, `Agent`, `Customer`) with stateless **HMAC-SHA256 JWT** authentication, password salting with **bcrypt**, and security headers.

- **📜 Immutable Audit Trail & Private Staff Notes:**  
  Every ticket transition (status updates, agent re-assignments, customer replies) is logged to an immutable audit timeline. Supports internal agent-only private notes hidden from customer views.

- **🎮 Zero-Config Interactive Demo Mode:**  
  Features an in-memory client-side mock provider that allows recruiters, evaluators, and users to interact with every single app feature (tickets, comments, status transitions, role simulation) instantly in the browser without provisioning a database or backend.

- **🤖 Automated CI/CD Pipelines (GitHub Actions):**  
  Automated workflows validate linting (`oxlint`), verify TypeScript compilation, execute production builds, and deploy live artifacts on every pull request and push to `main`.

---

## 🏗️ System Architecture

```
                       ┌────────────────────────┐
                       │   Client / Browser     │
                       │  React 19 + TypeScript │
                       └───────────┬────────────┘
                                   │ HTTP / JSON (REST)
                                   ▼
                       ┌────────────────────────┐
                       │    Gin HTTP Router     │
                       │   CORS / Auth / RBAC   │
                       └───────────┬────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │   Auth Service  │  │ Ticket Service  │  │ Assign Service  │
     │  (JWT + bcrypt) │  │ (Audit Trail)   │  │ (Row Locks)     │
     └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
                       ┌────────────────────────┐
                       │     GORM Data Layer    │
                       └───────────┬────────────┘
                                   ▼
                       ┌────────────────────────┐
                       │  PostgreSQL (Neon DB)  │
                       └────────────────────────┘
```

---

## 💻 Tech Stack

### Backend
* **Language & Runtime:** Go (Golang) 1.22+
* **Web Framework:** [Gin Gonic](https://github.com/gin-gonic/gin)
* **ORM & Database:** [GORM](https://gorm.io/) with PostgreSQL (Neon Serverless Postgres)
* **Security & Auth:** `golang.org/x/crypto/bcrypt`, `golang-jwt/jwt/v5`
* **Architecture:** Layered Clean Architecture (`controllers/`, `services/`, `repositories/`, `models/`, `middleware/`)

### Frontend
* **Core:** React 19, TypeScript
* **Tooling:** Vite, Oxlint (high-performance Rust linter)
* **Styling & UI:** Tailwind CSS, Lucide React icons
* **State Management:** React Hooks + Context API

### DevOps & Infrastructure
* **CI/CD:** GitHub Actions (Build, Lint, Test, Artifact Deployment)
* **Hosting:** Vercel (Frontend), Render / Railway (Go Backend), GitHub Pages

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register a new user account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current user profile |

### Tickets & Support
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tickets` | Customer / Agent / Admin | Create a new support ticket |
| `GET` | `/api/v1/tickets` | Authenticated | List tickets (filtered by role / ownership) |
| `GET` | `/api/v1/tickets/:id` | Authenticated | Get detailed ticket info |
| `PATCH`| `/api/v1/tickets/:id/status`| Agent / Admin | Update ticket status (`open`, `in_progress`, `resolved`, `closed`) |
| `POST` | `/api/v1/tickets/:id/comments` | Authenticated | Add public comment or private internal note |
| `GET` | `/api/v1/tickets/:id/comments` | Authenticated | Retrieve comments thread |
| `GET` | `/api/v1/tickets/:id/history` | Authenticated | View immutable audit trail timeline |

### Health Check
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | API health and uptime status |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* [Go 1.22+](https://golang.org/dl/)
* [Node.js 20+](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/) (or a free [Neon DB](https://neon.tech) instance)

### 1. Clone Repository
```bash
git clone https://github.com/garvpatidar-rgb/suppportdesk.git
cd suppportdesk
```

### 2. Backend Setup
```bash
cd backend

# Copy environment template
cp .env.example .env

# Configure your database connection in .env:
# DATABASE_URL=postgres://user:password@localhost:5432/supportdesk?sslmode=disable
# JWT_SECRET=your-secure-jwt-secret
# PORT=8080

# Run database migrations and start server
go run main.go
```
The backend API will start on `http://localhost:8080`.

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Code Quality

```bash
# Frontend Linting
cd frontend
npm run lint

# Frontend Production Build Check
npm run build

# Backend Tests
cd ../backend
go test -v ./...
```

---

## 📈 Roadmap & Upcoming Features

- [x] Concurrency-safe intelligent ticket assignment with database locks
- [x] JWT authentication & RBAC middleware
- [x] Ticket comments & staff private notes
- [x] Audit timeline history tracking
- [x] Zero-config interactive browser demo mode
- [x] GitHub Actions automated CI/CD pipeline
- [ ] Email / Webhook notifications on ticket resolution
- [ ] Multi-container Docker Compose & Kubernetes (EKS) manifests
- [ ] Redis caching layer for SLA / workload metrics

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
