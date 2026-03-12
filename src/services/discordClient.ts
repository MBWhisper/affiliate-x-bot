import { Product } from "../types/product";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscordEmbed {
  title: string;
  description: string;
  url: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: { text: string };
  timestamp: string;
}

interface DiscordPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds: DiscordEmbed[];
}

// ─── Colour by niche ──────────────────────────────────────────────────────────

const NICHE_COLORS: Record<string, number> = {
  Tech:    0x5865f2, // Blurple
  Fitness: 0x57f287, // Green
  Crypto:  0xfee75c, // Gold
  Web3:    0xeb459e, // Fuchsia
  Home:    0xed4245  // Red
};

function getNicheColor(niche: string): number {
  return NICHE_COLORS[niche] ?? 0x9b59b6;
}

// ─── Emoji by niche ───────────────────────────────────────────────────────────

const NICHE_EMOJI: Record<string, string> = {
  Tech:    "⚡",
  Fitness: "💪",
  Crypto:  "🔐",
  Web3:    "🌐",
  Home:    "🏠"
};

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
    url.searchParams.set("utm_source", process.env.UTM_SOURCE ?? "discord");
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", process.env.UTM_CAMPAIGN ?? "affiliate_daily_deals");
    url.searchParams.set("utm_content", product.id);
    return url.toString();
  } catch {
    return product.affiliateUrl;
  }
}

// ─── Build embed ──────────────────────────────────────────────────────────────

export function buildDiscordEmbed(product: Product): DiscordPayload {
  const trackedUrl = buildTrackedUrl(product);
  const emoji = NICHE_EMOJI[product.niche] ?? "🛒";
  const disclosure = process.env.AFFILIATE_DISCLOSURE ?? "#ad";

  const hasDiscount =
    product.originalPrice &&
    product.originalPrice > 0 &&
    product.originalPrice > product.price;

  const priceField = hasDiscount
    ? {
        name: "💰 Price",
        value: `~~$${product.originalPrice?.toFixed(2)}~~ → **$${product.price.toFixed(2)}** (${Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}% OFF)`,
        inline: true
      }
    : {
        name: "💰 Price",
        value: product.price > 0 ? `$${product.price.toFixed(2)}` : "Free",
        inline: true
      };

  const tags = product.tags
    .slice(0, 4)
    .map((t) => `\`${t}\``)
    .join(" ");

  const embed: DiscordEmbed = {
    title: `${emoji} ${product.title}`,
    description: `${product.description}\n\n🔗 [View Deal](${trackedUrl})`,
    url: trackedUrl,
    color: getNicheColor(product.niche),
    fields: [
      priceField,
      { name: "🏷️ Tags", value: tags || product.niche, inline: true },
      { name: "📢 Disclosure", value: disclosure, inline: true }
    ],
    footer: { text: `affiliate-x-bot • ${product.niche} niche` },
    timestamp: new Date().toISOString()
  };

  return {
    username: process.env.DISCORD_BOT_NAME ?? "Deals Bot",
    embeds: [embed]
  };
}

// ─── Post to Discord ──────────────────────────────────────────────────────────

export async function postToDiscord(product: Product): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is not set in .env");
  }

  const payload = buildDiscordEmbed(product);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} — ${body}`);
  }
}
