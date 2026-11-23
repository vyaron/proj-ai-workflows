# AI Workflows — Hands-on Demos

Short demos of the common patterns for building with LLMs, all run against a real
codebase: [demo-chat-agents](https://github.com/vyaron/demo-chat-agents), a
WhatsApp-style chat app.

| Pattern | Demo | Idea in one line |
|---|---|---|
| Chaining | [demo-chaining.md](demo-chaining.md) | Fixed steps, each feeding the next, with a gate in between |
| Routing | [demo-routing.md](demo-routing.md) | Classify the input, send it to one specialist |
| Parallelization | [demo-concurrency.md](demo-concurrency.md) | Several agents work on the same repo at the same time |
| Evaluator–Optimizer | [demo-evaluator-optimizer.md](demo-evaluator-optimizer.md) | Generate, grade against a rubric, repeat |

Each demo takes about 5 minutes.

## Workflow or agent?

- **Workflow:** your code controls the flow, and Claude does the work inside each step.
- **Agent:** Claude controls the flow, choosing which tool to use next until the goal is met.

The demos run as prompts in Claude Code, which is an agent acting out each workflow.
To see a workflow written as actual code, compare
[demo-chaining-workflow.mjs](demo-chaining-workflow.mjs) with the prompt in
[demo-chaining.md](demo-chaining.md).

## Setup

You need [Node.js](https://nodejs.org) 20.6+ and
[Claude Code](https://claude.com/claude-code).

```bash
# 1. This repo
git clone https://github.com/vyaron/proj-ai-workflows.git
cd proj-ai-workflows

# 2. The codebase the demos work on, cloned INTO ./repo
git clone https://github.com/vyaron/demo-chat-agents.git repo

# 3. Only needed for the code version of the chaining demo
npm install
echo "ANTHROPIC_API_KEY=your-key-here" > .env
npm run chain
```

Get an API key at [platform.claude.com](https://platform.claude.com). Never commit
`.env`; it's already in `.gitignore`.

## Running a demo

1. Open Claude Code in this folder.
2. In a second terminal, start the live log (each demo shows the command).
3. Copy the prompt from the bottom of the demo file and paste it into Claude Code.

Everything the demos write goes to `.lab/`, which is gitignored, so you can delete
it at any time.
