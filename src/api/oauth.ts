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

const REDIRECT_URI = 'obsidian://mathblog-oauth';
const SCOPE = 'atproto transition:generic';

const OAUTH_METADATA = {
	client_id: `http://localhost?redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}`,
	redirect_uri: REDIRECT_URI,
};

export class OAuthHandler {
	private callbackResolver: ((value: URLSearchParams) => void) | null = null;
	private callbackRejecter: ((reason?: Error) => void) | null = null;
	private callbackTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		configureOAuth({
			metadata: OAUTH_METADATA,
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
