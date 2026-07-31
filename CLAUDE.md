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

Data flow: `main.ts` (plugin entry: ribbon icon, command, settings) → `modal.ts` (`CccSearchModal extends SuggestModal`) → `ccc-client.ts` (`execFile` wrapper) → `ccc` binary → JSON parsed into `types.ts` shapes.

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
- Obsidian's community-plugin review rules bind this repo: no default hotkeys on commands, no private/undocumented APIs, sentence case in UI text, no `innerHTML` (use `createEl`/`createDiv`/`createSpan`). A default hotkey and an `app.setting.openTabById` shortcut were both removed for this reason — don't reintroduce them.
- `settings.ts` renders twice over: `getSettingDefinitions()` (declarative, 1.13+, and the only path that feeds Obsidian's settings search) and `display()` (deprecated, kept as the pre-1.13 fallback). Add or change a setting in both — shared desc strings and `testBinary()` are factored out to keep them honest. Drop `display()` only if `minAppVersion` ever reaches 1.13.0.
- `minAppVersion` is 1.5.7 because `modal.ts` uses `Vault.getFileByPath`. Raise it (in both `manifest.json` and `versions.json`) if newer APIs are adopted.
- Releases: push a tag matching `manifest.json`'s version exactly, no `v` prefix (`0.1.0`). `.github/workflows/release.yml` verifies the match, builds, and attaches `main.js`/`manifest.json`/`styles.css` — Obsidian requires those three as release assets.
- `styles.css` uses only Obsidian theme variables (`--size-*`, `--text-muted`, `--interactive-accent`, …); all classes are `ccc-`prefixed.
- Node builtins (`child_process`, `os`, `path`) are fine — desktop-only plugin (`isDesktopOnly: true`), and esbuild marks builtins external.
- `manifest.json` + `versions.json` follow Obsidian's plugin release scheme; keep `package.json` version in sync with `manifest.json`.
