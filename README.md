[start of file]
filename="README.md"

SeoEdge: AI-Powered SEO Analytics & Workflow Companion
This repository contains the full specification and implementation plan for SeoEdge, an AI-assisted application designed to diagnose and recover organic traffic, streamline editorial workflows, and provide data-backed SEO recommendations. This document serves as the single source of truth (SoT) for both human developers and AI coding assistants.

📜 Table of Contents
Project Roadmap

Technical Architecture

Implementation Plan (AI-Ready Tasks)

AI Prompt Templates & Schemas

CI/CD, Deployment & Security

Testing & Validation

Anti-Hallucination Principles

1. Project Roadmap
Our development is phased to deliver value quickly and iterate.

🚀 MVP (0–30 Days)
The goal is to deliver core value fast.


GSC Connector: Ingest 90 days of Google Search Console data into Firestore/BigQuery via a service account.


Backend API: A basic API (Next.js Serverless or Firebase Function) to return aggregated metrics.


Frontend Dashboard: A dashboard showing top traffic trends, a list of pages with significant performance drops, and a single-page drilldown view.


AI Companion (Endpoint): A simple endpoint that takes a page ID and returns a JSON object with a suggested title, meta description, summary, and a checklist. This must be deterministic and have unit tests.


CI/CD: A continuous integration pipeline with tests and deployment to a staging environment on Vercel.

Phase 2 (30–60 Days)

Advanced Features: Add topic clustering using embeddings, competitor SERP snapshots, and an editorial task creation system.


Experimentation: Implement an A/B title/meta experiment runner that either integrates with a CMS or exports to CSV.


Automation: Set up scheduled data ingestion and alerting.

Phase 3 (60–120 Days)

Full Editorial Workflow: A complete system with a task board, approvals, and auto-push capabilities to a CMS.


Advanced Tooling: An experiment manager, long-term ML models, and a ranking simulator.

2. Technical Architecture
Tech Stack

Frontend: Next.js (TypeScript) for easy Vercel deployment and SSR/ISR for SEO.


Styling: Tailwind CSS.


Database: Firestore for rapid prototyping, with the option to use BigQuery for heavy analytics later.


Serverless: Next.js API routes or Firebase Functions for secure backend operations.


AI/LLM: OpenAI or a similar service, wrapped in a microservice with caching.


Monitoring: Sentry and Vercel Analytics, with Prometheus as an option if needed.

Repository Structure
Bash

/repo-root
├─ README.md
├─ package.json
├─ .github/
│  └─ workflows/ci.yml
├─ apps/
│  ├─ web/                # Next.js frontend
│  └─ api/                # Next.js serverless functions
├─ services/
│  ├─ ingestion/          # GSC/GA4 connectors, ETL
│  └─ ai-companion/       # Prompts, wrappers, tests
├─ infra/
│  └─ firestore.rules
├─ tests/
│  ├─ unit/
│  └─ integration/
└─ scripts/
   └─ local-dev-helpers
Firestore Data Model
Collections use strict, predictable schemas.

gsc_raw/{docId}
Stores raw, unprocessed data from Google Search Console.

JSON

{
  "site": "string",
  "url": "string",
  "query": "string",
  "impressions": "number",
  "clicks": "number",
  "position": "number",
  "date": "string",
  "device": "string",
  "country": "string",
  "searchAppearance": "string"
}
pages/{pageId}
Canonical information for each page.

JSON

{
  "url": "string",
  "canonical": "string",
  "title": "string",
  "meta": "string",
  "last_published": "string",
  "cw_vitals_summary": "object",
  "tags": ["string"],
  "topics": ["string"]
}
analytics_agg/daily_{YYYYMMDD}
Daily aggregated metrics.

JSON

{
  "site": "string",
  "country": "string",
  "device": "string",
  "impressions": "number",
  "clicks": "number",
  "avg_position": "number"
}
tasks/{taskId}
Editorial tasks assigned to users.

JSON

{
  "pageId": "string",
  "action": "string",
  "assignee": "string",
  "status": "string",
  "createdAt": "string",
  "priority": "number"
}
ai_suggestions/{pageId}/{timestamp}
Logs and caches suggestions from the AI Companion.

JSON

{
  "promptHash": "string",
  "responseJSON": "object",
  "model": "string",
  "confidence": "number",
  "approved": "boolean"
}
3. Implementation Plan (AI-Ready Tasks)
Follow these steps to build the application. Each step includes a clear task description suitable for an AI assistant.

Step 0: Manual Preparation
Create the GitHub repository, Vercel project, and Firebase project.

Create a Google Cloud Service Account with "Search Console API" and "Indexing API" access.

Download the service account's JSON key and store it as a secret in Vercel.

Enable the GA4 API if needed.


Deliverable: All projects are created and secrets are securely stored.

Step 1: Ingestion Service (ETL)

AI Task: Build an ingestion module to connect to the GSC API using a service account key. It should accept a date range and site URL, pull daily data (impressions, clicks, position, etc.), normalize URLs, and write the raw rows to the 

gsc_raw Firestore collection. Implement batching and retries. Provide both a CLI and a protected HTTP endpoint to trigger the service.


