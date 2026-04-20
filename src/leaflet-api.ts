import type { Agent } from '@atproto/api'

import { DOCUMENT_COLLECTION, PUBLICATION_COLLECTION } from './constants'
import type { DraftRecordRef, LeafletDocumentRecord, PublicationRecord } from './types'

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
  record: LeafletDocumentRecord,
  existing?: DraftRecordRef,
): Promise<DraftRecordRef> {
  agent.assertAuthenticated()

  if (existing) {
    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.assertDid,
      collection: DOCUMENT_COLLECTION,
      rkey: existing.rkey,
      record,
      validate: false,
    })

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: existing.rkey,
    }
  }

  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: DOCUMENT_COLLECTION,
    record,
    validate: false,
  })

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    rkey: response.data.uri.split('/').at(-1) ?? '',
  }
}
