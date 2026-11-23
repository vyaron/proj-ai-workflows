# Demo — Parallelization: Four Reviewers, One Repo

**Pattern:** split a task into independent parts and run them **at the same time**.
Each agent gets its own narrow job, none of them sees the others' work, and the
results are combined at the end. This is the *sectioning* variant of
parallelization.

**Repo:** https://github.com/vyaron/demo-chat-agents (cloned to `./repo`)
**Time:** ~5 minutes · **Writes:** only to `.lab/` (gitignored)

```
           ┌─► [SEC]     security      ─┐
           ├─► [PERF]    performance   ─┤
 repo ─────┼─► [QUALITY] clean code    ─┼─► 4 reports ─► compare
           └─► [STYLE]   coding style  ─┘
                 all four at once
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

**What you'll see:** four agents start together. The log terminal fills with
interleaved lines from all four, with matching timestamps: SEC reads a hook while
PERF reads a component and STYLE checks naming. Nobody waits for anybody. Each
agent saves its report to `.lab/<TAG>-report.md`.

**Why it works:** each reviewer holds **one** question. A single reviewer asked to
check security, performance, quality and style at once spreads its attention thin
and blends the four into an average. Four focused reviewers go deeper, and running
them at the same time means the review takes about as long as the slowest one, not
the sum of all four.

**You might also see:** the security reviewer tries to open the repo's environment
file and gets **blocked**. The repo has a guardrail hook
(`.claude/hooks/block-secret-file-access.js`) that inspects every tool call, and it
doesn't care that the reviewer is on our side. Guardrails apply to your own agents too.

---

## Then compare

Once all four have reported, paste this follow-up:

```
Now cross-reference the four reports.

1. Where do two lenses want INCOMPATIBLE things — where satisfying one reviewer
   breaks another? Name both lenses, state the tension in one sentence, and say
   what a human has to decide.

2. Which findings did exactly ONE lens catch, that no other lens could have?

Do not resolve anything. Surface it.
```

**Takeaway:** the value isn't four opinions. It's the *seams* between them: places
where, for example, a performance fix makes the code harder to read. A single
reviewer would have quietly picked a side without telling you there was a choice.

You can read all four reports in the second terminal:

```bash
cat .lab/*-report.md
```

---

## When to use parallelization

- **Sectioning** (this demo): the task splits into independent parts that don't
  need each other's results.
- **Voting:** run the *same* task several times and compare the answers. Where they
  agree, you can be more confident; where they disagree, that's worth a look.
- You want speed, or you want each part to get the model's full attention.

Skip it when the steps depend on each other. That's a job for
[chaining](demo-chaining.md).

---

## Try it yourself

- Swap one lens for another, such as `ACCESSIBILITY` or `SKEPTICAL PM` ("is this
  whole dev loop worth it compared with just using Claude Code directly?").
- Run the security lens as `subagent_type: security-reviewer`, an agent defined in
  the repo with **no Write tool**. It can still log through the shell, but it can't
  save its report file the normal way. Agent type is a real design choice.

---

## The prompt

```
Audit the repository in ./repo from four independent perspectives
(if ./repo does not exist, clone https://github.com/vyaron/demo-chat-agents into it).

In a SINGLE message, issue 4 Agent tool calls so all 4 run concurrently.
Do not run them one at a time.

The 4 lenses, one per agent:

  [SEC]     SECURITY
  [PERF]    PERFORMANCE
  [QUALITY] CLEAN-CODE
  [STYLE]   CODING-STYLE

Give every agent these same instructions:

  - You are REVIEWING. Read-only: do not edit or create any file except your own
    log line appends and your own report file. Do not fix anything you find.
  - Ignore node_modules/, dist/, coverage/, test-results/, and .git/ entirely.
  - Stay strictly inside your lens. If you notice something outside it, ignore it.
    Another reviewer has it.

  - LOG AS YOU GO. Before each file you open and on each finding, append one line:

        echo "[TAG ] $(date +%H:%M:%S)  <what you are doing right now>" >> .lab/live.log

    Use your own tag from the list above, keeping the brackets and padding so the
    columns line up. Keep each line under 80 characters. Log at least 8 times —
    this is a live display, silence looks like a hang.

  - IMPORTANT: never write a literal environment-file name into a log line. Say
    "the env file" instead. A repository guardrail inspects every shell command
    and will block the echo itself if it names one.

  - Report back in EXACTLY this format:

        lens: <your lens>

        findings:
          - severity: blocker | major | minor
            what:     <the problem, one line>
            where:    [<file:line>](<path>#L<line>)
            why:      <the consequence, one line>
            fix:      <what you would change, one line>

        verdict: healthy | needs work | serious problems

  - Read files in ./repo, not via GitHub. Every `where:` is a clickable markdown
    link. Reports live in .lab/, so the link path starts with ../repo/ and ends
    in #L<line>:
        where:    [backend/src/socket/chat.ts:31](../repo/backend/src/socket/chat.ts#L31)
    Any other file:line you cite (in why: or fix:) gets the same link form.

  - 3 to 6 findings, ranked most severe first. No preamble.

  - WRITE YOUR REPORT TO DISK before you reply. Save that exact text to
    .lab/<TAG>-report.md, where TAG is your own tag without brackets or padding,
    then return the same text as your reply.
```
