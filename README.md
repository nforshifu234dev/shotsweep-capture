<h1 align="center">📸 NFSFU234ShotSweep Capture Worker</h1>

<p align="center">
  <strong>The browser engine behind ShotSweep's live capture experience.</strong>
</p>

<p align="center">
  A lightweight Playwright-powered capture service that turns approved web targets into real browser screenshots through a simple HTTP API.
</p>

<p align="center">
  <a href="https://github.com/nforshifu234dev/shotsweep-capture">
    <img src="https://img.shields.io/github/last-commit/nforshifu234dev/shotsweep-capture?style=for-the-badge" alt="Last Commit">
  </a>
  <a href="https://github.com/nforshifu234dev/shotsweep-capture/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/nforshifu234dev/shotsweep-capture?style=for-the-badge" alt="License">
  </a>
  <img src="https://img.shields.io/github/stars/nforshifu234dev/shotsweep-capture?style=for-the-badge" alt="GitHub Stars">
</p>

<p align="center">
  Built for <a href="https://shotsweep.nforshifu234dev.com">NFSFU234ShotSweep</a>
  by <a href="https://iamnotshifu.com">IAMNOTSHIFU</a>,
  through <a href="https://nforshifu234dev.com">NFORSHIFU234 Dev</a> 🇳🇬
</p>

---

# 📸 What is this?

ShotSweep is a CLI for website capture and visual regression testing.

The main ShotSweep package is designed to run locally or inside CI.

The ShotSweep documentation site has a different requirement.

It needs to demonstrate **real browser capture directly from the website**.

That means the documentation site needs somewhere to run Chromium.

This project is that browser layer.

```text
                    ShotSweep Docs
                         │
                         │ POST /api/demo-capture
                         ▼
                 Netlify API Route
                         │
                         │ authenticated request
                         ▼
             ┌─────────────────────────┐
             │  ShotSweep Capture      │
             │  Worker                 │
             │                         │
             │  Node.js + Playwright   │
             │  + Chromium             │
             └────────────┬────────────┘
                          │
                          │ browser capture
                          ▼
                    Approved Target
                          │
                          ▼
                       PNG
                          │
                          ▼
                    ShotSweep Docs
```

The worker exists so that the public documentation site does **not** need to bundle Chromium into its serverless function.

---

# ⚡ Why a separate capture worker?

Running Chromium inside a serverless documentation deployment creates unnecessary constraints.

The browser binary is large.

The runtime is temporary.

The filesystem is different between build and execution environments.

And serverless function package limits can make shipping a complete Playwright browser impractical.

Instead, ShotSweep separates the responsibilities:

```text
ShotSweep Docs
     │
     ├── Documentation
     ├── Demo UI
     └── Request validation
              │
              ▼
     Capture Worker
     │
     ├── Playwright
     ├── Chromium
     ├── Browser lifecycle
     ├── Capture limits
     └── Target allowlist
```

The documentation site stays lightweight.

The browser lives where it belongs.

---

# 🧠 What the worker does

The capture worker provides a small authenticated HTTP API.

It can:

* 📸 Launch a real Chromium browser
* 🌐 Open an approved target
* 🖥️ Use a consistent desktop viewport
* ⏱️ Enforce capture timeouts
* 🔐 Require an API key
* 🚦 Limit concurrent browser captures
* 📦 Return screenshots as PNG data URLs
* ❤️ Provide a health endpoint
* 🛡️ Restrict capture targets to an explicit allowlist
* 🐳 Run cleanly inside Docker
* 🚂 Deploy directly to Railway

The worker deliberately does **not** expose arbitrary URL screenshots.

That distinction matters.

This is not intended to become:

```text
POST /capture
{
  "url": "https://anything.com"
}
```

Instead, the API accepts an approved target key:

```json
{
  "target": "wishit"
}
```

The worker decides what URL that key represents.

---

# 🎯 Approved Targets

The current capture allowlist contains the following ShotSweep ecosystem projects:

| Target            | Project          |
| ----------------- | ---------------- |
| `form-validation` | FormValidation   |
| `tour-guide`      | TourGuide        |
| `wishit`          | WishIT           |
| `iamnotshifu`     | IAMNOTSHIFU      |
| `healthhub`       | HealthHub        |
| `nfsfu234dev`     | NFORSHIFU234 Dev |

The actual URLs are maintained inside:

```text
src/targets.js
```

