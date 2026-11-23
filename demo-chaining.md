# Demo — Prompt Chaining: From Backlog Line to Test List

**Pattern:** break a task into fixed steps, where each step's output is the *only*
input to the next. Between steps, a **gate** — a simple check — decides whether the
chain continues or stops.

**Repo:** https://github.com/vyaron/demo-chat-agents (cloned to `./repo`)
**Time:** ~5 minutes · **Writes:** only to `.lab/` (gitignored)

```
backlog line ─► [1 SPEC] ─► gate ─► [2 CONTRACT] ─► gate ─► [3 TESTS]
                             │                       │
                             └─ fail: STOP           └─ fail: STOP
```

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

**What you'll see:** the steps run **one after another**, never together. Each agent
starts only after the previous one has finished and its gate has passed. Three
files show up in `.lab/`, in order: `chain-1-spec.md`, `chain-2-contract.md`,
`chain-3-tests.md`.

**Why it works:** each step has one small job and reads only one input file. The
contract agent never sees the backlog line, and the test agent never sees the spec.
If a step drifts, the gate catches it before the next step builds on the mistake.

---

## Then break it

Paste this follow-up:

```
Run the same chain again, but use this input instead:
"- [ ] make the chat better"
```

**What you'll see:** gate 1 fails. The input has no testable criteria, so the chain
stops and never writes a contract or tests from it.

**Takeaway:** a chain is only as good as its gates. Without them, step 3 would
confidently produce tests for a feature that was never defined.

---

## When to use chaining

- The task splits cleanly into steps that always run in the same order.
- You'd rather be accurate than fast: each call is simpler, but there are more calls.
- Every step's output can be checked cheaply before you move on.

The repo's own `dev-loop.js` is a bigger version of this chain:
plan → frontend/backend → QA.

---

## Workflow vs. agent: the same chain as code

There's a catch in the prompt below. Claude Code is an **agent**, and when you paste
the prompt, it *decides* to follow the steps. That's an agent acting out a workflow.

In a real **workflow**, your code controls the flow and Claude only does the work
inside each step. [demo-chaining-workflow.mjs](demo-chaining-workflow.mjs) is the
same chain as about 100 lines of JavaScript: three `messages.create` calls, and the
gates are ordinary `if` statements.

Put your key in a `.env` file (`ANTHROPIC_API_KEY=...`), then:

```bash
npm install
npm run chain                                   # good input, ~30 seconds
npm run chain -- "- [ ] make the chat better"   # gate 1 stops it, ~2 seconds
```

Read the file side by side with the prompt:

| | Prompt version | Code version |
|---|---|---|
| Who decides the next step | Claude | `await` on the next line |
| What a gate is | Claude judging "is this testable?" | a regex and a count |
| Can it skip a step? | in theory, yes | no |
| Can it adapt to a surprise? | yes | no — and that's the point |

**Rule of thumb:** if you can draw the flowchart in advance, write it as code. Use an
agent when you can't.

---

## The prompt

```
Demonstrate the PROMPT CHAINING workflow on the repository in ./repo
(if ./repo does not exist, clone https://github.com/vyaron/demo-chat-agents into it).

Input — this backlog line from repo/.plan/000-backlog.md:
  "- [ ] Conversations search | stack:full"

Run three steps STRICTLY IN SEQUENCE, one Agent call each (general-purpose).
Never start a step before the previous step's gate has passed.
Each agent receives ONLY the file listed as its input — nothing else from earlier steps.

  STEP 1 [SPEC]     input: the backlog line + repo/.doc/product-definition.md
                    output: .lab/chain-1-spec.md — 4 to 6 numbered acceptance
                    criteria, each one sentence, each observable by a test.
  GATE 1 (you, not an agent): every criterion is concrete and testable
                    (no "better", "nice", "fast" without a number). If any
                    fails, STOP the chain and say why.

  STEP 2 [CONTRACT] input: .lab/chain-1-spec.md + repo/backend/src/routes/messages.ts
                    (as a style reference only)
                    output: .lab/chain-2-contract.md — the REST endpoints and/or
                    socket events needed, with request/response shapes.
  GATE 2 (you): every criterion from step 1 is covered by at least one endpoint
                    or event, and naming follows repo/.claude/rules/naming.md.
                    If not, STOP and say why.

  STEP 3 [TESTS]    input: .lab/chain-2-contract.md only
                    output: .lab/chain-3-tests.md — a list of Vitest and Playwright
                    test names, each tagged with the endpoint/event it covers.

Rules for every agent:
  - Read-only on ./repo. Write only your own output file in .lab/.
  - Log as you go, at least 4 lines:
        echo "[STEP-N] $(date +%H:%M:%S)  <what you are doing>" >> .lab/live.log
  - Never write a literal environment-file name in a log line (a repo guardrail
    blocks it). Say "the env file".

You (the main thread) also log each gate result:
        echo "[GATE-N] $(date +%H:%M:%S)  PASS|FAIL  <reason>" >> .lab/live.log

At the end, print a 3-line summary: one line per step with its output file and gate result.
```
