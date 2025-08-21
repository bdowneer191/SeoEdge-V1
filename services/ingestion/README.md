# GSC Ingestion Service

## Overview

This module is responsible for connecting to the Google Search Console (GSC) API, fetching daily performance data, normalizing it, and persisting it to a Firestore collection named `gsc_raw`.

The core logic has been refactored into a standalone function, `ingestGscData`, located in `gsc-ingestor.ts`. This module is designed to be robust, with built-in retries for both API calls and database writes.

It provides two ways to trigger the ingestion process: a command-line interface (CLI) and a protected HTTP endpoint.

## Setup

Before running the service, you must set two environment variables containing Base64-encoded strings of your Google Cloud Service Account JSON keys.

-   `GSC_SERVICE_ACCOUNT_BASE64`: Service account credentials with **read-only access to the Google Search Console API**.
-   `FIREBASE_ADMIN_SDK_JSON_BASE64`: Service account credentials with **write access to your Firestore database**.

*Note: You can use the same service account for both if it has the required permissions for both services.*

## Firestore Data Schema

Data is written to the `gsc_raw` collection with the following schema:

-   `site` (string): The GSC property URL (e.g., "sc-domain:example.com").
-   `url` (string): The normalized URL of the page.
-   `query` (string): The search query.
-   `date` (string): The date of the data in `YYYY-MM-DD` format.
-   `impressions` (number): The number of impressions.
-   `clicks` (number): The number of clicks.
-   `position` (number): The average ranking position.
-   `device` (string): The device type (e.g., "DESKTOP", "MOBILE").
-   `country` (string): The three-letter country code (e.g., "USA").
-   `searchAppearance` (string): The search appearance type (e.g., "News", "Video").

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
