import 'dotenv/config';

async function run() {
  const email = "24bce233@nirmauni.ac.in";
  
  console.log("1. Sending signup request...");
  const signupRes = await fetch("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Test",
      lastName: "User",
      email: email,
      password: "password123!"
    })
  });
  
  const signupBody = await signupRes.json();
  if (!signupRes.ok) {
    if (signupRes.status === 409) {
      console.log(`Account ${email} already exists. We should delete it first for a clean test.`);
    } else {
      console.error("Signup failed:", signupBody);
      process.exit(1);
    }
  }
  
  console.log("Signup Response:", signupBody);
  
  console.log("2. Fetching OTP from Redis...");
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  const redisRes = await fetch(`${upstashUrl}/get/signup:otp:${email}`, {
    headers: { Authorization: `Bearer ${upstashToken}` }
  });
  const redisBody = await redisRes.json();
  
  if (!redisBody.result) {
    console.error("OTP not found in Redis!");
    process.exit(1);
  }
  
  let data;
  try {
    data = JSON.parse(redisBody.result);
  } catch (e) {
    data = redisBody.result; // If it's already an object
  }
  
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  const otp = parsedData.otp;
  console.log("OTP retrieved:", otp);
  
  console.log("3. Verifying OTP...");
  const verifyRes = await fetch("http://localhost:3000/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      otp: otp
    })
  });
  
  const verifyBody = await verifyRes.json();
  console.log("Verify Response:", verifyBody);
  
  if (verifyRes.ok) {
    console.log("✅ End-to-End Signup Flow Successful!");
  } else {
    console.error("❌ Verification failed.");
    process.exit(1);
  }
}

run().catch(console.error);
