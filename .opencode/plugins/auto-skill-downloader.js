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
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "skill") return

      const skillName = output.args?.name
      if (!skillName || typeof skillName !== "string") return

      if (await isSkillInstalled(directory, skillName)) return

      const candidates = await searchSkillsSh(skillName)
      if (candidates.length === 0) return

      const best = candidates[0]
      const content = await downloadSkill(best)
      if (!content) return

      await installSkill(directory, skillName, content)

      let notice =
        `[auto-skill-downloader] Downloaded "${skillName}" from ${best.source} ` +
        `(${best.installs.toLocaleString()} installs) → .opencode/skills/${skillName}/SKILL.md`

      if (candidates.length > 1) {
        const others = candidates
          .slice(1, 4)
          .map((s) => `${s.source} (${s.installs.toLocaleString()})`)
          .join(", ")
        notice += `\nOther candidates skipped: ${others}`
        if (candidates.length > 4) notice += `, … and ${candidates.length - 4} more`
      }

      console.error(notice)
    },
  }
}
