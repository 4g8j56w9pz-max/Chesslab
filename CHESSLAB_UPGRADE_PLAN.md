# ChessLab Upgrade Plan

This plan covers the next upgrade phase for ChessLab without changing gameplay code yet. The current primary game appears to be `index.html` + `app.js` + `style.css`; `chessgame.html` looks like an older inline prototype and should be treated carefully to avoid duplicating new features in two places.

## Storage Recommendation

Start with `localStorage`.

- Store local-only game records, player display names, weekly scores, and feature preferences in the browser.
- Keep the data shape versioned, for example `chesslab.records.v1`, `chesslab.players.v1`, and `chesslab.settings.v1`.
- Use small helper functions in `app.js` first, or split into a new `storage.js` later if the logic grows.
- This fits the current static-site structure and requires no backend, login, auth rules, or deployment changes.

Add Supabase later for a public leaderboard.

- Use Supabase only when the leaderboard needs to be shared across devices or players.
- Add it after the local leaderboard behavior is stable.
- Expect new risks at that point: public write abuse, name moderation, rate limiting, row-level security, environment key handling, and migration from local-only scores.

## Recommended Implementation Order

1. Player display names
2. Local game records
3. Weekly leaderboard
4. Check animation
5. Checkmate animation
6. Optional FNAF-style jump scare
7. Supabase-backed public leaderboard

This order builds durable data first, then UI summaries, then visual effects. Supabase should wait until the local data model and leaderboard rules have proven useful.

## 1. Local Game Records

### Purpose

Keep a local history of completed games so players can see wins, losses, stalemates, dates, names, game mode, and basic game metadata. This also creates the foundation for weekly leaderboard scoring.

### Files Likely Affected

- `app.js`: detect game end in `updateStatus()` or a new game-state helper; write completed game records to `localStorage`; prevent duplicate saves for the same completed game.
- `index.html`: add a small recent-games area or history panel if records are surfaced immediately.
- `style.css`: style recent game rows, empty states, and compact history layout.
- Possible later file: `storage.js` if localStorage helpers become large enough to split out.

### Difficulty

Medium.

The current game already detects checkmate and stalemate in `updateStatus()`, but records need a reliable "game ended once" flag so repeated renders or status updates do not save duplicate results.

### Risks

- Duplicate records if `updateStatus()` runs multiple times after checkmate or stalemate.
- Incomplete record data if the game does not track move count, winner, loser, and game mode explicitly.
- Resetting a game before it ends should not create a record.
- Bot games need clear winner naming, especially when black is controlled by the bot.
- Browser storage can be cleared by the user and should not be treated as permanent.

### Recommended Implementation Order

Implement after player display names. Records should use the same name normalization and fallback labels that the UI displays.

## 2. Player Display Names

### Purpose

Make player names consistent across the status text, score display, saved records, and leaderboard. The current UI already has `whiteName` and `blackName` inputs, but `getPlayerLabel()` still falls back to generic labels and does not appear to use the typed names for status text.

### Files Likely Affected

- `app.js`: update `getPlayerLabel()`, name sanitization/normalization, default names, input listeners, and localStorage persistence.
- `index.html`: possibly adjust labels, placeholders, max lengths, or add a "Bot" display behavior.
- `style.css`: minor input and truncation styling if names become longer.

### Difficulty

Low.

The inputs already exist, and the scoreboard names are already updated in `updateScoreboard()`.

### Risks

- Empty names should fall back to `White Player`, `Black Player`, or `Bot`.
- Very long names can break compact UI unless max length and CSS truncation are enforced.
- Names used in local records should be sanitized as plain text, not HTML.
- In bot mode, black's display name should be deterministic and not accidentally saved as a user-entered local-player name unless that is intended.

### Recommended Implementation Order

Do this first. It is low risk and unblocks cleaner game records and leaderboard entries.

## 3. Weekly Leaderboard

### Purpose

Show a weekly ranking based on locally stored completed games. This gives ChessLab replay value without requiring backend infrastructure.

Suggested scoring:

- Win: 3 points
- Draw/stalemate: 1 point per player
- Loss: 0 points
- Optional tie breakers: wins, games played, most recent win

### Files Likely Affected

- `app.js`: aggregate records by week; calculate points; reset or filter by week boundary; render leaderboard rows.
- `index.html`: replace or expand the current `Leaderboard` panel, which currently displays captured-piece material scores rather than standings.
- `style.css`: leaderboard table/list styling, empty state, compact mobile layout.
- Possible later file: `storage.js` or `leaderboard.js` if aggregation logic should be separated.

### Difficulty

Medium.

The data model is simple, but week boundaries and display behavior should be intentional.

### Risks

