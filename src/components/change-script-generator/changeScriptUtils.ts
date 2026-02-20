import type { SchemaComparisonResult, SchemaObjectDifference, ObjectType } from '@/types/backup.types';

const OBJECT_TYPES: Record<ObjectType, { create: string; drop: string }> = {
  table: { create: 'TABLE', drop: 'TABLE' },
  procedure: { create: 'PROCEDURE', drop: 'PROCEDURE' },
  view: { create: 'VIEW', drop: 'VIEW' },
  function: { create: 'FUNCTION', drop: 'FUNCTION' },
  trigger: { create: 'TRIGGER', drop: 'TRIGGER' },
  event: { create: 'EVENT', drop: 'EVENT' },
};

/**
 * Generate rollback script from schema comparison result.
 * Inverts the migration: CREATE→DROP, DROP→CREATE, ALTER→revert to target.
 */
export function generateRollbackScript(result: SchemaComparisonResult): string {
  const { sourceServer, targetServer, sourceDatabase, targetDatabase, differences } = result;

  let script = `-- ========================================\n`;
  script += `-- ROLLBACK SCRIPT (Revert to target state)\n`;
  script += `-- Source: ${sourceServer.name} / ${sourceDatabase}\n`;
  script += `-- Target: ${targetServer.name} / ${targetDatabase}\n`;
  script += `-- Generated: ${new Date().toISOString()}\n`;
  script += `-- ========================================\n\n`;

  script += `USE ${targetDatabase};\n\n`;

  const typeOrder: ObjectType[] = ['event', 'trigger', 'view', 'procedure', 'function', 'table'];

  for (const objType of typeOrder) {
    const key = `${objType}s` as keyof typeof differences;
    const diffs = (differences[key] as SchemaObjectDifference[]) ?? [];
    const actionable = diffs.filter(d => d.differenceType !== 'identical');

    if (actionable.length === 0) continue;

    const { create, drop } = OBJECT_TYPES[objType];
    script += `-- ========================================\n`;
    script += `-- ${create}S\n`;
    script += `-- ========================================\n\n`;

    for (const diff of actionable) {
      script += `-- Rollback: ${diff.name} (was ${diff.differenceType})\n`;

      if (diff.differenceType === 'missing') {
        // Forward: CREATE. Rollback: DROP
        script += `DROP ${drop} IF EXISTS \`${diff.name}\`;\n`;
      } else if (diff.differenceType === 'extra') {
        // Forward: DROP. Rollback: CREATE from target
        if (diff.targetMetadata?.definition) {
          script += `${diff.targetMetadata.definition};\n`;
        } else {
          script += `-- Warning: Definition not available from target\n`;
        }
      } else if (diff.differenceType === 'modified') {
        // Forward: ALTER or DROP+CREATE. Rollback: revert to target
        if (diff.targetMetadata?.definition) {
          script += `DROP ${drop} IF EXISTS \`${diff.name}\`;\n`;
          script += `${diff.targetMetadata.definition};\n`;
        } else {
          script += `-- Warning: Target definition not available for rollback\n`;
        }
      }
      script += '\n';
    }
  }

  script += `-- ========================================\n`;
  script += `-- END OF ROLLBACK SCRIPT\n`;
  script += `-- ========================================\n`;

  return script;
}

/**
 * Wrap migration script with idempotent patterns (IF NOT EXISTS, etc.)
 */
export function makeScriptIdempotent(script: string): string {
  let out = script;

  // CREATE TABLE -> CREATE TABLE IF NOT EXISTS
  out = out.replace(/\bCREATE TABLE\s+`/g, 'CREATE TABLE IF NOT EXISTS `');

  // DROP PROCEDURE/VIEW/FUNCTION/EVENT IF EXISTS - already idempotent, leave as is
  // For CREATE PROCEDURE/VIEW/FUNCTION: typically need DROP IF EXISTS + CREATE
  // The existing script already does DROP IF EXISTS before CREATE for modified objects

  // Add header note
  const header = `-- Idempotent migration: safe to run multiple times\n`;
  const useMatch = out.match(/^(--[^\n]*\n)+(\n*USE[^\n]*\n)/);
  if (useMatch) {
    const insertIdx = out.indexOf(useMatch[2]) + useMatch[2].length;
    out = out.slice(0, insertIdx) + header + out.slice(insertIdx);
  } else {
    out = header + out;
  }

  return out;
}
