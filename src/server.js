import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { TARGETS } from './targets.js'

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

async function runShotSweepCapture(target) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'shotsweep-capture-')
  )

  try {
    const args = [
      'capture',
      '--url',
      target.url,
      '--out',
      tempDir,
      '--viewport',
      '1280x800',
      '--wait-until',
      'load',
      '--timeout',
      '15000',
      '--json',
      '--quiet',
    ]

    if (target.wait) {
      args.push('--wait', target.wait)
    }

    const shotsweepBin =
      process.platform === 'win32'
        ? path.join(process.cwd(), 'node_modules', '.bin', 'shotsweep.cmd')
        : path.join(process.cwd(), 'node_modules', '.bin', 'shotsweep')

    const { stdout, stderr } = await execFileAsync(
      shotsweepBin,
      args,
      {
        cwd: process.cwd(),
        timeout: 45000,
        maxBuffer: 10 * 1024 * 1024,
      }
    )

    if (stderr) {
      console.log('ShotSweep stderr:', stderr)
    }

    console.log('ShotSweep output:', stdout)

    const files = await findPngFiles(tempDir)

    if (files.length === 0) {
      throw new Error('ShotSweep completed but produced no PNG screenshot.')
    }

    const screenshotPath = files[0]
    const buffer = await fs.readFile(screenshotPath)

    return `data:image/png;base64,${buffer.toString('base64')}`
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
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

app.listen(PORT, () => {
  console.log(`ShotSweep Capture Worker listening on port ${PORT}`)
})