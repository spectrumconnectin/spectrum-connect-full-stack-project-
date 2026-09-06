# agent.py — Claude Agents SDK + Composio

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv
from composio import Composio
from composio_claude_agent_sdk import ClaudeAgentSDKProvider
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, create_sdk_mcp_server

# Reads COMPOSIO_API_KEY from composio-agent/.env (falls back to the shell env).
load_dotenv(Path(__file__).parent / ".env")

composio = Composio(provider=ClaudeAgentSDKProvider())
user_id = "user_wnzqb"

# Create a tool router session
session = composio.create(user_id=user_id)
tools = session.tools()
custom_server = create_sdk_mcp_server(name="composio", version="1.0.0", tools=tools)


async def main():
    prompt = (
        " ".join(sys.argv[1:])
        if len(sys.argv) > 1
        else "Star the composiohq/composio repo on GitHub"
    )

    options = ClaudeAgentOptions(
        system_prompt="You are a helpful assistant",
        permission_mode="bypassPermissions",
        mcp_servers={
            "composio": custom_server,
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for msg in client.receive_response():
            print(msg)


asyncio.run(main())
