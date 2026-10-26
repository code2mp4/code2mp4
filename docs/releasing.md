# Publishing desktop builds

This repository publishes product documentation and downloadable release assets. Desktop source and build environments are maintained separately.

## A complete release entry

For each actual build, provide:

- A unique version tag and clear preview or stable designation.
- Supported operating systems and processor architectures.
- The installer assets and a SHA256SUMS file covering those exact bytes.
- Installation, upgrade, recovery, and known-limitations notes.
- Signing and notarization status where applicable.
- Applicable application terms and third-party notices supplied with the build.

An entry without installer assets must not be presented as an available desktop download. Keep the downloads page consistent with the actual assets.

## Publication

1. Prepare and verify the final installer outside this documentation tree.
2. Create a GitHub release for its real version, attach the installer and checksum file, and publish matching release notes.
3. Update the current-desktop release entry in repository.json and the download instructions, then verify the public download and its SHA-256.

GitHub's automatically attached source archives contain this public documentation repository. Explain that distinction in the release notes when needed.

Keep the historical v0.1.0-alpha record and its original tag. Label it as the early open-source prototype, not a current desktop installer.

## Repository maintenance

The default branch accepts documentation and repository tooling changes. It has a documentation check instead of the early prototype's application build and dependency update workflows.

The legacy-open-source branch and its snapshot tag preserve the original source. Do not merge the old application dependency-update branches into the documentation branch. Public issue templates distinguish current-product feedback from historical-source reports.
