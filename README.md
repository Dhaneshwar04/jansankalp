# 🇮🇳 JanSankalp – Public Grievance & Constituency Management Platform

> A full-stack, enterprise-grade public grievance management platform providing direct digital communication between citizens, elected MLAs, constituency offices, and municipal departments.

Built in compliance with the **JanSankalp Software Requirements Specification (SRS)**.

---

## 🏛️ Application Architecture & Major Components

### 1. Citizen Application
- **Registration & Authentication**: Mobile number + OTP simulation, Email + Password login, persistent session management.
- **Interactive Geo-Tagging**: OpenStreetMap/Leaflet map integration with device GPS capture, pin-dropping, landmark search, and reverse geocoding.
- **Real-Time Duplicate Detection**: Warns citizens if a similar active grievance in the same category exists within a 200m radius before submission.
- **Complaint Submission Wizard**: Multi-step submission with category/subcategory selection, priority suggestion, evidence upload (JPG, PNG, WEBP, MP4, PDF), and unique reference generator (`JS-2026-XXXXXX`).
- **Live Status Timeline**: Visual progress tracking across all lifecycle stages (`Submitted` → `Verified` → `Assigned` → `In Progress` → `Resolved` → `Closed`).
- **Grievance Reopening**: Allows citizens to reopen complaints with reasons if ground resolution was inadequate.
- **Satisfaction Feedback**: 5-star rating system and qualitative feedback upon resolution.
- **Multi-Language Support**: Complete localization in **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**.

### 2. MLA & Constituency Management Dashboard
- **Constituency Command Center**: High-level executive overview with live KPIs:
  - Resolution Rate %: `(Resolved / Total) * 100`
  - SLA Compliance Rate %: `(Within SLA / Total Resolved) * 100`
  - Average Resolution Time (hours)
  - Citizen Satisfaction Score (out of 5.0)
  - Critical hazard alerts & overdue countdowns
- **Interactive Geospatial Map**: Full constituency map with color-coded pins by priority/status, category filters, and ward boundary polygon overlays.
- **Ward-Level Breakdown**: Ward-by-ward complaint density and performance metrics.
- **Actionable Assignment Queue**: 1-click assignment to departments, designated officers, and field staff with remarks and resolution deadlines.
- **Official Reports**: Filterable data tables and 1-click CSV export.

### 3. Department Field Officer Desk
- **Assigned Task Backlog**: Scoped to the officer's department (e.g., PWD Roads, Water Supply, Electricity MSEDCL).
- **Progress Tracking**: Transition complaints from `Assigned` → `In Progress` → `Resolved`.
- **Resolution Proof Upload**: Before-and-after photo verification submission.
- **Direct Communication**: Interactive comment thread with citizens and the MLA office.

### 4. Super Admin Console
- **User Directory & RBAC**: Manage all users across 5 roles (Citizen, MLA, Staff, Officer, Super Admin) with instant account suspension/activation.
- **SLA Rule Matrix Configuration**: Configurable resolution target hours (Critical: 24h, High: 48h, Medium: 120h, Low: 240h).
- **Immutable Audit Trail**: Tamper-evident audit log tracking every user action, entity modified, IP address, and JSON diffs of state changes.
- **System Configuration**: Departments, categories, subcategories, and geographic boundary management.

### 5. Public Transparency Portal (Open Data)
- **Anonymized Civic Data**: Public accountability dashboard displaying constituency resolution rates, department speeds, and recent resolutions without exposing any citizen personally identifiable information (PII).

---

## 🔑 Quick Demo Credentials (1-Click Switcher Available in App)

| Persona / Role | Name & Title | Email / Identifier | Password |
|---|---|---|---|
| **Citizen** | Ramesh Sharma | `citizen@jansankalp.gov.in` | `Jansankalp@1` |
| **MLA** | Hon. Rajesh Shinde (MLA) | `mla@jansankalp.gov.in` | `Jansankalp@2` |
| **Constituency Staff** | Sunita Patil (Office Desk) | `staff@jansankalp.gov.in` | `Jansankalp@3` |
| **Department Officer** | Er. Vikrant Deshmukh (PWD) | `officer@jansankalp.gov.in` | `Jansankalp@4` |
| **Super Admin** | System Administrator | `admin@jansankalp.gov.in` | `Jansankalp@5` |

*Note: Use the interactive **"Switch Demo Persona"** pill bar at the top of the interface to switch between roles instantly!*

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, TypeScript, Better-SQLite3 with custom spatial functions (`haversine_km`, `haversine_meters`, `point_in_radius`), Multer, JWT, Bcrypt.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Leaflet.
- **Database**: SQLite (out-of-the-box zero setup) with database WAL mode, foreign key enforcement, and indexes on geospatial coordinates, status, and categories.

---

## 🚀 Running the Application

### 1. Start Both Servers with a Single Command
From the root project directory:
```bash
npm run dev
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

### 2. Run Independently
To run the server alone:
```bash
cd server
npm run dev
```

To run the client alone:
```bash
cd client
npm run dev
```

### 3. Re-seed Demo Data
```bash
cd server
npm run seed
```

### 4. Run End-to-End Integration Verification Test
```bash
cd server
node src/test-workflow.js
```
