# INSTALL — auto-skill-downloader

Machine-readable installation guide for AI agents.

## Prerequisites check

```bash
opencode --version   # must be >= 1.14.0
```

## Step 1 — Locate opencode config file

```bash
cat ~/.config/opencode/opencode.json
```

The file contains a JSON object. If it does not exist, create it:

```bash
mkdir -p ~/.config/opencode
echo '{}' > ~/.config/opencode/opencode.json
```

## Step 2 — Add the plugin

Edit `~/.config/opencode/opencode.json`. Add `"git+https://github.com/YOUR_USERNAME/auto-skill-downloader.git"` to the `plugin` array.

**If `plugin` key does not exist**, add it:

```json
{
  "plugin": [
    "git+https://github.com/YOUR_USERNAME/auto-skill-downloader.git"
  ]
}
```

**If `plugin` key already exists**, append to the array:

```json
{
  "plugin": [
    "existing-plugin",
    "git+https://github.com/YOUR_USERNAME/auto-skill-downloader.git"
  ]
}
```

## Step 3 — Verify the config is valid JSON

```bash
python3 -c "import json; json.load(open('$HOME/.config/opencode/opencode.json')); print('valid')"
```

Expected output: `valid`

## Step 4 — Restart OpenCode

The plugin loads at startup. Restart the OpenCode process for changes to take effect.

## Verification

After restart, the plugin is active. To confirm it works, trigger a missing skill:

In an OpenCode session, call the skill tool with a name that does not exist locally. The plugin intercepts the "not found" error, searches skills.sh, downloads the skill to `.opencode/skills/<name>/SKILL.md` in the current project directory, and returns a success message instructing the agent to retry.

## Uninstall

Remove the plugin entry from `~/.config/opencode/opencode.json` and restart OpenCode.

Downloaded skills remain in `.opencode/skills/` — delete them manually if needed:

```bash
rm -rf .opencode/skills/<skill-name>
```
