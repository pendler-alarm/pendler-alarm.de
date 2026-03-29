import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

type FlatMessages = Record<string, string>;
type MessageTree = Record<string, unknown>;

type HardcodedHit = {
  file: string;
  value: string;
};

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const deFilePath = path.join(srcRoot, 'i18n', 'messages', 'de.ts');
const enFilePath = path.join(srcRoot, 'i18n', 'messages', 'en.ts');
const messageFiles = new Set([deFilePath, enFilePath]);
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const ignoredFileSnippets = ['__tests__', '.spec.ts'];
const allowedHardcodedFiles = new Set([
  path.join(srcRoot, 'router', 'routes.ts'),
  path.join(srcRoot, 'router', 'index.ts'),
]);
const allowedHardcodedValues = new Set([
  'de',
  'en',
  'true',
  'false',
  'home',
  'dashboard',
  'about',
  'releases',
  'login',
  'status',
  'idle',
  'loading',
  'authenticated',
  'error',
  'logo',
  '?raw',
  '/service-worker.js',
  'Unknown service worker error',
  'Service worker registration failed.',
  '/api/releases.json',
]);

const parseMessageFile = async (filePath: string): Promise<MessageTree> => {
  const source = await fs.readFile(filePath, 'utf8');
  const objectLiteral = source
    .replace(/^import .*$/gm, '')
    .replace(/^\s*export const \w+ = /m, '')
    .replace(/\s+as const;\s*$/, '');

  return Function('GOOGLE_CALENDAR_SCOPE', `"use strict"; return (${objectLiteral});`)(GOOGLE_CALENDAR_SCOPE) as MessageTree;
};

const flattenMessages = (input: unknown, prefix = ''): FlatMessages => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce<FlatMessages>((accumulator, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return {
        ...accumulator,
        ...flattenMessages(value, nextKey),
      };
    }

    accumulator[nextKey] = String(value);
    return accumulator;
  }, {});
};

const walk = async (directory: string): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return fullPath;
  }));

  return files.flat();
};

const collectUsedKeys = (source: string, knownKeys: Set<string>): Set<string> => {
  const usedKeys = new Set<string>();
  const translationCallPattern = /(?:\$t|\bt|translate|i18n\.global\.t)\(\s*['"`]([^'"`]+)['"`]/g;
  const literalPattern = /(['"`])((?:\\.|(?!\1)[^\n\\])*)\1/g;

  for (const match of source.matchAll(translationCallPattern)) {
    usedKeys.add(match[1]);
  }

  for (const match of source.matchAll(literalPattern)) {
    const value = normalizeText(match[2]);

    if (knownKeys.has(value)) {
      usedKeys.add(value);
    }
  }

  return usedKeys;
};

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isSuspiciousLiteral = (value: string): boolean => {
  const trimmedValue = normalizeText(value);

  if (!trimmedValue) {
    return false;
  }

  if (!/[A-Za-zÄÖÜäöüß]/.test(trimmedValue)) {
    return false;
  }

  if (allowedHardcodedValues.has(trimmedValue)) {
    return false;
  }

  if (trimmedValue.includes('http://') || trimmedValue.includes('https://')) {
    return false;
  }

  if (trimmedValue.includes('@/') || trimmedValue.includes('../') || trimmedValue.includes('./')) {
    return false;
  }

  if (/[=@:{}()[\]]/.test(trimmedValue)) {
    return false;
  }

  if (/^[a-z0-9_.-]+$/i.test(trimmedValue) && !trimmedValue.includes(' ')) {
    return false;
  }

  if (trimmedValue.includes('${')) {
    return false;
  }

  return true;
};

const extractBlock = (source: string, tagName: 'template' | 'script'): string[] => {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'g');
  const blocks: string[] = [];

  for (const match of source.matchAll(pattern)) {
    blocks.push(match[1]);
  }

  return blocks;
};

const collectTemplateTexts = (source: string): string[] => {
  const values: string[] = [];
  const templatePattern = />\s*([^<\n][^<]*[A-Za-zÄÖÜäöüß][^<]*)\s*</g;

  for (const templateBlock of extractBlock(source, 'template')) {
    for (const match of templateBlock.matchAll(templatePattern)) {
      const value = normalizeText(match[1]);

      if (!value || value.includes('{{') || value.includes('}}')) {
        continue;
      }

      if (isSuspiciousLiteral(value)) {
        values.push(value);
      }
    }
  }

  return values;
};

