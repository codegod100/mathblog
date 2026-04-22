import type { Plugin } from "obsidian";
import type { Client } from "@atcute/client";
import type { ResolvedActor } from "@atcute/identity-resolver";

/**
 * Configuration for the AT Protocol auth manager.
 * Pass this when constructing AtpAuthManager.
 */
export interface AtpAuthOptions {
	/** The Obsidian Plugin instance (used for protocol handlers and storage). */
	plugin: Plugin;

	/** Obsidian protocol scheme, e.g. 'myplugin-oauth'. Do NOT include 'obsidian://'. */
	protocolScheme: string;

	/** Full HTTPS URL to your client-metadata.json (must be publicly reachable). */
	clientId: string;

	/** Full HTTPS redirect URI (must match redirect_uris in client-metadata.json). */
	redirectUri: string;

	/** OAuth scope, e.g. 'atproto transition:generic'. */
	scope: string;

	/** Optional name for the browser client's local DB. */
	storageName?: string;
}

/**
 * Lightweight interface exposed by AtpAuthManager so callers
can interact with the AT Client without depending on its internals.
 */
export interface IAtpAuthManager {
	readonly client: Client;
	readonly actor: ResolvedActor | undefined;
	readonly isLoggedIn: boolean;
	readonly did: string | undefined;
	readonly handle: string | undefined;

	login(identifier: string): Promise<void>;
	logout(): Promise<void>;
	checkAuth(): Promise<boolean>;
}
