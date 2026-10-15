// Pure quota policy helpers (shared by server + client, unit-tested).
export const QUOTA = {
  downloadPerDay: 1,
  watchPerDay: 5,
  watchCountAfterSeconds: 120,
  downloadLinkTtlSeconds: 300,
  streamLinkTtlSeconds: 1800,
  maxHeartbeatCreditSeconds: 20,
} as const;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Quota day (YYYY-MM-DD) in Asia/Kolkata for a UTC instant. */
export function istDay(at: Date = new Date()): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Next IST midnight as a UTC Date. */
export function nextIstReset(at: Date = new Date()): Date {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const nextMidnightIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1);
  return new Date(nextMidnightIst - IST_OFFSET_MS);
}

/** Seconds of validated playback to credit for one heartbeat. Never trusts client-claimed time. */
export function heartbeatCredit(lastHeartbeatMs: number, nowMs: number, playing: boolean): number {
  if (!playing) return 0;
  const wall = Math.max(0, (nowMs - lastHeartbeatMs) / 1000);
  return Math.floor(Math.min(wall, QUOTA.maxHeartbeatCreditSeconds));
}

export function formatBytes(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export const QUALITIES = ["2160p", "1080p", "720p", "480p"] as const;
export type Quality = (typeof QUALITIES)[number];
export const qualityLabel = (q: string) => (q === "2160p" ? "4K" : q);
