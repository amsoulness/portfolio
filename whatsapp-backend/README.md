# WhatsApp tools

This service powers the WhatsApp profile-photo updater on the portfolio tools page. It connects only the account entered by its owner, requires consent, and logs out the temporary linked device after the operation. Session status can be restored in the same browser tab using sessionStorage.

## Local development

Use Node 24 or later. In this directory:

```sh
npm ci
cp .env.example .env
npm start
```

The service defaults to disabled live mode. To connect real WhatsApp accounts, set `ASLNS_ENABLE_LIVE_WHATSAPP=true` in the backend `.env`. Pairing uses the eight-character code returned by WhatsApp through Baileys. The UI adds AMSOULNESS styling around that code; never modify the actual code because WhatsApp validates it.

Run `npm run dev` in the repository root. Vite proxies `/api` to `127.0.0.1:3001`; `ASLNS_API_TARGET` can override that development target. `GET /api/whatsapp/health` reports `{ available, version: 2 }`.

## Page visit totals

The portfolio and each tool route use `/api/analytics/views` for public aggregate page-visit totals. The backend stores only counts for fixed page IDs in `ASLNS_RUNTIME_DIR/page-views.json`; it does not persist IP addresses, account identifiers, or browser fingerprints. Keep this file on the same persistent volume used for service restart recovery.

## Production deployment

The frontend can remain on Vercel. The WhatsApp service needs a continuously running Node host; it cannot run as a short-lived Vercel function. No production backend address is included in this repository.

Before replacing a running older backend, stop new sessions, log out any linked account, and stop its Node process. Keep old credentials until that cleanup is confirmed. The new service does not import legacy sessions.

1. Deploy this directory on a Linux host or build its Dockerfile. Use **one process and one replica**. Supply persistent storage for `ASLNS_RUNTIME_DIR` (default `.runtime`) so restart recovery checks survive container replacement.
2. Enable `ASLNS_ENABLE_LIVE_WHATSAPP=true`. Set `ASLNS_ALLOWED_ORIGINS` to the exact frontend origins, comma separated. Use `HOST=0.0.0.0` in a container or a host that requires it. Place the service behind HTTPS.
3. Set `ASLNS_PROXY_HOPS` only to the exact trusted reverse-proxy count for that host so rate limiting uses the real client IP.
4. Set the frontend build environment variable `VITE_WHATSAPP_API_URL` to the backend's HTTPS **origin**, without `/api`, and rebuild/redeploy the frontend. Alternatively configure an explicit same-origin `/api/whatsapp/*` reverse proxy. The existing SPA fallback in `vercel.json` does not provide that proxy.
5. Verify `/api/whatsapp/health`, then make an account-owner-approved live test with portrait and landscape photos. Confirm the full image in WhatsApp and that the temporary device disappears from Linked devices.

Example container build from this directory: `docker build -t aslns-whatsapp .`. Provide environment variables and a writable runtime volume through your hosting platform. The Docker image recipe is provided but is not part of the automated test run.

## Image behavior

The profile tool accepts still JPEG, PNG, and WebP files up to 20 MB and 40 megapixels. Sharp honors orientation, preserves all edges, and fits the main JPEG within 640×640 and its thumbnail within 96×96 without cropping, stretching, square padding, or enlargement. The profile image path preserves the full aspect ratio and flattens transparency onto white. Encoding/resizing means outputs are not byte-identical to their inputs. WhatsApp controls final acceptance and display.

The Baileys profile API receives the prepared JPEG together with its aspect dimensions. Image edges and proportions are verified locally before the profile update; WhatsApp controls final acceptance, recompression, and display, including circular thumbnails. Automated tests check the submitted image dimensions and workflow, not WhatsApp's live rendering. Do not promise untouched original bytes or a rectangular avatar everywhere in WhatsApp.

## Session lifecycle and privacy

- The initial consent authorizes the profile update and automatic logout. Entering the pairing code on the account owner's phone completes linking. Profile updates do not sync history.
- Session credentials are random, scoped to one session, sent in `X-Session-Token`, and stored only in the frontend tab's sessionStorage. They are not placed in URLs or logs. Completed server records are bounded and retained for status recovery for up to 30 minutes of inactivity before the next session request prunes them.
- One workflow owns the WhatsApp socket at a time. Uploads are checked by decoded content, not their declared MIME type. Original uploads are not written to disk. Image buffers are released after the update or completed cancellation.
- Browser credentials live in a private runtime directory. For authenticated sessions, confirmed logout and browser shutdown precede local deletion. Success requires both a positive update acknowledgement and completed device removal/cleanup.
- Updates are single-flight and are never automatically retried after an uncertain result. A late result still finishes cleanup. Cancellation during initialization or update waits for that operation to settle; it cannot cause a second update.
- Unlinked sessions expire after ten minutes. Failed cleanup retains exclusive ownership and offers a retry. If device removal cannot be confirmed, the UI directs the user to WhatsApp → Linked devices.

## Restart and recovery

Startup exclusively creates `.runtime/owner`; an existing owner blocks a second process and automatic crash recovery. Graceful SIGTERM/SIGINT waits up to 15 seconds for cleanup and preserves ownership if it cannot finish.

If startup is blocked, inspect the recorded PID and service/container state. Stop the old service, have the account owner remove the temporary device through WhatsApp if it remains linked, then remove the stale `owner` directory **only after those checks**. Restart the service. Do not delete runtime ownership or credentials while another instance may still be updating or connected. In-memory session status cannot be recovered across a process crash, so the frontend tells users to check Linked devices if their session disappears.

## Validation

```sh
npm test
```

The tests use fake clients and local HTTP servers; they never link an account. They cover original image edges across five aspect ratios, orientation/transparency, invalid inputs, the uncropped transport boundary, token authorization, consent, CORS, disabled live mode, repeated ready events, cancellation races, timeout cleanup, uncertain updates, failed logout/retry, and shutdown ordering. Run the frontend production build from the repository root with `npm run build`.

Browser regression tests are included at the repository root:

```sh
npm ci
npx playwright install chromium
npm run test:whatsapp-ui
```

They mock only the WhatsApp API and exercise the actual Tools page. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an already installed Chromium. The tests cover original uploads, session restoration without duplicate submission, cleanup confirmation, cancellation, unavailable-service handling, and mobile layout.
