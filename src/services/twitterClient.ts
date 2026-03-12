import { TwitterApi } from "twitter-api-v2";
import { twitterConfig, validateTwitterConfig } from "../config/twitter";

validateTwitterConfig();

const client = new TwitterApi({
  appKey: twitterConfig.appKey,
  appSecret: twitterConfig.appSecret,
  accessToken: twitterConfig.accessToken,
  accessSecret: twitterConfig.accessSecret
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ApiLikeError = {
  code?: number;
  headers?: Record<string, string | string[] | undefined>;
  data?: {
    reason?: string;
  };
};

function getErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "number") return code;
  }

  return undefined;
}

function getRetryAfterMs(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const headers = (error as ApiLikeError).headers;
  if (!headers) return undefined;

  const value = headers["retry-after"];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  return seconds * 1000;
}

function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504;
}

function isServerSideError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 500 || code === 502 || code === 503 || code === 504;
}

function getErrorReason(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as ApiLikeError).data?.reason;
}

function isV2EnrollmentError(error: unknown): boolean {
  return getErrorCode(error) === 403 && getErrorReason(error) === "client-not-enrolled";
}

async function postTweetV2(status: string): Promise<void> {
  await client.v2.tweet(status);
}

async function postTweetV1(status: string): Promise<void> {
  await client.v1.tweet(status);
}

export async function verifyTwitterConnection(): Promise<string> {
  try {
    const me = await client.v2.me();
    const username = me.data?.username ?? "unknown";
    const id = me.data?.id ?? "unknown";
    return `Connected via v2 as @${username} (id: ${id})`;
  } catch (error) {
    if (!isServerSideError(error) && !isV2EnrollmentError(error)) {
      throw error;
    }

    const meV1 = await client.v1.verifyCredentials();
    const username = meV1.screen_name ?? "unknown";
    const id = meV1.id_str ?? String(meV1.id ?? "unknown");
    return `Connected via v1 fallback as @${username} (id: ${id})`;
  }
}

export async function postTweet(status: string): Promise<void> {
  // If PREFER_V1=true is set (or auto-detected via env), skip v2 entirely
  const preferV1 = process.env.PREFER_V1 === "true";

  if (preferV1) {
    console.log("ℹ️  PREFER_V1=true — posting directly via v1...");
    await postTweetV1(status);
    console.log("✅ Tweet posted through v1.");
    return;
  }

  const maxAttempts = Number(process.env.POST_MAX_RETRIES ?? "5");
  const baseDelayMs = Number(process.env.POST_RETRY_BASE_DELAY_MS ?? "1500");
  const maxDelayMs = Number(process.env.POST_RETRY_MAX_DELAY_MS ?? "30000");
  const jitterMs = Number(process.env.POST_RETRY_JITTER_MS ?? "500");

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await postTweetV2(status);
      return;
    } catch (error) {
      lastError = error;

      // Immediately fall back to v1 for enrollment/access issues
      if (isV2EnrollmentError(error)) {
        console.warn("⚠️ v2 access not enrolled. Switching to v1 fallback...");
        await postTweetV1(status);
        console.log("✅ Tweet posted through v1 fallback.");
        return;
      }

      // On first 503 from v2, switch to v1 immediately (Free-tier v2 restriction)
      if (isServerSideError(error) && attempt === 1) {
        console.warn("⚠️ v2 returned 5xx on first attempt. Trying v1 fallback immediately...");
        try {
          await postTweetV1(status);
          console.log("✅ Tweet posted through v1 fallback.");
          return;
        } catch (v1Error) {
          // v1 also failed — continue retrying v2
          console.warn("⚠️ v1 fallback also failed, retrying v2...");
          lastError = v1Error;
        }
      }

      const retryable = isRetryableError(error);
      const hasNextAttempt = attempt < maxAttempts;

      if (!retryable || !hasNextAttempt) {
        throw error;
      }

      const exponentialDelay = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt - 1)
      );
      const retryAfterDelay = getRetryAfterMs(error);
      const randomJitter = Math.floor(Math.random() * Math.max(0, jitterMs));
      const delay = Math.max(exponentialDelay, retryAfterDelay ?? 0) + randomJitter;

      const code = getErrorCode(error);
      console.warn(
        `⚠️ Tweet post failed with ${code ?? "unknown"} (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  if (lastError && isServerSideError(lastError)) {
    console.warn("⚠️ v2 exhausted. Final v1 fallback attempt...");
    await postTweetV1(status);
    console.log("✅ Tweet posted through v1 fallback.");
    return;
  }

  throw lastError;
}
