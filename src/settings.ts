import { App, PluginSettingTab, Setting } from "obsidian";
import type MathblogPlugin from "./main";
import { AuthSettingsSection } from "./auth";

export interface MathblogSettings {
	defaultPublicationUri?: string;
}

export const DEFAULT_SETTINGS: MathblogSettings = {
	defaultPublicationUri: undefined,
};

export class SettingTab extends PluginSettingTab {
	plugin: MathblogPlugin;

	constructor(app: App, plugin: MathblogPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Reusable auth login/logout section
		const authSection = new AuthSettingsSection(
			this.app,
			containerEl,
			this.plugin.auth,
			() => this.display(), // refresh UI on state change
		);
		authSection.display();

		// Plugin-specific settings
		new Setting(containerEl)
			.setName("Default publication")
			.setDesc("AT-URI of your default site.standard.publication (optional)")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.defaultPublicationUri ?? "")
					.onChange(async (value) => {
						this.plugin.settings.defaultPublicationUri = value || undefined;
						await this.plugin.saveSettings();
					})
			);
	}
}
