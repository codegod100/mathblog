import type { Client } from '@atcute/client'
import { DOCUMENT_COLLECTION, PUBLICATION_COLLECTION } from './constants'

function generateRkey(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function listPublications(
	client: Client,
	did: string,
): Promise<Array<{ uri: string; cid: string; name: string; description?: string }>> {
	const resp = await (client as any).get('com.atproto.repo.listRecords', {
		params: {
			repo: did,
			collection: PUBLICATION_COLLECTION,
			limit: 100,
		},
	})
	if (!resp.ok) {
		throw new Error(`Failed to list publications: ${resp.status}`)
	}
	return (resp.data.records as any[]).map((record: any) => ({
		uri: record.uri,
		cid: record.cid,
		name: typeof record.value.name === 'string' ? record.value.name : 'Untitled publication',
		description: typeof record.value.description === 'string' ? record.value.description : undefined,
	}))
}

export async function listDocuments(
	client: Client,
	did: string,
): Promise<Array<{ uri: string; cid: string; rkey: string; title: string; record: any }>> {
	const resp = await (client as any).get('com.atproto.repo.listRecords', {
		params: {
			repo: did,
			collection: DOCUMENT_COLLECTION,
			limit: 100,
		},
	})
	if (!resp.ok) {
		throw new Error(`Failed to list documents: ${resp.status}`)
	}
	return (resp.data.records as any[])
		.filter((record: any) => record.value?.$type === 'site.standard.document')
		.map((record: any) => ({
			uri: record.uri,
			cid: record.cid,
			rkey: record.uri.split('/').at(-1) ?? '',
			title: typeof record.value.title === 'string' ? record.value.title : 'Untitled',
			record: record.value,
		}))
}

export async function saveDocument(
	client: Client,
	did: string,
	record: any,
	existing?: { uri: string; cid: string; rkey: string },
): Promise<{ uri: string; cid: string; rkey: string }> {
	const rkey = existing ? existing.rkey : generateRkey()
	record.path = `/${rkey}`

	if (!record.publishedAt) {
		record.publishedAt = new Date().toISOString()
	}
	record.updatedAt = new Date().toISOString()

	const resp = await (client as any).post('com.atproto.repo.putRecord', {
		input: {
			repo: did,
			collection: DOCUMENT_COLLECTION,
			rkey,
			record,
			validate: false,
		},
	})
	if (!resp.ok) {
		throw new Error(`Failed to save document: ${resp.status} ${resp.data?.message || ''}`)
	}
	return {
		uri: resp.data.uri,
		cid: resp.data.cid,
		rkey,
	}
}

export async function getPublicDocument(client: Client, did: string, rkey: string): Promise<any> {
	const resp = await (client as any).get('com.atproto.repo.getRecord', {
		params: {
			repo: did,
			collection: DOCUMENT_COLLECTION,
			rkey,
		},
	})
	if (!resp.ok) {
		throw new Error(`Failed to get document: ${resp.status}`)
	}
	const val = resp.data.value
	if (val?.$type !== 'site.standard.document') {
		throw new Error(`Record is not a site.standard.document (got ${val?.$type})`)
	}
	return val
}
