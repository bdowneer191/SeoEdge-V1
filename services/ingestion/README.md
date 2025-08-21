# GSC Ingestion Service

## Overview

This module is responsible for connecting to the Google Search Console (GSC) API, fetching daily performance data, normalizing it, and persisting it to a Firestore collection named `gsc_raw`.

It provides two ways to trigger the ingestion process: a command-line interface (CLI) and a protected HTTP endpoint.

## Setup

Before running the service, you must set the following environment variable:

-   `FIREBASE_ADMIN_SDK_JSON_BASE64`: A Base64-encoded string of your Google Cloud Service Account JSON key. This service account needs access to both the Google Search Console API and your Firebase/Firestore project.

## Usage

### 1. Command-Line Interface (CLI)

The CLI script allows for manual triggering of the ingestion process. It's useful for backfills or ad-hoc runs.

**Prerequisites:**
- Node.js and `ts-node` installed.
- `commander` package installed (`npm install commander`).

**Command:**
```bash
ts-node services/ingestion/cli.ts --siteUrl <url> --startDate <yyyy-mm-dd> --endDate <yyyy-mm-dd>
```

**Example:**
```bash
ts-node services/ingestion/cli.ts \
  --siteUrl "sc-domain:example.com" \
  --startDate "2023-10-01" \
  --endDate "2023-10-31"
```

### 2. API Endpoint

The service can be triggered via a POST request to a Next.js API route.

**Note:** This endpoint is intended to be protected. You must implement your own authentication/authorization logic.

**Endpoint:** `POST /api/ingest/gsc`

**Request Body (JSON):**
```json
{
  "siteUrl": "sc-domain:example.com",
  "startDate": "2023-11-01",
  "endDate": "2023-11-01"
}
```

**Responses:**
-   `202 Accepted`: The ingestion process was successfully started in the background.
-   `400 Bad Request`: Missing or invalid parameters.
-   `405 Method Not Allowed`: If not a POST request.
-   `500 Internal Server Error`: If the service fails to start.

**Example with `curl`:**
```bash
curl -X POST \
  http://localhost:3000/api/ingest/gsc \
  -H "Content-Type: application/json" \
  -d '{
        "siteUrl": "sc-domain:example.com",
        "startDate": "2023-11-01",
        "endDate": "2023-11-01"
      }'
```

## Testing

To run the unit tests for this module, use the following command:

```bash
npm test -- services/ingestion/
```
