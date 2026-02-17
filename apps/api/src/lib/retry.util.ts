/**
 * Generic exponential backoff retry helper.
 *
 * Retries an async function up to `maxAttempts` times.
 * Delay doubles on each failure: baseDelayMs, 2x, 4x, ...
 *
 * The function is retried only when it throws. If it returns a value with
 * `success: false`, the caller is responsible for deciding to retry.
 *
 * @example
 * const result = await withExponentialBackoff(
 *   () => fetchSomething(),
 *   { maxAttempts: 3, baseDelayMs: 500 }
 * );
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500 } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms, ...
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
