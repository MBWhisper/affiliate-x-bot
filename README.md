# affiliate-x-bot

> **V2** — TypeScript bot that auto-posts Amazon Affiliate deals to X (Twitter).  
> Supports 5 niches: **Tech · Fitness · Crypto · Web3 · Home**

---

## Quick Start

```bash
# 1️⃣ استنساخ المستودع
git clone https://github.com/your-org/affiliate-x-bot.git
cd affiliate-x-bot

# 2️⃣ تثبيت الاعتمادات
npm ci

# 3️⃣ نسخ ملف المتغيّرات وتعبئته
cp .env.example .env
# ✏️  افتح .env وعدّل القيم (API keys, associate tag, جدول cron …)

# 4️⃣ تجربة وضع Dry-Run (معاينة)
npm run dev:dry

# 5️⃣ نشر تغريدة واحدة (تحقق من الاتصال أولاً)
npm run verify:twitter   # يجب أن تُظهر اسم حسابك
npm run dev              # تنشر إذا DRY_RUN=false

# 6️⃣ تشغيل وفق جدول cron
npm run build
npm run start:schedule   # سيستمع للجدولة المحددة في POST_SCHEDULE

# 7️⃣ (اختياري) تشغيل داخل Docker
docker compose up -d     # سيحافظ على ملف queue/failed-tweets.json
```

---

## Features

| Feature | Details |
|---|---|
| 🛒 Amazon Affiliate | Builds clean `?tag=` URLs per ASIN automatically |
| 🌐 5 Niches | Tech, Fitness, Crypto, Web3, Home |
| ⏰ Cron Scheduler | `node-cron` with configurable `POST_SCHEDULE` |
| 🔄 Retry + Backoff | Exponential backoff for X API 429/503 errors |
| 🗂️ Failed-Tweet Queue | Persists failed tweets to `queue/failed-tweets.json` |
| 🧪 Dry-Run Mode | Preview tweets without posting |
| 📊 UTM Tracking | Auto-appended for non-Amazon links |
| 📡 Remote Product Feed | Optional JSON API source via `PRODUCT_SOURCE_URL` |
| 🐳 Docker Ready | Multi-stage Dockerfile + `docker-compose.yml` |

---

## 1) Install

```bash
npm ci
```

Copy the env template:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

---

## 2) Required credentials

