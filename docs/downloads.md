# Downloads

[简体中文](#简体中文) · [Product](../README.md)

## Current desktop product

**No current Code2MP4 desktop installer has been published in this repository.**

Official desktop downloads will be attached as assets to a release on the [Releases page](https://github.com/code2mp4/code2mp4/releases). Each build will state:

- Product version and whether it is a preview or a stable release.
- Supported operating system and processor architecture.
- Installer filename, SHA-256 checksum, and installation instructions.
- Signing and notarization status where applicable.
- Available functionality, known limitations, and upgrade or recovery notes.
- Applicable software terms and third-party notices.

Use the attached installer for your platform. The automatic “Source code” ZIP and tar.gz files on GitHub contain this public repository's documentation, not the closed-source desktop application.

## Historical prototype

The [v0.1.0-alpha release](https://github.com/code2mp4/code2mp4/releases/tag/v0.1.0-alpha) belongs to the early open-source experiment. It has no desktop installer assets for the current product. Its version label does not establish current desktop compatibility or availability.

The old source remains in the [historical branch](https://github.com/code2mp4/code2mp4/tree/legacy-open-source). See [Project history](history.md).

## Verify a published download

When a release includes a SHA256SUMS file, place it beside the downloaded installer and run:

    shasum -a 256 -c SHA256SUMS

Follow the installation instructions supplied with that exact release.

## 简体中文

### 当前桌面产品

**本仓库尚未发布当前 Code2MP4 桌面产品的安装包。**

正式下载入口是 [Releases](https://github.com/code2mp4/code2mp4/releases) 中实际附带的安装文件。每个构建会明确版本、测试版或正式版身份、支持系统和芯片、文件名、SHA-256、安装步骤、签名或公证状态、已知限制、升级恢复说明，以及适用条款和第三方声明。

GitHub 自动生成的 “Source code” ZIP 和 tar.gz 只包含本公开仓库的文档，不包含当前闭源应用。

### 历史版本

[v0.1.0-alpha](https://github.com/code2mp4/code2mp4/releases/tag/v0.1.0-alpha) 属于早期开源实验，没有当前桌面产品的安装包。早期源码保留在[历史分支](https://github.com/code2mp4/code2mp4/tree/legacy-open-source)。旧版本号、依赖安装命令和示例不代表现行产品已经发布。

发布安装包后，请使用对应版本随附的校验文件和安装说明。