Constraints: Must include unit tests that mock GSC responses and verify URL normalization rules.


Deliverable: A services/ingestion/ module with code, unit tests, a README, and an OpenAPI specification for the endpoint.

Step 2: Normalization & Aggregation Service

AI Task: Implement a scheduled job that runs daily. It should read from 

gsc_raw, perform canonical resolution for URLs, and write daily aggregated data to the analytics_agg/daily_{YYYYMMDD} collection.


Deliverable: A script with unit tests and documented JSON schema for the aggregation output.

Step 3: Backend API

AI Task: Create the following API endpoints:


GET /api/metrics/site?start=...&end=...: Returns an aggregated time series of site metrics.


GET /api/pages/losses?threshold=...: Returns a list of pages that have lost significant traffic.


GET /api/page/{pageId}: Returns metadata and the latest metrics for a single page.


Constraints: All endpoints must return strict JSON and have unit/integration tests that mock Firestore.


Deliverable: An apps/api module with tests and an OpenAPI specification.

Step 4: Frontend Dashboard (MVP)

AI Task: Build the Next.js frontend dashboard. The homepage should show a site summary and a list of top-losing pages. Create a page drill-down view that shows a time series, top queries, and an AI suggestion panel. Implement authentication using Firebase Auth (Google Sign-In).


UI Expectations: Use Tailwind CSS for a responsive, mobile-first design. Each data panel must show a timestamp and its data source.


Deliverable: Working frontend pages with unit tests for key components.

Step 5: AI Companion Microservice

AI Task: Build a microservice that accepts a pageId, fetches relevant data from Firestore, calls the LLM with a deterministic prompt, and returns a JSON object matching a strict schema. Implement a validation layer that retries on schema mismatch and caches responses in the 

ai_suggestions collection using a promptHash.


Deliverable: A service with tests that simulate prompts and assert schema validation.

4. AI Prompt Templates & Schemas
Use these templates to instruct the AI and ensure deterministic, high-quality output.

Feature Implementation Prompt
SYSTEM: You are a senior TypeScript engineer. Produce only valid files and tests.

TASK: Implement [FEATURE_NAME] with these exact requirements:
- Input: [Explain HTTP input or CLI args]
- Output: [Exact JSON schema or files to create]
- Persistence: [Firestore collection path and expected document fields]
- Tests: Include unit tests that assert X, Y, and Z.
- Constraints: Must use TypeScript, Node 18+, no external network calls in tests (mock), and follow eslint + prettier code style.

DELIVERABLES:
1) Files to add/update with full content.
2) Unit tests (jest) that pass.
3) A short README describing how to run the feature locally.
AI Companion Content Prompt
SYSTEM: You are an SEO assistant. Always return JSON only, with no explanations.

INPUT:
- page_title: "<string>"
- page_url: "<string>"
- page_text_snippet: "<first 1200 chars>"
- top_queries: [{"query":"", "impressions":int}, ...]
- competitor_titles: ["", ...]

OUTPUT SCHEMA (JSON):
{
  "title": "<string, <=70 chars>",
  "meta_description": "<string, <=155 chars>",
  "summary": "<string, <=300 chars>",
  "h2_suggestions": ["string"],
  "seo_checklist": ["string"],
  "confidence": 0.0
}

CONSTRAINTS:
- Use only the information provided in `page_text_snippet` and `top_queries`.
- Do not invent facts (e.g., new quotes or dates).
- Titles must contain the primary query if one is provided.
- Return EXACT JSON only.
5. CI/CD, Deployment & Security
CI/CD & Deployment

Vercel: Connect the GitHub repo and use environment variables for secrets like GSC_KEY, OPENAI_API_KEY, and FIREBASE_ADMIN_SDK.


GitHub Actions: Use for CI to run tests and linting. Pushing to the 

main branch triggers an automatic Vercel deployment.


Branching: Use a staging branch for preview deployments and main for production. Enforce PR protection and code reviews.

Security & Production Hardening

Permissions: Restrict the GSC service account to only your property and store the key securely in Vercel secrets.


Firestore Rules: Enforce role-based access for editors vs. viewers.


Rate Limiting: Rate-limit LLM calls and implement caching.


Best Practices: Use Content Security Policy (CSP), HTTPS-only cookies, and rotate keys quarterly.

6. Testing & Validation

Unit Tests: Test data normalization and transformation logic (e.g., URL canonicalization).


Integration Tests: Mock GSC API responses and assert that the correct data is written to Firestore.


Contract Tests: Validate AI Companion outputs against the required JSON schema.


E2E Tests: Test critical user flows like ingestion, aggregation, API calls, and frontend rendering using a mocked database for CI.

7. Anti-Hallucination Principles

Schema Enforcement: Always require JSON-only responses from the LLM and validate them against a JSON Schema.


Deterministic Calls: Use a promptHash to detect when the same prompt yields different results and flag it for review.


Auditing: Persist the original prompt, the raw LLM output, and the sanitized output for a complete audit trail.


Unit Testing AI: Validate AI outputs with small, deterministic tests (e.g., check character limits on titles and metas). If a test fails, retry or fall back to a safe default.

[end of file]