### X (Twitter) API
Get them from [developer.twitter.com](https://developer.twitter.com):

```env
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_SECRET=...
```

### Amazon Associates Tag ⭐
Get it from [affiliate-program.amazon.com](https://affiliate-program.amazon.com):

```env
AMAZON_ASSOCIATE_TAG=yourname-20
```

> **Required for affiliate earnings.** When set, every Amazon product URL is built as:  
> `https://www.amazon.com/dp/{ASIN}/?tag=yourname-20`  
> Without it, UTM parameters are appended instead (no affiliate commission).

---

## 3) Run modes

| Command | Description |
|---|---|
| `npm run dev:dry` | Preview tweet text — **no posting** |
| `npm run dev` | Post one tweet immediately |
| `npm run verify:twitter` | Test X API connection |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start:schedule` | Run compiled bot with cron scheduler |

---

## 4) Scheduling

Set `POST_SCHEDULE` in `.env` using cron syntax:

```env
# Daily at 10:00 AM
POST_SCHEDULE=0 10 * * *

# Every 6 hours
POST_SCHEDULE=0 */6 * * *

# Twice a day — 9 AM and 5 PM
POST_SCHEDULE=0 9,17 * * *
```

Then build and start:

```bash
npm run build
npm run start:schedule
```

> `build` automatically copies `src/data/products.json` → `dist/data/`

---

## 5) Docker

A two-stage `Dockerfile` is included (builds TypeScript, runs only production deps).  
The `queue/` folder is mounted as a volume so failed tweets persist across restarts.

```bash
# Build image & start in background
docker compose up -d

# View live logs
docker compose logs -f

# Stop
docker compose down
```

> Make sure `.env` is filled before running Docker — it is mounted via `env_file`.

---

## 6) Niche selector

Leave blank to post from all niches, or restrict to one:

```env
# Allowed: Tech | Fitness | Crypto | Web3 | Home
PRODUCT_NICHE=Tech
```

### Product catalog (17 products)

| Niche | Count | Examples |
|---|---|---|
| Tech | 5 | Echo Dot, Fire TV Stick 4K, Kindle Paperwhite, Anker 65W Charger, WiFi 6 Router |
| Fitness | 4 | Fitbit Charge 6, Bowflex Dumbbells, Whoop 4.0, TRX Trainer |
| Crypto | 3 | Ledger Nano X, Trezor Model T, Antminer S19 XP |
| Web3 | 3 | Mastering Ethereum, The Bitcoin Standard, Solidity eBook |
| Home | 2 | Govee LED Strips, Instant Pot Duo |

---

## 7) Adding products

Edit `src/data/products.json`. Each product needs:

```jsonc
{
  "id": "amz-tech-001",
  "niche": "Tech",              // Tech | Fitness | Crypto | Web3 | Home
  "title": "Product Name",
  "description": "Short pitch under 120 chars.",
  "price": 29.99,
  "originalPrice": 49.99,       // Optional — shows % discount if higher than price
  "currency": "USD",
  "asin": "B09B8RF4PY",         // Amazon ASIN — used for ?tag= URL building
  "affiliateUrl": "https://www.amazon.com/dp/B09B8RF4PY/",
  "tags": ["Tech", "SmartHome", "Alexa"],
  "source": {
    "provider": "Amazon",
    "feedType": "amazon",
    "externalId": "B09B8RF4PY"
  }
}
```

---

## 8) Retry on X errors

Configured via `.env`:

```env
POST_MAX_RETRIES=5
POST_RETRY_BASE_DELAY_MS=1500
POST_RETRY_MAX_DELAY_MS=30000
POST_RETRY_JITTER_MS=500
```

Retries on: `429 Too Many Requests`, `500`, `502`, `503`, `504`.  
Falls back to v1 API automatically if v2 enrollment is missing.

---

## 9) Failed tweet queue

If all retries fail, the tweet is saved to:

```
queue/failed-tweets.json
```

On the next run, queued tweets are retried **before** posting a new deal.

---

## 10) Project structure

```
affiliate-x-bot/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── src/
    ├── config/
    │   └── twitter.ts          ← API credentials + validation
    ├── data/
    │   └── products.json       ← 17 Amazon + Web3 products
    ├── jobs/
    │   ├── postDailyDeals.ts   ← Main entry point (one-shot + scheduler)
    │   └── verifyConnection.ts ← Connection test
    ├── services/
    │   ├── failedTweetQueue.ts ← Persist & retry failed tweets
    │   ├── productCatalog.ts   ← Niche filtering + random selection
    │   ├── productDataSource.ts← Local JSON or remote API loader
    │   ├── tweetGenerator.ts   ← Tweet copy builder (Amazon URL aware)
    │   └── twitterClient.ts    ← Retry-aware X API client (v2 + v1 fallback)
    └── types/
        └── product.ts          ← Product & niche TypeScript types
```

---

## 11) Environment variable reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `X_API_KEY` | ✅ | — | X API key |
| `X_API_SECRET` | ✅ | — | X API secret |
| `X_ACCESS_TOKEN` | ✅ | — | X access token |
| `X_ACCESS_SECRET` | ✅ | — | X access token secret |
| `AMAZON_ASSOCIATE_TAG` | ⭐ | — | Amazon affiliate tag (`yourname-20`) |
| `DRY_RUN` | — | `false` | Preview without posting |
| `AFFILIATE_DISCLOSURE` | — | `#ad` | FTC/Amazon required disclosure |
| `POST_SCHEDULE` | — | — | Cron expression for scheduling |
| `PRODUCT_NICHE` | — | all | `Tech\|Fitness\|Crypto\|Web3\|Home` |
| `POST_MAX_RETRIES` | — | `5` | Max retry attempts |
| `POST_RETRY_BASE_DELAY_MS` | — | `1500` | Base delay for backoff |
| `POST_RETRY_MAX_DELAY_MS` | — | `30000` | Max delay cap |
| `POST_RETRY_JITTER_MS` | — | `500` | Jitter added to delay |
| `QUEUE_FILE_PATH` | — | `./queue/failed-tweets.json` | Failed tweet queue path |
| `UTM_SOURCE` | — | `x` | UTM source (non-Amazon links) |
| `UTM_MEDIUM` | — | `social` | UTM medium |
| `UTM_CAMPAIGN` | — | `affiliate_daily_deals` | UTM campaign |
| `UTM_CONTENT_PREFIX` | — | `deal` | UTM content prefix |
| `PRODUCT_SOURCE_URL` | — | — | Remote JSON product API URL |
| `PRODUCT_SOURCE_API_KEY` | — | — | Bearer token for remote API |
