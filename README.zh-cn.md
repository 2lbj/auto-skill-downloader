# auto-skill-downloader

[OpenCode](https://opencode.ai) 插件，当 `skill` 工具报告"未找到"时，自动从 [skills.sh](https://skills.sh) 下载缺失的 skill。

[English](README.md)

## 功能说明

当 AI agent 调用 `skill` 工具但该 skill 在本地不存在时，插件在工具执行前拦截调用，从 skills.sh 搜索并下载最佳匹配项到 `.opencode/skills/`，然后让工具正常执行——工具查找时 skill 已在磁盘上，无需重试。

**安装前（无插件）：**
```
Skill or command "frontend-design" not found. Available: playwright, frontend-ui-ux, ...
```

**安装后（有插件）：**
```
[auto-skill-downloader] Downloaded "frontend-design" from anthropics/skills (402,971 installs) → .opencode/skills/frontend-design/SKILL.md
Other candidates skipped: pbakaus/impeccable (53,448)
```
skill 工具随后正常加载，无需重试。

## 工作原理

- 挂载 `tool.execute.before` hook——每次 skill 工具调用前触发，skill 已存在则立即返回
- 搜索 `https://skills.sh/api/skills/all-time/0`（前 200 个 skill）查找匹配项
- 优先精确匹配名称，其次模糊匹配——全部按安装数降序排列
- 从来源 GitHub 仓库下载 `SKILL.md`，依次尝试常见路径格式
- 安装到 `{项目目录}/.opencode/skills/{name}/SKILL.md`（项目作用域，非全局）
- 若多个 skill 同名，选安装数最高的，其余候选输出到 stderr

## OpenCode

OpenCode 使用自己的插件安装机制；即使你已在其他 harness 中使用过本插件，也需要单独为 OpenCode 安装。

告诉 OpenCode：

```
Fetch and follow instructions from https://raw.githubusercontent.com/2lbj/auto-skill-downloader/main/INSTALL.md
```

## 安装方式

### 方式 A — git（推荐）

在 `~/.config/opencode/opencode.json` 中添加：

```json
{
  "plugin": [
    "git+https://github.com/2lbj/auto-skill-downloader.git"
  ]
}
```

### 方式 B — 本地路径

将本仓库 clone 或复制到任意位置，然后引用：

```json
{
  "plugin": [
    "/绝对路径/auto-skill-downloader"
  ]
}
```

或相对于 opencode 配置目录的相对路径：

```json
{
  "plugin": [
    "./plugins/auto-skill-downloader"
  ]
}
```

编辑 `opencode.json` 后重启 OpenCode 生效。

## 同名 skill 的处理

skills.sh 上有 9 万多个 skill，来自不同仓库。当多个 skill 同名时，插件选择安装数最高的版本并列出其余候选：

```
[auto-skill-downloader] Downloaded "frontend-design" from anthropics/skills (402,971 installs)
Other candidates skipped: some-fork/skills (42), another/repo (11)
```

如需安装特定来源，直接使用 CLI：

```bash
npx skills add <owner>/<repo> --skill <skill-name>
```

## 作用域

Skill 安装到**当前项目目录**的 `.opencode/skills/` 下，不影响全局配置，保证每个项目的安装可复现。

如需全局安装，将下载的 `SKILL.md` 手动复制到 `~/.config/opencode/skills/<name>/SKILL.md`。

## 环境要求

- OpenCode ≥ 1.14.0
- 可访问 `skills.sh` 和 `raw.githubusercontent.com`

## 许可证

MIT