This keeps the API surface intentionally small.

---

# 🔌 API

## `GET /health`

Checks whether the worker is running.

Example:

```bash
curl https://YOUR-WORKER-DOMAIN/health
```

Response:

```json
{
  "ok": true,
  "service": "shotsweep-capture"
}
```

---

# 📸 `POST /capture`

Captures one approved target.

### Authentication

Requests must include:

```http
Authorization: Bearer YOUR_CAPTURE_API_KEY
```

### Request

```json
{
  "target": "form-validation"
}
```

### Example

```bash
curl \
  -X POST \
  https://YOUR-WORKER-DOMAIN/capture \
  -H "Authorization: Bearer YOUR_CAPTURE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target":"form-validation"}'
```

### Successful response

```json
{
  "dataUrl": "data:image/png;base64,...",
  "label": "FormValidation"
}
```

The ShotSweep documentation site can then display the returned image directly.

---

# 🖥️ Capture Environment

The worker currently captures using:

```text
Browser: Chromium
Viewport: 1280 × 800
Device scale factor: 1
Navigation: load
Additional wait: 500ms
Timeout: 15 seconds
```

The goal is repeatability rather than attempting to reproduce every possible browser environment.

The worker is primarily intended to demonstrate ShotSweep's real capture capability.

---

# 🚦 Concurrency

Browser instances are expensive.

The worker therefore limits simultaneous captures.

Current limit:

```text
2 concurrent captures
```

If the worker is already processing the maximum number of captures, it returns:

```http
429 Too Many Requests
```

This prevents a burst of requests from spawning an uncontrolled number of Chromium processes.

---

# ⏱️ Capture Timeout

Every capture has a maximum execution time.

Current timeout:

```text
15 seconds
```

If the target takes too long to load, the worker returns:

```http
504 Gateway Timeout
```

This prevents a broken or permanently hanging target from occupying a browser indefinitely.

---

# 🔐 Security

The capture endpoint is protected with a bearer API key.

The worker expects:

```text
CAPTURE_API_KEY
```

The key should never be committed to Git.

It should be configured through the deployment environment.

The architecture also deliberately uses an allowlist rather than accepting arbitrary URLs.

That prevents the worker from becoming a publicly accessible screenshot proxy or an arbitrary server-side URL fetcher.

---

# 🐳 Docker

The worker uses the official Playwright Docker image.

The Docker image provides:

* Node.js
* Playwright
* Chromium
* Browser dependencies
* System libraries required by the browser

The application itself is intentionally small.

Build:

```bash
docker build -t shotsweep-capture .
```

Run:

```bash
docker run \
  -p 3000:3000 \
  -e CAPTURE_API_KEY=your-secret-key \
  shotsweep-capture
```

Then:

```bash
curl http://localhost:3000/health
```

---

# 💻 Local Development

Install dependencies:

```bash
npm install
```

Install Chromium for local development:

```bash
npx playwright install chromium
```

Start the worker:

```bash
npm start
```

Or use the development watcher:

```bash
npm run dev
```

The worker listens on:

```text
http://localhost:3000
```

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Test a capture:

```bash
curl \
  -X POST \
  http://localhost:3000/capture \
  -H "Authorization: Bearer YOUR_CAPTURE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target":"form-validation"}'
```

---

# 🚂 Railway Deployment

The capture worker is designed to run as a small containerized service on Railway.

Deployment flow:

```text
GitHub
   │
   ▼
Railway
   │
   ▼
Dockerfile
   │
   ▼
Playwright + Chromium
   │
   ▼
ShotSweep Capture Worker
```

Create a Railway service from this repository.

Railway will detect the:

```text
Dockerfile
```

and build the worker from it.

Set:

```text
CAPTURE_API_KEY
```

as a Railway environment variable.

Railway will provide the public service URL.

That URL is then configured in the ShotSweep documentation application as:

```text
SHOTSWEEP_CAPTURE_URL
```

The same secret is configured in the documentation application as:

```text
SHOTSWEEP_CAPTURE_API_KEY
```

Neither variable should use the `NEXT_PUBLIC_` prefix.

They are server-side credentials.

---

# 🔗 How ShotSweep Docs Uses It

The public documentation site does not talk directly to Chromium.

Instead:

```text
Browser
   │
   ▼
ShotSweep Docs
   │
   ▼
/api/demo-capture
   │
   ▼
Capture Worker
   │
   ▼
Playwright
   │
   ▼
Chromium
   │
   ▼
Target Website
```

