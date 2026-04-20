import { Agent } from '@atproto/api'
import {
  BrowserOAuthClient,
  atprotoLoopbackClientMetadata,
  type OAuthSession,
} from '@atproto/oauth-client-browser'

import { APP_PORT, CALLBACK_PATH, DEFAULT_SCOPE } from './constants'

let oauthClient: BrowserOAuthClient | undefined

function getClient(): BrowserOAuthClient {
  if (!oauthClient) {
    const callbackUrl = new URL(CALLBACK_PATH, `http://127.0.0.1:${window.location.port || APP_PORT}`)
    const clientId = `http://localhost/?redirect_uri=${encodeURIComponent(callbackUrl.toString())}&scope=${encodeURIComponent(DEFAULT_SCOPE)}`

    oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: atprotoLoopbackClientMetadata(clientId),
      responseMode: 'query',
    })
  }

  return oauthClient
}

export async function initOAuth() {
  return getClient().init()
}

export async function signIn(handleOrDid: string) {
  return getClient().signIn(handleOrDid, {
    scope: DEFAULT_SCOPE,
  })
}

export async function signOut(session: OAuthSession | undefined) {
  if (!session) return
  await getClient().revoke(session.sub)
}

export function createAgent(session: OAuthSession) {
  return new Agent(session)
}

export type { OAuthSession }
