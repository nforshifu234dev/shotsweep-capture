import 'dotenv/config'
import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { TARGETS } from './targets.js'
import { enqueue, queueSize } from './queue.js'

const execFileAsync = promisify(execFile)

const app = express()
const PORT = process.env.PORT || 3000
const API_KEY = process.env.CAPTURE_API_KEY
const MAX_CONCURRENT_CAPTURES = 2

let inFlight = 0

app.use(express.json())

function isAuthorized(request) {
  if (!API_KEY) return false

  const provided =
    request.headers.get?.('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    ''

  return provided === API_KEY
}

function getTarget(key) {
  return TARGETS[key]
}

export async function runShotSweepCapture(target) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shotsweep-capture-'))

  try {
    const args = [
      'capture', '--url', target.url, '--out', tempDir,
    ]

    if (target.selector) {
      args.push('--mode', 'element', '--selector', target.selector)
    } else if (target.viewport) {
      const viewportRegex = /^\d+x\d+$/
      const viewport = viewportRegex.test(target.viewport)
        ? target.viewport
        : '1280x800'

      args.push('--viewport', viewport)
    } else {
      args.push('--viewport', '1280x800')
    }

    args.push('--wait-until', 'load', '--timeout', '15000', '--json', '--quiet')

    if (target.wait) args.push('--wait', target.wait)

    const shotsweepBin =
      process.platform === 'win32'
        ? path.join(process.cwd(), 'node_modules', '.bin', 'shotsweep.cmd')
        : path.join(process.cwd(), 'node_modules', '.bin', 'shotsweep')

    let stdout, stderr
    try {
      ;({ stdout, stderr } = await execFileAsync(shotsweepBin, args, {
        cwd: process.cwd(),
        timeout: 45000,
        maxBuffer: 10 * 1024 * 1024,
        shell: process.platform === 'win32',
      }))
    } catch (execErr) {
      // Non-zero exit (e.g. selector never matched) still writes a valid manifest.
      // Read it before tempDir gets cleaned up, so the real per-URL error surfaces
      // instead of a bare "Command failed" with empty stderr.
      let detail = execErr.stderr || execErr.message
      try {
        const summary = JSON.parse(execErr.stdout)
        const manifest = JSON.parse(await fs.readFile(summary.manifestPath, 'utf8'))
        detail = manifest[0]?.error || detail
      } catch { /* fall back to detail above if manifest unreadable */ }
      throw new Error(`ShotSweep capture failed for ${target.url}: ${detail}`)
    }

    if (stderr) console.log('ShotSweep stderr:', stderr)
    console.log('ShotSweep output:', stdout)

    const files = await findPngFiles(tempDir)
    if (files.length === 0) {
      throw new Error('ShotSweep completed but produced no PNG screenshot.')
    }

    const screenshotPath = files[0]
    const buffer = await fs.readFile(screenshotPath)
    return `data:image/png;base64,${buffer.toString('base64')}`
  } finally {
    if (!process.env.KEEP_CAPTURE_TEMP) {
      await fs.rm(tempDir, { recursive: true, force: true })
    } else {
      console.log(`[DEBUG] Kept temp dir: ${tempDir}`)
    }
  }
}

async function findPngFiles(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  })

  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findPngFiles(fullPath)))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath)
    }
  }

  return files
}

app.get('/', (_request, response) => {
  response.json({
    service: 'ShotSweep Capture Worker',
    description:
      'Browser capture worker for ShotSweep, powered by Playwright and Chromium.',
    status: 'operational',
    version: '1.1.0',
  })
})

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'shotsweep-capture',
  })
})

app.post('/capture', async (request, response) => {
  if (!isAuthorized(request)) {
    return response.status(401).json({
      error: 'Unauthorized.',
    })
  }

  const { target } = request.body ?? {}
  const targetConfig = getTarget(target)

  if (!targetConfig) {
    return response.status(400).json({
      error: 'Unknown target.',
    })
  }

  if (inFlight >= MAX_CONCURRENT_CAPTURES) {
    return response.status(429).json({
      error: 'Capture worker is busy. Try again shortly.',
    })
  }

  inFlight += 1

  try {
    console.log(`Capturing ${targetConfig.label}: ${targetConfig.url}`)

    const dataUrl = await runShotSweepCapture(targetConfig)

    return response.json({
      dataUrl,
      label: targetConfig.label,
    })
  } catch (error) {
    console.error('SHOTSWEEP CAPTURE ERROR:', error)

    return response.status(500).json({
      error: 'Capture failed.',
      debug: error instanceof Error ? error.message : String(error),
    })
  } finally {
    inFlight -= 1
  }
})

app.post('/wishit/capture', (request, response) => {
  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Unauthorized.' })
  }

  const { slug, heroHash } = request.body ?? {}

  if (!slug || typeof slug !== 'string') {
    return response.status(400).json({ error: 'slug is required.' })
  }

  enqueue(slug, heroHash)

  return response.status(202).json({ queued: true, queueSize: queueSize() })
})

app.listen(PORT, () => {
  console.log(`ShotSweep Capture Worker listening on port ${PORT}`)
})