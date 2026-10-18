# ft_transcendence 21.2 — evaluation map

Source: the user-supplied `567.pdf`, version 21.2, 32 pages. PDF page numbers below
include the cover (printed page numbers are one lower). This is a preparation
map, **not a claim of awarded points or a guarantee of acceptance**.

## Mandatory gate (PDF pp. 9–10)

| Requirement | Implementation / evidence | Remaining verification |
|---|---|---|
| Frontend, backend, database | Canvas/DOM client, Python HTTPS API, relational SQLite | Peer architecture review |
| Simultaneous users | Isolated sessions, FK relations, transactions, revision-checked saves, 2–4 player arena | Demonstrate across actual remote machines |
| Email/password authentication | Random salt + scrypt N=131072/r=8/p=1; hashed opaque session tokens; Secure/HttpOnly cookie | Independent security review; no password recovery/email verification claimed |
| Input validation both sides | Form limits + API constraints; image decoding/re-encoding; JSON size cap | Fuzzing and broader adversarial review |
| HTTPS for backend access | TLS-only listener; generated local certificate; no HTTP API fallback | Trust/deploy a suitable certificate on evaluation machines |
| One-command container launch | `docker compose up --build -d`, persistent DB volume, unprivileged user | Image builds; host rejects runtime exec, must resolve before submission |
| Responsive styling solution | Custom CSS tokens, mobile grids, keyboard focus | Full latest Chrome user-flow audit |
| Privacy and Terms | Footer-linked, project-specific pages | Team must identify responsible operator/contact and retention policy before public use |
| `.env`, `.env.example`, secrets hygiene | Ignored `.env`, example config, runtime-generated ignored TLS key | Use deployment-specific secrets; never commit DB/key |
| English README | Root README, schema, instructions, modules, resources, AI disclosure | Real team names, roles and contribution records still required |
| Real Git history from 4–5 people | Not fabricated | **Real team Git history and roles remain unverified; no contributions are fabricated** |

## Candidate route: 14 base + 5 bonus = 19 points

Only fully working, demonstrated and accepted modules count (PDF p. 12).
The custom module is at evaluator discretion. Do not count the same feature twice
as a replacement for a missing requirement. No framework/ORM, WAF/Vault, WCAG AA,
full certification course or three-language module is claimed.

| Category / module | Weight | Concrete demonstration | Validation boundary |
|---|---:|---|---|
| Web: real-time features | 2 | SSE invalidation for chat, friend changes and lobby; reconnecting EventSource | Cross-browser/disconnect walkthrough pending |
| Web: user interaction | 2 | Public channel, profiles, incoming/outgoing friend invitations, accept/remove | API tests; full multi-browser UI walkthrough pending |
| Users: standard management | 2 | Edit name/bio, upload/default avatar, friends and online state | API tests; avatar UI manual check pending |
| Gaming: complete web game | 2 | Five-round knowledge duel, server score, winner/tie, final explanations | Four-client API match passed |
| Gaming: remote players | 2 | Separate authenticated clients, server deadline, recover snapshot after reconnect | Separate physical devices/network latency demo required |
| Gaming: multiplayer 3+ | 2 | Capacity 2–4, same deck, one answer per user per round | Four-client API match passed |
| Custom major: stateful incident simulator | 2 | Six linked labs, network/file/firewall state, preserved evidence, transfer scenario, final report | Existing model tests; evaluator decides major status |
| Users: game statistics | 1 | Win/draw/loss, dates/opponents/results, leaderboard, badges, levels | Server tests + browser walkthrough pending |
| Gaming: customization | 1 | Default configuration, topic themes, 15–60s timer, equal one-use “Impulse” ability | Ability test added; UI walkthrough pending |
| Gaming: gamification | 1 | DB-derived XP/levels + badges + leaderboard; visible feedback | Server authoritative arena results; offline XP is excluded |
| Gaming: spectators | 1 | Open live room as nonparticipant; read scores/questions; cannot answer or use power | API authorization test passed |
| Web: advanced search | 1 | Name search + online filter + sort + pagination | API/UI flow needs peer demo |
| **Total candidates** | **19** | **14 + maximum 5 bonus** | **Not an awarded or certified score** |

## Why the custom simulator may merit a major module

The single-player terminal is a bounded interpreter over explicit network and
filesystem models, not a collection of pre-baked “correct command” buttons.
Changing a DNS setting, gateway or firewall rule changes subsequent observations.
A broad block can stop a required service. Copies preserve source evidence. A later
case uses a different subnet and requires transfer of the learned method. Case
completion requires multiple state assertions, and the final report separates
observations from an unproven attribution. Serialization preserves these causal
states. This addresses safe reproducible security education and is independent
from the multiplayer quiz mechanics. An evaluator can reject the proposed weight;
prepare a fallback module if the team needs a less discretionary path.

## Honest release blockers

1. Supply the actual 42 logins, roles, contributions, communication practices and
   Git history. Generated attribution or invented meetings are not evidence.
2. Demonstrate the server UI with at least two isolated browser sessions and two
   real machines using a trusted HTTPS certificate. API integration tests do not
   replace this requirement.
3. Perform the latest stable Chrome console audit on the TLS deployment and run
   the walkthrough below with peers who can explain the code.
4. Complete certificate/deployment/contact setup for the chosen evaluation host.

## Peer demo (suggested sequence)

1. Start the stack with one command; show healthy status and persistent database.
2. Register A/B/C/D in isolated browser sessions; show separate cookies and profiles.
3. A edits name/avatar, invites B; B accepts. Send a message and observe it live.
4. In the city, change gender, skin, hairstyle and eyes; rotate preview, save/reload.
   Buy an outfit, show appearance survives and earned learning progress is unchanged.
5. A creates 4-player room; B/C join; D watches, then joins before start. Have every participant mark ready, start the
   game, use Impulse once, try duplicate answers, temporarily disconnect C, reconnect.
6. Finish, show all clients agree on results, history, leaderboard and achievements.
7. Open a 2-player room with a third spectator; show spectator cannot answer.
8. Save a campaign snapshot from two tabs using the same revision; second write
   gets a conflict instead of corrupting or silently overwriting progress.
9. Explain input checks, password hashing, session expiry, CSRF protection, SQL
   parameterization, state transition transaction and database foreign keys.
10. Walk through one simulator diagnosis and an intentionally wrong firewall rule.


## 1.0 verification update — 2026-10-14

- Eight HTTPS integration scenarios pass, including four-player authoritative results, spectators, SSE updates, capacity races, readiness enforcement, host transfer, concurrent rematch creation, idempotent matchmaking, additive schema migration and daily reward non-duplication.
- Eight frontend/model test files pass. Syntax validation and offline bundling pass.
- Desktop main menu, sign-in/register switching and campaign dossier were exercised in the browser. Evidence: `main-menu-1.0.png`, `player-dossier.png`.
- Image build and Compose configuration succeed. Runtime still fails on this host before application code: `exec /bin/sh: operation not permitted`. Do not mark the mandatory container gate complete.
- Native HTTPS health succeeds with explicit certificate verification. Browser TLS trust is unresolved; no warning bypass was attempted. Multi-device browser demonstration remains pending.
- Candidate score remains 19, not an awarded score. Matchmaking/ready/rematch improve the existing game modules; they are not counted as another game or an extra major module.
