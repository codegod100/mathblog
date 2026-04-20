export type DraftStatus = 'local-draft' | 'repo-draft' | 'published'

export type DraftRecordRef = {
  uri: string
  cid: string
  rkey: string
}

export type PublicationRecord = {
  uri: string
  cid: string
  name: string
  description?: string
}

export type EditorDraft = {
  title: string
  description: string
  tags: string
  markdown: string
  publicationUri: string
  status: DraftStatus
  updatedAt: string
  remote?: DraftRecordRef
}

export type SessionSummary = {
  did: string
  handle: string
}

export type FacetFeature =
  | { $type: 'pub.leaflet.richtext.facet#link'; uri: string }
  | { $type: 'pub.leaflet.richtext.facet#bold' }
  | { $type: 'pub.leaflet.richtext.facet#italic' }
  | { $type: 'pub.leaflet.richtext.facet#strikethrough' }
  | { $type: 'pub.leaflet.richtext.facet#code' }

export type LeafletFacet = {
  $type: 'pub.leaflet.richtext.facet'
  index: {
    byteStart: number
    byteEnd: number
  }
  features: FacetFeature[]
}

export type TextBlock = {
  $type: 'pub.leaflet.blocks.text'
  plaintext: string
  textSize?: 'default' | 'small' | 'large'
  facets?: LeafletFacet[]
}

export type HeaderBlock = {
  $type: 'pub.leaflet.blocks.header'
  level: number
  plaintext: string
  facets?: LeafletFacet[]
}

export type BlockquoteBlock = {
  $type: 'pub.leaflet.blocks.blockquote'
  plaintext: string
  facets?: LeafletFacet[]
}

export type CodeBlock = {
  $type: 'pub.leaflet.blocks.code'
  plaintext: string
  language?: string
}

export type HorizontalRuleBlock = {
  $type: 'pub.leaflet.blocks.horizontalRule'
}

export type UnorderedListItem = {
  $type: 'pub.leaflet.blocks.unorderedList#listItem'
  content: TextBlock | HeaderBlock
  checked?: boolean
  children?: UnorderedListItem[]
}

export type OrderedListItem = {
  $type: 'pub.leaflet.blocks.orderedList#listItem'
  content: TextBlock | HeaderBlock
  checked?: boolean
  children?: OrderedListItem[]
}

export type UnorderedListBlock = {
  $type: 'pub.leaflet.blocks.unorderedList'
  children: UnorderedListItem[]
}

export type OrderedListBlock = {
  $type: 'pub.leaflet.blocks.orderedList'
  startIndex?: number
  children: OrderedListItem[]
}

export type MathBlock = {
  $type: 'pub.leaflet.blocks.math'
  tex: string
}

export type LeafletBlock =
  | TextBlock
  | HeaderBlock
  | BlockquoteBlock
  | CodeBlock
  | HorizontalRuleBlock
  | UnorderedListBlock
  | OrderedListBlock
  | MathBlock

export type LinearDocumentBlock = {
  $type: 'pub.leaflet.pages.linearDocument#block'
  block: LeafletBlock
}

export type LinearDocumentPage = {
  $type: 'pub.leaflet.pages.linearDocument'
  id?: string
  blocks: LinearDocumentBlock[]
}

export type LeafletContent = {
  $type: 'pub.leaflet.content'
  pages: LinearDocumentPage[]
}

export type SiteStandardDocumentRecord = {
  $type: 'site.standard.document'
  site: string
  title: string
  publishedAt: string
  path: string
  content: LeafletContent
  description?: string
  tags?: string[]
  updatedAt?: string
}

export type DocumentSummary = {
  uri: string
  cid: string
  rkey: string
  title: string
  site: string
  description?: string
  tags?: string[]
  publishedAt?: string
  updatedAt?: string
  record: SiteStandardDocumentRecord
}

