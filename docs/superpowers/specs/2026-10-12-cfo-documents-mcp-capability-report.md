# cfo.ai MCP capability report (read-only discovery)

**Date:** 2026-10-12  
**Harness:** Cursor `user-cfoai` MCP (authenticated interactive session)  
**MCP endpoint:** `https://api.cfo.ai/mcp`  
**Schema fingerprint:** 35 published tools (SDK `tools/list` via Cursor catalog, 2026-10-12)

## Workspace binding

| Field | Value |
|-------|--------|
| org_id | `103299` |
| name | State Street |
| slug | `state-street-5dead580` |
| role | admin |

Single workspace on this account — `org_id` optional on tool calls per server contract. ProductSense will still persist `org_id` per user after backend OAuth verification.

## OAuth metadata (unauthenticated probe)

| Item | Observed |
|------|----------|
| MCP unauthenticated | `401` + `WWW-Authenticate: Bearer resource_metadata="https://api.cfo.ai/.well-known/oauth-protected-resource/mcp"` |
| Protected resource | `https://api.cfo.ai/.well-known/oauth-protected-resource/mcp` → resource `https://api.cfo.ai/mcp`, authorization server `https://complete-cottage-73.authkit.app` |
| Authorization server | `/.well-known/oauth-authorization-server` on AuthKit host: `authorization_code`, `refresh_token`, `device_code`; **dynamic client registration** at `/oauth2/register`; PKCE `S256`; `token_endpoint_auth_methods_supported`: `none`, `client_secret_post`, `client_secret_basic` |
| Service account / client-credentials | **Not documented** on public MCP docs; not observed in AuthKit grant list |

**Backend implication:** Implement OAuth authorization code + PKCE via `@modelcontextprotocol/sdk` `StreamableHTTPClientTransport` + `OAuthClientProvider`. Do **not** reuse Cursor tokens.

## Published tools (35)

```
call_connected_api
edit_canvas_blocks, edit_dimension_mappings, edit_guides, edit_history,
edit_integrations, edit_memory, edit_org, edit_pages, edit_profile,
edit_scenarios, edit_skills, edit_table_blocks, edit_team, edit_triggers
inspect_billing, inspect_canvas_blocks, inspect_canvas_library,
inspect_dimension_mappings, inspect_documentation, inspect_guides,
inspect_history, inspect_integrations, inspect_memory, inspect_pages,
inspect_profile, inspect_scenarios, inspect_skills, inspect_table_blocks,
inspect_team, inspect_triggers
list_orgs
mcp_auth, notify_user, validate_code_blocks
```

**Not exposed:** `inspect_source_data` (no match in catalog). Plan ingestion readiness via `inspect_integrations` `ingestion` / `outcomes` only.

## Ingestion-related actions (verified schemas)

| Tool | Action | Status |
|------|--------|--------|
| `edit_integrations` | `ingest_csv` | Exposed; `user_intent` required; inline `csv_content` max **262144 UTF-8 bytes**; upload path via `size_bytes` max **52428800** |
| `edit_integrations` | `start_ingestion` | Exposed |
| `inspect_integrations` | `outcomes`, `connections`, `ingestion` | Exposed |
| `inspect_skills` | `list`, `instructions` | Exposed |

## Built-in skills (`inspect_skills` `list`)

| Skill | Purpose (summary) |
|-------|-------------------|
| `build-model` | Variables, formulas, dimensions, tables |
| `connect-data-sources` | Connections, ingestion, readiness |
| `import-model` | Workbook → native model |
| `build-visualizations` | Canvas blocks |
| `discover-onboarding-intent` | Onboarding (out of scope) |

## Read-only workspace snapshot (2026-10-12)

| Inspect | Result |
|---------|--------|
| `inspect_integrations` `outcomes` | `[]` (no saved connections) |
| `inspect_pages` `list` | 0 pages |
| `inspect_scenarios` `list` | Main Scenario + 2 sandboxes |

No writes performed during discovery.

## Cursor vs backend

| Capability | Cursor MCP | Node backend |
|------------|------------|--------------|
| OAuth | User browser via Cursor | **Not implemented until** `/integrations/cfo/*` flow verified |
| `list_orgs` | Works when connected | Pending backend OAuth |
| `ingest_csv` | Available in schema | Pending backend OAuth + write policy |

## Implementation checklist (from brief)

1. [x] Repository + MCP discovery + this report  
2. [ ] Backend OAuth routes + encrypted credential store  
3. [ ] Read-only MCP proof (`list_orgs`) via backend credentials  
4. [ ] Tiny CSV `ingest_csv` + `inspect_integrations` readiness + readback  
5. [ ] SQLite BLOB documents + dataset pipeline (`documents`, `dataset_versions`, `cfo_bindings`, `jobs`, `questions`)  
6. [ ] Question orchestrator + tests  
7. [ ] Runbook + final Ishan report  

## Risks / blockers

- **Redirect URI:** Must register `PUBLIC_API_URL/integrations/cfo/callback` via dynamic client registration; if AuthKit rejects localhost or production host, escalate to cfo.ai support (do not scrape app APIs).  
- **No `inspect_source_data`:** Row-level verification may rely on `inspect_integrations` ingestion outcomes and model property inspection only.  
- **Excel:** `ingest_csv` is CSV-oriented; XLSX requires local parse → normalized CSV export before MCP publish (per brief).  
- **Test workspace:** Ingestion tests should use a dedicated workspace when available; current binding is production-like **State Street** — use minimal test CSV and non-destructive connection names when writing begins.
