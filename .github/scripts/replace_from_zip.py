#!/usr/bin/env python3
"""Safely replace the repository contents with one uploaded Vite project ZIP."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

MAX_FILES = 15_000
MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024
MAX_SINGLE_FILE_BYTES = 90 * 1024 * 1024
PROTECTED_FILES = {
    ".github/workflows/replace-from-zip.yml",
    ".github/scripts/replace_from_zip.py",
}


def select_upload(changed_paths: list[str]) -> str:
    """Return the one added/modified ZIP path or fail instead of guessing."""
    candidates = sorted(
        path for path in changed_paths
        if path.lower().endswith(".zip")
    )
    if len(candidates) != 1:
        if not candidates:
            raise ValueError("No newly added or modified .zip file was found in this commit.")
        raise ValueError(
            "Upload exactly one ZIP per commit; found: " + ", ".join(candidates)
        )
    return candidates[0]


def changed_zip_for_commit(repo_root: Path, commit_sha: str) -> Path:
    """Find the single added/modified ZIP in a commit, safely handling unusual names."""
    result = subprocess.run(
        [
            "git", "-C", str(repo_root), "diff-tree", "--root",
            "--no-commit-id", "--name-only", "--diff-filter=AM", "-r", "-z",
            commit_sha, "--",
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    changed_paths = [
        item.decode("utf-8", errors="surrogateescape")
        for item in result.stdout.split(b"\0") if item
    ]
    relative_path = select_upload(changed_paths)
    candidate = (repo_root / relative_path).resolve()
    resolved_root = repo_root.resolve()
    if resolved_root not in candidate.parents or not candidate.is_file():
        raise ValueError(f"Uploaded ZIP does not exist inside the repository: {relative_path}")
    if ".git" in Path(relative_path).parts:
        raise ValueError("ZIP files inside .git are not allowed.")
    if ".github" in Path(relative_path).parts:
        raise ValueError("Put the ZIP outside .github; automation files are protected.")
    return candidate


def _safe_member_path(raw_name: str) -> PurePosixPath:
    if "\\" in raw_name:
        raise ValueError(f"Unsafe ZIP entry uses backslashes: {raw_name!r}")
    path = PurePosixPath(raw_name)
    parts = path.parts
    if path.is_absolute() or not parts or any(part in {"", ".", ".."} for part in parts):
        raise ValueError(f"Unsafe ZIP path: {raw_name!r}")
    if ":" in parts[0]:
        raise ValueError(f"Unsafe ZIP path: {raw_name!r}")
    if ".git" in parts:
        raise ValueError("ZIP archives cannot contain a .git directory.")
    return path


def _validate_project(folder: Path) -> None:
    index_file = folder / "index.html"
    package_file = folder / "package.json"
    if not index_file.is_file() or not package_file.is_file():
        raise ValueError("ZIP must contain index.html and package.json at its project root.")
    try:
        package = json.loads(package_file.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("package.json in the ZIP is not valid JSON.") from error
    scripts = package.get("scripts") if isinstance(package, dict) else None
    if not isinstance(scripts, dict) or not isinstance(scripts.get("build"), str):
        raise ValueError("package.json must define a build script for Vercel.")


def _protected_paths(repo_root: Path) -> set[Path]:
    return {repo_root / name for name in PROTECTED_FILES}


def _clear_repo_except_automation(repo_root: Path) -> None:
    protected = _protected_paths(repo_root)

    def remove_unprotected(directory: Path) -> None:
        if not directory.exists():
            return
        for child in list(directory.iterdir()):
            if child in protected:
                continue
            if child.is_dir() and not child.is_symlink():
                remove_unprotected(child)
                try:
                    child.rmdir()
                except OSError:
                    pass
            else:
                child.unlink(missing_ok=True)

    for child in list(repo_root.iterdir()):
        if child.name == ".git":
            continue
        if child.name == ".github":
            remove_unprotected(child)
            continue
        if child.is_dir() and not child.is_symlink():
            shutil.rmtree(child)
        else:
            child.unlink(missing_ok=True)


def replace_from_archive(archive_path: Path, repo_root: Path) -> int:
    """Validate and stage the entire ZIP before replacing any current project files."""
    archive_path = archive_path.resolve()
    repo_root = repo_root.resolve()
    if not archive_path.is_file():
        raise ValueError(f"ZIP not found: {archive_path}")
    if archive_path.suffix.lower() != ".zip":
        raise ValueError("The uploaded file must have a .zip extension.")

    with tempfile.TemporaryDirectory(prefix="game-zip-stage-") as temporary:
        staging = Path(temporary)
        extracted_root = staging / "contents"
        extracted_root.mkdir()

        try:
            with zipfile.ZipFile(archive_path) as archive:
                infos = [info for info in archive.infolist() if not info.is_dir()]
                if not infos:
                    raise ValueError("The ZIP is empty.")
                if len(infos) > MAX_FILES:
                    raise ValueError(f"ZIP contains too many files (maximum {MAX_FILES}).")

                total_size = sum(info.file_size for info in infos)
                if total_size > MAX_UNCOMPRESSED_BYTES:
                    raise ValueError("ZIP expands beyond the 512 MB safety limit.")

                validated_entries = []
                seen_paths = set()
                for info in infos:
                    if info.file_size > MAX_SINGLE_FILE_BYTES:
                        raise ValueError(f"ZIP entry is larger than 90 MB: {info.filename}")
                    if info.flag_bits & 0x1:
                        raise ValueError("Encrypted ZIP entries are not supported.")
                    file_type = (info.external_attr >> 16) & 0o170000
                    if file_type == 0o120000:
                        raise ValueError("ZIP symlinks are not allowed.")
                    member_path = _safe_member_path(info.filename)
                    if member_path.name == ".DS_Store" or any(
                        part == "__MACOSX" or part.startswith("._")
                        for part in member_path.parts
                    ):
                        continue
                    normalized_name = member_path.as_posix()
                    if normalized_name in seen_paths:
                        raise ValueError(f"ZIP contains a duplicate file path: {normalized_name}")
                    seen_paths.add(normalized_name)
                    validated_entries.append((info, member_path))

                if not validated_entries:
                    raise ValueError("The ZIP contains no usable project files.")

                bad_file = archive.testzip()
                if bad_file:
                    raise ValueError(f"ZIP integrity check failed for: {bad_file}")

                infos = [info for info, _ in validated_entries]
                file_paths = [path for _, path in validated_entries]
                top_levels = {path.parts[0] for path in file_paths}
                strip_wrapper = (
                    len(top_levels) == 1
                    and all(len(path.parts) > 1 for path in file_paths)
                )
                wrapper = next(iter(top_levels)) if strip_wrapper else None

                extracted_count = 0
                for info, member_path in zip(infos, file_paths):
                    relative = PurePosixPath(*member_path.parts[1:]) if wrapper else member_path
                    if not relative.parts:
                        continue
                    destination = extracted_root.joinpath(*relative.parts)
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(info, "r") as source, destination.open("wb") as target:
                        shutil.copyfileobj(source, target, length=1024 * 1024)
                    mode = (info.external_attr >> 16) & 0o777
                    destination.chmod(0o755 if mode & 0o111 else 0o644)
                    extracted_count += 1
        except (zipfile.BadZipFile, RuntimeError) as error:
            raise ValueError("The uploaded file is not a valid readable ZIP archive.") from error

        _validate_project(extracted_root)
        _clear_repo_except_automation(repo_root)

        # Restore the ZIP's project files, including its own .github content, while
        # keeping this importer and its workflow intact so future ZIPs still work.
        for source in extracted_root.rglob("*"):
            if not source.is_file():
                continue
            relative = source.relative_to(extracted_root)
            if relative.as_posix() in PROTECTED_FILES:
                continue
            destination = repo_root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

    return extracted_count


def main() -> int:
    parser = argparse.ArgumentParser(description="Replace a repository from one uploaded ZIP.")
    parser.add_argument("--upload-repo-root", default=".", help="Checkout containing the uploaded ZIP commit")
    parser.add_argument("--repo-root", default=".", help="Production repository checkout to replace")
    parser.add_argument("--archive-path", help="Explicit ZIP path, used for GitHub Release assets")
    args = parser.parse_args()

    upload_root = Path(args.upload_repo_root).resolve()
    repo_root = Path(args.repo_root).resolve()
    try:
        if args.archive_path:
            archive_path = Path(args.archive_path).resolve()
            if not archive_path.is_file():
                raise ValueError(f"Release ZIP not found: {archive_path}")
            print("Replacing the production repository from a published release asset.")
        else:
            commit_sha = os.environ.get("GITHUB_SHA")
            if not commit_sha:
                raise ValueError("GITHUB_SHA is required for ZIP branch uploads.")
            archive_path = changed_zip_for_commit(upload_root, commit_sha)
            relative_archive = archive_path.relative_to(upload_root)
            print(f"Replacing the production repository from upload {relative_archive}")

        count = replace_from_archive(archive_path, repo_root)
        print(f"Replacement staged: {count} files imported. Automation files were preserved.")
        return 0
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"ZIP replacement stopped safely: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
