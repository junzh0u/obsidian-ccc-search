# Development

TypeScript + esbuild, [bun](https://bun.sh) as runtime and package manager, [just](https://github.com/casey/just) as the task runner. No runtime dependencies.

## Commands

```sh
just install        # bun install
just check          # type check only (tsc --noEmit)
just build          # type check + esbuild production bundle → main.js
just dev            # esbuild watch mode (inline sourcemaps, no type check)
just install-vault  # build + copy main.js/manifest.json/styles.css into a vault
```

Without `just`: `bun install`, then `bun run build` / `bun run check` / `bun run dev`.

`install-vault` needs the target vault in `OBSIDIAN_VAULT` — set it in your environment or copy `.env.example` to `.env`. It copies into `$OBSIDIAN_VAULT/.obsidian/plugins/ccc-search/`. Obsidian doesn't hot-reload plugins, so reload the plugin (or the app) after each install.

There are no tests.

## Architecture

The plugin is a thin client. Each query shells out to `ccc search --json` with the vault as the working directory; the embedding model, index, and incremental refresh all live in ccc's background daemon, which ccc auto-starts. The plugin never manages that daemon. Warm queries return in ~100–160 ms, comfortably inside the modal's 250 ms debounce.

Data flow: `main.ts` (plugin entry: ribbon icon, command, settings) → `modal.ts` (`CccSearchModal extends SuggestModal`) → `ccc-client.ts` (`execFile` wrapper) → the `ccc` binary → JSON parsed into `types.ts` shapes.

Three things in `modal.ts::getSuggestions` are subtler than they look:

- **Debouncing** is promise-based. A newer keystroke resolves the pending debounce with `false`, and the superseded call returns early.
- **Aborting**: one `AbortController` per request, and a new query aborts the in-flight one. Abort errors are swallowed on purpose — that's stale-query cancellation, not failure. The spinner hides in `finally` only when `this.abortController === controller`, because a superseding query owns it.
- **The first query is special-cased**: a 120 s timeout instead of 30 s (a cold daemon has to load the embedding model), a "warming up" empty state, and optionally a `--refresh` for an incremental reindex.

In `ccc-client.ts`: binary resolution tries the configured path, then `ccc` on `PATH`, then `~/.local/bin/ccc` — the fallback matters because Obsidian launched from Finder inherits launchd's minimal `PATH`. On failure, `ccc search --json` writes a machine-readable `message` to **stdout**, so error mapping reads that before falling back to the stderr tail. ccc has no `--version`, so `testCcc` uses `ccc --help` to check reachability.

Node builtins (`child_process`, `os`, `path`) are fair game — this is a desktop-only plugin (`isDesktopOnly: true`) and esbuild marks builtins external.

Two conventions worth knowing: ccc reports 1-based line numbers while Obsidian's `eState.line` is 0-based (converted in `onChooseSuggestion`), and `styles.css` uses only Obsidian theme variables (`--size-*`, `--text-muted`, `--interactive-accent`, …) with every class `ccc-`prefixed, so the plugin follows the user's theme.

## Plugin review constraints

Obsidian's community-plugin guidelines shape the code in ways that aren't obvious from reading it:

- No default hotkeys on commands, and no private or undocumented APIs. A default `Mod+Shift+S` and an `app.setting.openTabById` shortcut were both removed for this reason.
- No `innerHTML`/`outerHTML`; build DOM with `createEl`/`createDiv`/`createSpan`.
- Sentence case in UI text. Window-scoped timers (`window.setTimeout`) for popout compatibility.
- `settings.ts` renders two ways: `getSettingDefinitions()` (declarative, Obsidian 1.13+, and the only path that feeds settings search) and `display()` (deprecated, kept as the pre-1.13 fallback). Add or change a setting in **both** — shared description strings and `testBinary()` limit the drift.
- `minAppVersion` is 1.5.7 because `modal.ts` uses `Vault.getFileByPath`. Raise it in both `manifest.json` and `versions.json` if newer APIs are adopted.

## Releasing

`manifest.json` and `package.json` versions stay in sync, and every version needs a `versions.json` entry mapping it to the minimum app version.

```sh
# bump manifest.json + package.json, add the versions.json entry, commit, then:
git tag 0.1.2 && git push origin 0.1.2
```

The tag must match `manifest.json`'s version exactly, with no `v` prefix — `.github/workflows/release.yml` verifies that, builds, and attaches `main.js`, `manifest.json`, and `styles.css` to a GitHub release. Obsidian installs from those three assets.

The workflow also signs a build provenance attestation for each asset, so anyone can confirm a downloaded file was built by this workflow from this repo rather than uploaded by hand:

```sh
gh attestation verify main.js --repo junzh0u/obsidian-ccc-search
```

That only works for assets built by the workflow — never attach release assets manually.

Once published, the community directory picks up new releases automatically; re-submission is only needed for review feedback, which appears on the plugin's entry at [community.obsidian.md](https://community.obsidian.md), not on this repo.
