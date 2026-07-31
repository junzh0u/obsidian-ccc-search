# CCC Semantic Search

Find notes by **meaning**, not just keywords. A quick-switcher-style modal that searches your [Obsidian](https://obsidian.md) vault semantically — type "that bank statement about the mortgage" and get the note, even if it never uses those words.

Search runs on your machine, powered by [cocoindex-code](https://github.com/cocoindex-io/cocoindex-code) (`ccc`).

## Before you install

This plugin is a front end for `ccc`, a separate command-line tool you install yourself. Without it the plugin can't search.

1. **Desktop only.** The plugin runs a local program, which Obsidian mobile doesn't allow.
2. **Install `ccc` v0.2.38 or newer.** With [uv](https://docs.astral.sh/uv/):

   ```sh
   uv tool install --upgrade 'cocoindex-code[full]'
   ```

   That puts `ccc` in `~/.local/bin`, where the plugin finds it automatically. For other install methods see the [cocoindex-code README](https://github.com/cocoindex-io/cocoindex-code); anywhere on your `PATH` works, and other locations you can point at in the plugin settings.
3. **Index your vault once.** In a terminal, from your vault folder:

   ```sh
   cd /path/to/YourVault
   ccc init
   ccc index
   ```

   Indexing a large vault takes a while the first time. After that the plugin keeps the index current for you.

## Install

Open [the plugin page](https://community.obsidian.md/plugins/ccc-search) and click **Add to Obsidian**, or from inside the app: **Settings → Community plugins → Browse**, search for *CCC Semantic Search*, then **Install** and **Enable**. (If Obsidian is in Restricted mode, turn that off first.)

## Use

Click the **sparkles** ribbon icon, or run the command **"Search vault semantically"** from the command palette. There's no default hotkey — assign your own under **Settings → Hotkeys**.

Type a natural-language query. Each result shows the note title, its path, a relevance score, and a snippet of the matching text.

- **Enter** — open the note, scrolled to the matching section
- **Cmd/Ctrl-Enter** — open it in a new tab

**The first search after starting your computer can take up to a minute.** `ccc` is loading its language model; the modal shows a "warming up" hint while it does. Every search after that returns in a fraction of a second.

## Settings

| Setting | Default | What it does |
|---|---|---|
| ccc binary path | auto-detect | Where your `ccc` executable lives. Leave empty to look on `PATH`, then `~/.local/bin/ccc`. **Test ccc binary** confirms the plugin can reach it. |
| Result limit | 10 | How many results a search returns. |
| Refresh index on search | on | Pick up recent edits: the first search each time you open the modal refreshes the index. Turn off if you'd rather reindex manually with `ccc index`. |
| Minimum score | 0 | Hide weak matches below this relevance score. 0 shows everything. |

## Troubleshooting

**"ccc not found" or the Test button fails.** Obsidian launched from Finder or the Start menu doesn't inherit your shell's `PATH`, so a `ccc` that works in your terminal may still be invisible to the plugin. Run `which ccc` in a terminal and paste the full path into the ccc binary path setting.

**No results, or results from notes you deleted.** The index is stale. Make sure "Refresh index on search" is on, or run `ccc index` in your vault folder.

**Every search is slow, not just the first.** `ccc`'s background daemon is likely restarting each time. Check that `ccc search "test"` is fast on the second run in a terminal.

## Privacy

- **The plugin makes no network requests and collects no telemetry.** It runs `ccc` on your machine and reads the results.
- **Whether `ccc` uses the network is your choice.** Configured with a local embedding model, nothing leaves your computer. If you configure `ccc` with an API-based embedding provider, it sends your search queries — and your note contents while indexing — to that provider.
- **Files outside your vault.** The plugin looks for the `ccc` executable on your `PATH` and at `~/.local/bin/ccc`. `ccc` keeps its search index in its own data directory, outside the vault.
- The plugin never downloads, installs, or updates `ccc`; that's yours to manage.

## Contributing

Bug reports and pull requests are welcome — see [DEVELOPMENT.md](DEVELOPMENT.md) for the build setup and architecture.

## License

MIT
