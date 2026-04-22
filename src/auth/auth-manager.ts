import { Notice, Plugin } from "obsidian";
import type { Client } from "@atcute/client";
import type { ResolvedActor } from "@atcute/identity-resolver";
import { OAuthHandler } from "./oauth-handler";
import { ATPClient } from "./client";
import type { AtpAuthOptions, IAtpAuthManager } from "./types";

const STORAGE_KEY = 'atp_auth_did';

/**
 * Reusable AT Protocol auth manager for Obsidian plugins.
 *
 * Encapsulates OAuth login via @atcute, session persistence,
 * protocol-handler registration, and exposes an authenticated @atcute/client.
 *
 * Example usage in a Plugin:
 *
 * ```ts
 * export default class MyPlugin extends Plugin {
 *   auth: AtpAuthManager;
 *
 *   async onload() {
 *     this.auth = new AtpAuthManager({
 *       plugin: this,
 *       protocolScheme: 'myplugin-oauth',
 *       clientId: 'https://myuser.github.io/myplugin/client-metadata.json',
 *       redirectUri: 'https://myuser.github.io/myplugin/oauth-callback.html',
 *       scope: 'atproto transition:generic',
 *     });
 *     await this.auth.initialize();
 *
 *     // Access authenticated XRPC client:
 *     // this.auth.client.get('...')
 *   }
 * }
 * ```
 */
export class AtpAuthManager implements IAtpAuthManager {
	private plugin: Plugin;
	private protocolScheme: string;
	private oauthHandler: OAuthHandler;
	private atpClient: ATPClient;

	/** The DID of the currently authenticated user (undefined if logged out). */
	did: string | undefined;

	constructor(options: AtpAuthOptions) {
		this.plugin = options.plugin;
		this.protocolScheme = options.protocolScheme;
		this.oauthHandler = new OAuthHandler({
			clientId: options.clientId,
			redirectUri: options.redirectUri,
			scope: options.scope,
			storageName: options.storageName,
		});
		this.atpClient = new ATPClient(this.oauthHandler);
	}

	/**
	 * Register the obsidian:// protocol handler and attempt to restore
	 * any persisted session. Call this once in your plugin's `onload()`.
	 */
	async initialize(): Promise<void> {
		this.plugin.registerObsidianProtocolHandler(this.protocolScheme, (params) => {
			try {
				const urlParams = new URLSearchParams();
				for (const [key, value] of Object.entries(params)) {
					if (value) urlParams.set(key, String(value));
				}
				this.atpClient.handleOAuthCallback(urlParams);
				// Only show success if no error param
				if (!urlParams.has('error')) {
					new Notice('Authentication completed!');
				}
			} catch (error) {
				console.error('OAuth callback error:', error);
				new Notice('Authentication error: ' + (error instanceof Error ? error.message : String(error)));
			}
		});

		// Try restoring from plugin data
		const saved = await this.plugin.loadData();
		this.did = saved?.[STORAGE_KEY];
		if (this.did) {
			try {
				await this.atpClient.restoreSession(this.did);
			} catch (e) {
				console.warn('Failed to restore session:', e);
				this.did = undefined;
				await this._persist();
			}
		}
	}

	/** The underlying @atcute/client instance (authenticated when logged in). */
	get client(): Client {
		return this.atpClient;
	}

	/** Resolved actor info for the authenticated user. */
	get actor(): ResolvedActor | undefined {
		return this.atpClient.actor;
	}

	/** Whether a session is currently active. */
	get isLoggedIn(): boolean {
		return this.atpClient.loggedIn;
	}

	/** The authenticated user's handle (e.g. user.bsky.social). */
	get handle(): string | undefined {
		return this.atpClient.actor?.handle;
	}

	/**
	 * Start OAuth login for the given handle/did.
	 * Opens the browser; the user is redirected back via obsidian://.
	 */
	async login(identifier: string): Promise<void> {
		await this.atpClient.login(identifier);
		this.did = this.atpClient.actor?.did;
		await this._persist();
	}

	/**
	 * Revoke the current session and clear stored credentials.
	 */
	async logout(): Promise<void> {
		if (this.did) {
			await this.atpClient.logout(this.did);
		}
		this.did = undefined;
		await this._persist();
	}

	/**
	 * Ensure we have a valid session. Returns true if logged in or restore succeeded.
	 * Shows a Notice if auth is required.
	 */
	async checkAuth(): Promise<boolean> {
		if (this.isLoggedIn) return true;
		if (this.did) {
			try {
				await this.atpClient.restoreSession(this.did);
				return true;
			} catch (e) {
				console.error('Failed to restore session:', e);
				this.did = undefined;
				await this._persist();
				new Notice('Session expired. Please log in via settings.');
				return false;
			}
		}
		new Notice('Please log in via plugin settings.');
		return false;
	}

	private async _persist(): Promise<void> {
		const saved = (await this.plugin.loadData()) ?? {};
		saved[STORAGE_KEY] = this.did;
		await this.plugin.saveData(saved);
	}
}
