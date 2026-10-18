# NULL CITY private application API

Same-origin HTTPS only. Authentication uses an opaque `__Host-nullcity` cookie
(`Secure; HttpOnly; SameSite=Strict`). Mutations require exact `Origin`, the
`X-NullCity: 1` header and `Content-Type: application/json`. No CORS permissions
are emitted. Body limit is 200,000 bytes. Passwords: 12–128 characters. Public
API/API-key module is **not** claimed; these are authenticated application routes.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | DB connectivity; no sensitive status fields |
| POST | `/api/register`, `/api/login` | email/password; register also requires name |
| POST | `/api/logout` | invalidate current session |
| GET/PUT | `/api/me` | own profile; update name/bio |
| PUT | `/api/avatar` | base64 PNG/JPEG or `image: null`; decode/re-encode |
| GET | `/api/avatar/:id` | authenticated base64 PNG preview |
| GET/PUT | `/api/save` | own campaign JSON; PUT requires expected revision |
| GET | `/api/users?q=&online=1&sort=name&page=0` | filtered/sorted/paged public profiles |
| GET/POST/DELETE | `/api/friends` | list, invite/accept, remove; mutation `userId` |
| GET/POST | `/api/messages` | latest 60 public channel messages; POST `body` |
| GET | `/api/events` | SSE invalidation sequence; reconnect after 25-second stream |
| GET/POST | `/api/rooms` | room list/create; name, capacity, topic, duration |
| GET | `/api/rooms/:id` | authorized user may observe; snapshot, no answer key |
| POST | `/api/rooms/:id/join` | join only while waiting and below capacity |
| POST | `/api/rooms/:id/start` | host only, 2+ participants |
| POST | `/api/rooms/:id/answer` | round and choice, once per participant/round |
| POST | `/api/rooms/:id/hint` | round; once per participant/match, excludes a wrong option |
| GET | `/api/stats` | own history and aggregate stats; public leaderboard |
| GET | `/api/export` | own non-secret profile/data export |

Save writes use conditional revisions. An outdated writer gets HTTP 409, and must
load/reconcile the newer state. The server does not accept client-provided arena
scores; only the answer key increments scores. All game transitions run inside an
IMMEDIATE SQLite transaction. Disconnected players can query the same room and
continue; missed deadlines score zero. No wall-clock speed bonus penalizes latency.
Question answers/explanations are returned only after a finished match.

Registration/login are limited to 10 attempts per 5 minutes per IP; API traffic to
300 requests/minute per IP; chat to 20 messages/minute per account; room creation
to 5 per 5 minutes. Limits are in-memory and reset on restart. This is deliberately
a single-process implementation, not a distributed rate limiter or production
DDoS protection system. Scrypt hashing has a bounded concurrency semaphore.

## Lobby and progression (1.0)

All endpoints below require an authenticated session and the existing same-origin write checks.

- `POST /api/matchmaking {}`: atomically return the caller's active room, join an available recent mixed/30s lobby, or create a four-seat lobby.
- `POST /api/rooms/:id/ready {"ready": true}`: toggle the caller's readiness while waiting. Spectators cannot mark ready.
- `POST /api/rooms/:id/start {}`: host only; at least two participants, every participant ready.
- `POST /api/rooms/:id/leave {}`: waiting lobbies only. Transfers host to a remaining participant; empty lobbies become cancelled. During a live match use the lobby list to reconnect; the server clock continues.
- `POST /api/rooms/:id/rematch {}`: participants in a finished match can opt into one shared successor lobby. Concurrent requests cannot create separate successors. Every player must consent and ready again; nobody is enrolled automatically.
- `GET /api/stats`: includes `rank`, `nextLevelXp`, and `daily` (`progress`, `target`, `reward`, `complete`, `resetsAt`). Three correct answers across finished matches in a UTC day add 40 XP once. These totals are derived from persisted match results, never from client claims; requesting stats again cannot grant another reward.

Room snapshots include `players[].ready` and `rematch_of`. Invite links identify public rooms and grant no private access. The question bank contains 28 original teaching scenarios. The main menu uses the same register/login/logout endpoints as the multiplayer client. Offline HTML does not emulate an account server.
