/**
 * Simple token-bucket rate limiter.
 * Ensures no more than `maxConcurrent` requests run at the same time
 * and adds a small inter-batch delay to stay well within API rate limits.
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run an array of async tasks with a concurrency cap.
 * @param {Function[]} tasks  - Array of () => Promise<T>
 * @param {number} concurrency - Max parallel inflight
 * @param {number} delayMs    - ms to wait between launching each task
 */
async function runWithConcurrency(tasks, concurrency = 3, delayMs = 200) {
  const results = [];
  const inFlight = new Set();
  let index = 0;

  while (index < tasks.length || inFlight.size > 0) {
    while (inFlight.size < concurrency && index < tasks.length) {
      const i = index++;
      const promise = tasks[i]().then(result => {
        inFlight.delete(promise);
        results[i] = result;
      });
      inFlight.add(promise);
      if (delayMs > 0) await sleep(delayMs);
    }
    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }
  }

  return results;
}

module.exports = { runWithConcurrency, sleep };
