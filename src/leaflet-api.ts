import type { Agent } from '@atproto/api'

import { DOCUMENT_COLLECTION, LEGACY_DOCUMENT_COLLECTION, PUBLICATION_COLLECTION } from './constants'
import type { DocumentSummary, DraftRecordRef, PublicationRecord, SiteStandardDocumentRecord } from './types'

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

export async function listDocuments(agent: Agent): Promise<DocumentSummary[]> {
  agent.assertAuthenticated()
  const response = await agent.com.atproto.repo.listRecords({
    repo: agent.assertDid,
    collection: DOCUMENT_COLLECTION,
    limit: 100,
  })

  const docs: DocumentSummary[] = []
  for (const record of response.data.records) {
    const val = record.value as Record<string, unknown>
    if (val?.$type !== 'site.standard.document') continue
    const rkey = record.uri.split('/').at(-1) ?? ''
    const rec = val as unknown as SiteStandardDocumentRecord
    docs.push({
      uri: record.uri,
      cid: record.cid,
      rkey,
      title: typeof rec.title === 'string' ? rec.title : 'Untitled',
      site: typeof rec.site === 'string' ? rec.site : '',
      description: typeof rec.description === 'string' ? rec.description : undefined,
      tags: Array.isArray(rec.tags) ? rec.tags.filter((t): t is string => typeof t === 'string') : undefined,
      publishedAt: typeof rec.publishedAt === 'string' ? rec.publishedAt : undefined,
      updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : undefined,
      record: rec,
    })
  }

  docs.sort((a, b) => {
    const ta = a.updatedAt ?? a.publishedAt ?? ''
    const tb = b.updatedAt ?? b.publishedAt ?? ''
    return tb.localeCompare(ta)
  })

  return docs
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
