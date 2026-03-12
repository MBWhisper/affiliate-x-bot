/**
 * Web3 Job Alert Poster
 * ─────────────────────────────────────────────────────────────────
 * Fetches live Web3 jobs and posts them to:
 *   • Telegram (free channel + optional PREMIUM channel)
 *   • Discord (free webhook + optional PREMIUM webhook)
 *
 * MONETIZATION STRATEGY:
 * ──────────────────────
 * Free channel  → 1 job/day, standard listing
 * Premium channel → 3–5 jobs/day, salary shown, direct apply link
 *
 * Charge $9.99/month for premium via:
 *   - Telegram Stars (built-in)
 *   - Gumroad / PayPal subscription link
 *
 * Tip: Include your web3-jobs-hazel.vercel.app link in every post
 * to drive organic traffic + ad revenue.
 */

import cron from "node-cron";
import { fetchWeb3Jobs, Web3Job } from "../services/web3JobsFetcher";

// ─── Telegram ──────────────────────────────────────────────────────────────────

function buildTelegramJobMessage(job: Web3Job, isPremium: boolean): string {
  const tags = job.tags
    .slice(0, 4)
    .map((t) => `#${t.replace(/\s+/g, "")}`)
    .join(" ");

  const salaryLine =
    isPremium && job.salary ? `\n💵 Salary: <b>${job.salary}</b>` : "";

  const applyLine = isPremium
    ? `\n🔗 <a href="${job.url}">Apply Now</a>`
    : `\n🌐 <a href="https://web3-jobs-hazel.vercel.app/">Browse All Web3 Jobs</a>`;

  return [
    `🌐 <b>${escapeHtml(job.title)}</b>`,
    `🏢 ${escapeHtml(job.company)}`,
    `📍 ${escapeHtml(job.location)}`,
    salaryLine,
    applyLine,
    ``,
    tags,
    isPremium ? "" : `\n🔐 <i>Upgrade to Premium for salary & direct apply links → DM @WhHisBot</i>`
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  url: string
): Promise<void> {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 View Job", url }]]
    }
  };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(`Telegram error: ${json.description}`);
}

// ─── Discord ───────────────────────────────────────────────────────────────────

function buildDiscordJobEmbed(job: Web3Job, isPremium: boolean) {
  const fields = [
    { name: "🏢 Company", value: job.company, inline: true },
    { name: "📍 Location", value: job.location, inline: true }
  ];

  if (isPremium && job.salary) {
    fields.push({ name: "💵 Salary", value: job.salary, inline: true });
  }

  const tags = job.tags
    .slice(0, 4)
    .map((t) => `\`${t}\``)
    .join(" ");

  if (tags) fields.push({ name: "🏷️ Skills", value: tags, inline: false });

  return {
    username: process.env.DISCORD_BOT_NAME ?? "Web3 Jobs Bot",
    embeds: [
      {
        title: `🌐 ${job.title}`,
        description: isPremium
          ? `[Apply Now ↗](${job.url})`
          : `[Browse All Web3 Jobs ↗](https://web3-jobs-hazel.vercel.app/)`,
        url: isPremium ? job.url : "https://web3-jobs-hazel.vercel.app/",
        color: 0xeb459e, // fuchsia for Web3
        fields,
        footer: {
          text: isPremium
            ? "⭐ Premium Job Alert"
            : "🔓 Upgrade to Premium for salary + direct links"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };
}

async function sendDiscordEmbed(webhookUrl: string, payload: object): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord error: ${res.status} — ${body}`);
  }
}

// ─── Main runner ───────────────────────────────────────────────────────────────

export async function runWeb3JobPost(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const freeChatId = process.env.TELEGRAM_CHAT_ID;
  const premiumChatId = process.env.TELEGRAM_PREMIUM_CHAT_ID;

  const discordFree = process.env.DISCORD_WEBHOOK_URL;
  const discordPremium = process.env.DISCORD_PREMIUM_WEBHOOK_URL;

  const dryRun = process.env.DRY_RUN === "true";
  const freeLimit = 1;
  const premiumLimit = Number(process.env.JOBS_PREMIUM_LIMIT ?? "3");

  console.log("🔍 Fetching live Web3 jobs...");
  const jobs = await fetchWeb3Jobs(Math.max(freeLimit, premiumLimit));

  if (jobs.length === 0) {
    console.warn("⚠️  No jobs found.");
    return;
  }

  // ── FREE tier (1 job) ─────────────────────────────────────────────────────

  const freeJob = jobs[0];

  if (dryRun) {
    console.log("\n─── FREE Telegram preview ───");
    console.log(buildTelegramJobMessage(freeJob, false));
    console.log("\n─── PREMIUM Telegram preview ───");
    jobs.slice(0, premiumLimit).forEach((j) => {
      console.log(buildTelegramJobMessage(j, true));
      console.log("---");
    });
    return;
  }

  // Telegram free
  if (token && freeChatId) {
    try {
      await sendTelegramMessage(
        token,
        freeChatId,
        buildTelegramJobMessage(freeJob, false),
        "https://web3-jobs-hazel.vercel.app/"
      );
      console.log(`✅ [Telegram FREE] Job posted: ${freeJob.title}`);
    } catch (e) {
      console.error("❌ [Telegram FREE]", e instanceof Error ? e.message : e);
    }
  }

  // Discord free
  if (discordFree) {
    try {
      await sendDiscordEmbed(discordFree, buildDiscordJobEmbed(freeJob, false));
      console.log(`✅ [Discord FREE] Job posted: ${freeJob.title}`);
    } catch (e) {
      console.error("❌ [Discord FREE]", e instanceof Error ? e.message : e);
    }
  }

  // ── PREMIUM tier (multiple jobs) ─────────────────────────────────────────

  const premiumJobs = jobs.slice(0, premiumLimit);

  for (const job of premiumJobs) {
    // Telegram premium
    if (token && premiumChatId) {
      try {
        await sendTelegramMessage(
          token,
          premiumChatId,
          buildTelegramJobMessage(job, true),
          job.url
        );
        console.log(`✅ [Telegram PREMIUM] Job posted: ${job.title}`);
      } catch (e) {
        console.error("❌ [Telegram PREMIUM]", e instanceof Error ? e.message : e);
      }
      await new Promise((r) => setTimeout(r, 500)); // avoid flood
    }

    // Discord premium
    if (discordPremium) {
      try {
        await sendDiscordEmbed(discordPremium, buildDiscordJobEmbed(job, true));
        console.log(`✅ [Discord PREMIUM] Job posted: ${job.title}`);
      } catch (e) {
        console.error("❌ [Discord PREMIUM]", e instanceof Error ? e.message : e);
      }
    }
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const schedule = process.env.JOBS_SCHEDULE ?? process.env.POST_SCHEDULE;

  if (!schedule) {
    await runWeb3JobPost();
    return;
  }

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid JOBS_SCHEDULE: ${schedule}`);
  }

  console.log(`⏰ Web3 Jobs scheduler started: "${schedule}"`);
  await runWeb3JobPost();

  cron.schedule(schedule, async () => {
    try {
      await runWeb3JobPost();
    } catch (error) {
      console.error("❌ Scheduled job post failed:", error);
    }
  });
}

main().catch((error) => {
  console.error("❌ Web3 job poster failed:", error);
  process.exit(1);
});
