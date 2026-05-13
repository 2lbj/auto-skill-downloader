# auto-skill-downloader

An [OpenCode](https://opencode.ai) plugin that automatically downloads missing skills from [skills.sh](https://skills.sh) when the `skill` tool reports "not found".

## What it does

When an AI agent calls the `skill` tool and the skill doesn't exist locally, this plugin intercepts the error, searches skills.sh for a match, downloads the best candidate (ranked by install count), and installs it to `.opencode/skills/` in the current project. The agent is then told to retry — no human intervention needed.

**Before (without plugin):**
```
Skill or command "systematic-debugging" not found. Available: playwright, frontend-ui-ux, ...
```

**After (with plugin):**
```
✓ Skill "systematic-debugging" downloaded from obra/superpowers (91,246 installs)
  Installed to: .opencode/skills/systematic-debugging/SKILL.md

Other candidates skipped (lower installs):
  • some-other/repo (1,200)

Please invoke the skill tool again with name="systematic-debugging" — it is now available.
```

## How it works

- Hooks into `tool.execute.after` — fires after every tool call, zero overhead when skill is found
- On "not found": fetches `https://skills.sh/api/skills/all-time/0` (top 200 skills)
- Exact name match first, then partial match — all sorted by install count descending
- Downloads `SKILL.md` from the source GitHub repo, trying common path patterns
- Installs to `{project}/.opencode/skills/{name}/SKILL.md` (project scope, not global)
- If multiple skills share the same name, picks the highest-install one and lists the rest

## Installation

### Option A — npm (once published)

```bash
npm install -g auto-skill-downloader
```

Then add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "auto-skill-downloader"
  ]
}
```

### Option B — git (current)

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "git+https://github.com/YOUR_USERNAME/auto-skill-downloader.git"
  ]
}
```

### Option C — local path

Clone or copy this repo anywhere, then reference it:

```json
{
  "plugin": [
    "/absolute/path/to/auto-skill-downloader"
  ]
}
```

Or relative to the opencode config dir:

```json
{
  "plugin": [
    "./plugins/auto-skill-downloader"
  ]
}
```

Restart OpenCode after editing `opencode.json`.

## Disambiguation: multiple skills with the same name

skills.sh has 90,000+ skills from many repos. When multiple skills share the same name, the plugin picks the one with the most installs and logs the others:

```
✓ Skill "frontend-design" downloaded from anthropics/skills (397,885 installs)

Other candidates skipped (lower installs):
  • some-fork/skills (42)
  • another/repo (11)
```

To install a specific source instead, use the CLI directly:

```bash
npx skills add <owner>/<repo> --skill <skill-name>
```

## Scope

Skills are installed to `.opencode/skills/` in the **current project directory** — not globally. This keeps installs reproducible per project and avoids polluting the global config.

To install globally instead, copy the downloaded `SKILL.md` to `~/.config/opencode/skills/<name>/SKILL.md`.

## Requirements

- OpenCode ≥ 1.14.0
- Internet access to reach `skills.sh` and `raw.githubusercontent.com`

## License

MIT
