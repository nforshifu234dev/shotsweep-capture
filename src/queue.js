// src/queue.js
import { runShotSweepCapture } from './server.js'
const queue = new Map(); // slug -> { heroHash, enqueuedAt } — Map dedupes: newest wins per slug
let processing = false;

export function enqueue(slug, heroHash) {
  queue.set(slug, { heroHash, enqueuedAt: Date.now() });
  if (!processing) void drain();
}

export function queueSize() {
  return queue.size;
}

async function drain() {
  processing = true;
  while (queue.size > 0) {
    // FIFO: Map iteration order = insertion order, so .next().value is always the oldest entry
    const [slug, job] = queue.entries().next().value;
    queue.delete(slug);

    try {
      await captureAndReport(slug, job.heroHash);
    } catch (err) {
      console.error(`Capture failed for ${slug}:`, err);
      await reportResult(slug, { status: 'failed' }).catch(() => {});
    }
  }
  processing = false;
}

async function captureAndReport(slug, heroHash) {
  const dataUrl = await runShotSweepCapture({
    // ?ss_capture=1 is the gate CookieConsent.tsx checks (isCapture) to skip
    // rendering the privacy banner and skip firing GA/Meta Pixel for this hit.
    // Without it the banner renders into every hero screenshot.
    url: `https://www.wish-it.app/w/${slug}?ss_capture=1`,
    label: slug,
    selector: '[data-og-hero]',
    viewport: '1200x630',
  })
  await reportResult(slug, { status: 'done', dataUrl, heroHash })
}

async function reportResult(slug, { status, dataUrl, heroHash }) {
  const res = await fetch(`${process.env.WISHIT_INTERNAL_URL}/api/internal/og-hero`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SHARED_SECRET}`,
    },
    body: JSON.stringify({ slug, status, dataUrl, heroHash }),
  })
  if (!res.ok) {
    throw new Error(`og-hero report failed: ${res.status} ${await res.text().catch(() => '')}`)
  }
}