import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { testCcc } from "./ccc-client";
import type CccSearchPlugin from "./main";

export interface CccSettings {
	/** Path to the ccc binary; "" = auto-detect (PATH, then ~/.local/bin/ccc). */
	cccPath: string;
	/** Maximum number of results per query. */
	limit: number;
	/** Run an incremental index refresh on the first query per modal open. */
	refreshOnSearch: boolean;
	/** Hide results scoring below this value (client-side filter; 0 disables). */
	minScore: number;
}

export const DEFAULT_SETTINGS: CccSettings = {
	cccPath: "",
	limit: 10,
	refreshOnSearch: true,
	minScore: 0,
};

export class CccSettingTab extends PluginSettingTab {
	private plugin: CccSearchPlugin;

	constructor(app: App, plugin: CccSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("ccc binary path")
			.setDesc(
				"Path to the ccc executable. Leave empty to auto-detect " +
					"(ccc on PATH, then ~/.local/bin/ccc)."
			)
			.addText((text) =>
				text
					.setPlaceholder("auto-detect")
					.setValue(this.plugin.settings.cccPath)
					.onChange(async (value) => {
						this.plugin.settings.cccPath = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Test").onClick(async () => {
					try {
						const bin = await testCcc(this.plugin.settings.cccPath);
						new Notice(`ccc responded: ${bin}`);
					} catch (err) {
						new Notice(err instanceof Error ? err.message : String(err));
					}
				})
			);

		new Setting(containerEl)
			.setName("Hotkey")
			.setDesc(
				"Shortcut to open semantic search. Defaults to Cmd/Ctrl+Shift+S; " +
					"change it in Obsidian's hotkey settings."
			)
			.addButton((btn) =>
				btn.setButtonText("Configure").onClick(() => {
					// Undocumented API: open the Hotkeys tab pre-filtered to this plugin.
					const setting = (
						this.app as unknown as {
							setting: {
								open(): void;
								openTabById(id: string): { setQuery?(query: string): void } | null;
							};
						}
					).setting;
					setting.open();
					const tab = setting.openTabById("hotkeys");
					tab?.setQuery?.(this.plugin.manifest.name);
				})
			);

		new Setting(containerEl)
			.setName("Result limit")
			.setDesc("Maximum number of results per query.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.limit))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						if (Number.isFinite(parsed) && parsed >= 1) {
							this.plugin.settings.limit = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Refresh index on search")
			.setDesc(
				"Run an incremental index refresh on the first query each time the search opens."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.refreshOnSearch)
					.onChange(async (value) => {
						this.plugin.settings.refreshOnSearch = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Minimum score")
			.setDesc("Hide results scoring below this value. 0 disables the filter.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.minScore))
					.onChange(async (value) => {
						const parsed = Number.parseFloat(value);
						if (Number.isFinite(parsed) && parsed >= 0) {
							this.plugin.settings.minScore = parsed;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
