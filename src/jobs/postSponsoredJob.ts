/**
 * Sponsored Job Post Runner
 * ─────────────────────────────────────────────────────────────────
 * Reads active sponsors from sponsors.json and posts them FIRST
 * in every alert batch with a "🔥 SPONSORED" badge.
 *
 * Run standalone:  npm run sponsor:post
 * Dry preview:     npm run sponsor:dry
 *
 * ══════════════════════════════════════════════════════════════════
 * 💡 THE IDEA — "Earn from nothing"
 * ══════════════════════════════════════════════════════════════════
 * You already have an audience (Telegram + Discord).
 * Web3 companies NEED to reach developers.
 * You are the bridge — and you charge for it.
 *
 * OUTREACH TEMPLATE (copy-paste):
 * ────────────────────────────────
 * Subject: Feature your job to 500+ Web3 devs for $19.99/week
 *
 * Hi [Company],
 *
 * I run a Web3 job alert newsletter with daily posts to Telegram
 * and Discord. Sponsored slots are pinned at the TOP of every alert
 * with a 🔥 SPONSORED badge and direct apply link.
 *
 * Packages:
 *   Basic   $19.99/wk — Telegram or Discord
 *   Standard $34.99/wk — both platforms
 *   Premium $59.99/wk — both + X (Twitter) shoutout
 *
 * Pay via: https://www.paypal.me/[your-handle]
 *          Crypto: [your wallet]
 *
 * Reply to book your slot.
 *
 * ══════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { getActiveSponsors, getSponsorStats, Sponsor } from "../services/sponsorManager";

// ─── Telegram helpers ─────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildTelegramSponsorMessage(s: Sponsor): string {
  const tags = s.tags
    .slice(0, 4)
    .map((t) => `#${t.replace(/\s+/g, "")}`)
    .join(" ");

  const salary = s.salary ? `\n💵 <b>${escapeHtml(s.salary)}</b>` : "";
  const desc = s.description ? `\n📋 <i>${escapeHtml(s.description)}</i>` : "";

  return [
    `🔥 <b>SPONSORED</b> · Paid placement`,
    ``,
    `💼 <b>${escapeHtml(s.jobTitle)}</b>`,
    `🏢 ${escapeHtml(s.company)}`,
    `📍 ${escapeHtml(s.location)}`,
    salary,
    desc,
    ``,
    tags,
    ``,
    `🔗 <a href="${s.applyUrl}">Apply Now → Direct Link</a>`,
    ``,
    `<i>Want to sponsor this channel? DM @WhHisBot</i>`
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .trim();
}

async function sendTelegramSponsor(
  token: string,
  chatId: string,
  sponsor: Sponsor,
  dryRun: boolean
): Promise<void> {
  const text = buildTelegramSponsorMessage(sponsor);

  if (dryRun) {
    console.log(`\n══ [DRY RUN] Telegram → ${chatId} ══\n${text}\n`);
    return;
  }

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Apply Now — Sponsored", url: sponsor.applyUrl }]]
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

// ─── Discord helpers ──────────────────────────────────────────────────────────

function buildDiscordSponsorEmbed(s: Sponsor) {
  const fields = [
    { name: "🏢 Company", value: s.company, inline: true },
    { name: "📍 Location", value: s.location, inline: true }
  ];

  if (s.salary) {
    fields.push({ name: "💵 Salary", value: s.salary, inline: true });
  }

  const tags = s.tags
    .slice(0, 4)
    .map((t) => `\`${t}\``)
    .join(" ");
  if (tags) fields.push({ name: "🏷️ Skills", value: tags, inline: false });

  if (s.description) {
    fields.push({ name: "📋 About the role", value: s.description, inline: false });
  }

  return {
    username: process.env.DISCORD_BOT_NAME ?? "Web3 Jobs Bot",
    embeds: [
      {
        title: `🔥 SPONSORED · ${s.jobTitle}`,
        description: `[Apply Now — Direct Link ↗](${s.applyUrl})\n\n*Want to sponsor this channel? DM @WhHisBot*`,
        url: s.applyUrl,
        color: 0xffa500, // orange = "sponsored" / premium
        fields,
        thumbnail: s.logoUrl ? { url: s.logoUrl } : undefined,
        footer: {
          text: `📢 Paid Placement · ${s.company} · Want to sponsor? DM @WhHisBot`
        },
        timestamp: new Date().toISOString()
      }
    ]
  };
}

async function sendDiscordSponsor(
  webhookUrl: string,
  sponsor: Sponsor,
  dryRun: boolean
): Promise<void> {
  const embed = buildDiscordSponsorEmbed(sponsor);

  if (dryRun) {
    console.log(`\n══ [DRY RUN] Discord Embed ══`);
    console.log(JSON.stringify(embed, null, 2));
    return;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(embed)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord error: ${res.status} — ${body}`);
  }
}

// ─── Main runner ──────────────────────────────────────────────────────────────

export async function runSponsoredPosts(): Promise<void> {
  const dryRun = process.env.DRY_RUN === "true";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  const sponsors = getActiveSponsors();

  if (sponsors.length === 0) {
    console.log("ℹ️  No active sponsors today. Slot is open for booking!");
    console.log("📬 Outreach tip: Post in #jobs-and-careers on major Web3 Discord servers");
    console.log("    Message: 'Reach 500+ Web3 devs for $19.99/week — DM me for details'");
    return;
  }

  console.log(`📢 Found ${sponsors.length} active sponsor(s). Posting now...\n`);

  for (const sponsor of sponsors) {
    console.log(`🔥 Sponsor: ${sponsor.company} | "${sponsor.jobTitle}" | $${sponsor.paidAmount} ${sponsor.package}`);

    // Telegram
    if (token && chatId) {
      try {
        await sendTelegramSponsor(token, chatId, sponsor, dryRun);
        if (!dryRun) console.log(`  ✅ [Telegram] Sponsored post sent`);
      } catch (e) {
        console.error(`  ❌ [Telegram]`, e instanceof Error ? e.message : e);
      }
    }

    // Discord
    if (discordWebhook) {
      try {
        await sendDiscordSponsor(discordWebhook, sponsor, dryRun);
        if (!dryRun) console.log(`  ✅ [Discord] Sponsored embed sent`);
      } catch (e) {
        console.error(`  ❌ [Discord]`, e instanceof Error ? e.message : e);
      }
    }

    // Rate limit delay between sponsors
    if (sponsors.indexOf(sponsor) < sponsors.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // Print revenue stats
  const stats = getSponsorStats();
  console.log(`\n💰 Sponsor Revenue Snapshot:`);
  console.log(`   Total sponsors ever: ${stats.total}`);
  console.log(`   Active today:        ${stats.active}`);
  console.log(`   Total earned:        $${stats.revenue.toFixed(2)} ${stats.currency}`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════");
  console.log("  💼 Sponsored Job Post Runner");
  console.log(`  🕐 ${new Date().toLocaleString()}`);
  console.log("═══════════════════════════════════════════════\n");

  await runSponsoredPosts();
}

main().catch((err) => {
  console.error("❌ Sponsored post runner failed:", err);
  process.exit(1);
});
