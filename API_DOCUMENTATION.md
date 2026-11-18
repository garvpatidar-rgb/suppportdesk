# 📖 SupportDesk — Comprehensive REST API Documentation

This document provides complete, production-grade specifications for every endpoint exposed by the **SupportDesk API**, including authentication requirements, request headers, JSON payloads, responses, and sample `curl` commands.

---

## 📑 Table of Contents
1. [Overview & Standards](#overview--standards)
2. [Authentication & Headers](#authentication--headers)
3. [Health Check Endpoint](#health-check-endpoint)
4. [Authentication Endpoints (`/api/v1/auth`)](#authentication-endpoints)
   - [User Registration](#1-register-new-user)
   - [User Login](#2-user-login)
   - [Get Current User Profile](#3-get-current-user-me)
5. [Ticket Management Endpoints (`/api/v1/tickets`)](#ticket-management-endpoints)
   - [Create Ticket (with Auto-Assignment)](#1-create-ticket)
   - [List Tickets (Role-Filtered)](#2-list-tickets)
   - [Get Ticket By ID](#3-get-ticket-details)
   - [Update Ticket Status (RBAC Protected)](#4-update-ticket-status)
6. [Comments & Audit Trail Endpoints](#comments--audit-trail-endpoints)
   - [Add Comment or Private Note](#1-add-comment--internal-note)
   - [List Ticket Comments](#2-list-ticket-comments)
   - [Get Ticket Audit History Timeline](#3-get-ticket-audit-history)
7. [Standard Error Response Schema](#standard-error-response-schema)

---

## 🌐 Overview & Standards

* **Base URL (Local):** `http://localhost:8080`
* **Data Format:** JSON (`application/json`)
* **Standard Time Format:** ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)
* **Authentication Scheme:** `Bearer <JWT_TOKEN>`

---

## 🔑 Authentication & Headers

Protected routes require the `Authorization` header containing a valid signed JWT:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 🩺 Health Check Endpoint

### `GET /health`
Returns the operational health and uptime status of the backend API.

* **Access:** Public
* **Request:** None
* **Response (200 OK):**
```json
{
  "status": "ok",
  "message": "SupportDesk API is running"
}
```
* **cURL Example:**
```bash
curl -X GET http://localhost:8080/health
```

---

## 🔐 Authentication Endpoints

### 1. Register New User
Creates a new customer or agent account with hashed password storage (bcrypt).

* **Method:** `POST`
* **URL:** `/api/v1/auth/register`
* **Access:** Public
* **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!",
  "role": "customer"
}
```
> **Allowed Roles:** `customer`, `agent`, `admin` (defaults to `customer` if omitted).

* **Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "customer",
    "skills": "Technical",
    "max_capacity": 5,
    "is_available": true,
    "created_at": "2026-11-17T22:30:00Z",
    "updated_at": "2026-11-17T22:30:00Z"
  }
}
```

* **cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"SecurePassword123!","role":"customer"}'
```

---

### 2. User Login
Validates email and password, returning an HMAC-SHA256 JWT bearer token valid for 72 hours.

* **Method:** `POST`
* **URL:** `/api/v1/auth/login`
* **Access:** Public
* **Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

* **Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "customer"
  }
}
```

---

### 3. Get Current User (`/me`)
Retrieves the profile of the authenticated caller extracted from the JWT context.

* **Method:** `GET`
* **URL:** `/api/v1/auth/me`
* **Access:** Authenticated (Any Role)
* **Response (200 OK):**
```json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "customer",
  "skills": "Technical",
  "max_capacity": 5,
  "is_available": true
}
```

---

## 🎫 Ticket Management Endpoints

### 1. Create Ticket
Submits a new customer support ticket. The backend automatically initiates the **concurrency-safe intelligent auto-assignment algorithm**:
1. Checks for online agents matching the ticket `category`.
2. Selects the agent with the lowest active ticket workload.
3. Automatically sets `status = "open"` and logs the creation event into `ticket_histories`.

* **Method:** `POST`
* **URL:** `/api/v1/tickets`
* **Access:** Authenticated (`customer`, `agent`, `admin`)
* **Request Body:**
```json
{
  "subject": "Payment gateway timeout on checkout",
  "description": "Customer attempted UPI transaction, payment deducted but order failed.",
  "category": "Payment",
  "priority": "high"
}
```
> **Priority Values:** `low`, `normal`, `high`, `urgent`  
> **Categories:** `Payment`, `Technical`, `Billing`, `General`

* **Response (201 Created):**
```json
{
  "id": 104,
  "subject": "Payment gateway timeout on checkout",
  "description": "Customer attempted UPI transaction, payment deducted but order failed.",
  "category": "Payment",
  "priority": "high",
  "status": "open",
  "customer_id": 1,
  "agent_id": 3,
  "agent": {
    "id": 3,
    "name": "Alex Tech Support",
    "email": "alex@company.com",
    "role": "agent"
  },
  "created_at": "2026-11-17T22:45:10Z",
  "updated_at": "2026-11-17T22:45:10Z"
}
```

---

### 2. List Tickets
Retrieves a list of tickets scoped dynamically by the caller's role:
* **Customers:** View only tickets created by their account.
* **Agents:** View tickets assigned to them or unassigned tickets.
* **Admins:** View all system tickets across the entire organization.

* **Method:** `GET`
* **URL:** `/api/v1/tickets`
* **Access:** Authenticated
* **Response (200 OK):**
```json
[
  {
    "id": 104,
    "subject": "Payment gateway timeout on checkout",
    "category": "Payment",
    "priority": "high",
    "status": "open",
    "customer_id": 1,
    "agent_id": 3,
    "created_at": "2026-11-17T22:45:10Z"
  }
]
```

---

### 3. Get Ticket Details
Retrieves complete ticket metadata, including embedded Customer and Agent details.

* **Method:** `GET`
* **URL:** `/api/v1/tickets/:id`
* **Access:** Authenticated (Owner, Assigned Agent, or Admin)
* **Response (200 OK):**
```json
{
  "id": 104,
  "subject": "Payment gateway timeout on checkout",
  "description": "Full description details...",
  "category": "Payment",
  "priority": "high",
  "status": "open",
  "customer": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "agent": {
    "id": 3,
    "name": "Alex Tech Support",
    "email": "alex@company.com"
  },
  "created_at": "2026-11-17T22:45:10Z",
  "updated_at": "2026-11-17T22:45:10Z"
}
```

---

### 4. Update Ticket Status
Transitions a ticket lifecycle state. Automatically adds an immutable entry in the `ticket_histories` audit log.

* **Method:** `PATCH`
* **URL:** `/api/v1/tickets/:id/status`
* **Access:** Restricted by RBAC to **`agent`** and **`admin`** roles.
* **Request Body:**
```json
{
  "status": "in_progress"
}
```
> **Allowed Values:** `open`, `in_progress`, `resolved`

* **Response (200 OK):**
```json
{
  "id": 104,
  "status": "in_progress",
  "updated_at": "2026-11-17T22:50:00Z"
}
```

---

## 💬 Comments & Audit Trail Endpoints

### 1. Add Comment / Internal Note
Adds a message to the ticket conversation. Supports staff-only **private internal notes** that customers cannot view.

* **Method:** `POST`
* **URL:** `/api/v1/tickets/:id/comments`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "body": "Investigating the Razorpay webhook logs for transaction ID #9981.",
  "is_internal": true
}
```
> `is_internal: true` marks the comment as an internal note (only visible to Agents/Admins).

* **Response (201 Created):**
```json
{
  "id": 512,
  "ticket_id": 104,
  "author_id": 3,
  "body": "Investigating the Razorpay webhook logs for transaction ID #9981.",
  "is_internal": true,
  "created_at": "2026-11-17T22:55:00Z"
}
```

---

### 2. List Ticket Comments
Fetches conversation history. If the caller has role `customer`, `is_internal: true` notes are automatically filtered out from the database response.

* **Method:** `GET`
* **URL:** `/api/v1/tickets/:id/comments`
* **Access:** Authenticated
* **Response (200 OK):**
```json
[
  {
    "id": 512,
    "ticket_id": 104,
    "author": {
      "id": 3,
      "name": "Alex Tech Support",
      "role": "agent"
    },
    "body": "We have identified the refund issue and re-initiated the credit.",
    "is_internal": false,
    "created_at": "2026-11-17T23:00:00Z"
  }
]
```

---

### 3. Get Ticket Audit History
Returns an immutable timeline of every event that occurred on this ticket (creation, assignments, status changes).

* **Method:** `GET`
* **URL:** `/api/v1/tickets/:id/history`
* **Access:** Authenticated
* **Response (200 OK):**
```json
[
  {
    "id": 12,
    "ticket_id": 104,
    "action": "created",
    "details": "Ticket created by customer Jane Doe",
    "user": { "name": "Jane Doe" },
    "created_at": "2026-11-17T22:45:10Z"
  },
  {
    "id": 13,
    "ticket_id": 104,
    "action": "auto_assigned",
    "details": "Assigned to Alex Tech Support (Workload: 2 active tickets)",
    "created_at": "2026-11-17T22:45:10Z"
  },
  {
    "id": 14,
    "ticket_id": 104,
    "action": "status_change",
    "details": "Status changed from open to in_progress",
    "created_at": "2026-11-17T22:50:00Z"
  }
]
```

---

## ⚠️ Standard Error Response Schema

All errors follow a unified JSON payload structure:

```json
{
  "error": "Descriptive error message here"
}
```

### Common HTTP Status Codes
* **`400 Bad Request`**: Missing required JSON fields or malformed syntax.
* **`401 Unauthorized`**: Missing, invalid, or expired JWT token in `Authorization` header.
* **`403 Forbidden`**: User has valid token but lacks required role permission (e.g. customer attempting to change ticket status).
* **`404 Not Found`**: Target ticket, user, or resource does not exist.
* **`500 Internal Server Error`**: Database connectivity failure or unhandled exception.
