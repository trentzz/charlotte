# Charlotte — Project Instructions

## Feature tracking

After every feature request or implementation, update `docs/FEATURES.md` to reflect the current state of the platform. This includes:

- New features added or changed
- Design decisions (layout, typography, colour scheme)
- Dashboard capabilities
- Anything the user has asked for that is planned but not yet built (add to the "Planned / requested" section)

Do this in the same session as the work, not as an afterthought.

## Verify your work

After implementing any change, check that it actually matches what was requested:

- Re-read the user's original request and compare it against what was built.
- Check that templates reference the correct classes, that CSS classes exist, and that handlers pass the right data.
- Look at the Docker logs after restarting (`docker logs charlotte-charlotte-1 2>&1 | tail -20`) and fix any template execution errors before reporting done.

## Restart Docker after every change — mandatory

**Always** rebuild and restart the container after any change, without exception and without being asked. This applies to every code edit, no matter how small.

```
docker compose up -d --build
docker logs charlotte-charlotte-1 2>&1 | tail -20
```

The app runs on port 9271. Do not report a task as done until the container is running cleanly and the logs show no errors. If subagents make changes, they must also restart Docker themselves before returning.

## DB migrations

New columns and tables go in `internal/db/migrations.go` as new entries appended to the `migrations` slice. Each entry is applied exactly once, in order. Never modify existing entries.
