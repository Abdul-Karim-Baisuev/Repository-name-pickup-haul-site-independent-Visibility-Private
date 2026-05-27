// Client-side brute-force throttle for tracking lookups.
// Complements the server-side rate limit in `tracking_auth_attempts`
// (5 failed attempts / 10 min, hashed). This adds an immediate UX
// lockout so attackers can't keep firing requests from one browser.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes lockout

type Bucket = { attempts: number[]; lockedUntil?: number };

const keyFor = (scope: "token" | "code", id: string) =>
  `pickuphaul_track_attempts__${scope}__${id}`;

const read = (key: string): Bucket => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw) as Bucket;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      lockedUntil: typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : undefined,
    };
  } catch {
    return { attempts: [] };
  }
};

const write = (key: string, bucket: Bucket) => {
  try {
    localStorage.setItem(key, JSON.stringify(bucket));
  } catch {
    /* noop */
  }
};

export const checkLockout = (
  scope: "token" | "code",
  id: string,
): { locked: boolean; retryInSec: number; remaining: number } => {
  const key = keyFor(scope, id);
  const now = Date.now();
  const bucket = read(key);

  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    return {
      locked: true,
      retryInSec: Math.ceil((bucket.lockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  const fresh = bucket.attempts.filter((t) => now - t < WINDOW_MS);
  return { locked: false, retryInSec: 0, remaining: Math.max(0, MAX_ATTEMPTS - fresh.length) };
};

export const recordFailure = (
  scope: "token" | "code",
  id: string,
): { locked: boolean; retryInSec: number; remaining: number } => {
  const key = keyFor(scope, id);
  const now = Date.now();
  const bucket = read(key);
  const fresh = bucket.attempts.filter((t) => now - t < WINDOW_MS);
  fresh.push(now);

  if (fresh.length >= MAX_ATTEMPTS) {
    const lockedUntil = now + COOLDOWN_MS;
    write(key, { attempts: fresh, lockedUntil });
    return { locked: true, retryInSec: Math.ceil(COOLDOWN_MS / 1000), remaining: 0 };
  }

  write(key, { attempts: fresh });
  return { locked: false, retryInSec: 0, remaining: MAX_ATTEMPTS - fresh.length };
};

export const recordSuccess = (scope: "token" | "code", id: string) => {
  try {
    localStorage.removeItem(keyFor(scope, id));
  } catch {
    /* noop */
  }
};

export const formatRetry = (sec: number) => {
  if (sec <= 60) return `${sec}s`;
  const m = Math.ceil(sec / 60);
  return `${m} min`;
};
