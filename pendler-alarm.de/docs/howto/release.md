# Release History

## how to release a new version

1. Make sure you have committed all your changes and pushed them to the remote repository.
2. Run `npm run push:versioned` to create and push a new Git tag

## background

- Plain `git push` is blocked by a repository `pre-push` hook unless the push includes a semantic version tag like `v1.2.3`.
- `npm run setup:hooks` configures Git to use the versioned hooks from this project. It also runs automatically on `npm install` via `prepare`.
- `npm run push:versioned` creates and pushes the next semantic version as an annotated Git tag (for example `v1.2.3`).
- `npm run push:versioned:verbose` runs the same release flow with shell tracing and `DRY_RUN=1`, so you can test the steps locally without creating a tag or pushing.
- During push, no changes are committed to `package.json`, `package-lock.json`, or a tracked release-history file.
- Release history and version metadata are generated at build/dev time into `src/generated/*` from Git tags and commits.
