# Error Model

Status: Draft (V1)
Owner: Engineering
Last Updated: 2026-03-19

## Purpose
Standardize API and Server Action error responses so frontend and logs remain consistent.

## Principles
1. Predictable shape for all errors.
2. Stable machine-readable codes.
3. Human-readable message safe for end users.
4. No stack traces or sensitive internals in API responses.

## Error Envelope

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input is invalid.",
    "details": [
      {
        "field": "email",
        "reason": "Invalid format"
      }
    ],
    "requestId": "req_123",
    "retryable": false
  }
}
```

## Success Envelope

```json
{
  "ok": true,
  "data": {}
}
```

## Error Code Catalog (V1)

| Code | HTTP | Meaning | Retryable |
|---|---:|---|---|
| VALIDATION_ERROR | 400 | Input failed schema or business pre-check | No |
| UNAUTHORIZED | 401 | Authentication missing/invalid | No |
| FORBIDDEN | 403 | Authenticated but not allowed | No |
| NOT_FOUND | 404 | Resource does not exist | No |
| CONFLICT | 409 | Duplicate or state conflict (for example duplicate contribution period) | No |
| PRECONDITION_FAILED | 412 | Domain precondition failed | No |
| RATE_LIMITED | 429 | Too many requests | Yes |
| INTERNAL_ERROR | 500 | Unexpected server failure | Maybe |
| SERVICE_UNAVAILABLE | 503 | Temporary dependency failure | Yes |

## Domain-Specific Error Mappings
1. Overlapping ownership timeline -> `CONFLICT`.
2. Overlapping residency timeline -> `CONFLICT`.
3. Duplicate contribution for same unit/head/period -> `CONFLICT`.
4. Attempt to edit immutable financial record -> `PRECONDITION_FAILED`.
5. Missing active rate at payment time -> `PRECONDITION_FAILED`.

## Authorization and Access-Control Mappings
1. Unauthenticated mutation/list request -> `UNAUTHORIZED` (401).
2. Authenticated user lacking required role for action (for example Read-Only attempting payment capture) -> `FORBIDDEN` (403).
3. Authenticated user attempting role management without Society Admin role -> `FORBIDDEN` (403).
4. Direct API call to hidden UI action must still return `FORBIDDEN` (403) when permission is missing.

## PII Visibility and Response Policy
1. PII masking is a presentation policy, not an authorization failure by itself.
2. For allowed Read-Only list/report views, sensitive fields should be masked in payload (for example mobile/email partial masking) instead of throwing `FORBIDDEN`.
3. If a role is not allowed to access a PII-only endpoint, return `FORBIDDEN` (403).
4. Never include unmasked sensitive data in error payloads.

PII masking example:

```json
{
  "ok": true,
  "data": {
    "individual": {
      "name": "R Singh",
      "email": "r***@example.com",
      "mobile": "95******21"
    }
  }
}
```

## Validation Error Details
- `details` should include field-level issues when available.
- For cross-field validation, use `field` as `"_global"`.

Example:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Date range is invalid.",
    "details": [
      { "field": "fromDt", "reason": "must be <= toDt" },
      { "field": "toDt", "reason": "must be >= fromDt" }
    ]
  }
}
```

## Logging Contract
1. Log full internal error with stack trace server-side only.
2. Return safe public message in API response.
3. Always attach `requestId` where available.

## Reusable Template Notes
For other projects, keep:
- envelope structure
- stable code catalog
- mapping table from domain rule to code

Change only:
- specific domain mappings
- retry semantics if required by infrastructure
