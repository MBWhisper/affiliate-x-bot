import cron from "node-cron";
import { Product } from "../types/product";
import { generateDealTweet } from "../services/tweetGenerator";
import { postTweet } from "../services/twitterClient";
import { postToDiscord } from "../services/discordClient";
import { postToTelegram } from "../services/telegramClient";
import { loadProducts } from "../services/productDataSource";
import {
  getProductsByNiche,
  pickRandomProduct,
  resolveNicheFromEnv
} from "../services/productCatalog";
import {
  enqueueFailedTweet,
  retryQueuedTweets
} from "../services/failedTweetQueue";

// ─── Platform flags ───────────────────────────────────────────────────────────

function isXEnabled(): boolean {
  return (
    !!process.env.X_API_KEY &&
    process.env.POST_TO_X !== "false"
  );
}

function isDiscordEnabled(): boolean {
  return !!process.env.DISCORD_WEBHOOK_URL;
}

function isTelegramEnabled(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;
}

// ─── Main post job ────────────────────────────────────────────────────────────

export async function runDailyDealPost(): Promise<void> {
  const allProducts = (await loadProducts()) as Product[];
  const selectedNiche = resolveNicheFromEnv();
  const products = getProductsByNiche(allProducts, selectedNiche);

  if (!products.length) {
    throw new Error(
      selectedNiche
        ? `No products found for niche ${selectedNiche}`
        : "No products found in src/data/products.json"
    );
  }

  const product = pickRandomProduct(products);
  const dryRun = process.env.DRY_RUN === "true";

  // ── Dry-run preview ────────────────────────────────────────────────────────
  if (dryRun) {
    console.log("🧪 DRY_RUN=true — no messages will be sent.\n");

    if (isXEnabled()) {
      const tweet = generateDealTweet(product);
      console.log("─── X / Twitter preview ───");
      console.log(tweet);
      console.log();
    }

    if (isDiscordEnabled()) {
      const { buildDiscordEmbed } = await import("../services/discordClient");
      const payload = buildDiscordEmbed(product);
      console.log("─── Discord embed preview ───");
      console.log(JSON.stringify(payload.embeds[0], null, 2));
      console.log();
    }

    if (isTelegramEnabled()) {
      const { buildTelegramMessage } = await import("../services/telegramClient");
      const msg = buildTelegramMessage(product);
      console.log("─── Telegram message preview ───");
      console.log(msg);
    }

    return;
  }

  // ── Determine active platforms ─────────────────────────────────────────────
  const xEnabled = isXEnabled();
  const discordEnabled = isDiscordEnabled();
  const telegramEnabled = isTelegramEnabled();

  if (!xEnabled && !discordEnabled && !telegramEnabled) {
    console.warn("⚠️  No platforms configured. Set at least one of:");
    console.warn("    X_API_KEY, DISCORD_WEBHOOK_URL, or TELEGRAM_BOT_TOKEN");
    return;
  }

  // ── X / Twitter ────────────────────────────────────────────────────────────
  if (xEnabled) {
    await retryQueuedTweets(postTweet);
    const tweet = generateDealTweet(product);
    try {
      await postTweet(tweet);
      console.log("✅ [X] Tweet posted:");
      console.log(tweet);
    } catch (error) {
      await enqueueFailedTweet(tweet, error);
      console.error("🗂️ [X] Tweet queued for later retry.");
    }
  }

  // ── Discord ────────────────────────────────────────────────────────────────
  if (discordEnabled) {
    try {
      await postToDiscord(product);
      console.log(`✅ [Discord] Deal posted: ${product.title}`);
    } catch (error) {
      console.error("❌ [Discord] Failed to post:", error instanceof Error ? error.message : error);
    }
  }

  // ── Telegram ───────────────────────────────────────────────────────────────
  if (telegramEnabled) {
    try {
      await postToTelegram(product);
      console.log(`✅ [Telegram] Deal posted: ${product.title}`);
    } catch (error) {
      console.error("❌ [Telegram] Failed to post:", error instanceof Error ? error.message : error);
    }
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const schedule = process.env.POST_SCHEDULE;

  if (!schedule) {
    await runDailyDealPost();
    return;
  }

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid POST_SCHEDULE cron expression: ${schedule}`);
  }

  console.log(`⏰ Scheduler started with POST_SCHEDULE="${schedule}"`);
  await runDailyDealPost();

  cron.schedule(schedule, async () => {
    try {
      await runDailyDealPost();
    } catch (error) {
      console.error("❌ Scheduled post failed:", error);
    }
  });
}

main().catch((error) => {
  console.error("❌ Failed to start daily deal job:", error);
  process.exit(1);
});
