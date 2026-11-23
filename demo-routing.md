# Demo — Routing: The Triage Desk

**Pattern:** a **router** classifies each incoming request and sends it to *one*
specialist that handles that kind of request. Specialists stay narrow. The router
never does the work itself.

**Repo:** https://github.com/vyaron/demo-chat-agents (cloned to `./repo`)
**Time:** ~5 minutes · **Writes:** only to `.lab/` (gitignored)

```
                    ┌─► frontend           (UI, components, styling)
                    ├─► backend            (API, socket, database, @ai)
 request ─► ROUTER ─┼─► qa                 (tests, reproduction)
                    ├─► security-reviewer  (access, secrets, injection)
                    └─► out-of-scope       (politely declined)
```

The specialists are real agent definitions in the repo:
[repo/.claude/agents/](repo/.claude/agents/).

---

## Setup

Open a second terminal next to Claude Code and leave it running:

```bash
mkdir -p .lab && : > .lab/live.log && tail -f .lab/live.log
```

```powershell
New-Item -ItemType Directory -Force .lab; Set-Content .lab\live.log ""; Get-Content .lab\live.log -Wait
```

---

## Run it

Paste the prompt at the bottom into Claude Code.

**What you'll see:**
1. The router logs one decision per ticket: route, confidence, and a short reason.
2. The routing table is saved to `.lab/routes.md`.
3. Each specialist gets **only its own tickets** and answers with a diagnosis that
   points to a specific file and line.

**Why it works:** a single prompt that has to be good at everything ends up mediocre
at all of it. When you split by input type, each specialist gets a focused prompt,
its own tools, and even its own model. The `security-reviewer` agent, for example,
has no Write tool at all.

---

## Then push on it

Paste this follow-up:

```
Route one more ticket and show the router's full reasoning:
"@ai sometimes mentions other users' names in its replies"
Which two specialists could own this, why did you pick one, and what would a wrong
route have cost?
```

**Takeaway:** the router is the single point of failure. An ambiguous ticket sent to
the wrong specialist gets a confident, well-written answer to the wrong question.

---

## When to use routing

- Inputs fall into clear categories that need different handling.
- Classification can be done accurately, by an LLM or by a plain rule.
- You want cheap/fast handling for easy inputs and expensive handling for hard ones.

The repo's `dev-loop.js` already has a hard-coded router: the `stack:full` marker
on a backlog line decides whether the backend agent runs at all.

---

## The prompt

```
Demonstrate the ROUTING workflow on the repository in ./repo
(if ./repo does not exist, clone https://github.com/vyaron/demo-chat-agents into it).

Incoming tickets:
  T1  "The @ai replies sound American, not British."
  T2  "The search box loses focus when results update."
  T3  "Can a user read messages from a conversation they are not part of?"
  T4  "There is no test that covers sending an empty message."
  T5  "Add a dark mode toggle to the chat list."
  T6  "Please deploy the app to AWS Lambda."

STEP 1 — ROUTE (you, the main thread; do not delegate this).
  For each ticket choose exactly one route:
    frontend | backend | qa | security-reviewer | out-of-scope
  Use the agent descriptions in repo/.claude/agents/*.md to decide.
  Log each decision:
    echo "[ROUTER] $(date +%H:%M:%S)  T<n> -> <route> (<high|med|low>)" >> .lab/live.log
  Save the table (ticket, route, confidence, one-line reason) to .lab/routes.md.

STEP 2 — DISPATCH.
  In a SINGLE message, launch one Agent call per route that received tickets,
  using that route's subagent_type (frontend, backend, qa, security-reviewer).
  Give each specialist ONLY its own tickets. Answer out-of-scope tickets yourself
  in one polite sentence each; no agent.

Rules for every specialist:
  - DIAGNOSE ONLY. Do not edit or create any file in ./repo. Do not fix anything.
  - Ignore node_modules/, dist/, coverage/, .git/.
  - Log at least 3 lines:
      echo "[<ROUTE>] $(date +%H:%M:%S)  <what you are doing>" >> .lab/live.log
  - Never write a literal environment-file name in a log line (a repo guardrail
    blocks it). Say "the env file".
  - Reply per ticket, max 4 lines:
      ticket: T<n>
      where:  [<file:line>](repo/<path>#L<line>)
      cause:  <one line>
      next:   <the first thing you would do>

Finally, save each specialist's reply to .lab/route-<route>.md and print all
replies grouped by route.
```
