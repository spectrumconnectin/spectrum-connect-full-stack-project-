# Composio Agent (Claude Agent SDK)

Standalone agent that wires [Composio's tool router](https://docs.composio.dev/tool-router/overview)
into the Claude Agent SDK via an in-process MCP server. Lives in its own
Python 3.11 venv because the main backend venv (`project-master-spectrum/venv`)
is on Python 3.9 and `claude-agent-sdk` requires 3.10+.

## Setup

```bash
cd composio-agent

# One-time (already done if venv/ exists):
/opt/homebrew/bin/python3.11 -m venv venv
venv/bin/pip install -r requirements.txt

# Configure
cp .env.example .env   # then paste your real COMPOSIO_API_KEY
```

The Claude side authenticates the same way Claude Code does (`ANTHROPIC_API_KEY`
or your existing Claude Code login).

### Claude auth — "Not logged in · Please run /login"

The Agent SDK spawns its own `claude` process, which needs credentials:

- **Run from your own terminal** (Terminal/iTerm, not from inside another
  Claude Code session) so the spawned CLI can use your existing `claude` login.
  If you've never logged in there, run `claude /login` once first.
- **Or** add `ANTHROPIC_API_KEY=sk-ant-...` to `.env` here (key from
  https://console.anthropic.com) — works anywhere, billed as API usage.

## Run

```bash
venv/bin/python agent.py                          # default demo prompt
venv/bin/python agent.py "your task here"         # custom prompt
```

Tools available to the agent depend on which apps the `user_id` has connected
in Composio — manage connections at https://app.composio.dev. See
[Managing Multiple Accounts](https://docs.composio.dev/tool-router/managing-multiple-accounts).
