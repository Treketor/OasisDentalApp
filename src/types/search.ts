export type SearchResultType = 'task' | 'handover' | 'profile' | 'template'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  metadata: Record<string, unknown>
  href: string
}

export interface SearchResultsByGroup {
  tasks: SearchResult[]
  handover: SearchResult[]
  profiles: SearchResult[]
  templates: SearchResult[]
}
