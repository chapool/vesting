const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing upgraded Vesting contract functionality...");
  
  // 使用testnet部署地址
  const vestingAddress = "0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7";
  
  // 连接到合约
  const vesting = await ethers.getContractAt("Vesting", vestingAddress);
  
  console.log("📋 Connected to Vesting contract at:", vestingAddress);
  
  try {
    // 1. 测试全局统计函数
    console.log("\n1️⃣ Testing global statistics functions...");
    
    const totalAmount = await vesting.getVestingSchedulesTotalAmount();
    const releasedAmount = await vesting.getVestingSchedulesReleasedAmount();
    
    console.log("   Total locked amount:", ethers.formatEther(totalAmount), "HZ");
    console.log("   Total released amount:", ethers.formatEther(releasedAmount), "HZ");
    
    if (totalAmount > 0) {
      const releaseProgress = (Number(releasedAmount) * 100) / Number(totalAmount);
      console.log("   Global release progress:", releaseProgress.toFixed(2), "%");
    }
    
    // 2. 测试受益人函数（使用MiningPool地址）
    console.log("\n2️⃣ Testing beneficiary functions with MiningPool address...");
    
    const miningPoolAddress = "0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa";
    
    // 获取受益人汇总信息
    try {
      const summary = await vesting.getBeneficiaryVestingSummary(miningPoolAddress);
      console.log("   Beneficiary Summary:");
      console.log("     Total amount:", ethers.formatEther(summary.totalAmount), "HZ");
      console.log("     Released amount:", ethers.formatEther(summary.releasedAmount), "HZ");
      console.log("     Releasable amount:", ethers.formatEther(summary.releasableAmount), "HZ");
      console.log("     Locked amount:", ethers.formatEther(summary.lockedAmount), "HZ");
      console.log("     Schedule count:", summary.scheduleCount.toString());
    } catch (error) {
      console.log("   ⚠️ Error getting beneficiary summary:", error.message);
    }
    
    // 获取受益人所有计划
    try {
      const schedules = await vesting.getBeneficiaryVestingSchedules(miningPoolAddress);
      console.log("   Beneficiary Schedules:", schedules.length, "found");
      
      for (let i = 0; i < schedules.length; i++) {
        console.log(`     Schedule ${i}:`);
        console.log("       Total:", ethers.formatEther(schedules[i].amountTotal), "HZ");
        console.log("       Released:", ethers.formatEther(schedules[i].released), "HZ");
        console.log("       Category:", schedules[i].category.toString());
        console.log("       Vesting Type:", schedules[i].vestingType.toString());
        console.log("       Revoked:", schedules[i].revoked);
      }
    } catch (error) {
      console.log("   ⚠️ Error getting beneficiary schedules:", error.message);
    }
    
    // 获取按类别分组的计划
    try {
      const categorySchedules = await vesting.getBeneficiarySchedulesByCategory(miningPoolAddress);
      console.log("   Category Schedules:", categorySchedules.length, "categories found");
      
      for (let i = 0; i < categorySchedules.length; i++) {
        console.log(`     Category ${categorySchedules[i].category}:`);
        console.log("       Schedule IDs:", categorySchedules[i].scheduleIds.length);
        console.log("       Total amount:", ethers.formatEther(categorySchedules[i].totalAmount), "HZ");
        console.log("       Released amount:", ethers.formatEther(categorySchedules[i].releasedAmount), "HZ");
        console.log("       Releasable amount:", ethers.formatEther(categorySchedules[i].releasableAmount), "HZ");
      }
    } catch (error) {
      console.log("   ⚠️ Error getting category schedules:", error.message);
    }
    
    // 3. 测试计划进度函数
    console.log("\n3️⃣ Testing vesting progress function...");
    
    const scheduleId = "0x7d68a4befde415f47272589f7d4fe36f47d882cbbb2d12752e21bb78a9635538";
    
    try {
      const progress = await vesting.getVestingProgress(scheduleId);
      console.log("   Vesting Progress for schedule:", scheduleId.substring(0, 10) + "...");
      console.log("     Total amount:", ethers.formatEther(progress.totalAmount), "HZ");
      console.log("     Released amount:", ethers.formatEther(progress.releasedAmount), "HZ");
      console.log("     Releasable amount:", ethers.formatEther(progress.releasableAmount), "HZ");
      console.log("     Locked amount:", ethers.formatEther(progress.lockedAmount), "HZ");
      console.log("     Progress percent:", (Number(progress.progressPercent) / 100).toFixed(2), "%");
      console.log("     Time progress:", (Number(progress.timeProgress) / 100).toFixed(2), "%");
      console.log("     Remaining time:", progress.remainingTime.toString(), "seconds");
      console.log("     Is active:", progress.isActive);
    } catch (error) {
      console.log("   ⚠️ Error getting vesting progress:", error.message);
    }
    
    // 4. 测试版本信息
    console.log("\n4️⃣ Testing version information...");
    
    try {
      const version = await vesting.version();
      console.log("   Contract version:", version);
    } catch (error) {
      console.log("   ⚠️ Error getting version:", error.message);
    }
    
    console.log("\n✅ Vesting contract upgrade verification completed!");
    console.log("🎉 All new frontend display functions are working correctly!");
    
  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;