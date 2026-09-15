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
# 1. Log in via the browser (no passwords in the terminal)
wani login
# → shows a code, opens the portal authorization page, waits for approval

# 2. Guided end-to-end check (interactive: phone → template → code)
wani otp test
wani otp test --phone 201012345678 --template-id YOUR_TEMPLATE_ID --code 123456

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
| `wani login [--no-open]` | Log in via the browser device flow (session stored encrypted). `--no-open` prints the URL without opening it |
| `wani logout [--all]` | Discard the stored session (`--all` also clears stored project keys) |
| `wani whoami` | Show the logged-in account |
| `wani project list` | List your projects |
| `wani project use <id-or-name> [--api-key KEY]` | Select the working project (id, id-prefix or exact name); optionally save its API key |
| `wani project current` | Show the selected project |
| `wani otp test [--phone P] [--template-id ID \| --template NAME] [--code C]` | Guided end-to-end OTP check (prompts for missing values) |
| `wani otp send --phone P (--template-id ID \| --template NAME [--language CODE]) [--expires N]` | Send a WhatsApp OTP |
| `wani otp verify --token T [--code C]` | Verify an OTP code (prompts for the code when omitted) |
| `wani otp status --token T` | Check OTP delivery status |

Global options: `--base-url <url>` (or `WANI_BASE_URL`), `--dev`, `--timeout <ms>`, `--json`/`-j`, `--help`, `--version`.

> `--project` in OTP commands only selects *which stored key* to use — it is
> never sent to the API. Combining `--project` with `--api-key` is rejected
> as meaningless: the project is always resolved server-side from the key.

## Authentication model

- **Account commands** (`login`, `whoami`, `project …`) use the stored CLI session token from `wani login` (browser device flow — email/password never touch the terminal). Revoke anytime from Portal Settings → CLI & Integrations, or with `wani logout`.
- **OTP commands** need a project API key, resolved as: `--api-key` flag → `WANI_API_KEY` env → key saved with `wani project use --api-key`. The project itself is always resolved server-side from that key — the CLI never sends a project id to the OTP API.

## Output

Human-readable tables by default; add `--json` for a single machine-readable document (errors go to stderr with exit code `1`, usage errors exit `2`).

## Security model (read this before publishing use)

- **At rest:** the CLI access token and project API keys are **AES-256-GCM encrypted**
  in `~/.wani/config.json` with a key derived from machine+user factors plus a
  per-install salt. A copied config file is useless on another machine/user —
  but this is **not** an OS-keychain substitute: any process running as *your*
  OS user can derive the same key. The hard boundary remains file permissions
  (`0600`, dir `0700`) and OS user separation — the same model as `gh`/`aws`
  CLIs. On shared machines, prefer `--api-key` / `WANI_API_KEY` (memory-only).
- **In transit:** credentials are sent **only** to `https://developers.aiwni.com`.
  Any other host is refused; loopback URLs work only with explicit `--dev`
  mode (`--dev` flag or `WANI_DEV=1`). Never run the CLI against a URL you
  don't control — a malicious server would receive your credentials.
- Keys are sent only as `x-api-key` / `Authorization: Bearer` to the configured base
  URL, and never appear in error output or logs.
- Profile lives at `~/.wani/config.json` (override dir with `WANI_CONFIG_HOME`).
  `wani logout` clears the session only; `wani logout --all` also removes
  stored project keys and the selected project.

## License

MIT — see [LICENSE](./LICENSE).
