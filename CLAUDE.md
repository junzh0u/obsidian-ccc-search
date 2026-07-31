# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read [DEVELOPMENT.md](DEVELOPMENT.md) first** — commands, architecture, the plugin-review constraints that shape the code, and the release process all live there, and it is the file to update when any of that changes. Everything below is the delta for working in this repo, not a summary of it.

## Working here

- The plugin is a thin client over the `ccc` CLI; assume nothing about the daemon's lifecycle, since ccc owns it.
- `README.md` is end-user documentation **and** the text shown on the plugin's page at community.obsidian.md. Keep it non-technical: build instructions, architecture, and anything only a contributor needs belong in `DEVELOPMENT.md`.
- Obsidian's plugin guidelines are binding here, not advisory — a violation blocks the next submission. The specific ones this repo has already been flagged for are listed in DEVELOPMENT.md; don't reintroduce them.
- Verifying a change in the real app is manual: `just install-vault`, then the user reloads the plugin in Obsidian. There are no tests, so `just check` passing is not evidence a change works.
- Never push a version tag without being asked — it publishes a GitHub release that the community directory picks up.
