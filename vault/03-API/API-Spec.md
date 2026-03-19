# API Specification – MSH Society Management System

This document defines all application APIs (Server Actions) for the Contributions module.

It is designed for:
- Next.js App Router (Server Actions)
- Prisma ORM
- AI-assisted code generation

---

# 🧭 DESIGN PRINCIPLES

1. Server Actions are the primary mutation interface
2. All mutations must enforce Domain Rules
3. Financial records are immutable
4. Validation is mandatory using Zod
5. APIs must be deterministic and idempotent where applicable

---

# 🧱 CORE MODULES

- Units
- Individuals
- Ownership
- Residency
- Contributions
- Reports

---

# 📦 COMMON TYPES

```ts
type UUID = string
type ID = number