# Data Aggregation Service

## Overview

This service is designed to run as a scheduled daily job. Its primary function is to read the raw data from the `gsc_raw` Firestore collection for a specific day, compute various daily aggregate metrics, and then write these summaries into a new `analytics_agg` collection.

This pre-computation is a critical optimization for the application's dashboard, allowing for fast retrieval of historical trend data without needing to query and process large volumes of raw documents on the fly.

## Setup

Before running the service, you must set the following environment variable:

-   `FIREBASE_ADMIN_SDK_JSON_BASE64`: A Base64-encoded string of your Google Cloud Service Account JSON key. This service account needs read access to the `gsc_raw` collection and write access to the `analytics_agg` collection in your Firestore project.

## Usage

### Command-Line Interface (CLI)

The CLI script allows for manual triggering of the aggregation process for a specific date. It's useful for backfills, reprocessing data, or ad-hoc runs.

**Prerequisites:**
- Node.js and `ts-node` installed.
- `commander` package installed (`npm install commander`).

**Command:**
```bash
ts-node services/aggregation/cli.ts --date <yyyy-mm-dd>
```

**Example:**
```bash
ts-node services/aggregation/cli.ts --date "2023-11-20"
```
