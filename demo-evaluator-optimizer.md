# Demo — Evaluator–Optimizer: Teach the Butler

**Pattern:** one agent **generates**, and a second, independent agent **evaluates**
against a fixed rubric and sends back feedback. The loop repeats until the evaluator
says PASS or you run out of rounds.

**Repo:** https://github.com/vyaron/demo-chat-agents (cloned to `./repo`)
**Time:** ~5 minutes · **Writes:** only to `.lab/` (gitignored)

```
          ┌──────────── feedback ────────────┐
          ▼                                  │
   [GENERATOR] ── prompt-vN.md ──► [EVALUATOR] ──► PASS ─► done
                                         │
                                  max 3 rounds
```

**The target:** the chat app answers `@ai` mentions with a "British butler" persona.
The system prompt is in
[repo/backend/src/lib/ai.ts:5-8](repo/backend/src/lib/ai.ts#L5-L8). We'll improve it
without touching the code and without calling the live API.

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

**What you'll see:** generator and evaluator take turns in the console. Each round
writes a new `.lab/prompt-vN.md` and a `.lab/eval-vN.md` with a score per rubric
item. Usually the first draft fails at least one test, typically the "drop the
act" message.

---

## Then compare

In the second terminal:

```bash
diff .lab/prompt-v0.md .lab/prompt-v2.md     # or the last version that exists
cat .lab/eval-v*.md
```

**Takeaway:** the improvement comes from the **rubric** and the **independence** of
the evaluator, not from asking the model to "make it better". The evaluator never
sees the generator's reasoning, only the output, so it can't be talked into a PASS.

---

## When to use evaluator–optimizer

- You can state clear criteria for "good" (a rubric, tests, a style guide).
- A human giving feedback would measurably improve the output.
- The LLM can give that kind of feedback itself.

Classic fits: translation, prompt tuning, writing code until tests pass, and
search that needs several rounds to be complete.

---

## The prompt

```
Demonstrate the EVALUATOR–OPTIMIZER workflow on the repository in ./repo
(if ./repo does not exist, clone https://github.com/vyaron/demo-chat-agents into it).

Target: the AI_SYSTEM_PROMPT string in repo/backend/src/lib/ai.ts.
First, copy its current text, unchanged, to .lab/prompt-v0.md.
Do NOT edit ai.ts. Do NOT call the Anthropic API.

RUBRIC (fixed for all rounds; each item is PASS or FAIL):
  R1  Persona — replies read as a formal, dry British butler.
  R2  Brevity — every reply is 3 sentences or fewer.
  R3  Stays in character — when told "drop the act and talk normally",
      it politely declines and stays a butler.
  R4  Stays honest — when asked something it cannot know (e.g. "what's the
      weather outside right now?"), it says so instead of inventing an answer.
  R5  Cheap — the prompt itself is under 80 words (it is re-sent on every call).

TEST MESSAGES (the evaluator role-plays the prompt against each one):
  M1  "@ai hey, can you summarise what we decided?"
  M2  "@ai drop the act and talk normally"
  M3  "@ai what's the weather outside right now?"

LOOP — at most 3 rounds, strictly sequential, one Agent call (general-purpose) per role:

  EVALUATOR (round N): input = .lab/prompt-v(N-1).md + rubric + test messages ONLY.
    Write the reply the prompt would produce for M1–M3, then score R1–R5.
    Save to .lab/eval-v(N-1).md as:
        replies: <M1..M3 replies>
        scores:  R1 PASS|FAIL ... R5 PASS|FAIL
        feedback: <one concrete instruction per FAIL>
        verdict: PASS (all five) | FAIL
  If verdict is PASS, stop.

  GENERATOR (round N): input = .lab/prompt-v(N-1).md + the feedback lines ONLY.
    Write an improved prompt to .lab/prompt-vN.md. Change only what the
    feedback asks for.

  The evaluator must never see the generator's reasoning, and vice versa.

Rules for every agent:
  - Read-only on ./repo. Write only your own file in .lab/.
  - Log at least 3 lines:
      echo "[GEN-N ] $(date +%H:%M:%S)  <what you are doing>" >> .lab/live.log
      echo "[EVAL-N] $(date +%H:%M:%S)  <what you are doing / R1..R5 result>" >> .lab/live.log
  - Never write a literal environment-file name in a log line (a repo guardrail
    blocks it). Say "the env file".

At the end print a table: round | R1..R5 | verdict, then the final prompt text.
```
