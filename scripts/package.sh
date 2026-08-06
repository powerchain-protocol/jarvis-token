#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_name="$(basename "$repo_root")"
release_dir="$repo_root/target/releases"
archive="$release_dir/jarvis-token-1.0.0-rc.0.tar.gz"
source_epoch="${SOURCE_DATE_EPOCH:-0}"

[[ "$source_epoch" =~ ^[0-9]+$ ]] || { echo "SOURCE_DATE_EPOCH must be an unsigned integer" >&2; exit 64; }
mkdir -p "$release_dir"

(
  cd "$repo_root"
  find . -type f \
    -not -path './node_modules/*' -not -path './dist/*' -not -path './artifacts/*' \
    -not -path './target/generated/*' -not -path './target/releases/*' \
    -print0 | LC_ALL=C sort -z | xargs -0 sha256sum
) > "$release_dir/SOURCE-MANIFEST.sha256"

cd "$(dirname "$repo_root")"
LC_ALL=C tar \
  --sort=name --mtime="@$source_epoch" --owner=0 --group=0 --numeric-owner \
  --pax-option=delete=atime,delete=ctime \
  --exclude="$project_name/node_modules" --exclude="$project_name/dist" \
  --exclude="$project_name/artifacts" --exclude="$project_name/target/generated" \
  --exclude="$project_name/target/releases" \
  --use-compress-program='gzip -n' -cf "$archive" "$project_name"

(
  cd "$release_dir"
  sha256sum "$(basename "$archive")" > SHA256SUMS
)
cat "$release_dir/SHA256SUMS"