- Ambiguous week definition. Recommend local timezone, Monday 00:00 through Sunday 23:59.
- Existing `Leaderboard` label currently means in-game material score, so the UI should avoid confusing "current score" with "weekly standings."
- Same display name across multiple people on the same browser will merge scores unless player IDs are added.
- Changing scoring rules later can make old stored records appear different unless records store raw outcomes and scores are computed dynamically.

### Recommended Implementation Order

Implement after local game records. Build it from saved records instead of maintaining a separate mutable leaderboard total.

## 4. Check Animation

### Purpose

Make check visually obvious and exciting when the current player's king is under attack. This should support the existing status text and help players understand the board state.

### Files Likely Affected

- `app.js`: identify the checked king square after `isKingInCheck(currentTurn)`; add a CSS class during `renderBoard()`.
- `style.css`: add check highlight, pulse, shake, glow, or brief overlay animation.
- `index.html`: likely no change unless adding a user setting to reduce effects.

### Difficulty

Low to Medium.

The engine already has `isKingInCheck(color)` and `findKing(color)`, so the main task is connecting that state to rendering.

### Risks

- Animation should not obscure legal-move highlights, selected squares, or piece images.
- Re-rendering the board may restart the animation too often.
- Users sensitive to motion may need a simple way to reduce intense effects later.
- The checked king can change after every move, so stale CSS classes must not persist.

### Recommended Implementation Order

Implement after records and leaderboard unless the priority is immediate game feel. It is visually isolated and should be straightforward once game-state handling is clean.

## 5. Checkmate Animation

### Purpose

Celebrate or dramatize the end of a decisive game. Checkmate should feel distinct from ordinary check and should clearly communicate the winner.

### Files Likely Affected

- `app.js`: detect checkmate once; trigger end-of-game animation and record save from the same finalized game result.
- `index.html`: possible result overlay or modal container.
- `style.css`: full-board flash, winner banner, defeated king effect, or modal styling.

### Difficulty

Medium.

The current checkmate detection exists in `updateStatus()`, but a polished animation needs a one-time trigger and should coordinate with game recording.

### Risks

- Duplicate triggers if status updates run repeatedly.
- Animation should not block reset controls or trap keyboard focus.
- The winner must be calculated from the checkmated color, not inferred from stale UI text.
- In bot mode, the result copy should handle "Bot wins" and "[player] wins" clearly.

### Recommended Implementation Order

Implement after check animation. Use the same game-end state that local records use.

## 6. Optional FNAF-Style Jump Scare

### Purpose

Add an optional horror-flavored effect that fits the current FNAF-themed presentation. This should be opt-in or easy to disable, especially if sound, flashes, or sudden motion are used.

### Files Likely Affected

- `app.js`: add a settings flag, trigger logic, and cooldown so it only plays at specific moments such as checkmate or rare bot victory.
- `index.html`: add a setting toggle and possibly an overlay element.
- `style.css`: full-screen overlay, quick flash, image reveal, shake, and reduced-motion fallback.
- `pieces/` or new `assets/`: optional scare image/audio assets if the effect uses media.

### Difficulty

Medium to High, depending on asset quality and audio behavior.

CSS-only is medium. Custom art, audio, timing, and browser autoplay constraints make it higher.

### Risks

- Sudden flashes and loud audio can be uncomfortable; default should be off or clearly controlled.
- Browser autoplay rules may block sound until the user interacts.
- Asset licensing matters if using FNAF-like media. Use original or generated assets, not copyrighted game art.
- A jump scare can become annoying if it triggers too often.
- Mobile layout and performance need testing for full-screen overlays.

### Recommended Implementation Order

Implement last and keep it optional. It depends on clean checkmate/game-end triggers and should not be mixed into core chess logic.

## Supabase Later: Public Leaderboard

### Purpose

Move from single-browser weekly standings to a shared public leaderboard after local records and scoring rules are stable.

### Files Likely Affected

- `index.html`: include Supabase client or bundled script if the project remains static.
- `app.js`: submit completed game summaries; fetch public weekly rankings; handle offline/failure states.
- `style.css`: public leaderboard states and loading/error messages.
- New config/deployment docs: document Supabase project URL, anon key, database schema, and row-level security policy.

### Difficulty

High compared with localStorage.

### Risks

- Public writes can be spammed without rate limits or server-side validation.
- Display names may need moderation.
- Anonymous users can submit fake scores unless the app adds stronger identity or server validation.
- Supabase keys must be configured for browser-safe anonymous access only.
- Migration from local records to public records needs a clear choice: sync all, sync future only, or manual opt-in.

### Recommended Implementation Order

Do this after the local weekly leaderboard has been used and the scoring model is settled.