This allows the documentation site to expose a real interactive demo without shipping a browser binary inside its Netlify function.

The frontend remains simple:

```text
Pick target
     ↓
Capture
     ↓
Show browser log
     ↓
Show screenshot
```

---

# 🧱 Project Structure

```text
shotsweep-capture/
│
├── src/
│   ├── server.js
│   └── targets.js
│
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
└── CHANGELOG.md
```

### `src/server.js`

HTTP server, authentication, concurrency control, browser lifecycle, and capture handling.

### `src/targets.js`

The approved ShotSweep demo targets.

### `Dockerfile`

Production browser environment.

### `README.md`

Project documentation.

### `CHANGELOG.md`

Release history.

---

# 📦 Relationship to ShotSweep

This project is **not** the ShotSweep CLI.

The main project is:

**`@nfsfu234/shotsweep`**

That is the tool developers install and use for visual regression testing.

This repository is infrastructure supporting a specific hosted capture experience.

```text
@nfsfu234/shotsweep
       │
       │ Core product
       ▼
CLI + capture + diff
       │
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
Local / CI              ShotSweep Docs
                              │
                              ▼
                     Capture Worker
                              │
                              ▼
                          Chromium
```

The worker can evolve independently without making the CLI dependent on a hosted service.

---

# 🪶 Design Philosophy

The worker follows the same principles as ShotSweep.

### 1. Keep the API small

The worker does one thing:

> **Turn an approved target into a real browser screenshot.**

It does not need a dashboard.

It does not need a database.

It does not need user accounts.

It does not need a complicated API.

---

### 2. Keep Chromium out of the docs deployment

The browser is the expensive part.

The worker owns it.

The documentation site does not.

---

### 3. Don't create an arbitrary screenshot proxy

The worker knows its targets.

That makes the service easier to secure and reason about.

---

### 4. Keep the deployment replaceable

Railway is the current deployment environment.

The application itself is just:

```text
Node.js
+
Playwright
+
Chromium
+
HTTP
```

It can therefore be moved to another container platform later without redesigning ShotSweep.

---

### 5. Open source the implementation

The code is public because the implementation itself is useful and transparent.

The deployed worker credentials are not public.

```text
Open source
     ≠
Public API credentials
```

The GitHub repository can be public while:

```text
CAPTURE_API_KEY
```

remains private.

---

# 🤝 Contributing

Contributions are welcome.

Useful contributions include:

* bug fixes
* capture reliability improvements
* browser configuration improvements
* Docker improvements
* security improvements
* API improvements
* documentation
* deployment improvements
* tests

Before contributing, review the project's issue tracker and existing implementation.

---

# 📄 License

MIT License.

Free for personal and commercial use.

Copyright © NFORSHIFU LOGICFORGE LTD

---

# 🌐 The NFSFU234 Ecosystem

ShotSweep Capture Worker is part of the wider NFSFU234 ecosystem.

### `@nfsfu234/formvalidation`

HTML-first form validation built around the attributes already present in your forms.

**<https://formvalidation.nforshifu234dev.com>**

### `@nfsfu234/tour-guide`

React onboarding tours and product walkthroughs.

**<https://tourguide.nforshifu234dev.com>**

### `@nfsfu234/shotsweep`

CLI-based website capture and visual regression testing.

**<https://shotsweep.nforshifu234dev.com>**

### WishIT

An emotional technology platform for creating, sharing, and preserving meaningful moments.

**<https://wish-it.app>**

---

# 🇳🇬 Built from Nigeria

ShotSweep Capture Worker is built by:

[IAMNOTSHIFU](https://iamnotshifu.com)

through:

[NFORSHIFU234 Dev](https://www.nforshifu234dev.com)

and published under:

**NFORSHIFU LOGICFORGE LTD**

🇳🇬

---

# 🎯 Final Word

ShotSweep needs a real browser to capture real websites.

This worker gives it one.

```text
Request
   ↓
Authenticate
   ↓
Select target
   ↓
Launch Chromium
   ↓
Capture page
   ↓
Return screenshot
```

Simple.

Focused.

Replaceable.

And built to stay out of the way of the actual product.

**ShotSweep captures the web. This is the browser behind it.** 📸

— Built by NFORSHIFU234 Dev 🇳🇬
