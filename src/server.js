import http from 'node:http'
import { chromium } from 'playwright'
import { TARGETS } from './targets.js'

const PORT = Number(process.env.PORT || 3000)
const API_KEY = process.env.CAPTURE_API_KEY

const CAPTURE_TIMEOUT_MS = 15_000
const MAX_CONCURRENT_CAPTURES = 2

let inFlight = 0

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)

  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  })

  res.end(payload)
}

function isAuthorized(req) {
  if (!API_KEY) {
    return false
  }

  return req.headers.authorization === `Bearer ${API_KEY}`
}

async function readBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')

  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}

async function captureTarget(target) {
  const browser = await chromium.launch({
    headless: true
  })

  try {
    const context = await browser.newContext({
      viewport: {
        width: 1280,
        height: 800
      },
      deviceScaleFactor: 1
    })

    const page = await context.newPage()

    await page.goto(target.url, {
      waitUntil: 'load',
      timeout: CAPTURE_TIMEOUT_MS
    })

    await page.waitForTimeout(500)

    const buffer = await page.screenshot({
      type: 'png'
    })

    return `data:image/png;base64,${buffer.toString('base64')}`
  } finally {
    await browser.close()
  }
}

async function handleCapture(req, res) {
  if (!isAuthorized(req)) {
    return sendJson(res, 401, {
      error: 'Unauthorized.'
    })
  }

  if (inFlight >= MAX_CONCURRENT_CAPTURES) {
    return sendJson(res, 429, {
      error: 'Capture worker is busy. Try again shortly.'
    })
  }

  let body

  try {
    body = await readBody(req)
  } catch {
    return sendJson(res, 400, {
      error: 'Invalid JSON body.'
    })
  }

  const key = body?.target
  const target = TARGETS[key]

  if (!target) {
    return sendJson(res, 400, {
      error: 'Unknown target.'
    })
  }

  inFlight += 1

  try {
    console.log(`Capturing ${target.label} → ${target.url}`)

    const dataUrl = await captureTarget(target)

    console.log(`Capture complete: ${target.label}`)

    return sendJson(res, 200, {
      dataUrl,
      label: target.label
    })
  } catch (error) {
    console.error('Capture error:', error)

    const message =
      error instanceof Error ? error.message : String(error)

    const timedOut =
      /timeout/i.test(message)

    return sendJson(res, timedOut ? 504 : 500, {
      error: timedOut
        ? 'The target page took too long to load.'
        : 'Capture failed.'
    })
  } finally {
    inFlight -= 1
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    return sendJson(res, 200, {
      service: 'ShotSweep Capture Worker',
      description: 'Browser capture worker for ShotSweep, powered by Playwright and Chromium.',
      status: 'operational',
      version: '1.0.0'
    })
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'shotsweep-capture'
    })
  }

  if (req.method === 'POST' && req.url === '/capture') {
    return handleCapture(req, res)
  }

  return sendJson(res, 404, {
    error: 'Not found.'
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ShotSweep capture worker listening on port ${PORT}`)
})