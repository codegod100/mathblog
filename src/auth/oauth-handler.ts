import {
	configureOAuth,
	createAuthorizationUrl,
	finalizeAuthorization,
	getSession,
	deleteStoredSession,
	OAuthUserAgent,
	type Session,
} from '@atcute/oauth-browser-client';
import { Notice } from 'obsidian';
import { compositeResolver } from './resolver';

export type OAuthConfig = {
	clientId: string;
	redirectUri: string;
	scope: string;
	storageName?: string;
};

const IDENTITY_TIMEOUT_MS = 10_000;
const TOKEN_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
		),
	]);
}

export class OAuthHandler {
	private callbackResolver: ((value: URLSearchParams) => void) | null = null;
	private callbackRejecter: ((reason?: Error) => void) | null = null;
	private callbackTimeout: ReturnType<typeof setTimeout> | null = null;
	private readonly config: OAuthConfig;

	constructor(config: OAuthConfig) {
		this.config = config;
		configureOAuth({
			metadata: {
				client_id: config.clientId,
				redirect_uri: config.redirectUri,
			},
			identityResolver: compositeResolver,
			storageName: config.storageName,
		});
	}

	handleCallback(params: URLSearchParams): void {
		if (this.callbackResolver && this.callbackRejecter) {
			if (this.callbackTimeout) {
				clearTimeout(this.callbackTimeout);
				this.callbackTimeout = null;
			}

			// Validate callback params: reject if authorization server returned an error
			if (params.has('error')) {
				const error = params.get('error') || 'unknown_error';
				const description = params.get('error_description') || error;
				this.callbackRejecter(new Error(`OAuth error: ${description}`));
			} else {
				this.callbackResolver(params);
			}

			this.callbackResolver = null;
			this.callbackRejecter = null;
		}
	}

	async authorize(identifier: string): Promise<Session> {
		const authUrl = await withTimeout(
			createAuthorizationUrl({
				target: { type: 'account', identifier: identifier as any },
				scope: this.config.scope,
			}),
			IDENTITY_TIMEOUT_MS,
			'Identity resolution / PAR',
		);

		// Small delay to let the auth window settle (matches atmosphere plugin)
		await new Promise((resolve) => setTimeout(resolve, 200));

		const waitForCallback = new Promise<URLSearchParams>((resolve, reject) => {
			this.callbackResolver = resolve;
			this.callbackRejecter = reject;
			this.callbackTimeout = setTimeout(() => {
				if (this.callbackRejecter) {
					this.callbackRejecter(new Error('OAuth callback timed out after 5 minutes'));
					this.callbackResolver = null;
					this.callbackRejecter = null;
				}
			}, 5 * 60_000);
		});

		window.open(authUrl, '_blank');
		new Notice('Continue login in the browser');

		const params = await waitForCallback;
		const { session } = await withTimeout(
			finalizeAuthorization(params),
			TOKEN_TIMEOUT_MS,
			'Token exchange',
		);
		return session;
	}

	async restore(did: string): Promise<Session> {
		const session = await getSession(did as `did:${string}:${string}`, { allowStale: false });
		if (!session) {
			throw new Error('No session found for DID: ' + did);
		}
		return session;
	}

	async revoke(did: string): Promise<void> {
		const session = await getSession(did as `did:${string}:${string}`, { allowStale: true });
		if (session) {
			try {
				const agent = new OAuthUserAgent(session);
				await agent.signOut();
			} catch (error) {
				console.error('Error during sign out:', error);
			}
		}
		deleteStoredSession(did as `did:${string}:${string}`);
	}
}
