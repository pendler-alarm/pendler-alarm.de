# Release

## How to release a new version

1. Make sure your working tree is clean.
2. Make sure there is at least one real commit since the last release tag.
3. Run `npm run push:versioned`.
4. Choose `patch`, `minor`, or `major` when prompted.
5. The script creates a release commit, adds the new annotated tag, and pushes both to `origin`.

## Local testing

- Run `BUMP=patch npm run push:versioned:verbose` to test the flow without creating a commit, tag, or push.
- Replace `patch` with `minor` or `major` if needed.

## Background

- Plain `git push` is blocked by a repository `pre-push` hook unless the push includes a semantic version tag like `v1.2.3`.
- `npm run setup:hooks` configures Git to use the versioned hooks from this project. It also runs automatically on `npm install` via `prepare`.
- `npm run push:versioned` aborts if the working tree is dirty.
- `npm run push:versioned` aborts if there is no commit since the last release tag.
- On success, `npm run push:versioned` creates a release commit so Vercel receives a fresh branch commit, then creates the new release tag and pushes both.
- No project files are modified during release; `package.json`, `package-lock.json`, and tracked documentation stay unchanged.
- Release history and version metadata are generated at build/dev time into `src/generated/*` from Git tags and commits.
