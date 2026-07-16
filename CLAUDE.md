# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Obsidian desktop-only plugin for semantic vault search. It is a thin client: each query shells out to `ccc search --json` (cocoindex-code) with the vault as the CWD. All heavy lifting — embedding model, index, incremental refresh — lives in ccc's background daemon, which ccc auto-starts; the plugin never manages it.

## Commands

```sh
just install        # bun install
just check          # type check only (tsc --noEmit)
just build          # type check + esbuild production bundle → main.js
just dev            # esbuild watch mode (inline sourcemaps, no type check)
just install-vault  # build + copy main.js/manifest.json/styles.css into the vault
```

There are no tests. `install-vault` needs `OBSIDIAN_VAULT` set (env or local `.env`; see `.env.example`). Enabling/reloading the plugin in Obsidian is manual — after `install-vault`, the user must reload the plugin to see changes.

## Architecture

Data flow: `main.ts` (plugin entry: ribbon icon, command with default hotkey, settings) → `modal.ts` (`CccSearchModal extends SuggestModal`) → `ccc-client.ts` (`execFile` wrapper) → `ccc` binary → JSON parsed into `types.ts` shapes.

Query lifecycle in `modal.ts::getSuggestions` — the subtle part:
1. **Debounce (250 ms)** is promise-based: a newer keystroke resolves the pending debounce with `false`, and that superseded call returns early.
2. **Abort**: one `AbortController` per request; a new query aborts the in-flight one. Abort errors are deliberately swallowed (stale-query cancellation, not failure). The spinner is hidden in `finally` only if `this.abortController === controller` — a superseding query owns the spinner.
3. **First-query special-casing**: `firstQuery` gets a 120 s timeout (cold daemon loads the embedding model; warm queries get 30 s), a "warming up" empty-state hint, and optionally triggers `--refresh` (incremental reindex, per settings).

`ccc-client.ts` details that matter:
- Binary resolution: configured path if set, else `ccc` on PATH, then `~/.local/bin/ccc`. The fallback exists because Obsidian launched from Finder inherits launchd's minimal PATH.
- On failure, `ccc search --json` emits a machine-readable `message` on **stdout**; error mapping tries that first, then the stderr tail.
- ccc has no `--version`; `testCcc` uses `ccc --help` to verify reachability.

Other conventions:
- ccc line numbers are 1-based; Obsidian `eState.line` is 0-based (converted in `onChooseSuggestion`).
- The settings tab's "Configure" hotkey button uses the undocumented `app.setting.openTabById("hotkeys")` API.
- `styles.css` uses only Obsidian theme variables (`--size-*`, `--text-muted`, `--interactive-accent`, …); all classes are `ccc-`prefixed.
- Node builtins (`child_process`, `os`, `path`) are fine — desktop-only plugin (`isDesktopOnly: true`), and esbuild marks builtins external.
- `manifest.json` + `versions.json` follow Obsidian's plugin release scheme; keep `package.json` version in sync with `manifest.json`.
