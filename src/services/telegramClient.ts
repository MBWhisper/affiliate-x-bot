import { Product } from "../types/product";

// ─── Build tracked URL ────────────────────────────────────────────────────────

function buildTrackedUrl(product: Product): string {
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  if (tag && product.asin) {
    return `https://www.amazon.com/dp/${product.asin}/?tag=${tag}`;
  }

  try {
    const url = new URL(product.affiliateUrl);
    if (tag && url.hostname.includes("amazon.com")) {
      url.searchParams.set("tag", tag);
      return url.toString();
    }
    url.searchParams.set("utm_source", process.env.UTM_SOURCE ?? "telegram");
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", process.env.UTM_CAMPAIGN ?? "affiliate_daily_deals");
    url.searchParams.set("utm_content", product.id);
    return url.toString();
  } catch {
    return product.affiliateUrl;
  }
}

// ─── Niche emoji ──────────────────────────────────────────────────────────────

const NICHE_EMOJI: Record<string, string> = {
  Tech:    "⚡",
  Fitness: "💪",
  Crypto:  "🔐",
  Web3:    "🌐",
  Home:    "🏠"
};

// ─── Build Telegram HTML message ──────────────────────────────────────────────

export function buildTelegramMessage(product: Product): string {
  const trackedUrl = buildTrackedUrl(product);
  const emoji = NICHE_EMOJI[product.niche] ?? "🛒";
  const disclosure = process.env.AFFILIATE_DISCLOSURE ?? "#ad";

  const hasDiscount =
    product.originalPrice &&
    product.originalPrice > 0 &&
    product.originalPrice > product.price;

  const priceBlock = hasDiscount
    ? `💰 <s>$${product.originalPrice?.toFixed(2)}</s> → <b>$${product.price.toFixed(2)}</b> (${Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}% OFF)`
    : product.price > 0
    ? `💰 Price: <b>$${product.price.toFixed(2)}</b>`
    : `✅ <b>Free</b>`;

  const tags = product.tags
    .slice(0, 4)
    .map((t) => `#${t.replace(/\s+/g, "")}`)
    .join(" ");

  return [
    `${emoji} <b>${escapeHtml(product.title)}</b>`,
    ``,
    escapeHtml(product.description),
    ``,
    priceBlock,
    ``,
    `🔗 <a href="${trackedUrl}">View Deal</a>`,
    ``,
    `${tags} ${disclosure}`
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Send Telegram message ────────────────────────────────────────────────────

export async function postToTelegram(product: Product): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set in .env");
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not set in .env");

  const text = buildTelegramMessage(product);
  const trackedUrl = buildTrackedUrl(product);

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛒 View Deal", url: trackedUrl }]
      ]
    }
  };

  const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as { ok: boolean; description?: string };

  if (!json.ok) {
    throw new Error(`Telegram API error: ${json.description ?? "unknown"}`);
  }
}