const collectScriptLiterals = (source: string): string[] => {
  const values: string[] = [];
  const literalPattern = /(['"`])((?:\\.|(?!\1)[^\n\\])*)\1/g;
  const scriptBlocks = source.includes('<script') ? extractBlock(source, 'script') : [source];

  for (const scriptBlock of scriptBlocks) {
    const sanitizedBlock = scriptBlock
      .split('\n')
      .filter((line) => !line.trim().startsWith('import '))
      .join('\n');

    for (const match of sanitizedBlock.matchAll(literalPattern)) {
      const value = normalizeText(match[2]);

      if (isSuspiciousLiteral(value) && /\s|[.!?:`]/.test(value)) {
        values.push(value);
      }
    }
  }

  return values;
};

const collectHardcodedTexts = (filePath: string, source: string): HardcodedHit[] => {
  if (messageFiles.has(filePath) || allowedHardcodedFiles.has(filePath)) {
    return [];
  }

  return [...collectTemplateTexts(source), ...collectScriptLiterals(source)].map((value) => ({
    file: filePath,
    value,
  }));
};

const relative = (filePath: string): string => path.relative(projectRoot, filePath);

const main = async (): Promise<void> => {
  const de = await parseMessageFile(deFilePath);
  const en = await parseMessageFile(enFilePath);
  const deMessages = flattenMessages(de);
  const enMessages = flattenMessages(en);
  const deKeys = new Set(Object.keys(deMessages));
  const enKeys = new Set(Object.keys(enMessages));
  const missingInEn = [...deKeys].filter((key) => !enKeys.has(key));
  const missingInDe = [...enKeys].filter((key) => !deKeys.has(key));

  const sourceFiles = (await walk(srcRoot))
    .filter((filePath) => ['.ts', '.vue'].includes(path.extname(filePath)))
    .filter((filePath) => !messageFiles.has(filePath))
    .filter((filePath) => ignoredFileSnippets.every((snippet) => !filePath.includes(snippet)));

  const usedKeys = new Set<string>();
  const hardcodedHits: HardcodedHit[] = [];

  for (const filePath of sourceFiles) {
    const source = await fs.readFile(filePath, 'utf8');

    for (const key of collectUsedKeys(source, deKeys)) {
      usedKeys.add(key);
    }

    hardcodedHits.push(...collectHardcodedTexts(filePath, source));
  }

  const allKeys = [...deKeys].sort();
  const unusedKeys = allKeys.filter((key) => !usedKeys.has(key));
  const unknownUsedKeys = [...usedKeys].filter((key) => !deKeys.has(key)).sort();
  const uniqueHardcodedHits = hardcodedHits.filter(
    (hit, index, entries) =>
      entries.findIndex((entry) => entry.file === hit.file && entry.value === hit.value) === index,
  );

  const hasIssues =
    missingInEn.length > 0
    || missingInDe.length > 0
    || unusedKeys.length > 0
    || unknownUsedKeys.length > 0
    || uniqueHardcodedHits.length > 0;

  if (!hasIssues) {
    console.log('i18n check passed');
    return;
  }

  if (missingInEn.length > 0) {
    console.error('Missing keys in en:');
    for (const key of missingInEn) {
      console.error(`- ${key}`);
    }
  }

  if (missingInDe.length > 0) {
    console.error('Missing keys in de:');
    for (const key of missingInDe) {
      console.error(`- ${key}`);
    }
  }

  if (unknownUsedKeys.length > 0) {
    console.error('Unknown i18n keys in source:');
    for (const key of unknownUsedKeys) {
      console.error(`- ${key}`);
    }
  }

  if (unusedKeys.length > 0) {
    console.error('Unused i18n keys:');
    for (const key of unusedKeys) {
      console.error(`- ${key}`);
    }
  }

  if (uniqueHardcodedHits.length > 0) {
    console.error('Potential hardcoded texts outside i18n:');
    for (const hit of uniqueHardcodedHits) {
      console.error(`- ${relative(hit.file)} :: ${hit.value}`);
    }
  }

  process.exitCode = 1;
};

void main();
