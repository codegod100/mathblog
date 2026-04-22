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
import { compositeResolver } from './identity';

// Cache-busting parameter forces PDS to re-fetch client metadata if an earlier
// version was cached (e.g. before GitHub Pages was enabled or metadata was fixed).
const CACHE_BUST = 'v=3';

// These must match the values in client-metadata.json at the repo root.
// OAuth requires a real HTTPS redirect URI; the web page at this URL
// redirects back into Obsidian via the obsidian:// protocol.
const CLIENT_ID = `https://codegod100.github.io/mathblog/client-metadata.json?${CACHE_BUST}`;
const REDIRECT_URI = 'https://codegod100.github.io/mathblog/oauth-callback.html';
const SCOPE = 'atproto transition:generic';

export class OAuthHandler {
	private callbackResolver: ((value: URLSearchParams) => void) | null = null;
	private callbackRejecter: ((reason?: Error) => void) | null = null;
	private callbackTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		configureOAuth({
			metadata: {
				client_id: CLIENT_ID,
				redirect_uri: REDIRECT_URI,
			},
			identityResolver: compositeResolver,
		});
	}

	handleCallback(params: URLSearchParams): void {
		if (this.callbackResolver) {
			if (this.callbackTimeout) {
				clearTimeout(this.callbackTimeout);
				this.callbackTimeout = null;
			}
			this.callbackResolver(params);
			this.callbackResolver = null;
			this.callbackRejecter = null;
		}
	}

	async authorize(identifier: string): Promise<Session> {
		const authUrl = await createAuthorizationUrl({
			target: { type: 'account', identifier: identifier as any },
			scope: SCOPE,
		});

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
		const { session } = await finalizeAuthorization(params);
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
