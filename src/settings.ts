import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
} from "obsidian";
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

const CCC_PATH_DESC =
	"Path to the ccc executable. Leave empty to auto-detect " +
	"(ccc on PATH, then ~/.local/bin/ccc).";
const TEST_DESC = "Check that the configured ccc binary responds.";
const LIMIT_DESC = "Maximum number of results per query.";
const REFRESH_DESC =
	"Run an incremental index refresh on the first query each time the search opens.";
const MIN_SCORE_DESC = "Hide results scoring below this value. 0 disables the filter.";

export class CccSettingTab extends PluginSettingTab {
	private plugin: CccSearchPlugin;

	constructor(app: App, plugin: CccSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Declarative settings (Obsidian 1.13+), which also makes the settings
	 * searchable. On older versions this is never called and display() renders
	 * the tab instead; keep the two in sync.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "ccc binary path",
				desc: CCC_PATH_DESC,
				control: {
					type: "text",
					key: "cccPath",
					placeholder: "auto-detect",
					defaultValue: DEFAULT_SETTINGS.cccPath,
				},
			},
			{
				name: "Test ccc binary",
				desc: TEST_DESC,
				action: () => {
					void this.testBinary();
				},
			},
			{
				name: "Result limit",
				desc: LIMIT_DESC,
				control: {
					type: "number",
					key: "limit",
					min: 1,
					step: 1,
					defaultValue: DEFAULT_SETTINGS.limit,
				},
			},
			{
				name: "Refresh index on search",
				desc: REFRESH_DESC,
				control: {
					type: "toggle",
					key: "refreshOnSearch",
					defaultValue: DEFAULT_SETTINGS.refreshOnSearch,
				},
			},
			{
				name: "Minimum score",
				desc: MIN_SCORE_DESC,
				control: {
					type: "number",
					key: "minScore",
					min: 0,
					step: "any",
					defaultValue: DEFAULT_SETTINGS.minScore,
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof CccSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings;
		switch (key) {
			case "cccPath":
				settings.cccPath = String(value);
				break;
			case "limit":
				settings.limit = Number(value);
				break;
			case "refreshOnSearch":
				settings.refreshOnSearch = Boolean(value);
				break;
			case "minScore":
				settings.minScore = Number(value);
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
	}

	private async testBinary(): Promise<void> {
		try {
			const bin = await testCcc(this.plugin.settings.cccPath);
			new Notice(`ccc responded: ${bin}`);
		} catch (err) {
			new Notice(err instanceof Error ? err.message : String(err));
		}
	}

	/** Fallback for Obsidian versions older than 1.13.0. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("ccc binary path")
			.setDesc(CCC_PATH_DESC)
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
				btn.setButtonText("Test").onClick(() => {
					void this.testBinary();
				})
			);

		new Setting(containerEl)
			.setName("Result limit")
			.setDesc(LIMIT_DESC)
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
			.setDesc(REFRESH_DESC)
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
			.setDesc(MIN_SCORE_DESC)
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
