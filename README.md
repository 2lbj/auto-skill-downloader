# auto-skill-downloader

An [OpenCode](https://opencode.ai) plugin that automatically downloads missing skills from [skills.sh](https://skills.sh) when the `skill` tool reports "not found".

[中文文档](README.zh-cn.md)

## What it does

When an AI agent calls the `skill` tool and the skill doesn't exist locally, this plugin intercepts the call before execution, downloads the best match from skills.sh, installs it to `.opencode/skills/`, then lets the tool run normally — the skill is already on disk when the tool looks for it.

**Before (without plugin):**
```
Skill or command "frontend-design" not found. Available: playwright, frontend-ui-ux, ...
```

**After (with plugin):**
```
[auto-skill-downloader] Downloaded "frontend-design" from anthropics/skills (402,971 installs) → .opencode/skills/frontend-design/SKILL.md
Other candidates skipped: pbakaus/impeccable (53,448)
```
The skill tool then loads normally — no retry needed.

## How it works

- Hooks into `tool.execute.before` — fires before every skill tool call, returns immediately if skill already exists
- Searches `https://skills.sh/api/skills/all-time/0` (top 200 skills) for a match
- Exact name match first, then partial match — all sorted by install count descending
- Downloads `SKILL.md` from the source GitHub repo, trying common path patterns
- Installs to `{project}/.opencode/skills/{name}/SKILL.md` (project scope, not global)
- If multiple skills share the same name, picks the highest-install one and logs the rest to stderr

## OpenCode

OpenCode uses its own plugin install; install this plugin separately even if you already use it in another harness.

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/2lbj/auto-skill-downloader/main/INSTALL.md
```

## Installation

### Option A — git

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "git+https://github.com/2lbj/auto-skill-downloader.git"
  ]
}
```

### Option B — local path

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
[auto-skill-downloader] Downloaded "frontend-design" from anthropics/skills (402,971 installs)
Other candidates skipped: some-fork/skills (42), another/repo (11)
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
