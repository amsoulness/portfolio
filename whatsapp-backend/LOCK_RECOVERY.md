
# ASLNS WhatsApp DP Studio
## Manual Instance Lock Recovery

### Purpose

This document describes how to investigate an abandoned
backend instance lock.

The instance lock is stored at:

`.aslns-instance-lock/`

Its ownership metadata is stored at:

`.aslns-instance-lock/owner.json`

The lock prevents multiple backend instances from using
the same local authentication storage simultaneously.

## Safety Rules

1. Never automatically delete a stale lock.
2. Never delete a lock belonging to a running process.
3. Never assume that a missing PID proves recovery is safe.
4. Never terminate an unknown process.
5. Never delete WhatsApp authentication files as part of
   instance-lock recovery.
6. Never use `kill -9` as a routine recovery method.
7. Preserve invalid or unreadable lock metadata for
   investigation.
8. Stop recovery if the backend's state is uncertain.

## Step 1 — Inspect the Lock

From the backend directory, run:

```bash
node lock-inspector.js
node lock-recovery.js
```

Possible inspection results:

- NO_LOCK: No instance lock was found.
- OWNER_VERIFIED: The recorded process identity matches.
- PROCESS_NOT_FOUND: The recorded PID no longer exists.
- IDENTITY_MISMATCH: The PID exists but its start time differs.
- INVALID_LOCK: Lock metadata is missing or invalid.
- PROCESS_UNKNOWN: Process identity cannot be verified.

## Step 2 — Confirm Backend Activity

Check the terminal sessions and running backend processes.

Do not stop or remove anything until you know which
processes belong to this application.

If any backend instance may still be using the same
authentication storage, stop recovery.

## Step 3 — Evaluate Recovery Status

Run:

```bash
node lock-recovery.js
```

Interpret the result:

- NO_RECOVERY_NEEDED: No lock recovery is necessary.
- ACTIVE_OWNER: Do not remove the lock.
- MANUAL_REVIEW_REQUIRED: Investigate the recorded owner
  and confirm that all relevant backend processes have
  stopped.
- RECOVERY_BLOCKED: Preserve the lock and investigate.

No status authorizes automatic deletion.

## Step 4 — Verify Storage Safety

Before considering any manual lock removal:

- Confirm that no backend instance is using the storage.
- Confirm that no pairing or cleanup operation is running.
- Confirm that no other terminal, container, or service
  shares the same authentication directory.
- Preserve relevant diagnostic information.
- Confirm that startup recovery checks are understood.

If any condition is uncertain, do not proceed.

## Step 5 — Manual Recovery

Manual removal is deliberately not automated.

Only an authorized operator who has independently
verified that the lock is abandoned should consider
removing it.

Do not use recursive deletion commands from an
unverified working directory.

Do not remove `.wwebjs_auth`, uploaded images, or other
application data while recovering an instance lock.

## Step 6 — Restart Verification

After an independently verified recovery:

1. Run the lock inspector.
2. Confirm that the expected lock state is reported.
3. Start only one backend instance.
4. Verify that startup recovery checks succeed.
5. Verify that the backend creates new ownership metadata.
6. Confirm that a second backend instance is blocked.

## Important Limitations

PID and Linux process start-time verification reduce
the risk of confusing different processes.

They do not prove that a backend is healthy or that
shared storage is unused.

Filesystem races and external modification remain
possible.

Manual lock recovery does not revoke WhatsApp linked
devices or remove authentication credentials.

Real WhatsApp pairing and profile-picture updates are
not enabled by this recovery procedure.
