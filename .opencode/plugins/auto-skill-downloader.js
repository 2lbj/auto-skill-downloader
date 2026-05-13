import { mkdir, writeFile, access } from "fs/promises"
import { join } from "path"

const SKILLS_SH_API = "https://skills.sh/api/skills/all-time"

async function searchSkillsSh(query) {
  try {
    const res = await fetch(`${SKILLS_SH_API}/0`)
    if (!res.ok) return []
    const data = await res.json()

    const exact = data.skills.filter(
      (s) => s.name === query || s.skillId === query
    )
    if (exact.length > 0) {
      return exact.sort((a, b) => b.installs - a.installs)
    }

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
    } catch {
    }
  }
  return null
}

async function installSkill(projectDir, name, content) {
  const skillDir = join(projectDir, ".opencode", "skills", name)
  await mkdir(skillDir, { recursive: true })
  await writeFile(join(skillDir, "SKILL.md"), content, "utf-8")
}

async function isSkillInstalled(projectDir, name) {
  try {
    await access(join(projectDir, ".opencode", "skills", name, "SKILL.md"))
    return true
  } catch {
    return false
  }
}

export const AutoSkillDownloaderPlugin = async ({ directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
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
        const others = candidates
          .slice(1, 4)
          .map((s) => `  • ${s.source} (${s.installs.toLocaleString()})`)
          .join("\n")
        msg += `\nOther candidates skipped (lower installs):\n${others}\n`
        if (candidates.length > 4) msg += `  … and ${candidates.length - 4} more\n`
      }

      msg += `\nPlease invoke the skill tool again with name="${skillName}" — it is now available.`
      output.output = msg
    },
  }
}
