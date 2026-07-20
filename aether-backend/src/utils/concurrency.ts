/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once.
 * Used instead of Promise.all(items.map(fn)) anywhere we call the GitHub API
 * once per repo — GitHub's secondary rate limit will start rejecting requests
 * if you fire 50-100 calls at once for a user with a large number of repos.
 */
export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
}