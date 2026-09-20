# 📸 Changelog

All notable changes to the ShotSweep Capture Worker are documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) principles and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Changes that have not yet been released.

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
