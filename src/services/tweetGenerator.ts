import { Product } from "../types/product";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(price);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ─── Amazon affiliate URL builder ────────────────────────────────────────────

/**
 * Builds a proper Amazon affiliate URL.
 * If the product has an ASIN and an associate tag is set, returns:
 *   https://www.amazon.com/dp/{ASIN}/?tag={ASSOCIATE_TAG}
 * Otherwise falls back to UTM-decorated base URL.
 */
function buildAmazonUrl(product: Product): string | null {
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  if (!tag) return null;

  // Use ASIN if available
  if (product.asin) {
    return `https://www.amazon.com/dp/${product.asin}/?tag=${tag}`;
  }

  // Try to inject tag into an existing amazon.com URL
  try {
    const url = new URL(product.affiliateUrl);
    if (url.hostname.includes("amazon.com")) {
      url.searchParams.set("tag", tag);
      return url.toString();
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

// ─── UTM tracking URL builder ─────────────────────────────────────────────────

function buildTrackedUrl(baseUrl: string, product: Product): string {
  // For Amazon products, prefer the clean affiliate URL with associate tag
  const amazonUrl = buildAmazonUrl(product);
  if (amazonUrl) return amazonUrl;

  // For non-Amazon products, apply UTM parameters
  const source = process.env.UTM_SOURCE ?? "x";
  const medium = process.env.UTM_MEDIUM ?? "social";
  const campaign = process.env.UTM_CAMPAIGN ?? "affiliate_daily_deals";
  const contentPrefix = process.env.UTM_CONTENT_PREFIX ?? "deal";

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign);
    url.searchParams.set("utm_content", `${contentPrefix}_${product.id}`);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// ─── Discount copy ────────────────────────────────────────────────────────────

function buildDiscountText(product: Product): string {
  if (
    product.originalPrice &&
    product.originalPrice > 0 &&
    product.originalPrice > product.price
  ) {
    const savings = product.originalPrice - product.price;
    const pct = Math.round((savings / product.originalPrice) * 100);
    return `🔥 Was ${formatPrice(product.originalPrice, product.currency)} → Now ${formatPrice(product.price, product.currency)} (${pct}% OFF)`;
  }

  return `💰 Price: ${formatPrice(product.price, product.currency)}`;
}

// ─── Niche-aware hooks ────────────────────────────────────────────────────────

function getHooks(niche: string): string[] {
  const byNiche: Record<string, string[]> = {
    Tech:    ["⚡ Tech Deal Alert", "🔌 Gadget of the Day", "💻 Top Tech Pick", "🚨 Limited Tech Offer"],
    Fitness: ["🏋️ Fitness Deal", "💪 Level Up Your Workout", "🔥 Fitness Pick of the Day", "🏃 Active Life Deal"],
    Crypto:  ["🔐 Crypto Security Deal", "₿ Bitcoin Enthusiast Pick", "🛡️ Protect Your Assets", "📈 Crypto Gear Alert"],
    Web3:    ["🌐 Web3 Must-Have", "⛓️ Blockchain Bookshelf", "🚀 Level Up Your Web3 Skills", "🔗 DeFi & Web3 Pick"],
    Home:    ["🏠 Home Deal Alert", "✨ Make Your Space Smarter", "💡 Home Pick of the Day", "🛋️ Upgrade Your Home"]
  };
  return byNiche[niche] ?? ["🚨 Deal Alert", "⚡ Limited-time offer", "🛒 Today's top pick", "💸 Great value item"];
}

function getCtas(): string[] {
  return [
    "👉 Grab it on Amazon",
    "✅ Check full details",
    "🧾 See the offer",
    "🔥 Shop before it ends",
    "📦 Order on Amazon"
  ];
}

// ─── Main tweet builder ───────────────────────────────────────────────────────

export function generateDealTweet(product: Product): string {
  const discountText = buildDiscountText(product);
  const trackedUrl = buildTrackedUrl(product.affiliateUrl, product);
  const hook = pickRandom(getHooks(product.niche));
  const cta = pickRandom(getCtas());

  const templates: Array<() => string> = [
    () => `${hook}\n${product.title}\n${product.description}\n${discountText}\n${cta}: ${trackedUrl}`,
    () => `✨ ${product.title}\n${discountText}\n${product.description}\n${cta}: ${trackedUrl}`,
    () => `Deal of the moment 👀\n${product.title}\n${discountText}\n${cta}: ${trackedUrl}`,
    () => `If you need ${product.tags[0] ?? "great"} picks, this one is worth it 👇\n${product.title}\n${discountText}\n${trackedUrl}`
  ];

  const tags = product.tags
    .slice(0, 3)
    .map((tag) => `#${tag.replace(/\s+/g, "")}`);

  const disclosure = process.env.AFFILIATE_DISCLOSURE ?? "#ad";
  const body = pickRandom(templates)();
  const footer = `${tags.join(" ")} ${disclosure}`.trim();
  const tweet = `${body}\n${footer}`;

  return tweet.length <= 280 ? tweet : `${tweet.slice(0, 277)}...`;
}
