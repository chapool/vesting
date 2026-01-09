const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load env (opBNB defaults)
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.opBNB") });
} catch (e) {}

// ---------------- Config ----------------
// Beneficiary address to query
const BENEFICIARY_ADDRESS = "0x2e50d9492607AE1C4058b2d64cc8Ea098389EE3D";
// ----------------------------------------

async function main() {
  console.log("🔍 Query vesting schedules for beneficiary");
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

  console.log("📍 Vesting contract:", vestingAddress);

  const vesting = await ethers.getContractAt("Vesting", vestingAddress);

  try {
    // Get all vesting schedules for the beneficiary
    console.log("\n📋 Fetching vesting schedules...");
    const schedules = await vesting.getBeneficiaryVestingSchedules(BENEFICIARY_ADDRESS);
    console.log(`Found ${schedules.length} vesting schedule(s)\n`);

    if (schedules.length === 0) {
      console.log("✅ No schedules found for this beneficiary.");
      return;
    }

    // Enum definitions
    const categoryNames = ["MINING", "ECOSYSTEM", "TEAM", "CORNERSTONE"];
    const vestingTypeNames = ["LINEAR", "MILESTONE", "CLIFF_LINEAR"];

    let revocableCount = 0;
    let nonRevocableCount = 0;
    let revokedCount = 0;

    // Process each schedule
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(BENEFICIARY_ADDRESS, i);

      console.log("=".repeat(60));
      console.log(`📋 Schedule ${i + 1}/${schedules.length}`);
      console.log("=".repeat(60));
      console.log(`计划ID: ${scheduleId}`);
      console.log(`受益人: ${schedule.beneficiary}`);
      console.log(`总金额: ${ethers.formatEther(schedule.amountTotal)} CPOT`);
      console.log(`已释放: ${ethers.formatEther(schedule.released)} CPOT`);
      
      const lockedAmount = schedule.amountTotal - schedule.released;
      console.log(`锁定金额: ${ethers.formatEther(lockedAmount)} CPOT`);
      
      // Revocable status - KEY INFORMATION
      const isRevocable = schedule.revocable;
      const isRevoked = schedule.revoked;
      console.log(`\n🔑 可撤销状态: ${isRevocable ? "✅ 可撤销" : "❌ 不可撤销"}`);
      console.log(`🗑️  撤销状态: ${isRevoked ? "已撤销" : "未撤销"}`);
      
      if (isRevocable && !isRevoked) {
        revocableCount++;
        console.log("   → 此计划可以撤销");
      } else if (!isRevocable) {
        nonRevocableCount++;
        console.log("   → 此计划不可撤销");
      } else if (isRevoked) {
        revokedCount++;
        console.log("   → 此计划已被撤销");
      }

      // Category and type
      console.log(`\n分类信息:`);
      console.log(`  分配类别: ${categoryNames[Number(schedule.category)]} (${schedule.category})`);
      console.log(`  释放类型: ${vestingTypeNames[Number(schedule.vestingType)]} (${schedule.vestingType})`);

      // Time information
      const startTime = Number(schedule.start);
      const cliff = Number(schedule.cliff);
      const duration = Number(schedule.duration);
      const endTime = startTime + duration;
      const cliffEnd = startTime + cliff;
      const currentTime = Math.floor(Date.now() / 1000);

      console.log(`\n⏰ 时间信息:`);
      console.log(`  开始时间: ${new Date(startTime * 1000).toISOString()} (${startTime})`);
      if (cliff > 0) {
        console.log(`  Cliff结束: ${new Date(cliffEnd * 1000).toISOString()} (${cliffEnd})`);
        console.log(`  Cliff期: ${Math.floor(cliff / 86400)} 天`);
      } else {
        console.log(`  Cliff期: 无`);
      }
      console.log(`  结束时间: ${new Date(endTime * 1000).toISOString()} (${endTime})`);
      console.log(`  持续时间: ${Math.floor(duration / 86400)} 天`);
      console.log(`  释放间隔: ${schedule.slicePeriodSeconds} 秒`);

      // Current status
      console.log(`\n📊 当前状态:`);
      if (isRevoked) {
        console.log(`  状态: 已撤销`);
      } else if (currentTime < cliffEnd) {
        const daysLeft = Math.ceil((cliffEnd - currentTime) / 86400);
        console.log(`  状态: Cliff期 (还需等待 ${daysLeft} 天)`);
      } else if (currentTime < endTime) {
        const progress = ((currentTime - startTime) / duration) * 100;
        const daysLeft = Math.ceil((endTime - currentTime) / 86400);
        console.log(`  状态: 释放中 (进度: ${progress.toFixed(2)}%, 还需 ${daysLeft} 天)`);
      } else {
        console.log(`  状态: 释放完成`);
      }

      // Releasable amount
      if (!isRevoked) {
        try {
          const releasableAmount = await vesting.computeReleasableAmount(scheduleId);
          console.log(`  当前可释放: ${ethers.formatEther(releasableAmount)} CPOT`);
        } catch (error) {
          console.log(`  当前可释放: 查询失败 (${error.message})`);
        }
      }

      console.log(""); // Empty line separator
    }

    // Summary
    console.log("=".repeat(60));
    console.log("📊 汇总信息");
    console.log("=".repeat(60));
    console.log(`总计划数: ${schedules.length}`);
    console.log(`✅ 可撤销且未撤销: ${revocableCount}`);
    console.log(`❌ 不可撤销: ${nonRevocableCount}`);
    console.log(`🗑️  已撤销: ${revokedCount}`);

    // Get beneficiary summary
    try {
      console.log("\n" + "=".repeat(60));
      console.log("📈 受益人汇总统计");
      console.log("=".repeat(60));
      const summary = await vesting.getBeneficiaryVestingSummary(BENEFICIARY_ADDRESS);
      console.log(`总分配数量: ${ethers.formatEther(summary.totalAmount)} CPOT`);
      console.log(`已释放数量: ${ethers.formatEther(summary.releasedAmount)} CPOT`);
      console.log(`当前可释放: ${ethers.formatEther(summary.releasableAmount)} CPOT`);
      console.log(`仍锁定数量: ${ethers.formatEther(summary.lockedAmount)} CPOT`);
      console.log(`计划总数: ${summary.scheduleCount.toString()}`);
    } catch (error) {
      console.log(`\n⚠️  获取汇总信息失败: ${error.message}`);
    }

    // Get category breakdown
    try {
      console.log("\n" + "=".repeat(60));
      console.log("📂 按类别统计");
      console.log("=".repeat(60));
      const categorySchedules = await vesting.getBeneficiarySchedulesByCategory(BENEFICIARY_ADDRESS);
      
      for (let i = 0; i < categorySchedules.length; i++) {
        const catSchedule = categorySchedules[i];
        const categoryName = categoryNames[Number(catSchedule.category)];
        
        console.log(`\n${categoryName} 类别:`);
        console.log(`  计划数量: ${catSchedule.scheduleIds.length}`);
        console.log(`  总分配: ${ethers.formatEther(catSchedule.totalAmount)} CPOT`);
        console.log(`  已释放: ${ethers.formatEther(catSchedule.releasedAmount)} CPOT`);
        console.log(`  可释放: ${ethers.formatEther(catSchedule.releasableAmount)} CPOT`);
      }
    } catch (error) {
      console.log(`\n⚠️  获取类别统计失败: ${error.message}`);
    }

  } catch (error) {
    console.error(`\n❌ 查询失败: ${error.message}`);
    console.error(error);
    throw error;
  }
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
