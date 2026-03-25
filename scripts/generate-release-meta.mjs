#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const generatedDir = resolve(projectRoot, 'src/generated');
const publicApiDir = resolve(projectRoot, 'public/api');
const historyPath = resolve(generatedDir, 'RELEASE_HISTORY.md');
const metaPath = resolve(generatedDir, 'release-meta.ts');
const jsonPath = resolve(publicApiDir, 'releases.json');
const fallbackDate = new Date().toISOString().slice(0, 10);

const run = (command) => {
  try {
    return execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const getLines = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getChanges = (range) => {
  if (!range) {
    return [];
  }

  return getLines(run("git log --pretty=format:'%s (%h)' " + range));
};

const tags = getLines(run("git tag --list 'v*' --sort=-v:refname"));
const latestTag = tags[0] ?? '';
const headSha = run('git rev-parse --short HEAD');
const headDate = run('git log -1 --format=%cs HEAD') || fallbackDate;
const unreleasedRange = latestTag ? latestTag + '..HEAD' : 'HEAD';
const unreleasedChanges = headSha ? getChanges(unreleasedRange) : [];

const taggedSections = tags.map((tag, index) => {
  const previousTag = tags[index + 1];
  const range = previousTag ? previousTag + '..' + tag : tag;
  const date = run('git log -1 --format=%cs ' + tag) || fallbackDate;
  const changes = getChanges(range);

  return {
    version: tag,
    date,
    changes: changes.length > 0 ? changes : ['No code changes recorded.'],
  };
});

const sections = [];

if (unreleasedChanges.length > 0) {
  const debugVersion = latestTag
    ? latestTag + '+debug.' + String(unreleasedChanges.length)
    : 'debug-' + headSha;

  sections.push({
    version: debugVersion,
    date: headDate,
    changes: unreleasedChanges,
  });
}

sections.push(...taggedSections);

const appVersion = (sections[0]?.version ?? latestTag) || 'v0.0.0';
const releaseMeta = {
  appVersion,
  releaseSections: sections,
};

const historyLines = ['# Release History', ''];
for (const section of sections) {
  historyLines.push('## ' + section.version + ' - ' + section.date);
  historyLines.push('');

  for (const change of section.changes) {
    historyLines.push('- ' + change);
  }

  historyLines.push('');
}

const metaFile = [
  'export type ReleaseSection = {',
  '  version: string',
  '  date: string',
  '  changes: string[]',
  '}',
  '',
  'export type ReleaseMeta = {',
  '  appVersion: string',
  '  releaseSections: ReleaseSection[]',
  '}',
  '',
  'export const releaseMeta: ReleaseMeta = ' + JSON.stringify(releaseMeta, null, 2),
  '',
  'export const appVersion = ' + JSON.stringify(appVersion) + ' as const',
  'export const releaseSections: ReleaseSection[] = ' + JSON.stringify(sections, null, 2),
  '',
].join('\n');

mkdirSync(generatedDir, { recursive: true });
mkdirSync(publicApiDir, { recursive: true });
writeFileSync(historyPath, historyLines.join('\n') + '\n', 'utf8');
writeFileSync(metaPath, metaFile, 'utf8');
writeFileSync(jsonPath, JSON.stringify(releaseMeta, null, 2) + '\n', 'utf8');
