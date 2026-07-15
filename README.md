# CCC Semantic Search

An [Obsidian](https://obsidian.md) plugin for **semantic search** of your vault, powered by [cocoindex-code](https://github.com/cocoindex-io/cocoindex-code) (`ccc`). Find notes by meaning, not just keywords — a quick-switcher-style modal that queries a local AST/embedding index. Everything runs on your machine; no cloud calls are made by the plugin itself (whether embedding is local or via an API depends on your `ccc` configuration).

## How it works

The plugin is a thin client: each query shells out to `ccc search --json` with the vault as the working directory. The heavy lifting — embedding model, index, incremental refresh — lives in ccc's shared background daemon, so warm queries return in ~100–160 ms, imperceptible behind the modal's 250 ms debounce. The plugin never manages the daemon; ccc auto-starts it on demand.

## Requirements

- **Desktop only** (spawns a local process).
- **`ccc` (cocoindex-code) installed** and on your `PATH` (or at `~/.local/bin/ccc`, or configured in the plugin settings).
  - The plugin needs a ccc version with the `--json` flag on `ccc search`. As of now that flag is not yet in a released version — it requires a build that includes it.
- **Your vault initialized and indexed** by ccc: run `ccc init` then `ccc index` in the vault directory once. The plugin keeps the index fresh afterwards via incremental refresh on search (configurable).

## Install

Not in the community plugin registry (yet). Manual install:

```sh
git clone https://github.com/junzh0u/obsidian-ccc-search
cd obsidian-ccc-search
just install          # bun install
just vault=/path/to/YourVault install-vault
```

`install-vault` builds and copies `main.js`, `manifest.json`, and `styles.css` into `YourVault/.obsidian/plugins/ccc-search/`. Then in Obsidian: **Settings → Community plugins → enable "CCC Semantic Search"** (turn off Restricted mode first if needed).

Without [`just`](https://github.com/casey/just): `bun install && bun run build`, then copy the three files manually.

## Use

- Click the **sparkles** ribbon icon, or run the command **"Search vault semantically"**.
- Type a natural-language query ("that bank statement about the mortgage", "notes on daemon lifecycle design") — results show the note title, path, relevance score, and a frontmatter-free snippet.
- **Enter** opens the note at the matching section; **Cmd/Ctrl-Enter** opens it in a new tab.

The first query after a cold start (reboot, daemon idle-exit) can take a while — ccc loads the embedding model. The modal shows a warming-up hint; subsequent queries are fast.

## Settings

| Setting | Default | Description |
|---|---|---|
| ccc binary path | auto-detect | Path to the `ccc` executable. Empty = look on `PATH`, then `~/.local/bin/ccc`. The **Test** button verifies the binary responds. |
| Result limit | 10 | Maximum results per query. |
| Refresh on search | on | Run an incremental index refresh on the first query each time the modal opens, so recent edits are searchable. |
| Minimum score | 0 | Hide results scoring below this value (0 disables the filter). |

## Development

```sh
just install   # bun install
just check     # tsc --noEmit
just build     # type check + esbuild production bundle
just dev       # esbuild watch mode
```

TypeScript + esbuild, [bun](https://bun.sh) as runtime/package manager, no runtime dependencies.

## License

MIT
