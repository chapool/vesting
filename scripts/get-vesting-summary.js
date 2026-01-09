const fs = require("fs");
const path = require("path");
require("dotenv").config();
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.opBNB") });
} catch (e) {}

// ================= Hardcoded Config =================
const DEFAULT_NETWORK = "opbnb";
const DEFAULT_RPC_URL = "https://opbnb-mainnet.nodereal.io/v1/7f19eee8ad604b06864a35ec46580f9c";
const DEFAULT_VESTING_ADDRESS = "0x084e367B171101432c1F862f28A1792e5bA374b8"; // Vesting proxy on opBNB
const DEFAULT_BENEFICIARY = "0xc5cCc3c5e4bbb9519Deaf7a8afA29522DA49E33D";
const DEFAULT_SELECTOR = "0xca715fac"; // selector of getBeneficiaryVestingSummary(address)
// ====================================================

/**
 * Pure JS (no ethers/web3) query of getBeneficiaryVestingSummary(address)
 *
 * Usage:
 *   node scripts/get-vesting-summary.js
 * Notes:
 *   - RPC URL and Vesting address are hardcoded above (opBNB mainnet)
 *   - Selector is keccak256("getBeneficiaryVestingSummary(address)") first 4 bytes
 */
async function main() {
  const beneficiary = DEFAULT_BENEFICIARY;
  const selector = DEFAULT_SELECTOR;
  const network = DEFAULT_NETWORK;
  const rpcUrl = DEFAULT_RPC_URL;
  const vestingAddress = DEFAULT_VESTING_ADDRESS;

  // Require selector unless user provided it; we avoid bundling keccak here to stay dependency-free.
  if (!/^0x[0-9a-fA-F]{8}$/.test(selector)) {
    console.error("Invalid selector format. Expect 0x + 8 hex chars.");
    process.exit(1);
  }

  console.log("🔎 Query getBeneficiaryVestingSummary(address)");
  console.log("🌐 Network:", network);
  console.log("🧩 Vesting:", vestingAddress);
  console.log("👤 Beneficiary:", beneficiary);
  console.log("🆔 Selector:", selector);
  console.log("🔗 RPC:", rpcUrl);

  const data = buildCallData(selector, beneficiary);
  console.log("📦 Call data:", data);

  const raw = await ethCall(rpcUrl, vestingAddress, data);
  console.log("📨 Raw result:", raw);

  if (!raw || raw === "0x") {
    printSummary(createEmptySummary());
    return;
  }

  const summary = decodeBeneficiarySummary(raw);
  printSummary(summary);
}

function buildCallData(selector, address) {
  const clean = address.toLowerCase().replace(/^0x/, "");
  const encoded = clean.padStart(64, "0");
  return selector + encoded;
}

async function ethCall(rpcUrl, to, data) {
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "eth_call",
    params: [{ to, data }, "latest"],
  };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}

function decodeBeneficiarySummary(hexData) {
  const data = hexData.startsWith("0x") ? hexData.slice(2) : hexData;
  const need = 5 * 64;
  if (data.length < need) {
    throw new Error(`Invalid data length: ${data.length}, expected at least ${need}`);
  }
  return {
    totalAmount: parseUint256(data.slice(0, 64)),
    releasedAmount: parseUint256(data.slice(64, 128)),
    releasableAmount: parseUint256(data.slice(128, 192)),
    lockedAmount: parseUint256(data.slice(192, 256)),
    scheduleCount: parseUint256(data.slice(256, 320)),
  };
}

function parseUint256(hex) {
  return BigInt("0x" + hex);
}

function createEmptySummary() {
  return {
    totalAmount: 0n,
    releasedAmount: 0n,
    releasableAmount: 0n,
    lockedAmount: 0n,
    scheduleCount: 0n,
  };
}

function formatSummary(summary, decimals = 18) {
  const formatBigInt = (value) => {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    if (fractionalPart === 0n) return integerPart.toString();
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${integerPart}.${fractionalStr}`;
  };
  return {
    totalAmount: formatBigInt(summary.totalAmount),
    releasedAmount: formatBigInt(summary.releasedAmount),
    releasableAmount: formatBigInt(summary.releasableAmount),
    lockedAmount: formatBigInt(summary.lockedAmount),
    scheduleCount: summary.scheduleCount.toString(),
    releasedPercentage:
      summary.totalAmount > 0n
        ? ((Number(summary.releasedAmount) / Number(summary.totalAmount)) * 100).toFixed(2)
        : "0.00",
    releasablePercentage:
      summary.totalAmount > 0n
        ? ((Number(summary.releasableAmount) / Number(summary.totalAmount)) * 100).toFixed(2)
        : "0.00",
    lockedPercentage:
      summary.totalAmount > 0n
        ? ((Number(summary.lockedAmount) / Number(summary.totalAmount)) * 100).toFixed(2)
        : "0.00",
  };
}

function printSummary(summary, decimals = 18) {
  const formatted = formatSummary(summary, decimals);
  console.log("\n=== Raw Summary (BigInt) ===");
  console.log({
    totalAmount: summary.totalAmount.toString(),
    releasedAmount: summary.releasedAmount.toString(),
    releasableAmount: summary.releasableAmount.toString(),
    lockedAmount: summary.lockedAmount.toString(),
    scheduleCount: summary.scheduleCount.toString(),
  });

  console.log("\n=== Formatted Summary ===");
  console.log({
    totalAmount: formatted.totalAmount,
    releasedAmount: formatted.releasedAmount,
    releasableAmount: formatted.releasableAmount,
    lockedAmount: formatted.lockedAmount,
    scheduleCount: formatted.scheduleCount,
    releasedPercentage: formatted.releasedPercentage + "%",
    releasablePercentage: formatted.releasablePercentage + "%",
    lockedPercentage: formatted.lockedPercentage + "%",
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = main;


