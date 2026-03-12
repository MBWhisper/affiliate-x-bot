import { verifyTwitterConnection } from "../services/twitterClient";

async function main(): Promise<void> {
  const message = await verifyTwitterConnection();
  console.log(`✅ ${message}`);
}

main().catch((error) => {
  console.error("❌ Twitter connection check failed:", error);
  process.exit(1);
});
