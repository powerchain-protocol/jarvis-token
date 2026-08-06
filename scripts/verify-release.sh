#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <archive.tar.gz> <SHA256SUMS>" >&2
  exit 64
fi
archive="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
checksums="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
[[ -f "$archive" && -f "$checksums" ]] || { echo "archive and checksum file are required" >&2; exit 1; }

archive_name="$(basename "$archive")"
expected_lines="$(awk -v name="$archive_name" '$2 == name { count++ } END { print count+0 }' "$checksums")"
[[ "$expected_lines" -eq 1 ]] || { echo "checksum file must name the archive exactly once" >&2; exit 1; }

(cd "$(dirname "$archive")" && sha256sum -c "$checksums")
if tar -tzf "$archive" | awk -F/ '$1 == "" || $0 ~ /(^|\/)\.\.($|\/)/ { bad=1 } END { exit bad ? 0 : 1 }'; then
  echo "unsafe archive path detected" >&2
  exit 1
fi
echo "Release checksum and archive paths verified"
