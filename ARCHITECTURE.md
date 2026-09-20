# Architecture

ShotSweep Capture is a lightweight browser-capture service that provides
remote screenshot execution for environments where running Chromium directly
inside the application runtime is impractical.

## Overview

```text
┌──────────────────────────┐
│     ShotSweep Docs       │
│       (Netlify)          │
│                          │
│  Live Demo UI             │
│  /api/demo-capture        │
└────────────┬─────────────┘
             │
             │ HTTPS
             │ authenticated
             ▼
┌──────────────────────────┐
│ ShotSweep Capture Worker │
│        (Railway)         │
│                          │
│  Express API             │
│  Target allowlist        │
│  API-key authentication  │
└────────────┬─────────────┘
             │
             │ local CLI
             ▼
┌──────────────────────────┐
│       ShotSweep          │
│  @nfsfu234/shotsweep     │
│                          │
│  Capture orchestration   │
│  Waiting                 │
│  Viewport configuration  │
│  Output/manifest         │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Playwright + Chromium  │
│                          │
│   Browser rendering      │
│   Screenshot capture     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Target Projects     │
│                          │
│  FormValidation          │
│  TourGuide               │
│  WishIT                  │
│  IAMNOTSHIFU             │
│  HealthHub               │
│  NFORSHIFU234 Dev        │
└──────────────────────────┘
