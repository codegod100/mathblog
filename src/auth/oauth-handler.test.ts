import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock obsidian before importing oauth-handler
vi.mock('obsidian', () => ({
	Notice: vi.fn(),
}))

// Mock resolver
vi.mock('./resolver', () => ({
	compositeResolver: {},
}))

// Mock @atcute/oauth-browser-client
vi.mock('@atcute/oauth-browser-client', async () => {
	return {
		configureOAuth: vi.fn(),
		createAuthorizationUrl: vi.fn(),
		finalizeAuthorization: vi.fn(),
		getSession: vi.fn(),
		deleteStoredSession: vi.fn(),
		OAuthUserAgent: vi.fn(),
	}
})

// Provide window mock for node test environment
// @ts-ignore
global.window = { open: vi.fn() } as any

import { OAuthHandler, type OAuthConfig } from './oauth-handler'

const TEST_CONFIG: OAuthConfig = {
	clientId: 'https://example.com/client-metadata.json',
	redirectUri: 'https://example.com/oauth-callback.html',
	scope: 'atproto transition:generic',
}

describe('OAuthHandler.authorize error paths', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should reject when createAuthorizationUrl fails (PAR 400)', async () => {
		const { createAuthorizationUrl } = await import('@atcute/oauth-browser-client')
		vi.mocked(createAuthorizationUrl).mockRejectedValueOnce(new Error('PAR 400: invalid_client'))

		const handler = new OAuthHandler(TEST_CONFIG)
		await expect(handler.authorize('user.bsky.social')).rejects.toThrow('PAR 400')
	})
})

describe('OAuthHandler.authorize + handleCallback happy path', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should resolve authorize() with valid callback params', async () => {
		const { createAuthorizationUrl, finalizeAuthorization } = await import('@atcute/oauth-browser-client')
		vi.mocked(createAuthorizationUrl).mockResolvedValueOnce(new URL('https://example.com/auth') as any)
		vi.mocked(finalizeAuthorization).mockResolvedValueOnce({ session: { did: 'did:plc:test' } as any, state: null })

		const handler = new OAuthHandler(TEST_CONFIG)
		const authPromise = handler.authorize('user.bsky.social')

		// Wait for the internal 200ms settle delay + a bit
		await new Promise(r => setTimeout(r, 300))

		const params = new URLSearchParams({ code: 'abc123', state: 'xyz' })
		handler.handleCallback(params)

		const session = await authPromise
		expect(session).toEqual({ did: 'did:plc:test' })
	})

	it('should reject authorize() when callback contains error param', async () => {
		const { createAuthorizationUrl } = await import('@atcute/oauth-browser-client')
		vi.mocked(createAuthorizationUrl).mockResolvedValueOnce(new URL('https://example.com/auth') as any)

		const handler = new OAuthHandler(TEST_CONFIG)
		const authPromise = handler.authorize('user.bsky.social')

		await new Promise(r => setTimeout(r, 300))

		const params = new URLSearchParams({ error: 'access_denied', error_description: 'User denied access' })
		handler.handleCallback(params)

		await expect(authPromise).rejects.toThrow('User denied access')
	})

	it('should ignore stale callbacks (no pending authorize)', () => {
		const handler = new OAuthHandler(TEST_CONFIG)
		const params = new URLSearchParams({ code: 'abc123' })
		expect(() => handler.handleCallback(params)).not.toThrow()
	})
})

describe('OAuthHandler timeouts', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should reject on identity resolution timeout', async () => {
		vi.useFakeTimers()

		const { createAuthorizationUrl } = await import('@atcute/oauth-browser-client')
		vi.mocked(createAuthorizationUrl).mockImplementationOnce(() => new Promise(() => {}))

		const handler = new OAuthHandler(TEST_CONFIG)
		const promise = handler.authorize('user.bsky.social')

		await vi.advanceTimersByTimeAsync(11_000)

		await expect(promise).rejects.toThrow('Identity resolution / PAR timed out')
		vi.useRealTimers()
	})

	it('should reject if finalizeAuthorization hangs', async () => {
		vi.useFakeTimers()

		const { createAuthorizationUrl, finalizeAuthorization } = await import('@atcute/oauth-browser-client')
		vi.mocked(createAuthorizationUrl).mockResolvedValueOnce(new URL('https://example.com/auth') as any)
		vi.mocked(finalizeAuthorization).mockImplementationOnce(() => new Promise(() => {}))

		const handler = new OAuthHandler(TEST_CONFIG)
		const authPromise = handler.authorize('user.bsky.social')

		await vi.advanceTimersByTimeAsync(300)

		const params = new URLSearchParams({ code: 'abc123', state: 'xyz' })
		handler.handleCallback(params)

		// Advance past the 15s token timeout
		await vi.advanceTimersByTimeAsync(16_000)

		await expect(authPromise).rejects.toThrow('Token exchange timed out')
		vi.useRealTimers()
	})
})
