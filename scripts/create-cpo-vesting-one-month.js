const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Create 1-month linear vesting for CPOT");
  console.log("🌐 Network:", network.name);

  // Load deployment info to get vesting contract address
  const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}-cpo.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`Deployment file not found: ${deploymentsPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const vestingAddress = deployment?.vesting?.proxy;
  if (!vestingAddress) {
    throw new Error("Vesting proxy address missing in deployment file.");
  }

  // Beneficiary and parameters
  const beneficiary = "0xc5cCc3c5e4bbb9519Deaf7a8afA29522DA49E33D";
  const amount = ethers.parseUnits("10", 18); // 10 CPOT (18 decimals)
  const start = Math.floor(Date.now() / 1000); // now
  const cliff = 0; // no cliff
  const duration = 30 * 24 * 60 * 60; // 30 days
  const slicePeriodSeconds = 1; // fully linear
  const revocable = true; // allow owner to revoke
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

  const [signer] = await ethers.getSigners();
  console.log("👤 Using signer:", signer.address);

  const vesting = await ethers.getContractAt("Vesting", vestingAddress, signer);

  // Pre-compute scheduleId using current count as index
  const countBefore = await vesting.getVestingSchedulesCountByBeneficiary(beneficiary);
  const expectedId = await vesting.computeVestingScheduleIdForAddressAndIndex(beneficiary, countBefore);

  console.log("📨 Sending createVestingSchedule tx...");
  const tx = await vesting.createVestingSchedule(
    beneficiary,
    start,
    cliff,
    duration,
    slicePeriodSeconds,
    revocable,
    amount,
    AllocationCategory.ECOSYSTEM,
    VestingType.LINEAR
  );
  const receipt = await tx.wait();
  console.log("✅ Vesting schedule created. Tx:", receipt.hash);

  // Verify and output (use the expectedId computed before creation)
  const scheduleId = expectedId;
  const schedule = await vesting.getVestingSchedule(scheduleId);

  console.log("🆔 Schedule ID:", scheduleId);
  console.log("📊 Amount:", ethers.formatEther(schedule.amountTotal), "CPOT");
  console.log("⏳ Start:", start, " Cliff:", cliff, " Duration:", duration, " Slice:", slicePeriodSeconds);
  console.log("📦 Category: ECOSYSTEM, Type: LINEAR");

  // Save a small receipt file
  const out = {
    network: network.name,
    beneficiary,
    scheduleId,
    txHash: receipt.hash,
    params: {
      amount: amount.toString(),
      start,
      cliff,
      duration,
      slicePeriodSeconds,
      revocable,
      category: "ECOSYSTEM",
      vestingType: "LINEAR",
    },
    vestingAddress,
  };
  const outFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-cpo-vesting-${beneficiary.toLowerCase()}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log("💾 Saved:", outFile);
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


