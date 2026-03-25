#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ReleaseSection = {
  version: string;
  date: string;
  changes: string[];
};

type ReleaseMeta = {
  appVersion: string;
  releaseSections: ReleaseSection[];
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const publicApiDir = resolve(projectRoot, 'public/api');
const jsonPath = resolve(publicApiDir, 'releases.json');
const fallbackDate = new Date().toISOString().slice(0, 10);

const log = (message: string, details?: string): void => {
  const suffix = details ? ` ${details}` : '';
  console.log(`[release-meta] ${message}${suffix}`);
};

const run = (command: string): string => {
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

const getLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getChanges = (range: string): string[] => {
  if (!range) {
    return [];
  }

  return getLines(run("git log --pretty=format:'%s (%h)' " + range));
};

log('Generating release metadata...');

const tags = getLines(run("git tag --list 'v*' --sort=-v:refname"));
const latestTag = tags[0] ?? '';
const headSha = run('git rev-parse --short HEAD');
const headDate = run('git log -1 --format=%cs HEAD') || fallbackDate;
const unreleasedRange = latestTag ? latestTag + '..HEAD' : 'HEAD';
const unreleasedChanges = headSha ? getChanges(unreleasedRange) : [];

log('Git state:', `head=${headSha || 'unknown'}, latestTag=${latestTag || 'none'}, tags=${tags.length}`);
log('Unreleased changes:', String(unreleasedChanges.length));

const taggedSections: ReleaseSection[] = tags.map((tag, index) => {
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

const sections: ReleaseSection[] = [];

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
const releaseMeta: ReleaseMeta = {
  appVersion,
  releaseSections: sections,
};

mkdirSync(publicApiDir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(releaseMeta, null, 2) + '\n', 'utf8');

log('Wrote file:', `json=${jsonPath}`);
log('Resolved appVersion:', appVersion);
