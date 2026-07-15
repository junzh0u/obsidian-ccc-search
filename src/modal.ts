import { App, FileSystemAdapter, Keymap, Notice, SuggestModal } from "obsidian";
import { search } from "./ccc-client";
import type CccSearchPlugin from "./main";
import type { CccSearchResult } from "./types";

const DEBOUNCE_MS = 250;
const SNIPPET_LENGTH = 200;

/** Leading YAML frontmatter block at the start of a chunk. */
const FRONTMATTER_RE = /^---\n[\s\S]*?\n---(\n|$)/;

function makeSnippet(content: string): string {
	const collapsed = content.replace(FRONTMATTER_RE, "").replace(/\s+/g, " ").trim();
	if (collapsed.length > SNIPPET_LENGTH) {
		return collapsed.slice(0, SNIPPET_LENGTH) + "…";
	}
	return collapsed;
}

export class CccSearchModal extends SuggestModal<CccSearchResult> {
	private plugin: CccSearchPlugin;
	private vaultPath: string | null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingDebounce: ((proceed: boolean) => void) | null = null;
	private abortController: AbortController | null = null;
	private firstQuery = true;

	constructor(app: App, plugin: CccSearchPlugin) {
		super(app);
		this.plugin = plugin;
		const adapter = app.vault.adapter;
		this.vaultPath = adapter instanceof FileSystemAdapter ? adapter.getBasePath() : null;
		this.setPlaceholder("Semantic search…");
		this.emptyStateText = "No results.";
	}

	onOpen(): void {
		this.firstQuery = true;
		super.onOpen();
	}

	onClose(): void {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		this.pendingDebounce?.(false);
		this.pendingDebounce = null;
		this.abortController?.abort();
		this.abortController = null;
		super.onClose();
	}

	/** Resolves true after the debounce window, false if superseded by a newer keystroke. */
	private debounce(): Promise<boolean> {
		return new Promise((resolve) => {
			if (this.debounceTimer !== null) {
				clearTimeout(this.debounceTimer);
			}
			this.pendingDebounce?.(false);
			this.pendingDebounce = resolve;
			this.debounceTimer = setTimeout(() => {
				this.debounceTimer = null;
				this.pendingDebounce = null;
				resolve(true);
			}, DEBOUNCE_MS);
		});
	}

	async getSuggestions(query: string): Promise<CccSearchResult[]> {
		const trimmed = query.trim();
		if (trimmed === "") {
			return [];
		}
		if (this.vaultPath === null) {
			new Notice("CCC Semantic Search requires a local (desktop) vault.");
			return [];
		}

		if (!(await this.debounce())) {
			return []; // superseded by a newer keystroke
		}

		// Abort any in-flight request; at most one query runs at a time.
		this.abortController?.abort();
		const controller = new AbortController();
		this.abortController = controller;

		const isFirst = this.firstQuery;
		this.firstQuery = false;
		if (isFirst) {
			this.emptyStateText = "Warming up ccc… (first query may take a while)";
		}

		try {
			const resp = await search({
				query: trimmed,
				limit: this.plugin.settings.limit,
				refresh: this.plugin.settings.refreshOnSearch && isFirst,
				cccPath: this.plugin.settings.cccPath,
				cwd: this.vaultPath,
				signal: controller.signal,
				firstQuery: isFirst,
			});
			if (!resp.success) {
				new Notice(`ccc search failed: ${resp.message ?? "unknown error"}`);
				return [];
			}
			const minScore = this.plugin.settings.minScore;
			return resp.results.filter((r) => r.score >= minScore);
		} catch (err) {
			if (controller.signal.aborted) {
				return []; // stale-query cancellation
			}
			new Notice(err instanceof Error ? err.message : String(err));
			return [];
		} finally {
			this.emptyStateText = "No results.";
		}
	}

	renderSuggestion(result: CccSearchResult, el: HTMLElement): void {
		const header = el.createDiv();
		const name = result.file_path.split("/").pop() ?? result.file_path;
		const title = name.endsWith(".md") ? name.slice(0, -".md".length) : name;
		header.createSpan({ text: title, cls: "ccc-result-title" });
		header.createSpan({ text: result.score.toFixed(2), cls: "ccc-result-score" });
		header.createSpan({ text: result.file_path, cls: "ccc-result-path" });
		el.createDiv({ text: makeSnippet(result.content), cls: "ccc-result-snippet" });
	}

	onChooseSuggestion(result: CccSearchResult, evt: MouseEvent | KeyboardEvent): void {
		const file = this.app.vault.getFileByPath(result.file_path);
		if (file === null) {
			new Notice(`File not found (index may be stale): ${result.file_path}`);
			return;
		}
		const leaf = this.app.workspace.getLeaf(Keymap.isModEvent(evt));
		// ccc line numbers are 1-based; eState.line is 0-based.
		void leaf.openFile(file, { eState: { line: Math.max(0, result.start_line - 1) } });
	}
}
