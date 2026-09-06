---
type: PostgreSQL Table
title: User
description: Represents a logged-in identity and RBAC role.
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
| `email` | TEXT | Unique email for login. |
| `role` | ENUM | Determines RBAC permissions (`ADMIN`, `EMPLOYEE`, etc). |
| `employeeId` | UUID | Links the user to an [`Employee`](employee.md). |

# Notes for consumers

- Employees can have access to the portal but require an active User account with role `EMPLOYEE`.

[^schema]: Prisma Schema
