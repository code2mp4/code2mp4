#!/usr/bin/env python3
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(
    ["git", "-C", str(root), "ls-files", "-z"], text=True
).split("\0")
paths = sorted({p for p in tracked if p and (root / p).is_file()})
# Include newly added documentation before it is staged.
paths = sorted(set(paths) | {
    p.relative_to(root).as_posix() for p in root.rglob("*")
    if p.is_file() and ".git" not in p.relative_to(root).parts
    and "__pycache__" not in p.relative_to(root).parts
})
errors = []
links = 0
for relative in paths:
    path = root / relative
    if path.suffix != ".md":
        continue
    text = path.read_text(encoding="utf-8")
    text = re.sub(chr(96) * 3 + r".*?" + chr(96) * 3, "", text, flags=re.S)
    for match in re.finditer(r"!?(?:\[[^\]]*\])\(([^)]+)\)", text):
        target = match.group(1).strip()
        if target.startswith("<") and target.endswith(">"):
            target = target[1:-1]
        parts = urlsplit(target)
        if parts.scheme or parts.netloc or not parts.path:
            continue
        links += 1
        resolved = (path.parent / unquote(parts.path)).resolve()
        if root != resolved and root not in resolved.parents:
            errors.append(f"{relative}: local link leaves repository: {target}")
        elif not resolved.exists():
            errors.append(f"{relative}: missing local link: {target}")

metadata = json.loads((root / "repository.json").read_text())
if metadata["role"] != "product-documentation-and-releases":
    errors.append("repository.json: wrong repository role")
if metadata["legacy"]["source_commit"] != "91d7ba4501d8c6e48b4889a647b21af847f8185c":
    errors.append("repository.json: legacy snapshot changed")
if metadata["current_desktop_release"] is not None:
    release = metadata["current_desktop_release"]
    if not release.get("tag") or not release.get("url"):
        errors.append("repository.json: a current desktop release needs a tag and URL")
for old_path in ["apps", "packages", "pnpm-lock.yaml", "package.json", ".github/dependabot.yml"]:
    if (root / old_path).exists():
        errors.append(f"{old_path}: prototype source or automation belongs on the legacy branch")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Public documentation OK: {len(paths)} files, {links} local links; release metadata valid.")
