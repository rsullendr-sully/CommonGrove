# Decision 0002 — Local-Only During Development

Status: Accepted  
Date: 2026-08-25

## Context

The Release 0 prototype uses simulated information and is still undergoing product-owner review. Publishing it would add an external source repository and hosted surface before either is necessary.

## Decision

Keep the prototype on the development computer during design and internal preparation.

- Serve the prototype only through `localhost`.
- Do not upload prototype source to a hosting repository.
- Do not create a public, workspace-wide, or employee-accessible link yet.
- Do not enter real employee, customer, ticket, project, or performance data.
- Use only sanitized fictional examples during Release 0.

Before staff-accessible hosting, review the prototype's privacy language, intended participants, access list, data handling, and feedback process.

## Future hosted access

If remote staff testing becomes necessary, begin with an owner-only private deployment. Move to a named-user allowlist only after the owner verifies the deployment and explicitly approves each audience group. Public and workspace-wide access are out of scope for Release 0.

## Consequences

Review must occur on the development computer or by viewing a locally presented screen. This reduces convenience but minimizes disclosure and accidental distribution while the concept is unsettled.

