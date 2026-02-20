export interface SnippetParameter {
  name: string;
  defaultValue?: string;
}

export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  sql: string;
  tags: string[];
  parameters: SnippetParameter[];
  isFavorite: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SnippetFilter = 'all' | 'favorites' | 'templates';
