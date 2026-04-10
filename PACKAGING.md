# Knuthflow Packaging and Distribution Guide

## Overview

This document defines the packaging, signing, and distribution strategy for Knuthflow across all target platforms.

## Supported Platforms

| Platform | Package Format | Signing Required | Distribution Channel |
|----------|---------------|-----------------|---------------------|
| Windows (x64) | Squirrel Installer (.exe) | Yes (Authenticode) | Direct download, winget |
| macOS (x64, ARM64) | ZIP Archive | Yes (Apple ID, notarization) | Direct download |
| Linux (x64) | DEB, RPM | No (optional) | Direct download, apt, dnf |

## Versioning Strategy

### Semantic Versioning

Knuthflow uses [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH[-prerelease][+build]
```

- **MAJOR**: Breaking changes to user-facing API or functionality
- **MINOR**: New features in a backwards-compatible manner
- **PATCH**: Backwards-compatible bug fixes
- **Prerelease**: Alpha/beta releases (e.g., `1.0.0-alpha.1`)
- **Build**: Build metadata (ignored for comparison)

### Version Source

The version is defined in `package.json` and synced to:
- Electron app `app.getVersion()`
- macOS `Info.plist`
- Windows installer metadata

## Build Commands

```bash
# Development build (no packaging)
npm run start

# Package for current platform
npm run package

# Create distributable installers
npm run make

# Publish to GitHub Releases (requires GH_TOKEN env var)
npm run publish
```

## Platform-Specific Build Outputs

### Windows

**Output**: `out/make/squirrel.windows/x64/`

```
Knuthflow-Setup-{version}.exe
Knuthflow-{version}-full.nupkg
```

**Signing Requirements**:
- Authenticode certificate (Digicert, Comodo, etc.)
- Environment variables:
  - `WIN_CERTIFICATE`: Base64-encoded certificate
  - `WIN_PASSWORD`: Certificate password (or use `WIN_SECRETS` for keychain)
- Target: `*.exe` installer

**Squirrel Configuration**:
- Auto-update via Squirrel.Windows
- Delta updates supported
- App clears previous versions automatically

### macOS

**Output**: `out/make/zip/darwin/x64/` and `out/make/zip/darwin/arm64/`

```
Knuthflow-{version}-darwin-x64.zip
Knuthflow-{version}-darwin-arm64.zip
Knuthflow-{version}-darwin-universal.zip
```

**Signing Requirements**:
- Apple Developer ID certificate
- Environment variables:
  - `APPLE_CERTIFICATE`: Base64-encoded `.p12` certificate
  - `APPLE_CERTIFICATE_PASSWORD`: Certificate password
  - `APPLE_ID`: Apple ID email for notarization
  - `APPLE_APP_PASSWORD`: App-specific password (not your Apple ID password)
  - `APPLE_TEAM_ID`: Developer Team ID

**Notarization**:
- Required for distribution outside the Mac App Store
- Uses `electron-notarize` or `@electron/notarize`
- Staple the notarization ticket to the app

### Linux

**DEB Output**: `out/make/deb/x64/`
```
knuthflow_{version}_amd64.deb
```

**RPM Output**: `out/make/rpm/x64/`
```
knuthflowflow-{version}.x86_64.rpm
```

**Signing Requirements**:
- Optional GPG signing for repository inclusion
- Environment variables:
  - `GPG_KEY`: Base64-encoded GPG private key
  - `GPG_PASSPHRASE`: Key passphrase

## Artifact Naming Convention

```
{productName}-{version}-{os}-{arch}.{extension}
```

Examples:
- `Knuthflow-1.0.0-windows-x64.exe`
- `Knuthflow-1.0.0-darwin-x64.zip`
- `Knuthflow-1.0.0-darwin-arm64.zip`
- `Knuthflow-1.0.0-linux-x64.deb`
- `Knuthflow-1.0.0-linux-x64.rpm`

## Installer Features

### Windows (Squirrel)

- [x] Auto-update on app launch
- [x] Delta updates (smaller download)
- [x] Desktop shortcut creation
- [x] Start menu entry
- [x] Add/Remove Programs entry
- [x] Silent install support (`/S` flag)
- [x] Custom install location

### macOS

- [x] Drag-to-Applications installation
- [ ] DMG with license agreement
- [ ] LaunchAgent for auto-start
- [ ] Notarization for Gatekeeper

### Linux

- [x] Desktop entry file
- [x] Application icon
- [ ] Auto-update mechanism
- [ ] Repository hosting

## Code Signing Setup

### Prerequisites

1. **Windows**: Purchase an Authenticode certificate from a trusted CA
2. **macOS**: Enroll in Apple Developer Program ($99/year)

### Environment Setup

Create a `.env` file in the project root (never commit this):

```bash
# Windows Code Signing
WIN_CERTIFICATE=base64-encoded-certificate
WIN_PASSWORD=certificate-password

# macOS Code Signing & Notarization
APPLE_CERTIFICATE=base64-encoded-p12
APPLE_CERTIFICATE_PASSWORD=certificate-password
APPLE_ID=developer@email.com
APPLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABC1234567

# Linux GPG Signing (optional)
GPG_KEY=base64-encoded-private-key
GPG_PASSPHRASE=key-passphrase
```

### GitHub Actions Integration

See `.github/workflows/release.yml` for automated builds.

## Distribution Channels

### 1. Direct Download (Primary)
- Host binaries on GitHub Releases
- Update URLs in the app point to releases

### 2. Windows Package Managers
- **winget**: Submit to Microsoft Community Package Manager
- **Chocolatey**: Community-maintained package

### 3. macOS Package Managers
- **Homebrew**: Tap-based installation
- **MacPorts**: Port file maintenance

### 4. Linux Package Managers
- **apt/deb**: Host a repository or submit to Debian/Ubuntu
- **dnf/rpm**: Host a repository or submit to Fedora

## Update Mechanism

### Windows (Squirrel)
- `Update.exe` handles updates
- App checks for updates on launch
- Downloads delta or full update as needed

### macOS
- Sparkle framework (planned)
- Manual download from releases

### Linux
- No auto-update (planned)
- Manual download from releases

## Build Artifacts Checklist

Before releasing, verify:

- [ ] Version matches `package.json`
- [ ] Windows: `.exe` is signed with valid certificate
- [ ] macOS: `.app` is signed and notarized
- [ ] macOS: Universal binary (x64 + ARM64) created
- [ ] Linux: DEB and RPM packages created
- [ ] All artifacts follow naming convention
- [ ] Release notes created on GitHub
- [ ] SHA256 checksums generated for all artifacts

## Troubleshooting

### Windows: SmartScreen Warning
- SmartScreen may block first-time installers
- Build reputation by signing with a trusted certificate
- Time + code signing builds trust

### macOS: "App is Damaged"
- Usually indicates notarization failure
- Check notarization logs: `notarytool log <uuid>`
- Ensure correct Apple ID and app-specific password

### macOS: "Developer cannot be verified"
- App not properly signed
- Check code signing: `codesign -dvvv Knuthflow.app`
- Ensure signing certificate is not expired

### Linux: AppImage vs Package
- AppImage provides single-file distribution
- DEB/RPM for system integration
- Choose based on target user preference
