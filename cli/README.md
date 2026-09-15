# @aiwni/cli — Wani Developer CLI

Official command-line client for the [Wani Developer API](https://developers.aiwni.com/docs): manage projects and test the WhatsApp OTP API from your terminal.

> Server-side credentials live in this tool. Never paste terminal output containing tokens into public places, and never commit `~/.wani/config.json`.

The CLI talks to **Wani's public HTTP API exclusively**. It does **not** communicate with Meta/WhatsApp directly.

- Node.js ≥ 18, zero runtime dependencies
- Human-readable output by default, `--json` for scripting

## Installation

```bash
npm install -g @aiwni/cli
```

Verify:

```bash
wani --version
```

## Quick start

```bash
# 1. Log in with your Developer Portal account
wani login

# 2. See your projects and pick one
wani project list
wani project use cmu123abc --api-key wani_live_xxxx

# 3. Send a test OTP (templateId is shown on each template card in the portal)
wani otp send --phone 201012345678 --template-id YOUR_TEMPLATE_ID

# 4. Verify the code and check status
wani otp verify --token <token> --code 123456
wani otp status --token <token>
```

## Commands

| Command | Description |
|---|---|
| `wani login [--email E] [--browser]` | Log in (email/password, session stored with `0600`). `--browser` opens the portal so you can copy a project API key |
| `wani logout` | Discard the stored session |
| `wani whoami` | Show the logged-in account |
| `wani project list` | List your projects |
| `wani project use <id-or-name> [--api-key KEY]` | Select the working project (id, id-prefix or exact name); optionally save its API key |
| `wani project current` | Show the selected project |
| `wani otp send --phone P (--template-id ID \| --template NAME [--language CODE]) [--expires N]` | Send a WhatsApp OTP |
| `wani otp verify --token T [--code C]` | Verify an OTP code (prompts for the code when omitted) |
| `wani otp status --token T` | Check OTP delivery status |

Global options: `--base-url <url>` (or `WANI_BASE_URL`), `--timeout <ms>`, `--json`/`-j`, `--help`, `--version`.

## Authentication model

- **Account commands** (`login`, `whoami`, `project …`) use the stored session cookie from `wani login`.
- **OTP commands** need a project API key, resolved as: `--api-key` flag → `WANI_API_KEY` env → key saved with `wani project use --api-key`. The project itself is always resolved server-side from that key — the CLI never sends a project id to the OTP API.

## Output

Human-readable tables by default; add `--json` for a single machine-readable document (errors go to stderr with exit code `1`, usage errors exit `2`).

## Security notes

- Profile lives at `~/.wani/config.json` (`0600`; override dir with `WANI_CONFIG_HOME`).
- Keys are sent only as `x-api-key` / session cookie to the configured Wani base URL, and never appear in error output.

## License

MIT — see [LICENSE](./LICENSE).
