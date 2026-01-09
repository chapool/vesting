const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load env (opBNB defaults)
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.opBNB") });
} catch (e) {}

// ---------------- Config ----------------
// Beneficiary address whose schedules to revoke
const BENEFICIARY_ADDRESS = "0xECBDf0F2a059392c8AB71d1659B2370Cb2eb6c7B";
// ----------------------------------------

async function main() {
  console.log("🔧 Revoke all vesting schedules for beneficiary");
  console.log("🌐 Network:", network.name);
  console.log("👤 Beneficiary:", BENEFICIARY_ADDRESS);

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

  // Get all vesting schedules for the beneficiary
  console.log("\n📋 Fetching vesting schedules...");
  const schedules = await vesting.getBeneficiaryVestingSchedules(BENEFICIARY_ADDRESS);
  console.log(`Found ${schedules.length} vesting schedule(s)`);

  if (schedules.length === 0) {
    console.log("✅ No schedules found for this beneficiary.");
    return;
  }

  const results = [];
  let revokedCount = 0;
  let skippedCount = 0;

  // Get schedule count to calculate IDs
  const scheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(BENEFICIARY_ADDRESS);
  console.log(`Total schedule count: ${scheduleCount}`);

  // Process each schedule
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(BENEFICIARY_ADDRESS, i);

    console.log(`\n📋 Schedule ${i}:`);
    console.log("   ID:", scheduleId);
    console.log("   Amount:", ethers.formatEther(schedule.amountTotal), "CPOT");
    console.log("   Released:", ethers.formatEther(schedule.released), "CPOT");
    console.log("   Revocable:", schedule.revocable);
    console.log("   Already Revoked:", schedule.revoked);

    // Skip if already revoked
    if (schedule.revoked) {
      console.log("   ⏭️  Already revoked, skipping...");
      skippedCount++;
      results.push({
        index: i,
        scheduleId: scheduleId,
        status: "already_revoked",
        amountTotal: ethers.formatEther(schedule.amountTotal),
        released: ethers.formatEther(schedule.released),
      });
      continue;
    }

    // Skip if not revocable
    if (!schedule.revocable) {
      console.log("   ⏭️  Not revocable, skipping...");
      skippedCount++;
      results.push({
        index: i,
        scheduleId: scheduleId,
        status: "not_revocable",
        amountTotal: ethers.formatEther(schedule.amountTotal),
        released: ethers.formatEther(schedule.released),
      });
      continue;
    }

    // Get releasable amount before revocation
    let releasableAmount = ethers.formatEther("0");
    try {
      const releasable = await vesting.computeReleasableAmount(scheduleId);
      releasableAmount = ethers.formatEther(releasable);
      console.log("   Releasable:", releasableAmount, "CPOT");
    } catch (error) {
      console.log("   ⚠️  Could not compute releasable amount:", error.message);
    }

    // Revoke the schedule
    try {
      console.log("   🔄 Revoking schedule...");
      const tx = await vesting.revoke(scheduleId);
      const receipt = await tx.wait();
      console.log("   ✅ Revoked. Tx:", receipt.hash);

      revokedCount++;
      results.push({
        index: i,
        scheduleId: scheduleId,
        status: "revoked",
        txHash: receipt.hash,
        amountTotal: ethers.formatEther(schedule.amountTotal),
        released: ethers.formatEther(schedule.released),
        releasableBeforeRevoke: releasableAmount,
      });
    } catch (error) {
      console.log("   ❌ Failed to revoke:", error.message);
      results.push({
        index: i,
        scheduleId: scheduleId,
        status: "failed",
        error: error.message,
        amountTotal: ethers.formatEther(schedule.amountTotal),
        released: ethers.formatEther(schedule.released),
      });
    }
  }

  // Save results
  const outFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-revoke-${BENEFICIARY_ADDRESS.slice(2, 10)}-${Date.now()}.json`
  );
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        network: network.name,
        beneficiary: BENEFICIARY_ADDRESS,
        timestamp: new Date().toISOString(),
        summary: {
          total: schedules.length,
          revoked: revokedCount,
          skipped: skippedCount,
          failed: schedules.length - revokedCount - skippedCount,
        },
        results: results,
        vesting: vestingAddress,
      },
      null,
      2
    )
  );
  console.log("\n💾 Saved results to:", outFile);
  console.log("\n📊 Summary:");
  console.log(`   Total: ${schedules.length}`);
  console.log(`   ✅ Revoked: ${revokedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Failed: ${schedules.length - revokedCount - skippedCount}`);
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
