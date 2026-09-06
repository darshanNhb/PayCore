---
type: PostgreSQL Table
title: Employee
description: Represents a physical person working for the company.
resource: prisma/schema.prisma
tags: [database, schema]
generated: { by: okf-bundle-generator/antigravity, at: 2026-09-06T00:05:50.060Z }
sources:
  - id: schema
    resource: prisma/schema.prisma
    title: Prisma Schema
---

# Schema

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `employeeCode` | TEXT | Unique identifier (e.g. EMP/2026/0048). |
| `workEmail` | TEXT | Company email address. |
| `departmentId` | UUID | Links to their Department. |
| `bankAccountNumberEncrypted` | TEXT | Encrypted bank details via AES-256-GCM. |

# Notes for consumers

- Bank details are encrypted at rest. Do not expose this payload directly via APIs without decryption.

[^schema]: Prisma Schema
