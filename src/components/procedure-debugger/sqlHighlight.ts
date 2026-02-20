/**
 * Simple SQL syntax highlighting: comments, keywords, strings.
 * Returns array of { text, className } for rendering.
 */
const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'PROCEDURE', 'FUNCTION', 'BEGIN', 'END',
  'DECLARE', 'SET', 'IF', 'ELSE', 'THEN', 'LOOP', 'WHILE', 'REPEAT', 'UNTIL', 'CASE', 'WHEN',
  'CALL', 'RETURN', 'OUT', 'INOUT', 'INT', 'VARCHAR', 'DECIMAL', 'DATETIME', 'NULL', 'AS',
  'OPEN', 'FETCH', 'CLOSE', 'CURSOR', 'FOR', 'DO', 'LEAVE', 'ITERATE', 'HANDLER', 'CONDITION',
]);

function tokenizeLine(line: string): { text: string; className: string }[] {
  const tokens: { text: string; className: string }[] = [];
  let i = 0;
  const n = line.length;

  while (i < n) {
    // Line comment --
    if (line[i] === '-' && line[i + 1] === '-') {
      const start = i;
      i = n;
      tokens.push({ text: line.slice(start), className: 'debugger-code-comment' });
      continue;
    }
    // Block comment /* */
    if (line[i] === '/' && line[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < n - 1 && !(line[i] === '*' && line[i + 1] === '/')) i++;
      i = Math.min(i + 2, n);
      tokens.push({ text: line.slice(start, i), className: 'debugger-code-comment' });
      continue;
    }
    // Single-quoted string
    if (line[i] === "'") {
      const start = i;
      i++;
      while (i < n && line[i] !== "'") {
        if (line[i] === '\\') i++;
        i++;
      }
      if (i < n) i++;
      tokens.push({ text: line.slice(start, i), className: 'debugger-code-string' });
      continue;
    }
    // Double-quoted identifier
    if (line[i] === '`') {
      const start = i;
      i++;
      while (i < n && line[i] !== '`') i++;
      if (i < n) i++;
      tokens.push({ text: line.slice(start, i), className: 'debugger-code-string' });
      continue;
    }
    // Word (keyword or identifier)
    if (/[a-zA-Z_@]/.test(line[i])) {
      const start = i;
      while (i < n && /[a-zA-Z0-9_@.]/.test(line[i])) i++;
      const word = line.slice(start, i);
      const upper = word.toUpperCase();
      const isKeyword = KEYWORDS.has(upper) || KEYWORDS.has(upper.replace(/@.*/, ''));
      tokens.push({
        text: word,
        className: isKeyword ? 'debugger-code-keyword' : '',
      });
      continue;
    }
    // Single character
    tokens.push({ text: line[i], className: '' });
    i++;
  }
  return tokens;
}

export function highlightSqlLine(line: string): { text: string; className: string }[] {
  return tokenizeLine(line);
}
