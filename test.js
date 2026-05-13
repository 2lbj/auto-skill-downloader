import { mkdir, rm, access } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

const SKILLS_SH_API = "https://skills.sh/api/skills/all-time"

async function searchSkillsSh(query) {
  try {
    const res = await fetch(`${SKILLS_SH_API}/0`)
    if (!res.ok) return []
    const data = await res.json()
    const exact = data.skills.filter((s) => s.name === query || s.skillId === query)
    if (exact.length > 0) return exact.sort((a, b) => b.installs - a.installs)
    const partial = data.skills.filter(
      (s) => s.name.includes(query) || s.skillId.includes(query) || query.includes(s.name)
    )
    return partial.sort((a, b) => b.installs - a.installs)
  } catch {
    return []
  }
}

async function downloadSkill(entry) {
  const [owner, repo] = entry.source.split("/")
  if (!owner || !repo) return null
  const paths = [
    `skills/${entry.skillId}/SKILL.md`,
    `${entry.skillId}/SKILL.md`,
    `.skills/${entry.skillId}/SKILL.md`,
  ]
  for (const skillPath of paths) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${skillPath}`
    try {
      const res = await fetch(url)
      if (res.ok) return await res.text()
    } catch {}
  }
  return null
}

async function installSkill(projectDir, name, content) {
  const skillDir = join(projectDir, ".opencode", "skills", name)
  await mkdir(skillDir, { recursive: true })
  await Bun.write(join(skillDir, "SKILL.md"), content)
}

async function isSkillInstalled(projectDir, name) {
  try {
    await access(join(projectDir, ".opencode", "skills", name, "SKILL.md"))
    return true
  } catch {
    return false
  }
}

async function runHook(directory, input, output) {
  if (input.tool !== "skill") return
  const out = output.output ?? ""
  const match =
    out.match(/Skill (?:or command )?"([^"]+)" not found/i) ??
    out.match(/skill "([^"]+)" not found/i)
  if (!match) return
  const skillName = match[1]
  if (!skillName) return

  if (await isSkillInstalled(directory, skillName)) {
    output.output = `Skill "${skillName}" is now available. Please retry your skill invocation.`
    return
  }

  const candidates = await searchSkillsSh(skillName)
  if (candidates.length === 0) {
    output.output =
      `Skill "${skillName}" not found locally or on skills.sh.\n` +
      `Install manually: npx skills add <owner>/<repo> --skill ${skillName}\n` +
      `Browse: https://skills.sh`
    return
  }

  const best = candidates[0]
  const content = await downloadSkill(best)
  if (!content) {
    output.output =
      `Found "${skillName}" on skills.sh (${best.source}) but download failed.\n` +
      `Try manually: npx skills add ${best.source} --skill ${best.skillId}`
    return
  }

  await installSkill(directory, skillName, content)

  let msg =
    `✓ Skill "${skillName}" downloaded from ${best.source} (${best.installs.toLocaleString()} installs)\n` +
    `  Installed to: .opencode/skills/${skillName}/SKILL.md\n`

  if (candidates.length > 1) {
    const others = candidates.slice(1, 4).map((s) => `  • ${s.source} (${s.installs.toLocaleString()})`).join("\n")
    msg += `\nOther candidates skipped (lower installs):\n${others}\n`
    if (candidates.length > 4) msg += `  … and ${candidates.length - 4} more\n`
  }

  msg += `\nPlease invoke the skill tool again with name="${skillName}" — it is now available.`
  output.output = msg
}

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓  ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗  ${name}`)
    console.log(`     ${e.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

function assertIncludes(str, substr) {
  if (!str.includes(substr)) throw new Error(`Expected output to include "${substr}"\n     Got: "${str}"`)
}

const TMP = join(tmpdir(), `asd-test-${Date.now()}`)
await mkdir(TMP, { recursive: true })

console.log("\nauto-skill-downloader — test suite\n")

await test("non-skill tool is ignored", async () => {
  const output = { output: 'Skill "foo" not found' }
  await runHook(TMP, { tool: "bash" }, output)
  assertIncludes(output.output, "not found")
})

await test("skill tool with no error is ignored", async () => {
  const output = { output: "skill loaded successfully" }
  await runHook(TMP, { tool: "skill" }, output)
  assert(output.output === "skill loaded successfully", "output should be unchanged")
})

await test("already-installed skill returns retry message", async () => {
  const name = "already-there"
  const skillDir = join(TMP, ".opencode", "skills", name)
  await mkdir(skillDir, { recursive: true })
  await Bun.write(join(skillDir, "SKILL.md"), "---\nname: already-there\n---\n")

  const output = { output: `Skill "${name}" not found` }
  await runHook(TMP, { tool: "skill" }, output)
  assertIncludes(output.output, "is now available")
  assertIncludes(output.output, "retry")
})

await test("unknown skill returns manual install hint", async () => {
  const output = { output: 'Skill "zzz-nonexistent-skill-xyz-9999" not found' }
  await runHook(TMP, { tool: "skill" }, output)
  assertIncludes(output.output, "not found locally or on skills.sh")
  assertIncludes(output.output, "npx skills add")
})

await test("known skill is downloaded and installed (real network)", async () => {
  const name = "systematic-debugging"
  const output = { output: `Skill or command "${name}" not found. Available: foo, bar` }

  await runHook(TMP, { tool: "skill" }, output)

  assertIncludes(output.output, "✓ Skill")
  assertIncludes(output.output, name)
  assertIncludes(output.output, "Installed to:")
  assertIncludes(output.output, "Please invoke the skill tool again")

  const installed = await isSkillInstalled(TMP, name)
  assert(installed, "SKILL.md should exist on disk after install")

  const content = await Bun.file(join(TMP, ".opencode", "skills", name, "SKILL.md")).text()
  assert(content.length > 100, "SKILL.md should have real content")
  assertIncludes(content, "systematic-debugging")
})

await test("second call for same skill returns retry (idempotent)", async () => {
  const name = "systematic-debugging"
  const output = { output: `Skill "${name}" not found` }
  await runHook(TMP, { tool: "skill" }, output)
  assertIncludes(output.output, "is now available")
  assertIncludes(output.output, "retry")
})

await rm(TMP, { recursive: true, force: true })

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
