import type { Agent } from '@atproto/api'

import { DOCUMENT_COLLECTION, LEGACY_DOCUMENT_COLLECTION, PUBLICATION_COLLECTION } from './constants'
import type { DraftRecordRef, PublicationRecord, SiteStandardDocumentRecord } from './types'

export function isLegacyRemote(remote: DraftRecordRef | undefined): boolean {
  if (!remote) return false
  return remote.uri.includes(`/${LEGACY_DOCUMENT_COLLECTION}/`)
}

function generateRkey(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function listPublications(agent: Agent): Promise<PublicationRecord[]> {
  agent.assertAuthenticated()
  const response = await agent.com.atproto.repo.listRecords({
    repo: agent.assertDid,
    collection: PUBLICATION_COLLECTION,
    limit: 100,
  })

  return response.data.records.map((record) => ({
    uri: record.uri,
    cid: record.cid,
    name: typeof record.value.name === 'string' ? record.value.name : 'Untitled publication',
    description:
      typeof record.value.description === 'string' ? record.value.description : undefined,
  }))
}

export async function saveDocument(
  agent: Agent,
  record: SiteStandardDocumentRecord,
  existing?: DraftRecordRef,
): Promise<DraftRecordRef> {
  agent.assertAuthenticated()

  const rkey = existing ? existing.rkey : generateRkey()
  record.path = `/${rkey}`

  const response = await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: DOCUMENT_COLLECTION,
    rkey,
    record,
    validate: false,
  })

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    rkey,
  }
}
