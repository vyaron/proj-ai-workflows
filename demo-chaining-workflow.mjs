// Prompt chaining as a REAL workflow: the control flow is this file.
//
// Claude does the work inside each step. Everything else — the order of the
// steps, what each step is allowed to see, and whether the chain continues — is
// plain JavaScript you can read top to bottom. Compare with the prompt version
// in demo-chaining.md, where Claude itself plays the orchestrator.
//
//   npm install @anthropic-ai/sdk
//   node demo-chaining-workflow.mjs                               # the good input
//   node demo-chaining-workflow.mjs "- [ ] make the chat better"  # watch gate 1 stop it
//
// Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). Reads ./repo, writes .lab/.

import Anthropic from "@anthropic-ai/sdk"
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"

const MODEL = "claude-opus-5-5"
const INPUT = process.argv[2] ?? "- [ ] Conversations search | stack:full"

const client = new Anthropic()
mkdirSync(".lab", { recursive: true })
// Clear the previous run, so a stopped chain leaves no stale step outputs behind.
for (const file of ["chain-1-spec.md", "chain-2-contract.md", "chain-3-tests.md"]) {
  rmSync(`.lab/${file}`, { force: true })
}

function log(tag, message) {
  const time = new Date().toTimeString().slice(0, 8)
  const line = `[${tag.padEnd(6)}] ${time}  ${message}`
  console.log(line)
  appendFileSync(".lab/live.log", line + "\n")
}

// One LLM call. This is the ONLY place Claude is involved.
async function step(tag, instructions, input) {
  log(tag, "calling Claude...")
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low" },
    // If a safety classifier declines, the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: instructions,
    messages: [{ role: "user", content: input }],
  })
  if (response.stop_reason === "refusal") throw new Error(`${tag} was refused`)
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
  log(tag, `done (${response.usage.output_tokens} output tokens)`)
  return text
}

// A failed gate ends the chain. Returning (instead of process.exit) lets open
// HTTP connections close cleanly.
function stop(gate, reason) {
  log(gate, `FAIL  ${reason}`)
  log("CHAIN", "stopped — later steps never ran")
  process.exitCode = 1
}

async function runChain() {
  // ── STEP 1: SPEC ────────────────────────────────────────────────────────────
  const spec = await step(
    "STEP-1",
    "You write acceptance criteria. Output ONLY lines of the form `C<n>: <one sentence>`, " +
      "4 to 6 of them, each observable by an automated test. If the task is too vague to " +
      "write testable criteria, output exactly `VAGUE: <why>` instead.",
    `Task: ${INPUT}\n\nProduct definition:\n${readFileSync("repo/.doc/product-definition.md", "utf-8")}`
  )
  writeFileSync(".lab/chain-1-spec.md", spec)

  // ── GATE 1: plain code, no LLM ──────────────────────────────────────────────
  const criteria = spec.split("\n").filter((line) => /^C\d+:/.test(line.trim()))
  if (spec.startsWith("VAGUE")) return stop("GATE-1", spec)
  if (criteria.length < 4 || criteria.length > 6) return stop("GATE-1", `${criteria.length} criteria, expected 4–6`)
  const fuzzy = criteria.filter((c) => /\b(better|nice|fast|easy|intuitive)\b/i.test(c))
  if (fuzzy.length) return stop("GATE-1", `untestable wording: ${fuzzy[0]}`)
  log("GATE-1", `PASS  ${criteria.length} testable criteria`)

  // ── STEP 2: CONTRACT (sees the spec, never the backlog line) ────────────────
  const contract = await step(
    "STEP-2",
    "You design an API contract. For each REST endpoint or socket event, give method/path " +
      "or event name, request shape, response shape, and a line `covers: C1, C3` listing " +
      "the criteria it satisfies. Match the style of the reference route file.",
    `Criteria:\n${criteria.join("\n")}\n\nStyle reference:\n${readFileSync("repo/backend/src/routes/messages.ts", "utf-8")}`
  )
  writeFileSync(".lab/chain-2-contract.md", contract)

  // ── GATE 2: every criterion is covered ──────────────────────────────────────
  const ids = criteria.map((c) => c.trim().split(":")[0])
  const covered = new Set(contract.match(/C\d+/g) ?? [])
  const missing = ids.filter((id) => !covered.has(id))
  if (missing.length) return stop("GATE-2", `criteria not covered: ${missing.join(", ")}`)
  log("GATE-2", `PASS  all ${ids.length} criteria covered`)

  // ── STEP 3: TESTS (sees the contract only) ──────────────────────────────────
  const tests = await step(
    "STEP-3",
    "List test names only, one per line, as `[vitest|playwright] <name> — <endpoint or event>`.",
    contract
  )
  writeFileSync(".lab/chain-3-tests.md", tests)

  log("CHAIN", "complete — see .lab/chain-*.md")
}

await runChain()
