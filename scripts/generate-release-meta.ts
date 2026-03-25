#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

type GitContext = {
  cleanup: () => void;
  cwd: string;
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

const runIn = (cwd: string, command: string): string => {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const run = (command: string): string => runIn(projectRoot, command);

const tryRunIn = (cwd: string, command: string): boolean => {
  try {
    execSync(command, {
      cwd,
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

const getChanges = (range: string, cwd: string): string[] => {
  if (!range) {
    return [];
  }

  return getLines(runIn(cwd, "git log --pretty=format:'%s (%h)' " + range));
};

const getTags = (cwd: string): string[] =>
  getLines(runIn(cwd, "git tag --list 'v*' --sort=-v:refname"));

const cloneBareOrigin = (): GitContext | null => {
  const originUrl = run('git remote get-url origin');

  if (!originUrl) {
    log('Refreshing Git refs:', '⚠️ no origin remote found, cannot refresh refs');
    return null;
  }

  const tempRoot = mkdtempSync(resolve(tmpdir(), 'pendler-alarm-release-meta-'));
  const bareRepoPath = resolve(tempRoot, 'repo.git');
  log('Refreshing Git refs:', '🔎 creating temporary bare clone from origin');

  if (!tryRunIn(tempRoot, `git clone --bare ${originUrl} ${bareRepoPath}`)) {
    rmSync(tempRoot, { force: true, recursive: true });
    log('Refreshing Git refs:', '⚠️ bare clone failed, continuing with local checkout state');
    return null;
  }

  log('Refreshing Git refs:', '✅ temporary bare clone is ready');
  return {
    cleanup: () => {
      rmSync(tempRoot, { force: true, recursive: true });
    },
    cwd: bareRepoPath,
  };
};

const resolveGitContext = (): GitContext => {
  // if (!run('git rev-parse --is-inside-work-tree')) {
  //   return {
  //     cleanup: () => undefined,
  //     cwd: projectRoot,
  //   };
  // }

  // const isShallow = run('git rev-parse --is-shallow-repository') === 'true';
  // const localTags = getTags(projectRoot);

  // if (!isShallow && localTags.length > 0) {
  //   return {
  //     cleanup: () => undefined,
  //     cwd: projectRoot,
  //   };
  // }

  return cloneBareOrigin() ?? {
    cleanup: () => undefined,
    cwd: projectRoot,
  };
};

log('Generating release metadata...', '🛠️ collecting git history and release sections');

const gitContext = resolveGitContext();

try {
  const tags = getTags(gitContext.cwd);
  const latestTag = tags[0] ?? '';
  const headSha = runIn(gitContext.cwd, 'git rev-parse --short HEAD');
  const headDate = runIn(gitContext.cwd, 'git log -1 --format=%cs HEAD') || fallbackDate;
  const unreleasedRange = latestTag ? latestTag + '..HEAD' : 'HEAD';
  const unreleasedChanges = headSha ? getChanges(unreleasedRange, gitContext.cwd) : [];

  log('Git state:', `📌 head=${headSha || 'unknown'}, latestTag=${latestTag || 'none'}, tags=${tags.length}`);
  log('Unreleased changes:', `📝 ${String(unreleasedChanges.length)}`);

  const taggedSections: ReleaseSection[] = tags.map((tag, index) => {
    const previousTag = tags[index + 1];
    const range = previousTag ? previousTag + '..' + tag : tag;
    const date = runIn(gitContext.cwd, 'git log -1 --format=%cs ' + tag) || fallbackDate;
    const changes = getChanges(range, gitContext.cwd);

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

  log('Wrote file:', `💾 json=${jsonPath}`);
  log('Resolved appVersion:', `🏷️ ${appVersion}`);
} catch (error) {
  log('❌ Error:', String(error));

} finally {
  gitContext.cleanup();
}
