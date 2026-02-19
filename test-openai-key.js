const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

async function testKey() {
  try {
    const envPath = path.resolve(__dirname, ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);

    if (!match) {
      console.error("❌ Could not find OPENAI_API_KEY in .env file");
      return;
    }

    const apiKey = match[1].trim();
    console.log(`Checking key: ${apiKey.substring(0, 8)}...`);

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say hello" }],
    });

    console.log(
      "✅ Success! OpenAI responded:",
      response.choices[0].message.content,
    );
  } catch (error) {
    console.error("❌ Error testing key:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

testKey();
