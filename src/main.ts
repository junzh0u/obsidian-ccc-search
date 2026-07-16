import { Plugin } from "obsidian";
import { CccSearchModal } from "./modal";
import { CccSettingTab, DEFAULT_SETTINGS, type CccSettings } from "./settings";

export default class CccSearchPlugin extends Plugin {
	settings: CccSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon("sparkles", "CCC semantic search", () => {
			new CccSearchModal(this.app, this).open();
		});

		this.addCommand({
			id: "search-vault-semantically",
			name: "Search vault semantically",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "s" }],
			callback: () => {
				new CccSearchModal(this.app, this).open();
			},
		});

		this.addSettingTab(new CccSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
