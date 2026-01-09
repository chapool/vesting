const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load env (opBNB defaults)
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.opBNB") });
} catch (e) {}

// ---------------- Config ----------------
// Start: 2026-04-01 00:00:00 UTC
const START_TIMESTAMP = Math.floor(Date.UTC(2026, 3, 1) / 1000);
// Linear over 3 years (365d * 3)
const DURATION = 3 * 365 * 24 * 60 * 60;
// Daily slice for smooth linear release
const SLICE_PERIOD = 24 * 60 * 60;
const CLIFF = 0;
// Investor plans set revocable = true as requested
const REVOCABLE = true;

const AllocationCategory = {
  MINING: 0,
  ECOSYSTEM: 1,
  TEAM: 2,
  CORNERSTONE: 3,
};

const VestingType = {
  LINEAR: 0,
  MILESTONE: 1,
  CLIFF_LINEAR: 2,
};
// Beneficiaries and amounts (CPOT units, 18 decimals)
// All entries are CORNERSTONE as requested
const allocations = [
  { beneficiary: "0xb1Bbdc659a8265D22F7fD478BD4CF41a9Dff3e9e", amount: "4750000", category: AllocationCategory.CORNERSTONE },
];
// ----------------------------------------

async function main() {
  console.log("🔧 Batch create 3-year linear vesting schedules (start 2026-04)");
  console.log("🌐 Network:", network.name);
  console.log("⏱️ Start:", START_TIMESTAMP, new Date(START_TIMESTAMP * 1000).toISOString());
  console.log("⏳ Duration (seconds):", DURATION);
  console.log("🔁 Slice (seconds):", SLICE_PERIOD);
  console.log("⚙️ Revocable:", REVOCABLE);

  const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}-cpo.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`Deployment file not found: ${deploymentsPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const vestingAddress = deployment?.vesting?.proxy;
  if (!vestingAddress) {
    throw new Error("Vesting proxy address missing in deployment file.");
  }

  const [signer] = await ethers.getSigners();
  console.log("👤 Using signer:", signer.address);
  const vesting = await ethers.getContractAt("Vesting", vestingAddress, signer);

  const results = [];

  for (const entry of allocations) {
    const amountWei = ethers.parseUnits(entry.amount, 18);
    const countBefore = await vesting.getVestingSchedulesCountByBeneficiary(entry.beneficiary);
    const expectedId = await vesting.computeVestingScheduleIdForAddressAndIndex(entry.beneficiary, countBefore);

    console.log(`\n📨 Creating schedule for ${entry.beneficiary}`);
    console.log("   Amount:", entry.amount, "CPOT");
    console.log("   Category:", entry.category === AllocationCategory.CORNERSTONE ? "CORNERSTONE" : "CORNERSTONE");

    const tx = await vesting.createVestingSchedule(
      entry.beneficiary,
      START_TIMESTAMP,
      CLIFF,
      DURATION,
      SLICE_PERIOD,
      REVOCABLE,
      amountWei,
      entry.category,
      VestingType.LINEAR
    );
    const receipt = await tx.wait();
    console.log("✅ Created. Tx:", receipt.hash);

    results.push({
      beneficiary: entry.beneficiary,
      amount: entry.amount,
      category: entry.category,
      scheduleId: expectedId,
      txHash: receipt.hash,
    });
  }

  const outFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-cpo-vesting-apr2026-3y.json`
  );
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        network: network.name,
        start: START_TIMESTAMP,
        duration: DURATION,
        slicePeriodSeconds: SLICE_PERIOD,
        cliff: CLIFF,
        revocable: REVOCABLE,
        allocations: results,
        vesting: vestingAddress,
      },
      null,
      2
    )
  );
  console.log("\n💾 Saved batch receipt to:", outFile);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = main;

