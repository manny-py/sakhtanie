# Analytics Worker hardening requirements

## Scope boundary

The Analytics Worker source, Wrangler configuration, storage schema, and
deployment configuration are not present in this repository. The frontend uses:

- production origin: `https://sakhtanie.ir`
- Worker origin: `https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev`

This document is a release checklist for a separate Worker change. Nothing here
has been deployed by the frontend repository.

## Request contracts

Validate every request on the server before storage. Client validation is only
defense in depth.

### Event ingestion

- Accept `POST /` only.
- Reject a body larger than 4,096 bytes before parsing it.
- Accept the Beacon-compatible `text/plain` JSON body used by the frontend.
- Require a plain JSON object with exactly `event` and `payload` at the top
  level. Reject unknown, missing, duplicated, inherited, or unexpected fields.
- Permit only the following exact event/payload schemas:

| Event | Exact payload |
| --- | --- |
| `page_view` | `{}` |
| `tool_view` | `{ "tool_slug": safe_identifier }` |
| `category_view` | `{ "category_slug": safe_identifier }` |
| `search_used` | `{ "results_count": integer 0..10000 }` |
| `tool_cta_click` | `{ "tool_slug": safe_identifier }` |
| `related_tool_click` | `{ "tool_slug": safe_identifier, "related_tool_slug": safe_identifier }` |
| `sponsor_impression` | `{ "sponsor_id": safe_identifier }` |
| `sponsor_click` | `{ "sponsor_id": safe_identifier }` |
| `advertise_cta_click` | `{ "placement": safe_identifier }` |

`safe_identifier` means 1–80 lowercase ASCII characters matching
`^[a-z0-9]+(?:-[a-z0-9]+)*$`. Reject all unexpected properties instead of
silently retaining them. Do not accept generic metadata or arbitrary strings.

Explicitly reject `client_error` and any payload containing search text,
messages, stacks, filenames, source paths, URLs, destinations, referrers,
tokens, email addresses, page paths, visitor IDs, or session IDs.

### Online-presence heartbeat

- Accept `POST /v1/heartbeat` only.
- Reject a body larger than 512 bytes before parsing it.
- Require exactly `{ "session_id": uuid_v4 }`; reject every other property.
- Treat the ID as a volatile presence key only. Apply a TTL of 120 seconds and
  never join it to analytics events or longer-lived records.
- Do not accept or store a page path, URL, referrer, raw User-Agent, or raw IP.
- If country-level presence is required, derive the two-letter country code at
  request time from Cloudflare request metadata and store only the country code
  with the volatile presence entry.

## Origin and CORS

- For every state-changing request, require `Origin` to equal exactly
  `https://sakhtanie.ir`. Missing, `null`, Pages-preview, suffix-matched, and
  lookalike origins must be rejected.
- Return `Access-Control-Allow-Origin: https://sakhtanie.ir`, never `*` or a
  reflected value, plus `Vary: Origin`.
- Allow only the methods required by each route. Preflight responses should
  allow `POST` and `Content-Type` for ingestion/heartbeat; public read routes
  should allow only `GET`/`HEAD` as appropriate.
- Origin validation is not authentication and must be combined with schema,
  size, and abuse controls.

## Responses, logging, and storage

- Use fixed error bodies such as `{ "success": false, "error": "invalid_request" }`.
  Never echo a rejected value or request body.
- Never log request bodies, payloads, identifiers, raw IP addresses, raw
  User-Agent strings, raw URLs, paths, search queries, or error messages.
- Configure observability to log only fixed outcome codes, route names, status,
  duration, and aggregate counters. Review platform sampling and exception logs
  for accidental request serialization.
- Do not persist raw IP or User-Agent values. Any IP processing used by
  Cloudflare for delivery or short-window abuse controls must remain transient.
- Normal event storage must contain only the allowed event name, allowed
  payload fields, and a server-generated time bucket. Do not store client
  timestamps or a stable actor identifier.

## Aggregated-only public APIs

`GET /v1/dashboard` must return only bounded aggregate fields:

- `success`, `range_days`
- `summary.totalViews`, `summary.toolViews`, `summary.searches`, and
  `summary.toolCtaClicks`
- `viewsOverTime[]` with a date bucket and aggregate view count
- `popularTools[]` with a validated tool slug and aggregate view count

It must never return raw events, individual sessions, presence IDs, IP-derived
identifiers, paths, recent errors, error payloads, messages, or timestamps tied
to a person. Limit the date range and result count server-side.

`GET /v1/live` may return only `success`, the aggregate `online` count,
`window_seconds`, and bounded country/count buckets. Suppress country buckets
below five active entries (or merge them into a non-geographic remainder) so a
single person's country is not exposed. Never return presence IDs or precise
coordinates.

## Retention and existing data

Before the hardened Worker is deployed, confirm the actual storage technology
and make retention enforceable:

- volatile heartbeat/presence rows: maximum 120 seconds;
- allowed raw event rows: maximum 30 days;
- daily aggregate counts: maximum 13 months;
- rejected requests and request bodies: no application storage.

Use scheduled deletion/TTL appropriate to the storage system and add an
automated verification that expired rows are gone. Document the implemented
durations in the public privacy page only after production verification.

Existing storage requires a deliberate migration:

1. Stop accepting `client_error`, query text, destination URLs, paths, and
   persistent session IDs before any migration runs.
2. Inventory tables/keys and access paths without exporting sensitive values to
   logs.
3. If historical counts are needed, aggregate them into non-identifying daily
   totals in a controlled migration.
4. Delete old raw error messages, sources, paths, search queries, destination
   URLs, persistent identifiers, raw events, raw IPs, and raw User-Agents.
5. Verify deletion from primary storage, replicas, caches, exports, logs, and
   backups according to the storage provider's deletion lifecycle.

## Abuse and rate limiting

Apply controls in this order: method and origin check, byte-length limit, rate
limit, JSON parse, exact schema validation, then storage. Return a fixed `429`
response for limits.

Cloudflare Workers Rate Limiting bindings are suitable as one layer. The
current API uses a unique integer `namespace_id`, a `simple` limit, and a period
of either 10 or 60 seconds. A future Worker can start with separate bindings:

```jsonc
{
  "ratelimits": [
    {
      "name": "EVENT_RATE_LIMITER",
      "namespace_id": "REPLACE_WITH_UNIQUE_INTEGER_NAMESPACE",
      "simple": { "limit": 120, "period": 60 }
    },
    {
      "name": "HEARTBEAT_RATE_LIMITER",
      "namespace_id": "REPLACE_WITH_ANOTHER_UNIQUE_INTEGER_NAMESPACE",
      "simple": { "limit": 10, "period": 60 }
    }
  ]
}
```

The Worker must call the route's binding before parsing. For an anonymous site,
use conservative limits because IP addresses can be shared. If an actor key is
required, derive a short-lived HMAC of the connecting IP with a rotating secret,
never log either input or key, and use it only for the rate-limit window. Add a
high, route-wide per-location cap and Cloudflare WAF rate-limiting rules as
coarse backstops. Binding counters are permissive/eventually consistent and
local to a Cloudflare location, so they are not the only abuse control.

Monitor aggregate accepted/rejected/limited counts without request samples.
Alert on ingestion spikes, schema-rejection spikes, storage growth, and repeated
origin failures. Add Worker tests for every accepted schema and for oversized
bodies, extra properties, every forbidden field, invalid origin, CORS,
fixed-error responses, retention, and aggregated-only public output.

Reference: [Cloudflare Workers Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
