#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
project_dir=$(cd -- "${script_dir}/.." && pwd)

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Skipping Git hook setup: no Git repository detected."
  exit 0
fi

git config --local core.hooksPath "${project_dir}/.githooks"

echo "Configured core.hooksPath -> ${project_dir}/.githooks"
