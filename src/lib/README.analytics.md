# Analytics events

The browser may send only the following event and payload pairs:

| Event | Payload |
| --- | --- |
| `page_view` | `{}` |
| `tool_view` | `{ tool_slug }` |
| `category_view` | `{ category_slug }` |
| `search_used` | `{ results_count }` |
| `tool_cta_click` | `{ tool_slug }` |
| `related_tool_click` | `{ tool_slug, related_tool_slug }` |
| `sponsor_impression` | `{ sponsor_id }` |
| `sponsor_click` | `{ sponsor_id }` |
| `advertise_cta_click` | `{ placement }` |

All identifiers must be lowercase, hyphen-separated safe identifiers. The
client rejects unexpected properties and invalid values before sending.

Normal analytics events do not contain a visitor ID, session ID, page path,
URL, search text, browser error, timestamp, or free-form field. Search text is
used only inside the browser to produce results.

The online-presence heartbeat is separate. It sends one random identifier that
exists only in the page's memory, is not reused for normal events, contains no
page path, and disappears when the page closes.

The client allowlist is defense in depth. It does not replace independent
server-side validation in the Analytics Worker. See
`docs/security/analytics-worker-hardening.md`.
