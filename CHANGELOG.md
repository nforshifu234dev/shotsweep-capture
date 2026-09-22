# 📸 Changelog

All notable changes to the ShotSweep Capture Worker are documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) principles and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Changes that have not yet been released.

## [1.2.1] - 2026-09-22

### Fixed

- `queue.js` now requests `/w/{slug}?ss_capture=1` instead of the bare WishDrop URL. WishIT's `CookieConsent` component already gates on this param to skip rendering the privacy banner and skip firing GA/Meta Pixel for automated renders — the capture worker just wasn't sending it, so every hero screenshot (WishDrops and Templates alike, since both resolve through `/w/[id]`) had the banner baked in.

This closes out OG hero image capture as originally scoped: dynamic slug-based capture, FIFO per-slug queue, element-mode cropping, and now a clean banner-free render for both WishDrops and Templates.

## [1.2.0] - 2026-09-22

### Added

- `POST /wishit/capture` — dynamic, slug-based capture endpoint for WishDrop OG hero images, separate from the fixed `TARGETS` allowlist used by `/capture`.
- FIFO capture queue (`src/queue.js`), deduplicated by slug — repeated saves to the same WishDrop before it's processed replace the pending job instead of queuing duplicates.
- Element-mode capture support in `runShotSweepCapture`: a `target.selector` triggers `--mode element --selector <selector>`, cropping to a single element (e.g. `[data-og-hero]`) instead of the full page. Targets without a `selector` (all existing `TARGETS` entries) keep the original full-page `1280×800` viewport capture, unchanged.
- Capture results are reported back to WishIT via `POST /api/internal/og-hero` on the WishIT origin, authenticated with a separate shared secret.

### Changed

- `runShotSweepCapture` now builds its `--mode`/`--selector`/`--viewport` args conditionally based on the target, rather than always capturing full-page.

---

## [1.1.0] - 2026-09-20

### Added

- Use `@nfsfu234/shotsweep` as the browser capture engine.
- Support ShotSweep capture options including viewport configuration and selector-based waiting.
- Added HealthHub capture support with a 6000ms post-load wait.
- Return captured screenshots as PNG data URLs.
- Recursively discover PNG screenshots from ShotSweep output directories.
- Automatically clean up temporary capture directories.

### Changed

- Replaced direct Playwright screenshot orchestration with ShotSweep CLI execution.
- The capture worker now delegates browser capture behavior to ShotSweep.
- Browser lifecycle and Chromium management are handled by the Playwright-based ShotSweep runtime.

---

## [1.0.0] - 2026-09-20

### 🎉 Added

* Initial ShotSweep Capture Worker
* Node.js HTTP capture service
* Playwright-powered Chromium capture
* Approved target allowlist
* `GET /health` endpoint
* `POST /capture` endpoint
* Bearer API-key authentication
* Capture concurrency protection
* 15-second capture timeout
* Standardized `1280 × 800` capture viewport
* PNG screenshot responses
* Docker deployment configuration
* Playwright browser environment through the official Playwright Docker image
* Railway deployment support
* Local development workflow
* Environment-variable configuration
* Security documentation
* ShotSweep Docs integration architecture
* NFSFU234 ecosystem documentation

### 🔐 Security

* Restricted screenshot targets to an explicit allowlist
* Added bearer authentication for capture requests
* Prevented arbitrary URL capture
* Added concurrent capture limits
* Added browser capture timeout protection
* Kept deployment credentials outside the repository

### 🏗️ Infrastructure

* Separated browser execution from the ShotSweep documentation deployment
* Moved Chromium execution into a dedicated containerized service
* Added Docker-based production environment
* Designed the service to remain independently deployable from the ShotSweep CLI and documentation site

---

## Versioning

Version numbers follow:

```text
MAJOR.MINOR.PATCH
```

### MAJOR

Breaking API or architectural changes.

### MINOR

Backward-compatible features.

### PATCH

Backward-compatible fixes and improvements.

---

## Release Notes

For significant releases, the changelog should document:

```text
What changed
Why it changed
What users/deployments need to know
```

The goal is to keep the history useful for both development and deployment.

---

**Built for ShotSweep. Built by NFORSHIFU234 Dev. 🇳🇬**