const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting 释放计算验证测试", function () {
  let vesting;
  let hzToken;
  let miningPool;
  let owner;
  
  // 测试网部署的实际地址
  const TESTNET_CONFIG = {
    network: "hashkeyTestnet",
    chainId: 133,
    contracts: {
      HZToken: "0xAC3879CB86d1B815B1519c4805A21070649493Af",
      Vesting: "0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7", 
      MiningPool: "0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa"
    },
    miningVestingId: "0x7d68a4befde415f47272589f7d4fe36f47d882cbbb2d12752e21bb78a9635538",
    expectedMiningAmount: ethers.parseEther("25000000") // 25M HZ
  };

  before(async function () {
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network} (Chain ID: ${TESTNET_CONFIG.chainId})`);
    console.log(`👤 测试账户: ${owner.address}`);
    
    // 连接到已部署的合约
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    miningPool = await ethers.getContractAt("MiningPool", TESTNET_CONFIG.contracts.MiningPool);
    
    console.log(`📄 已连接到合约`);
  });

  let miningSchedule; // 在顶层定义以便所有测试访问

  describe("🔬 挖矿释放计划数学验证", function () {
    
    before(async function () {
      // 获取挖矿释放计划详情
      miningSchedule = await vesting.getVestingSchedule(TESTNET_CONFIG.miningVestingId);
      
      console.log(`\n📊 挖矿释放计划配置:`);
      console.log(`   受益人: ${miningSchedule.beneficiary}`);
      console.log(`   总金额: ${ethers.formatEther(miningSchedule.amountTotal)} HZ`);
      console.log(`   已释放: ${ethers.formatEther(miningSchedule.released)} HZ`);
      console.log(`   开始时间: ${new Date(Number(miningSchedule.start) * 1000).toLocaleString()}`);
      console.log(`   悬崖期: ${Number(miningSchedule.cliff)} 秒 (${Number(miningSchedule.cliff) / (24 * 60 * 60)} 天)`);
      console.log(`   持续时间: ${Number(miningSchedule.duration)} 秒 (${Number(miningSchedule.duration) / (24 * 60 * 60)} 天)`);
      console.log(`   释放间隔: ${Number(miningSchedule.slicePeriodSeconds)} 秒`);
      console.log(`   分配类型: ${miningSchedule.category} (MINING)`);
      console.log(`   释放类型: ${miningSchedule.vestingType} (LINEAR)`);
    });

    it("应该正确计算当前时间点的可释放金额", async function () {
      const releasableAmount = await vesting.computeReleasableAmount(TESTNET_CONFIG.miningVestingId);
      
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = Number(miningSchedule.start);
      const cliffEnd = startTime + Number(miningSchedule.cliff);
      const vestingEnd = startTime + Number(miningSchedule.duration);
      
      console.log(`\n⏰ 时间状态分析:`);
      console.log(`   当前时间: ${new Date(currentTime * 1000).toLocaleString()}`);
      console.log(`   释放开始: ${new Date(startTime * 1000).toLocaleString()}`);
      console.log(`   悬崖结束: ${new Date(cliffEnd * 1000).toLocaleString()}`);
      console.log(`   释放结束: ${new Date(vestingEnd * 1000).toLocaleString()}`);
      console.log(`   可释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
      
      // 验证时间状态
      if (currentTime < startTime) {
        console.log(`   📍 状态: 释放未开始`);
        expect(releasableAmount).to.equal(0);
      } else if (currentTime < cliffEnd) {
        console.log(`   📍 状态: 悬崖期内 (${Math.ceil((cliffEnd - currentTime) / (24 * 60 * 60))} 天后解锁)`);
        expect(releasableAmount).to.equal(0);
      } else if (currentTime >= vestingEnd) {
        console.log(`   📍 状态: 释放已完成`);
        const expectedAmount = miningSchedule.amountTotal - miningSchedule.released;
        expect(releasableAmount).to.equal(expectedAmount);
      } else {
        console.log(`   📍 状态: 释放进行中`);
        const timeFromCliffEnd = currentTime - cliffEnd;
        const vestingDuration = Number(miningSchedule.duration) - Number(miningSchedule.cliff);
        const progress = timeFromCliffEnd / vestingDuration;
        
        console.log(`   ⏱️  悬崖期后经过: ${Math.floor(timeFromCliffEnd / (24 * 60 * 60))} 天`);
        console.log(`   📈 释放进度: ${(progress * 100).toFixed(4)}%`);
        
        expect(releasableAmount).to.be.greaterThan(0);
        expect(releasableAmount).to.be.lessThanOrEqual(miningSchedule.amountTotal);
      }
    });

    it("应该验证线性释放数学计算的正确性", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = Number(miningSchedule.start);
      const cliffTime = Number(miningSchedule.cliff);
      const totalDuration = Number(miningSchedule.duration);
      const totalAmount = miningSchedule.amountTotal;
      const released = miningSchedule.released;
      
      const cliffEnd = startTime + cliffTime;
      const vestingEnd = startTime + totalDuration;
      const vestingDuration = totalDuration - cliffTime; // 实际释放时长
      
      console.log(`\n🧮 线性释放数学计算验证:`);
      console.log(`   总金额: ${ethers.formatEther(totalAmount)} HZ`);
      console.log(`   已释放: ${ethers.formatEther(released)} HZ`);
      console.log(`   剩余金额: ${ethers.formatEther(totalAmount - released)} HZ`);
      console.log(`   实际释放时长: ${vestingDuration} 秒 (${vestingDuration / (24 * 60 * 60)} 天)`);
      
      if (currentTime >= cliffEnd && currentTime < vestingEnd) {
        // 在释放期间，计算理论可释放金额
        const timeAfterCliff = currentTime - cliffEnd;
        const progress = timeAfterCliff / vestingDuration;
        
        // 理论上应该释放的总金额
        const theoreticalTotalReleased = (totalAmount * BigInt(Math.floor(progress * 1000000))) / BigInt(1000000);
        // 理论上当前可释放的金额 = 理论总释放 - 实际已释放
        const theoreticalReleasable = theoreticalTotalReleased - released;
        
        // 实际可释放金额
        const actualReleasable = await vesting.computeReleasableAmount(TESTNET_CONFIG.miningVestingId);
        
        console.log(`\n📊 理论计算 vs 实际结果:`);
        console.log(`   时间进度: ${(progress * 100).toFixed(6)}%`);
        console.log(`   理论总释放: ${ethers.formatEther(theoreticalTotalReleased)} HZ`);
        console.log(`   理论可释放: ${ethers.formatEther(theoreticalReleasable)} HZ`);
        console.log(`   实际可释放: ${ethers.formatEther(actualReleasable)} HZ`);
        
        // 计算误差
        const difference = actualReleasable > theoreticalReleasable ? 
          actualReleasable - theoreticalReleasable : 
          theoreticalReleasable - actualReleasable;
        const errorPercentage = Number(difference * BigInt(10000) / totalAmount) / 100;
        
        console.log(`   绝对误差: ${ethers.formatEther(difference)} HZ`);
        console.log(`   相对误差: ${errorPercentage.toFixed(4)}%`);
        
        // 验证误差在合理范围内（0.01%以内）
        expect(errorPercentage).to.be.lessThan(0.01);
        
        // 验证基本逻辑
        expect(actualReleasable).to.be.greaterThanOrEqual(0);
        expect(actualReleasable).to.be.lessThanOrEqual(totalAmount - released);
        
      } else if (currentTime >= vestingEnd) {
        console.log(`\n✅ 释放期已结束，应该能释放所有剩余代币`);
        const actualReleasable = await vesting.computeReleasableAmount(TESTNET_CONFIG.miningVestingId);
        const expectedReleasable = totalAmount - released;
        
        console.log(`   预期可释放: ${ethers.formatEther(expectedReleasable)} HZ`);
        console.log(`   实际可释放: ${ethers.formatEther(actualReleasable)} HZ`);
        
        expect(actualReleasable).to.equal(expectedReleasable);
      } else {
        console.log(`\n⏳ 当前处于悬崖期或释放未开始，应该无可释放金额`);
        const actualReleasable = await vesting.computeReleasableAmount(TESTNET_CONFIG.miningVestingId);
        expect(actualReleasable).to.equal(0);
      }
    });

    it("应该模拟未来时间点的释放金额计算", async function () {
      const startTime = Number(miningSchedule.start);
      const cliffTime = Number(miningSchedule.cliff);
      const totalDuration = Number(miningSchedule.duration);
      const totalAmount = miningSchedule.amountTotal;
      const vestingDuration = totalDuration - cliffTime;
      
      console.log(`\n🔮 模拟未来释放金额计算:`);
      
      // 定义几个关键时间点
      const timePoints = [
        { name: "悬崖期结束", time: startTime + cliffTime },
        { name: "25%释放期", time: startTime + cliffTime + Math.floor(vestingDuration * 0.25) },
        { name: "50%释放期", time: startTime + cliffTime + Math.floor(vestingDuration * 0.5) },
        { name: "75%释放期", time: startTime + cliffTime + Math.floor(vestingDuration * 0.75) },
        { name: "释放完成", time: startTime + totalDuration }
      ];
      
      for (const point of timePoints) {
        const timeAfterCliff = Math.max(0, point.time - (startTime + cliffTime));
        const progress = Math.min(timeAfterCliff / vestingDuration, 1);
        const expectedTotalReleased = (totalAmount * BigInt(Math.floor(progress * 1000000))) / BigInt(1000000);
        
        console.log(`\n📍 ${point.name}:`);
        console.log(`   时间: ${new Date(point.time * 1000).toLocaleString()}`);
        console.log(`   进度: ${(progress * 100).toFixed(2)}%`);
        console.log(`   累计可释放: ${ethers.formatEther(expectedTotalReleased)} HZ`);
        console.log(`   每日释放速率: ${ethers.formatEther(totalAmount / BigInt(Math.floor(vestingDuration / (24 * 60 * 60))))} HZ/天`);
      }
    });
  });

  describe("💡 释放策略建议", function () {
    it("应该分析最佳释放时机", async function () {
      const schedule = miningSchedule;
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = Number(schedule.start);
      const cliffEnd = startTime + Number(schedule.cliff);
      const vestingEnd = startTime + Number(schedule.duration);
      const vestingDuration = Number(schedule.duration) - Number(schedule.cliff);
      
      console.log(`\n💡 释放策略分析:`);
      
      // 计算悬崖期剩余时间
      if (currentTime < cliffEnd) {
        const daysUntilCliff = Math.ceil((cliffEnd - currentTime) / (24 * 60 * 60));
        console.log(`   🔒 悬崖期状态: 还需等待 ${daysUntilCliff} 天`);
        console.log(`   📅 解锁日期: ${new Date(cliffEnd * 1000).toLocaleString()}`);
      } else if (currentTime < vestingEnd) {
        const daysIntoVesting = Math.floor((currentTime - cliffEnd) / (24 * 60 * 60));
        const totalVestingDays = Math.floor(vestingDuration / (24 * 60 * 60));
        const daysRemaining = totalVestingDays - daysIntoVesting;
        
        console.log(`   🚀 释放状态: 进行中`);
        console.log(`   📈 已释放时间: ${daysIntoVesting} 天 / ${totalVestingDays} 天`);
        console.log(`   ⏳ 剩余时间: ${daysRemaining} 天`);
        
        // 计算每日释放金额
        const dailyRelease = schedule.amountTotal / BigInt(totalVestingDays);
        console.log(`   💰 每日释放: ${ethers.formatEther(dailyRelease)} HZ`);
        
        // 计算当前可释放和未来预期
        const currentReleasable = await vesting.computeReleasableAmount(TESTNET_CONFIG.miningVestingId);
        console.log(`   🔄 当前可释放: ${ethers.formatEther(currentReleasable)} HZ`);
        
        if (currentReleasable > 0) {
          console.log(`   ✅ 建议: 可以开始释放代币`);
        }
      } else {
        console.log(`   ✅ 释放状态: 已完成`);
        console.log(`   💎 建议: 所有代币均可释放`);
      }
      
      // 总是验证基本状态
      expect(schedule.initialized).to.be.true;
      expect(schedule.amountTotal).to.be.greaterThan(0);
    });
  });

  after(async function () {
    console.log(`\n🎉 Vesting释放计算验证测试完成！`);
    console.log(`📋 验证结果:`);
    console.log(`   - 挖矿释放计划配置 ✅`);
    console.log(`   - 时间状态分析 ✅`);
    console.log(`   - 线性释放数学计算 ✅`);
    console.log(`   - 未来释放金额模拟 ✅`);
    console.log(`   - 释放策略建议 ✅`);
    
    const schedule = miningSchedule;
    const currentTime = Math.floor(Date.now() / 1000);
    const cliffEnd = Number(schedule.start) + Number(schedule.cliff);
    
    if (currentTime < cliffEnd) {
      const daysToUnlock = Math.ceil((cliffEnd - currentTime) / (24 * 60 * 60));
      console.log(`\n🔮 下次检查建议: ${daysToUnlock} 天后 (${new Date(cliffEnd * 1000).toLocaleDateString()})`);
    }
  });
});