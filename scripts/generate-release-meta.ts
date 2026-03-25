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

const tryRun = (command: string): boolean => {
  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
};

const getLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getChanges = (range: string): string[] => {
  console.log(range);
  if (!range) {
    return [];
  }

  return getLines(run("git log --pretty=format:'%s (%h)' " + range));
};

const getTags = (): string[] => getLines(run("git tag --list 'v*' --sort=-v:refname"));

const fetchGitHistory = (isShallow: boolean): boolean => {
  const fetchBase = 'git fetch --force --prune --filter=blob:none origin';
  const branchRefs = "'+refs/heads/*:refs/remotes/origin/*'";

  if (isShallow) {
    const unshallowCommand = fetchBase + ' --tags --unshallow ' + branchRefs;
    log('Refreshing Git refs:', '🔎 detected shallow clone, trying partial unshallow fetch');
    if (tryRun(unshallowCommand)) {
      log('Refreshing Git refs:', '✅ partial unshallow fetch succeeded');
      return true;
    }

    const updateShallowCommand = fetchBase + ' --tags --update-shallow ' + branchRefs;
    log('Refreshing Git refs:', '⚠️ partial unshallow fetch failed, trying update-shallow fetch');
    if (tryRun(updateShallowCommand)) {
      log('Refreshing Git refs:', '✅ partial update-shallow fetch succeeded');
      return true;
    }

    return false;
  }

  const fullCommand = fetchBase + ' --tags ' + branchRefs;
  log('Refreshing Git refs:', '🔎 trying partial history and tag fetch without blobs');
  if (tryRun(fullCommand)) {
    log('Refreshing Git refs:', '✅ partial history and tag fetch succeeded');
    return true;
  }

  return false;
};

const refreshGitRefs = (): void => {
  if (!run('git rev-parse --is-inside-work-tree')) {
    return;
  }

  const isShallow = run('git rev-parse --is-shallow-repository') === 'true';
  const hasOrigin = Boolean(run('git remote get-url origin'));

  if (!hasOrigin) {
    return;
  }

  if (fetchGitHistory(isShallow)) {
    return;
  }

  log('Refreshing Git refs:', '⚠️ partial fetch failed, falling back to standard tag fetch');
  if (!tryRun('git fetch --force --tags --prune origin')) {
    log('Refreshing Git refs:', '❌ fetch failed, continuing with local checkout state');
  }
};

log('Generating release metadata...');

let tags = getTags();
if (tags.length === 0 || run('git rev-parse --is-shallow-repository') === 'true') {
  refreshGitRefs();
  tags = getTags();
}

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
