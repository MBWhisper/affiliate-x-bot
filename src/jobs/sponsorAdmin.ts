/**
 * Sponsor Admin CLI
 * ─────────────────────────────────────────────────────────────────
 * Interactive command-line tool for managing sponsors.
 *
 * Usage:
 *   npm run sponsor:list    — List all sponsors and revenue stats
 *   npm run sponsor:add     — Add a new sponsor interactively
 *   npm run sponsor:off     — Deactivate a sponsor by ID
 *   npm run sponsor:stats   — Print revenue summary
 */

import "dotenv/config";
import * as readline from "readline";
import {
  readAllSponsors,
  addSponsor,
  deactivateSponsor,
  getSponsorStats
} from "../services/sponsorManager";

// ─── CLI colour helpers ───────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  orange: "\x1b[38;5;208m"
};

const fmt = {
  header: (s: string) => `${C.bold}${C.cyan}${s}${C.reset}`,
  ok: (s: string) => `${C.green}${s}${C.reset}`,
  warn: (s: string) => `${C.yellow}${s}${C.reset}`,
  error: (s: string) => `${C.red}${s}${C.reset}`,
  dim: (s: string) => `${C.gray}${s}${C.reset}`,
  money: (s: string) => `${C.orange}${s}${C.reset}`
};

// ─── Banner ───────────────────────────────────────────────────────────────────

function printBanner(): void {
  console.log(fmt.header("\n╔══════════════════════════════════════════╗"));
  console.log(fmt.header("║   💼  Sponsor Admin — Web3 Jobs Bot      ║"));
  console.log(fmt.header("╚══════════════════════════════════════════╝\n"));
}

// ─── List sponsors ────────────────────────────────────────────────────────────

