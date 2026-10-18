# NULL CITY 1.0 — menu, multiplayer and progression

## Player experience

The main menu has Story, Multiplayer, Sign in / Register and a campaign dossier. Multiplayer offers quick match, a configurable friends lobby and spectating. Authentication is real HTTPS authentication, not a local demo account. The offline preview explains how to reach the server edition.

A multiplayer session now follows a clear sequence: enter a lobby, invite people through its public link, mark ready, let the host start, answer five shared rounds, review the result and opt into a shared rematch. The host role transfers when the host leaves a waiting lobby. Readiness, capacity, answers, match transitions and rematch creation are controlled transactionally by the server. Participants are not enrolled into a rematch without choosing it. Active matches remain available for reconnection.

## Reasons to return

- Campaign dossier: next objective, progress across 14 operations and six earned/locked achievement milestones.
- Arena career: persistent XP, levels, rank labels, progress to the next level, existing leaderboard and badges.
- Daily learning contract: three correct answers in completed matches, once-per-UTC-day bonus of 40 XP. No streak loss and no penalty for missed days.
- 28 questions, mixed/network/security settings, one-use Impulse and post-match explanations.
- Public invite links and shared rematches reduce the steps needed to play again with friends.

These are shipped engagement features, not proof of commercial demand. No paid currency, loot boxes, invented online players or fake scarcity is used. Pricing, audience research and real retention measurement have not been performed.

## Cleanup

Six obsolete files were removed from the working distribution: the original duplicate HTML prototype, an unused building atlas, two obsolete facade documents and two obsolete previews. A byte-verified recovery archive exists at `backups/cleanup-2026-10-14.tar.gz` and is excluded from Docker and Git. Python bytecode caches were cleared. `game1.png`, active artwork, tests, evaluation evidence, the standalone build and user databases/certificates are retained.

## Evaluation boundary

The existing candidate route remains 19 (14 base + 5 bonus), subject to evaluator acceptance. This release strengthens the existing multiplayer/gamification modules; it does not double-count menu work, matchmaking or rematches as new modules. The custom simulator major remains discretionary.

The Docker image builds, but this host refuses container process execution (`exec /bin/sh: operation not permitted`). The failed container was stopped without deleting its data volume. Native HTTPS launch succeeds and a certificate-verified health request returns OK. The desktop browser does not trust the local self-signed certificate; its warning was not bypassed. Real-machine multiplayer, trusted-certificate browser QA, team attribution and actual team Git history remain required before claiming evaluation readiness.
