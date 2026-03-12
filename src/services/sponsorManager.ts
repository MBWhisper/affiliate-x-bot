/**
 * Sponsor Manager
 * ─────────────────────────────────────────────────────────────────
 * Reads sponsors.json and filters to currently active sponsors.
 *
 * MONETIZATION MODEL:
 * ──────────────────────────────────────────────────────────────────
 * Charge Web3 companies to have their job pinned at the TOP of every
 * daily alert on Telegram & Discord for a fixed period.
 *
 * Pricing tiers:
 *   🥉 Basic    $19.99 / week  — 1 platform (Telegram OR Discord)
 *   🥈 Standard $34.99 / week  — both platforms
 *   🥇 Premium  $59.99 / week  — both platforms + X (Twitter) shoutout
 *
 * How to get sponsors:
 *   1. DM Web3 companies on Twitter/LinkedIn with your channel stats
 *   2. Post in #sponsorships channels on Web3 Discord servers
 *   3. List on https://web3-jobs-hazel.vercel.app/ as a "Featured Employer"
 *
 * To add a sponsor:  npm run sponsor:add
 * To list sponsors:  npm run sponsor:list
 * To test output:    npm run sponsor:dry
 */

import * as fs from "fs";
import * as path from "path";

export interface Sponsor {
  id: string;
  active: boolean;
  company: string;
  jobTitle: string;
  location: string;
  salary?: string;
  applyUrl: string;
  logoUrl?: string;
  tags: string[];
  description?: string;
  /** "weekly" | "monthly" | "daily" */
  package: string;
  paidAmount: number;
  currency: string;
  /** ISO date string YYYY-MM-DD */
  startDate: string;
  /** ISO date string YYYY-MM-DD */
  endDate: string;
  contactEmail?: string;
  note?: string;
}

// ─── File path ────────────────────────────────────────────────────────────────

const SPONSORS_PATH = path.join(__dirname, "../data/sponsors.json");

// ─── Read all sponsors ────────────────────────────────────────────────────────

export function readAllSponsors(): Sponsor[] {
  if (!fs.existsSync(SPONSORS_PATH)) return [];
  try {
    const raw = fs.readFileSync(SPONSORS_PATH, "utf-8");
    return JSON.parse(raw) as Sponsor[];
  } catch {
    console.error("⚠️  Could not parse sponsors.json");
    return [];
  }
}

// ─── Get active sponsors (within date range) ──────────────────────────────────

export function getActiveSponsors(): Sponsor[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return readAllSponsors().filter((s) => {
    if (!s.active) return false;
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  });
}

// ─── Save sponsors ────────────────────────────────────────────────────────────

export function saveSponsors(sponsors: Sponsor[]): void {
  fs.writeFileSync(SPONSORS_PATH, JSON.stringify(sponsors, null, 2), "utf-8");
}

// ─── Add a new sponsor ────────────────────────────────────────────────────────

export function addSponsor(sponsor: Omit<Sponsor, "id">): Sponsor {
  const all = readAllSponsors();
  const id = `sponsor-${Date.now()}`;
  const newSponsor: Sponsor = { id, ...sponsor };
  all.push(newSponsor);
  saveSponsors(all);
  return newSponsor;
}

// ─── Deactivate a sponsor ────────────────────────────────────────────────────

export function deactivateSponsor(id: string): boolean {
  const all = readAllSponsors();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  all[idx].active = false;
  saveSponsors(all);
  return true;
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function getSponsorStats(): {
  total: number;
  active: number;
  revenue: number;
  currency: string;
} {
  const all = readAllSponsors();
  const active = getActiveSponsors();
  const revenue = all
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.paidAmount, 0);
  return { total: all.length, active: active.length, revenue, currency: "USD" };
}
