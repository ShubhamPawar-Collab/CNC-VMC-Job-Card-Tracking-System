# CNC/VMC Job Card & Order Tracking System
### Triangle Engineering (Sachin G.I.D.C., Surat, Gujarat)
**Domain:** Precision Manufacturing • CNC Turning & Vertical Machining Centers (VMC)  

---

## 📌 Project Overview
The **CNC/VMC Job Card & Order Tracking System** is a production-grade industrial shop floor management platform built for **Triangle Engineering**, an ISO 9001:2015 certified precision machining facility in Sachin G.I.D.C., Surat.

It replaces fragile paper job cards with an end-to-end digital lifecycle:
- **FR-1 Job Order Registration (Admin)**: Automated sequential Job ID generation (`TE-YYYY-XXX`), client creation, technical specifications, and CAD drawing upload.
- **FR-2 Job Assignment & Availability Guard (Admin)**: Strict machine availability checks (`Available`, `Busy`, `Breakdown`), operator allocation, automatic machine locking, and old-machine release during reassignment.
- **FR-3 Job Status Update & Incident Logging (Operator)**: Touch-optimized shop floor progression (`Assigned` &rarr; `In Progress` &rarr; `Inspection`), machine breakdown reporting, and dimensional rework loop tracking.
- **FR-4 Live Job Status Tracking (Admin, Client)**: Comprehensive vertical audit trail with timestamps and remarks. Allows authenticated clients and administrators to track order progress in real time.
- **FR-5 Quality Signoff, Dispatch & Job Closure (Admin)**: Quality inspection gate prior to dispatch, automated Delivery Challan generation (`DC-TE-YYYY-XXX`), machine release back to `Available`, and printable official letterhead Delivery Challan.

---

## 🛠️ Technology Stack
- **Frontend:** React 19, Vite, TailwindCSS (Clean business theme: warm off-white background, deep blue-grey navbar, steady blue primary buttons, soft status badges), Lucide Icons.
- **Backend:** Node.js, Express.js REST API, SQLite (`node:sqlite` built-in), Multer (CAD file storage), JSON Web Tokens (JWT) with role-based access control (RBAC), bcryptjs.
- **Testing:** Node.js native test runner (`node:test`, `node:assert`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20+ recommended (supports built-in `node:sqlite` and `node:test`).

### 2. Setup & Seed Database
From the root directory:
```bash
# Seed SQLite database with demo users, machines, and 12 sample jobs
npm run seed
```

### 3. Run Backend & Frontend Servers
Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
# Runs Express API on http://localhost:5000
npm run server
```

**Terminal 2 (Frontend Client):**
```bash
# Runs Vite React App on http://localhost:5173
npm run client
```

Navigate to **`http://localhost:5173`** in your browser.

---

## 🧪 Running Automated Tests
Run the automated integration test suite covering FR-1 to FR-5, RBAC guards, breakdown handling, and role-protected tracking:
```bash
npm test
```
*All integration tests pass with 0 failures.*

---

## 🔑 Demo Personas & Credentials
The application features a full-page login screen with instant 1-click demo login buttons below the credentials form, or you can log in manually:

| Persona / Role | Username | Password | Purpose / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** (Mr. Dhaval Prajapati) | `admin` | `admin123` | Full dashboard KPIs, overdue alerts, job registration, machine assignment, quality dispatch, challan printing, and history filters. |
| **Operator** (Ramesh Patel) | `op_ramesh` | `operator123` | Shop floor tablet view: assigned jobs, start machining, finish to inspection, report machine breakdowns. |
| **Operator** (Suresh Sharma) | `op_suresh` | `operator123` | Assigned jobs on Haas / LMW machines. |
| **Operator** (Rajesh Mistry) | `op_rajesh` | `operator123` | Handles precision VMC core pins and rework operations. |
| **Client** (Larsen & Toubro Heavy Eng.) | `client_lnt` | `client123` | Customer portal: view orders, live audit timelines, download delivery challans. |
| **Client** (Reliance Petrochemical) | `client_reliance` | `client123` | Customer portal for heat exchanger tube sheets and manifolds. |
| **Client** (Surat Precision Tools) | `client_surat` | `client123` | Customer portal for die casting pins and splines. |
| **Client** (Adani Ports APSEZ) | `client_adani` | `client123` | Customer portal for heavy bushings and crane guide pillars. |

---

## 🏭 Machinery Fleet (Triangle Engineering Shop Floor)
- **M-CNC-01**: Ace Micromatic Jobber XL Turning Center (Fanuc 0i-TF) — *Available*
- **M-CNC-02**: LMW Smarturn II Heavy Duty CNC Lathe (Siemens 828D) — *Busy*
- **M-VMC-01**: BFW BMV 45+ High Precision 3-Axis VMC — *Busy*
- **M-VMC-02**: Haas VF-2SS Super-Speed VMC (12,000 RPM) — *Available*
- **M-VMC-03**: Jyoti VMC 850 Performance Machining Center — *Breakdown (Under Maintenance)*

