import { describe, it, expect } from "vitest";
import { istDay, nextIstReset, heartbeatCredit, formatBytes } from "./quota";

describe("IST quota day", () => {
  it("rolls over at 18:30 UTC (IST midnight)", () => {
    expect(istDay(new Date("2026-10-14T18:29:59Z"))).toBe("2026-10-14");
    expect(istDay(new Date("2026-10-14T18:30:00Z"))).toBe("2026-10-15");
  });
  it("computes next reset", () => {
    expect(nextIstReset(new Date("2026-10-14T10:00:00Z")).toISOString()).toBe("2026-10-14T18:30:00.000Z");
    expect(nextIstReset(new Date("2026-10-14T19:00:00Z")).toISOString()).toBe("2026-10-15T18:30:00.000Z");
  });
});

describe("heartbeat credit", () => {
  it("caps credit and ignores paused", () => {
    expect(heartbeatCredit(0, 15_000, true)).toBe(15);
    expect(heartbeatCredit(0, 600_000, true)).toBe(20);
    expect(heartbeatCredit(0, 15_000, false)).toBe(0);
    expect(heartbeatCredit(10_000, 5_000, true)).toBe(0);
  });
});

describe("formatBytes", () => {
  it("formats", () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(1536 * 1024 * 1024)).toBe("1.5 GB");
  });
});
