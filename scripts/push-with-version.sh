#!/usr/bin/env bash
set -euo pipefail

if [[ "${VERBOSE:-0}" == "1" ]]; then
  set -x
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Commit or stash your changes first."
  exit 1
fi

latest_tag=$(git tag --list 'v*' --sort=-v:refname | head -n 1)
base_version="${latest_tag#v}"

if [[ -z "$base_version" || "$base_version" == "$latest_tag" ]]; then
  base_version="0.0.0"
fi

if [[ -n "$latest_tag" ]]; then
  commits_since_last_release=$(git rev-list --count "${latest_tag}..HEAD")
else
  commits_since_last_release=$(git rev-list --count HEAD)
fi

if [[ "$commits_since_last_release" -eq 0 ]]; then
  if [[ -n "$latest_tag" ]]; then
    echo "No commits since the last release tag (${latest_tag})."
  else
    echo "No commits available to release."
  fi
  echo "Create and commit actual changes before running push:versioned."
  exit 1
fi

IFS='.' read -r major minor patch <<< "$base_version"
major=${major:-0}
minor=${minor:-0}
patch=${patch:-0}

bump=${BUMP:-}
if [[ -z "$bump" ]]; then
  printf 'Version bump (patch/minor/major)? '
  read -r bump < /dev/tty
fi

case "$bump" in
  patch)
    patch=$((patch + 1))
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  *)
    echo "Invalid choice: $bump"
    exit 1
    ;;
esac

new_tag="v${major}.${minor}.${patch}"
release_commit_message="chore(release): ${new_tag}"

if git rev-parse -q --verify "refs/tags/${new_tag}" >/dev/null; then
  echo "Tag already exists: ${new_tag}"
  exit 1
fi

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[dry-run] Found ${commits_since_last_release} commit(s) since the last release"
  echo "[dry-run] Would create release commit: ${release_commit_message}"
  echo "[dry-run] Would create annotated tag: ${new_tag}"
  echo "[dry-run] Would run: ALLOW_VERSIONED_PUSH=1 git push origin HEAD \"${new_tag}\""
  exit 0
fi

git commit --allow-empty -m "$release_commit_message"
git tag -a "$new_tag" -m "release: $new_tag"
ALLOW_VERSIONED_PUSH=1 git push origin HEAD "${new_tag}"

echo "Pushed release commit and tag: $new_tag"
