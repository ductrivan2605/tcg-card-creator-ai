// Pollinations Concurrency Queue
// Guarantees only 1 in-flight request to image.pollinations.ai at a time
// Eliminates "Queue full for IP: 1 requests already queued (max: 1)" HTTP 429 errors.
// Caches loaded image URLs in-memory and handles retries.

const cache = new Map();
const subscribers = new Map();
const queue = [];
let isProcessing = false;

export function getPollinationsCached(url) {
  return cache.get(url) || null;
}

export function subscribePollinationsImage(url, onLoaded, onError) {
  if (!url) return () => {};

  if (cache.has(url)) {
    onLoaded(cache.get(url));
    return () => {};
  }

  if (!subscribers.has(url)) {
    subscribers.set(url, new Set());
    queue.push(url);
  }

  const subs = subscribers.get(url);
  const cb = { onLoaded, onError };
  subs.add(cb);

  processQueue();

  return () => {
    const s = subscribers.get(url);
    if (s) {
      s.delete(cb);
      if (s.size === 0) {
        subscribers.delete(url);
        const idx = queue.indexOf(url);
        if (idx !== -1) queue.splice(idx, 1);
      }
    }
  };
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const url = queue.shift();
    if (!url) continue;

    let success = false;
    let attempts = 0;
    const maxAttempts = 4;

    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        await new Promise((resolve, reject) => {
          const img = new Image();
          const timer = setTimeout(() => {
            img.src = "";
            reject(new Error("Pollinations timeout"));
          }, 20000);

          img.onload = () => {
            clearTimeout(timer);
            cache.set(url, url);
            const subs = subscribers.get(url);
            if (subs) {
              subs.forEach(s => s.onLoaded && s.onLoaded(url));
              subscribers.delete(url);
            }
            success = true;
            resolve();
          };

          img.onerror = (err) => {
            clearTimeout(timer);
            reject(err);
          };

          img.src = url;
        });
      } catch (err) {
        console.warn(`[Pollinations] Attempt ${attempts} failed for: ${url.slice(0, 80)}...`, err);
        if (attempts < maxAttempts) {
          // Back off 1.8 seconds before next attempt to let Pollinations queue clear
          await new Promise(r => setTimeout(r, 1800));
        } else {
          const subs = subscribers.get(url);
          if (subs) {
            subs.forEach(s => s.onError && s.onError(err));
            subscribers.delete(url);
          }
        }
      }
    }

    // Small delay between successful requests to respect Pollinations rate limits
    await new Promise(r => setTimeout(r, 400));
  }

  isProcessing = false;
}
