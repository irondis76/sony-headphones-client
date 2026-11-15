# Model Inventory

This is the canonical index for source-backed system models and human HTML review surfaces.

## Rules

- Auto-detect model impact for each engineering change.
- Update the relevant canonical model source when code, API, workflow, dependency, deployment, or UX structure changes.
- Keep generated HTML under `generated/review/models/` and treat it as a review surface, not source of truth.
- Record every durable model in `docs/artifacts/artifacts.manifest.json` with source, modelId, method, modelKind, owner, and reviewSurface.

## Inventory

| Model ID | Kind | Method | Canonical Source | Human HTML Review | Owner | Implementation Touchpoints |
| --- | --- | --- | --- | --- | --- | --- |
| example-system-context | context | c4 | docs/artifacts/source/models/example-system-context.md | generated/review/models/example-system-context.html | system-modeler | apps, packages, deployment |

## Change Log

| Date | Model ID | Change | Source/Evidence |
| --- | --- | --- | --- |
