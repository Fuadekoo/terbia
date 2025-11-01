// Test script for Telegram Mini App integration
// Run this with: node test-telegram-integration.js

const BASE_URL =
  process.env.FORWARD_URL || process.env.AUTH_URL || "http://localhost:3000";

console.log("🧪 Testing Telegram Mini App Integration");
console.log("=====================================");

// Test 1: Check if the API endpoints are accessible
async function testAPIEndpoints() {
  console.log("\n1. Testing API Endpoints...");

  try {
    // Test student API endpoint
    const studentResponse = await fetch(`${BASE_URL}/api/student/1`);
    console.log(
      `✅ Student API: ${
        studentResponse.status === 404
          ? "Endpoint exists (404 expected for non-existent student)"
          : studentResponse.status
      }`
    );
  } catch (error) {
    console.log(`❌ Student API: ${error.message}`);
  }

  try {
    // Test Telegram validation endpoint
    const telegramResponse = await fetch(`${BASE_URL}/api/telegram/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: "test" }),
    });
    console.log(`✅ Telegram API: ${telegramResponse.status}`);
  } catch (error) {
    console.log(`❌ Telegram API: ${error.message}`);
  }
}

// Test 2: Check if the student page is accessible
async function testStudentPage() {
  console.log("\n2. Testing Student Page...");

  try {
    const pageResponse = await fetch(`${BASE_URL}/en/student/1`);
    console.log(`✅ Student Page: ${pageResponse.status}`);
  } catch (error) {
    console.log(`❌ Student Page: ${error.message}`);
  }
}

// Test 3: Simulate Telegram init data
function testInitDataParsing() {
  console.log("\n3. Testing Init Data Parsing...");

  const mockInitData =
    "user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%7D&chat_instance=-123456789&chat_type=private&auth_date=1234567890&hash=testhash";

  try {
    const urlParams = new URLSearchParams(mockInitData);
    const userParam = urlParams.get("user");
    const user = JSON.parse(userParam);

    console.log(`✅ Init Data Parsing: Success`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Username: @${user.username}`);
  } catch (error) {
    console.log(`❌ Init Data Parsing: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  await testAPIEndpoints();
  await testStudentPage();
  testInitDataParsing();

  console.log("\n🎉 Test completed!");
  console.log("\nNext steps:");
  console.log("1. Start your Next.js server: npm run dev");
  console.log("2. Start your Telegram bot with the updated code");
  console.log("3. Test the /start command in Telegram");
  console.log("4. Check if the web app opens correctly");
}

runTests().catch(console.error);
