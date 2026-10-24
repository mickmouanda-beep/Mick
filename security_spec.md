# Security Specification - Eco GES

## 1. Data Invariants
- An establishment cannot exist without a unique code.
- A user must be associated with exactly one establishment.
- All write operations must be authenticated and authorized.

## 2. The "Dirty Dozen" Payloads (examples for establishments)
1. { "id": "test", "name": "Test", "code": "TEST", "academic_year": "2026" } (Missing mandatory fields)
2. { "id": "test", "name": "Test", "code": "TEST", "academic_year": "2026", "illegal": "field" } (Shadow field)
3. ... (Other payloads will be added here)

## 3. Test Runner
- `firestore.rules.test.ts` to be created.
