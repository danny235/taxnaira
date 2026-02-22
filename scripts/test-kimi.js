/**
 * Kimi AI Diagnostic Tool
 * Run this to check if your API key and connection are valid.
 * Usage: node scripts/test-kimi.js
 */
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

// Manually parse .env to avoid dependency issues
const envPath = path.join(__dirname, "../.env");
let apiKey = "";

try {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/^KIMI_API_KEY=(.*)$/m);
  if (match) apiKey = match[1].trim();
} catch (e) {
  console.log("⚠️ Could not read .env file directly.");
}

if (!apiKey || apiKey.includes("YOUR_")) {
  console.log("❌ ERROR: KIMI_API_KEY is not set correctly in your .env file.");
  process.exit(1);
}

async function testKimi(baseUrl, platformName) {
  console.log(`\n🔍 testing Kimi on ${platformName} (${baseUrl})...`);
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
  });

  try {
    const response = await client.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [{ role: "user", content: "hi" }],
    });
    console.log(`✅ SUCCESS on ${platformName}! Message received.`);
    return true;
  } catch (error) {
    console.log(
      `❌ FAILED on ${platformName}: ${error.status} ${error.message}`,
    );
    if (error.status === 401) {
      console.log(
        "   👉 This means the API key is rejected. Check if it's for this platform.",
      );
    }
    return false;
  }
}

async function run() {
  console.log("🚀 Starting Kimi Diagnosis...");
  console.log(`Key starts with: ${apiKey.substring(0, 10)}...`);

  const results = [];
  results.push(
    await testKimi("https://api.moonshot.cn/v1", "China Platform (.cn)"),
  );
  results.push(
    await testKimi("https://api.moonshot.ai/v1", "Global Platform (.ai)"),
  );

  console.log("\n--- SUMMARY ---");
  if (results.some((r) => r)) {
    console.log("⭐ One or more platforms worked! Your key is valid.");
  } else {
    console.log(
      "❗ Both platforms failed with 401. Your key is likely invalid or inactive.",
    );
    console.log(
      "   Check: 1. Balance in Moonshot dashboard. 2. Key status. 3. Copy-paste errors.",
    );
  }
}

run();
