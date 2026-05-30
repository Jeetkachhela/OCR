# AETHERIA - AI Logistics Document Intelligence Platform

Aetheria is an enterprise-grade cognitive document ingestion, OCR parsing, business validation, and semantic retrieval infrastructure designed to automate shipping compliance, detect anomalies, and streamline logistics operations.

---

## Core Product Capabilities

1. **Intelligent Document Ingest & Validation**: isolated multipart uploads supporting PDFs, waybills, cargo manifests, shipping labels, and commercial invoices. Prevents double-processing using SHA-256 duplicate hashes.
2. **Dynamic OCR Bounding Overlays**: computes 2D coordinates for layouts and projects interactive coordinates outlines directly on a visual rendering canvas in the UI.
3. **Structured AI Schema Extraction**: leverages Groq/Llama-3 to parse text into strict JSON compliance schemas (shipment IDs, weights, sender/receiver, HS customs codes).
4. **Resilient Dual-Mode Engineering**: falls back gracefully to a robust regex-based Logistics Context Parser and TF-IDF cosine-similarity search engine if remote API keys (Groq/OpenAI) or local C++ bindings are not configured.
5. **Business Rule Audits**: validation engine flags zero-weights, malformed IDs, low-confidence OCR, and destination mismatches.
6. **Hardened RBAC Security**: JWT authorization stored in HTTP-Only, secure lax cookies with auditable ledger records and rate-limiting middleware.

---

## Architectural Framework & Tech Stack

```
/workspace (d:\OCR)
├── /backend
│   ├── /app
│   │   ├── /api          # Auth, Documents Ingest, Search, Analytics, Alerts, Compliance Reports
│   │   ├── /core         # Configurations, Pool DB, JWT Security, RBAC Guards, Exceptions
│   │   ├── /models       # SQLAlchemy Database Tables (Users, Documents, OCRResults, etc.)
│   │   ├── /schemas      # Pydantic schemas (Request/Response validators)
│   │   ├── /services     # Business logic layers (OCR, Llama-3 AI, BM25/Cosine Search, Audits)
│   │   └── /utils        # Telemetry, logger wrappers
│   ├── main.py           # FastAPI gateway, Rate limiter, WebSockets
│   ├── seed.py           # Neon Database Seeder
│   └── requirements.txt  # Python requirements
└── /frontend
    ├── /src
    │   ├── /app          # Next.js 15 App Router
    │   ├── /components   # Reusable UI (Glassmorphic Sidebar, Header, Alerts bells)
    │   ├── /context      # Zustand state store
    │   └── /lib          # Fetch client helper
    ├── package.json      # NPM dependencies
    └── tsconfig.json
```

---

## Rapid Setup & Startup Manual

Ensure you have **Python 3.14+** and **Node v24+** installed.

### 1. Backend Service Configuration
We have already created the `.env` configuration file containing the Neon cloud PostgreSQL database URL and Groq API key:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### Seed Database
The database has already been successfully seeded with chief admin accounts, operator accounts, and historical waybills:
```bash
python seed.py
```

#### Run FastAPI
Launch the backend server:
```bash
python main.py
```
The server will boot on `http://localhost:8000`. Full OpenAPI documentation can be reviewed at `http://localhost:8000/api/docs`.

### 2. Frontend Workspace Configuration
Navigate to the Next.js directory and launch the development environment:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser. You will be greeted by the obsidian-dark login wall.

---

## Operator Access Credentials

Access the operational terminal using these pre-seeded accounts:

* **Operations Auditor (Operator Role)**:
  * **Email**: `operator@logistics.ai`
  * **Access Key**: `operatorpassword`
* **Chief Administrator (Admin Role)**:
  * **Email**: `admin@logistics.ai`
  * **Access Key**: `adminpassword`

---

## Cyber Security Hardening Guidelines

Aetheria is hardened against standard web vulnerabilities:
* **No localStorage Tokens**: Session JWTs are stored in HTTP-Only, Lax, Secure cookies, strictly immune to XSS-based token theft.
* **Central Exception Wrappers**: Sanitizes server errors to protect database schema names against reverse engineering.
* **Central Rate Limiting**: Rate limits clients to 100 requests per minute to block brute-force attempts and API flooding.
* **MIME & Upload Sanitization**: Audits uploaded files against a whitelist of valid PDFs/images and limits size to 15MB to block malware exploits.
