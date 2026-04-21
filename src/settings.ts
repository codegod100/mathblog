import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type MathblogPlugin from "./main";

export interface MathblogSettings {
	did?: string;
	defaultPublicationUri?: string;
}

export const DEFAULT_SETTINGS: MathblogSettings = {
	did: undefined,
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

		if (this.plugin.client.loggedIn) {
			const displayName = this.plugin.client.actor?.handle || this.plugin.settings.did;

			new Setting(containerEl)
				.setName(`Logged in as @${displayName}`)
				.setDesc(this.plugin.client.actor?.did as string || "")
				.addButton((button) =>
					button
						.setButtonText("Log out")
						.setCta()
						.onClick(async () => {
							await this.plugin.client.logout(this.plugin.settings.did!)
							this.plugin.settings.did = undefined;
							await this.plugin.saveSettings();
							this.display();
							new Notice("Logged out successfully");
						})
				);
		} else {
			let handleInput: HTMLInputElement;

			new Setting(containerEl)
				.setName("Log in")
				.setDesc("Enter your handle (e.g., user.bsky.social)")
				.addText((text) => {
					handleInput = text.inputEl;
					text.setValue("");
				})
				.addButton((button) =>
					button
						.setButtonText("Log in")
						.setCta()
						.onClick(async () => {
							const handle = handleInput.value.trim();
							if (!handle) {
								new Notice("Please enter a handle.");
								return;
							}
							try {
								button.setDisabled(true);
								button.setButtonText("Logging in...");
								new Notice("Opening browser for authorization...");
								await this.plugin.client.login(handle);
								this.plugin.settings.did = this.plugin.client.actor?.did;
								await this.plugin.saveSettings();
								this.display();
								new Notice(`Successfully logged in as ${this.plugin.client.actor!.handle}`);
							} catch (error) {
								console.error("Login failed:", error);
								const errorMessage = error instanceof Error ? error.message : String(error);
								new Notice(`Authentication failed: ${errorMessage}`);
								button.setDisabled(false);
								button.setButtonText("Log in");
							}
						})
				);
		}

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