function cmdList(): void {
  const all = readAllSponsors();

  if (all.length === 0) {
    console.log(fmt.warn("No sponsors yet. Use 'npm run sponsor:add' to add your first one."));
    console.log(fmt.dim("\nOutreach tip:"));
    console.log(fmt.dim("  1. Search Twitter for Web3 companies hiring"));
    console.log(fmt.dim("  2. DM them: 'I run a Web3 job alert channel. Feature your job to 500+ devs for $19.99/week.'"));
    console.log(fmt.dim("  3. Once they agree, add them here and they appear in tomorrow's alert automatically.\n"));
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(fmt.header(`Found ${all.length} sponsor(s):\n`));

  for (const s of all) {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    end.setHours(23, 59, 59, 999);

    const isActive = s.active && today >= start && today <= end;
    const status = isActive
      ? fmt.ok("● ACTIVE")
      : s.active
      ? fmt.warn("○ Scheduled")
      : fmt.error("✕ Inactive");

    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);

    console.log(`  ${status}  ${fmt.header(s.company)}`);
    console.log(`  ${fmt.dim("ID:")} ${s.id}`);
    console.log(`  ${fmt.dim("Job:")} ${s.jobTitle}`);
    console.log(`  ${fmt.dim("Package:")} ${fmt.money(`$${s.paidAmount} / ${s.package}`)}`);
    console.log(`  ${fmt.dim("Period:")} ${s.startDate} → ${s.endDate}  ${isActive ? fmt.ok(`(${daysLeft}d left)`) : ""}`);
    if (s.note) console.log(`  ${fmt.dim("Note:")} ${s.note}`);
    console.log();
  }

  printStats();
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function printStats(): void {
  const stats = getSponsorStats();
  console.log(fmt.header("─── Revenue Snapshot ───────────────────────"));
  console.log(`  Total sponsors:    ${stats.total}`);
  console.log(`  Active today:      ${fmt.ok(String(stats.active))}`);
  console.log(`  Total earned:      ${fmt.money(`$${stats.revenue.toFixed(2)} ${stats.currency}`)}`);
  console.log(fmt.header("────────────────────────────────────────────\n"));

  if (stats.active === 0) {
    console.log(fmt.warn("💡 No active sponsors. Your sponsored slot is open!"));
    console.log(fmt.dim("   Post this in Web3 Discord servers:"));
    console.log(fmt.dim('   "🔥 Sponsored slots open! Reach 500+ Web3 devs for $19.99/week. DM me."\n'));
  }
}

// ─── Helper: today's date as YYYY-MM-DD ──────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Add sponsor (interactive) ────────────────────────────────────────────────

async function cmdAdd(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question("  " + q + " ", resolve));

  console.log(fmt.header("\n─── Add New Sponsor ────────────────────────\n"));

  try {
    const company = (await ask("Company name:")).trim();
    const jobTitle = (await ask("Job title:")).trim();
    const location = (await ask("Location (default: Remote Worldwide):")).trim() || "Remote Worldwide";
    const salary = (await ask("Salary range (e.g. $80k-$120k, or press Enter to skip):")).trim();
    const applyUrl = (await ask("Apply URL:")).trim();
    const tagsRaw = (await ask("Tags (comma-separated, e.g. Solidity,DeFi,Remote):")).trim();
    const description = (await ask("Short role description (or press Enter to skip):")).trim();
    const pkgChoice = (await ask("Package — 1=Basic $19.99  2=Standard $34.99  3=Premium $59.99  [1]:")).trim() || "1";
    const startDate = (await ask("Start date (YYYY-MM-DD, default today " + today() + "):")).trim() || today();
    const weeksRaw = (await ask("Duration in weeks (default 1):")).trim();
    const weeks = parseInt(weeksRaw, 10) || 1;
    const contactEmail = (await ask("Contact email (optional):")).trim();

    const pkgMap: Record<string, { name: string; amount: number }> = {
      "1": { name: "weekly", amount: 19.99 },
      "2": { name: "weekly", amount: 34.99 },
      "3": { name: "weekly", amount: 59.99 }
    };
    const pkg = pkgMap[pkgChoice] ?? pkgMap["1"];

    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + weeks * 7 - 1);
    const endDate = endDateObj.toISOString().split("T")[0];

    const newSponsor = addSponsor({
      active: true,
      company,
      jobTitle,
      location,
      salary: salary || undefined,
      applyUrl,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
      description: description || undefined,
      package: pkg.name,
      paidAmount: pkg.amount,
      currency: "USD",
      startDate,
      endDate,
      contactEmail: contactEmail || undefined
    });

    console.log(fmt.ok("\n✅ Sponsor added! ID: " + newSponsor.id));
    console.log(fmt.dim("   Active from " + startDate + " to " + endDate + " (" + weeks + " week(s))"));
    console.log(fmt.money("   Revenue: +$" + pkg.amount.toFixed(2)));
    console.log(fmt.dim("   Next run of 'npm run sponsor:post' will include this sponsor.\n"));
  } finally {
    rl.close();
  }
}

// ─── Deactivate sponsor ───────────────────────────────────────────────────────

async function cmdOff(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(`  ${q} `, resolve));

  try {
    cmdList();
    const id = (await ask("Enter Sponsor ID to deactivate:")).trim();
    const ok = deactivateSponsor(id);
    if (ok) {
      console.log(fmt.ok(`\n✅ Sponsor ${id} deactivated.\n`));
    } else {
      console.log(fmt.error(`\n❌ Sponsor ID not found: ${id}\n`));
    }
  } finally {
    rl.close();
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  printBanner();

  const cmd = process.argv[2] ?? "list";

  switch (cmd) {
    case "list":
      cmdList();
      break;
    case "add":
      await cmdAdd();
      break;
    case "off":
      await cmdOff();
      break;
    case "stats":
      printStats();
      break;
    default:
      console.log(fmt.warn(`Unknown command: ${cmd}`));
      console.log(`Usage: npx ts-node src/jobs/sponsorAdmin.ts [list|add|off|stats]\n`);
  }
}

main().catch((err) => {
  console.error("❌ Sponsor admin error:", err);
  process.exit(1);
});
