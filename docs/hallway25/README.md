# Hallway 25 shared nickname scores

The game remains on GitHub Pages. This dedicated Supabase project stores public nickname scores across devices; it does not host the game files. Project: qrjbpdqqwezzloadwggs, Hallway 25, us-east-2. No paid upgrade, user accounts, passwords or app-stored IP addresses.

## Public data and access

The only application table is public.hallway25_scores: random run UUID, nickname, encounters survived, remaining HP, win/loss and server submission timestamp. Anyone may reuse a nickname. This casual board does not verify identity or prove that client-reported gameplay happened.

RLS is enabled. The anonymous role can read public score rows and insert only run_id, nickname, encounters, health and outcome. UPDATE, DELETE, TRUNCATE and client-supplied timestamps are denied. Direct REST reads/inserts are possible by design and obey the same policies, constraints and insert trigger as the RPCs. No service-role or secret key is in the frontend; its publishable key is intentionally public.

All functions use SECURITY INVOKER and fixed search paths. The helper trigger function lives in the nonexposed hallway25 schema, with direct public execution revoked. No privileged RLS bypass is used.

## Validation, ranking and limits

Names contain 2-20 ASCII letters, numbers, ordinary spaces, underscores or hyphens. The submission RPC trims/collapses spaces and rejects control characters/HTML. Tables independently enforce canonical names and legal terminal game stats. Wins require exactly 25 encounters and positive HP; losses have at most 24 encounters. Legal HP is 0, 10, 25, 50, 75 or 100.

One UUID identifies each run. Identical retries return duplicate; conflicting replay payloads receive 409 and never overwrite a score. A locked insert trigger enforces at most 60 new rows/minute globally and 10,000 total rows, including direct REST inserts. At the cap, further new scores are rejected; normal gameplay still works.

The read RPC returns the best run per case-insensitive nickname, then the top 20 by encounters descending, HP descending, server timestamp ascending and UUID ascending. It omits UUIDs from the response. Time spent idle or random encounter timing earns no ranking advantage.

## Frontend behavior

Sharing requires a finished run and an explicit click. Retries retain the same UUID and payload; restarting creates a new UUID. Nicknames are rendered with textContent. Read and submit RPC calls use POST, so the arcade service worker cannot cache stale GET responses. Both headers and JSON body are covered by an 8-second timeout. Errors leave gameplay usable; Refresh/retry is explicit.

Backend SQL is already applied as migration hallway25_public_scores. backend.sql is its source record, not an instruction to rerun it. backend-tests.sql records rolled-back database checks used before release. The public frontend rollout still uses the existing Pages workflow; no workflow, account, permission or deployment-token change is needed.

## Validation and maintenance

Repository tests cover unchanged game mechanics, wins at exactly 25 encounters, damage/pause/restart, terminal-only submissions, UUID retries, safe rendering, stale-run responses, timeout/failure behavior and POST reads. Anonymous API checks additionally verify persistence through separate clients, CORS, conflicting replays, direct invalid inserts, timestamp overrides, and denied PATCH/DELETE.

If the board reaches its storage cap or needs moderation, an administrator can review only Hallway25 score rows through Supabase. Public clients have no editing/deletion ability. Do not add privileged keys to browser code.

Current references: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API security](https://supabase.com/docs/guides/api/securing-your-api).

