# GTM My Events by Bright Data

A Bright Data example app for GTM teams that need to turn event-specific public web research into prioritized invite lists.

## Data

On load, the app reads report JSON files from:

```txt
../reports/*.json
```

It also supports importing one or more report JSON files from the browser with the `Import report JSON` control. Imported reports are kept in the current browser session.

Expected report fields:

- `event_url`
- `city`
- `event_summary`
- `audience_hypothesis`
- `search_queries_used`
- `candidates`
- `caveats`

Candidate records can include `name`, `linkedin_url`, `headline`, `company`, `city_signal`, `relevance_score`, `relevance_rationale`, `evidence`, and `source_queries`.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
The landing page explains the agent workflow, and the report dashboard is at
[http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## Check

```bash
npm run lint
npm run build
```
