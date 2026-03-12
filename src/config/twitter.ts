import dotenv from "dotenv";

dotenv.config();

export const twitterConfig = {
  appKey: process.env.X_API_KEY ?? "",
  appSecret: process.env.X_API_SECRET ?? "",
  accessToken: process.env.X_ACCESS_TOKEN ?? "",
  accessSecret: process.env.X_ACCESS_SECRET ?? ""
};

export function validateTwitterConfig(): void {
  const missingVars: string[] = [];

  if (!twitterConfig.appKey) missingVars.push("X_API_KEY");
  if (!twitterConfig.appSecret) missingVars.push("X_API_SECRET");
  if (!twitterConfig.accessToken) missingVars.push("X_ACCESS_TOKEN");
  if (!twitterConfig.accessSecret) missingVars.push("X_ACCESS_SECRET");

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
}
