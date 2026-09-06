---
type: Frontend App
title: PayCore Web Interface
description: The main Next.js Application UI for Admins, HR, and Employees.
resource: app/
tags: [frontend, nextjs, react]
generated: { by: okf-bundle-generator/antigravity, at: 2026-09-06T00:05:50.060Z }
sources:
  - id: layout
    resource: app/layout.tsx
    title: Root Layout
---

# What it is

The frontend application built with Next.js (App Router). It consists of two distinct areas:
- The `(app)` directory containing the Admin and HR dashboard, employee lists, and payroll execution engine.
- The `portal/` directory acting as a restricted self-service interface for standard employees.

# Responsibilities

- Renders real-time dashboards and forms.
- Enforces RBAC visibility on UI elements.
- Connects to the backend [API](paycore-api.md) for data mutations.

# How to run it locally

    pnpm install
    pnpm dev
