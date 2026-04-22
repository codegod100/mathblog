// Stub for obsidian package in test environment
export class Notice {
	constructor(message: string) {}
}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {
	setName(name: string) { return this; }
	setDesc(desc: string) { return this; }
	setHeading() { return this; }
	addText(cb: any) { return this; }
	addButton(cb: any) { return this; }
}
export class App {}
export class Modal {}
export class TFile {}
export class TAbstractFile {}
export class Vault {}
export class Workspace {}
export class WorkspaceLeaf {}
export class ItemView {}
export class MarkdownRenderer {
	static render(app: any, markdown: string, el: HTMLElement, sourcePath: string, component: any) {}
}
export class Component {
	registerEvent(event: any) {}
}
