const BASE_URL = "http://localhost:3000";

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return data.data?.token;
}

async function askAi(message, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, history: [] })
  });
  const data = await res.json();
  return data.data;
}

async function runLiveAppDataAccessTests() {
  console.log("==================================================");
  console.log("🧪 TESTING LIVE APP DATA ACCESS IN AI ASSISTANT");
  console.log("==================================================\n");

  // 1. Customer Login (Budi Santoso)
  console.log("1. Logging in as Customer (budi.santoso@gmail.com)...");
  const customerToken = await loginUser("budi.santoso@gmail.com", "password123");
  console.log("Customer Token acquired:", !!customerToken);

  // Test 1: AI knows customer profile & address
  console.log("\n--- TEST 1: Customer Profile & Saved Address ---");
  const profileQuery = "Halo, siapa nama saya dan di mana alamat pengiriman saya?";
  console.log(`Customer: "${profileQuery}"`);
  const profileRes = await askAi(profileQuery, customerToken);
  console.log(`[Model: ${profileRes?.model}]\nAI: ${profileRes?.reply}\n`);

  // Test 2: AI knows user active cart
  console.log("--- TEST 2: Active Cart Inspection ---");
  const cartQuery = "Ada apa saja di keranjang belanja saya dan berapa totalnya?";
  console.log(`Customer: "${cartQuery}"`);
  const cartRes = await askAi(cartQuery, customerToken);
  console.log(`[Model: ${cartRes?.model}]\nAI: ${cartRes?.reply}\n`);

  // Test 3: AI knows user order tracking & status
  console.log("--- TEST 3: Order History & Tracking ---");
  const orderQuery = "Tolong cek status pesanan terakhir saya";
  console.log(`Customer: "${orderQuery}"`);
  const orderRes = await askAi(orderQuery, customerToken);
  console.log(`[Model: ${orderRes?.model}]\nAI: ${orderRes?.reply}\n`);

  // Test 4: Live Medicine Catalog stock & prescription requirements
  console.log("--- TEST 4: Live Medicine Catalog Stock & Pricing ---");
  const medQuery = "Berapa stok dan harga Amoxicillin 500mg saat ini, dan apakah saya butuh resep dokter?";
  console.log(`Customer: "${medQuery}"`);
  const medRes = await askAi(medQuery, customerToken);
  console.log(`[Model: ${medRes?.model}]\nAI: ${medRes?.reply}\n`);

  // Test 5: Staff Operational Insights
  console.log("--- TEST 5: Staff Operational Insights ---");
  const staffToken = await loginUser("staff.apoteker@apoteksehat-ai.com", "password123");
  const staffQuery = "Halo, ada berapa pesanan yang menunggu verifikasi resep dokter dan obat apa yang stoknya menipis?";
  console.log(`Staff: "${staffQuery}"`);
  const staffRes = await askAi(staffQuery, staffToken);
  console.log(`[Model: ${staffRes?.model}]\nAI: ${staffRes?.reply}\n`);
}

runLiveAppDataAccessTests();
