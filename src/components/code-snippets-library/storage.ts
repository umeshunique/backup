import type { CodeSnippet } from './types';

const STORAGE_KEY = 'code-snippets-library';

export function loadSnippets(): CodeSnippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CodeSnippet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSnippets(snippets: CodeSnippet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {
    // ignore
  }
}
