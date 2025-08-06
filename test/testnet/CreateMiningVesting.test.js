const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("创建MiningPool可用的Vesting计划", function () {
  let hzToken;
  let vesting;
  let miningPool;
  let owner;
  
  // 增加测试超时时间
  this.timeout(300000); // 5分钟超时
  
  // 测试网部署的实际地址
  const TESTNET_CONFIG = {
    network: "hashkeyTestnet",
    chainId: 133,
    contracts: {
      HZToken: "0xAC3879CB86d1B815B1519c4805A21070649493Af",
      Vesting: "0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7", 
      MiningPool: "0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa"
    },
    explorerUrl: "https://testnet-explorer.hsk.xyz"
  };

  let newVestingScheduleId;

  before(async function () {
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network}`);
    console.log(`🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    
    console.log(`👤 Owner: ${owner.address}`);
    
    // 连接到已部署的合约
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    miningPool = await ethers.getContractAt("MiningPool", TESTNET_CONFIG.contracts.MiningPool);
    
    console.log(`✅ 合约连接完成`);
  });

  describe("💰 检查和准备代币余额", function () {
    it("应该检查Vesting合约的代币余额", async function () {
      console.log(`\n💰 检查Vesting合约代币余额:`);
      
      const vestingBalance = await hzToken.balanceOf(TESTNET_CONFIG.contracts.Vesting);
      console.log(`   Vesting合约HZ余额: ${ethers.formatEther(vestingBalance)} HZ`);
      
      expect(vestingBalance).to.be.greaterThan(0);
      console.log(`   ✅ Vesting合约有足够余额`);
    });

    it("应该检查owner的代币余额", async function () {
      console.log(`\n💰 检查owner代币余额:`);
      
      const ownerBalance = await hzToken.balanceOf(owner.address);
      console.log(`   Owner HZ余额: ${ethers.formatEther(ownerBalance)} HZ`);
      
      if (ownerBalance > 0) {
        console.log(`   ✅ Owner有代币余额可用于创建计划`);
      } else {
        console.log(`   ⚠️  Owner余额不足，需要从其他源获取代币`);
      }
    });

    it("应该检查现有Vesting计划", async function () {
      console.log(`\n📋 检查现有Vesting计划:`);
      
      const totalCount = await vesting.getVestingSchedulesTotalCount();
      console.log(`   总Vesting计划数: ${totalCount}`);
      
      const vestingCount = await vesting.getVestingSchedulesCount();
      console.log(`   活跃Vesting计划数: ${vestingCount}`);
      
      // 检查MiningPool的计划
      const miningPoolCount = await vesting.getVestingSchedulesCountByBeneficiary(TESTNET_CONFIG.contracts.MiningPool);
      console.log(`   MiningPool的计划数: ${miningPoolCount}`);
      
      if (miningPoolCount > 0) {
        console.log(`   📝 MiningPool现有计划:`);
        for (let i = 0; i < miningPoolCount; i++) {
          const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(TESTNET_CONFIG.contracts.MiningPool, i);
          try {
            const schedule = await vesting.getVestingSchedule(scheduleId);
            console.log(`     计划${i + 1}: ${scheduleId}`);
            console.log(`       总额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
            console.log(`       已释放: ${ethers.formatEther(schedule.released)} HZ`);
            
            const releasable = await vesting.computeReleasableAmount(scheduleId);
            console.log(`       可释放: ${ethers.formatEther(releasable)} HZ`);
          } catch (error) {
            console.log(`     计划${i + 1}: ${scheduleId} - 获取详情失败`);
          }
        }
      }
      
      console.log(`   ✅ 现有计划检查完成`);
    });
  });

  describe("🚀 创建新的可用Vesting计划", function () {
    it("应该为MiningPool创建立即可用的Vesting计划", async function () {
      console.log(`\n🚀 为MiningPool创建新的Vesting计划:`);
      
      const miningAmount = ethers.parseEther("50000"); // 5万HZ用于挖矿测试
      const startTime = Math.floor(Date.now() / 1000) - 300; // 5分钟前开始，确保立即可释放
      const cliffDuration = 0; // 无悬崖期
      const duration = 30 * 24 * 3600; // 30天释放期
      const slicePeriodSeconds = 60; // 每分钟释放一次
      
      console.log(`   受益人: ${TESTNET_CONFIG.contracts.MiningPool}`);
      console.log(`   金额: ${ethers.formatEther(miningAmount)} HZ`);
      console.log(`   开始时间: ${new Date(startTime * 1000).toLocaleString()}`);
      console.log(`   释放期: ${duration / (24 * 3600)} 天`);
      console.log(`   释放频率: 每 ${slicePeriodSeconds} 秒`);
      
      try {
        const tx = await vesting.createVestingSchedule(
          TESTNET_CONFIG.contracts.MiningPool, // 受益人是MiningPool合约
          startTime,
          cliffDuration,
          duration,
          slicePeriodSeconds,
          true, // 可撤销
          miningAmount,
          4, // MINING类型
          0  // LINEAR线性释放
        );
        
        const receipt = await tx.wait();
        console.log(`   🚀 创建交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        
        // 获取新创建的计划ID
        const scheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(TESTNET_CONFIG.contracts.MiningPool);
        const scheduleIndex = Number(scheduleCount) - 1;
        const newScheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(TESTNET_CONFIG.contracts.MiningPool, scheduleIndex);
        
        console.log(`   📝 新计划ID: ${newScheduleId}`);
        newVestingScheduleId = newScheduleId;
        
        // 验证新计划
        const schedule = await vesting.getVestingSchedule(newScheduleId);
        console.log(`   📊 计划详情:`);
        console.log(`     受益人: ${schedule.beneficiary}`);
        console.log(`     总额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
        console.log(`     开始时间: ${new Date(Number(schedule.start) * 1000).toLocaleString()}`);
        console.log(`     持续时间: ${schedule.duration} 秒`);
        
        expect(schedule.beneficiary).to.equal(TESTNET_CONFIG.contracts.MiningPool);
        expect(schedule.amountTotal).to.equal(miningAmount);
        
        console.log(`   ✅ 新Vesting计划创建成功`);
      } catch (error) {
        console.log(`   ❌ 创建Vesting计划失败: ${error.message}`);
        throw error;
      }
    });

    it("应该验证新计划的可释放金额", async function () {
      console.log(`\n💎 验证新计划的可释放金额:`);
      
      try {
        const releasableAmount = await vesting.computeReleasableAmount(newVestingScheduleId);
        console.log(`   当前可释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
        
        expect(releasableAmount).to.be.greaterThan(0);
        console.log(`   ✅ 新计划有可释放金额`);
        
        // 检查计划的时间信息
        const schedule = await vesting.getVestingSchedule(newVestingScheduleId);
        const currentTime = Math.floor(Date.now() / 1000);
        const elapsed = currentTime - Number(schedule.start);
        
        console.log(`   ⏰ 时间信息:`);
        console.log(`     当前时间: ${new Date(currentTime * 1000).toLocaleString()}`);
        console.log(`     开始时间: ${new Date(Number(schedule.start) * 1000).toLocaleString()}`);
        console.log(`     已过时间: ${elapsed} 秒 (${(elapsed / 60).toFixed(1)} 分钟)`);
        
        console.log(`   ✅ 时间验证完成`);
      } catch (error) {
        console.log(`   ❌ 验证可释放金额失败: ${error.message}`);
        throw error;
      }
    });

    it("应该设置MiningPool使用新的Vesting计划", async function () {
      console.log(`\n🔧 设置MiningPool使用新计划:`);
      
      console.log(`   设置计划ID: ${newVestingScheduleId}`);
      
      try {
        const tx = await miningPool.setMiningVestingScheduleId(newVestingScheduleId);
        const receipt = await tx.wait();
        
        console.log(`   🚀 设置交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        
        // 验证设置
        const currentScheduleId = await miningPool.getMiningVestingScheduleId();
        expect(currentScheduleId).to.equal(newVestingScheduleId);
        
        // 检查MiningPool能否读取到可释放金额
        const poolReleasableAmount = await miningPool.getAvailableReleasableAmount();
        console.log(`   MiningPool可释放金额: ${ethers.formatEther(poolReleasableAmount)} HZ`);
        
        expect(poolReleasableAmount).to.be.greaterThan(0);
        
        console.log(`   ✅ MiningPool新计划设置成功`);
      } catch (error) {
        console.log(`   ❌ 设置MiningPool计划失败: ${error.message}`);
        throw error;
      }
    });
  });

  describe("✅ 准备审批人员", function () {
    it("应该确认所有审批人员已设置", async function () {
      console.log(`\n✅ 确认审批人员设置:`);
      
      const roles = [
        { name: "一级审批人", check: () => miningPool.firstLevelApprovers(owner.address), add: () => miningPool.addFirstLevelApprover(owner.address) },
        { name: "二级审批人", check: () => miningPool.secondLevelApprovers(owner.address), add: () => miningPool.addSecondLevelApprover(owner.address) },
        { name: "链下审核人", check: () => miningPool.offChainAuditors(owner.address), add: () => miningPool.addOffChainAuditor(owner.address) }
      ];
      
      for (const role of roles) {
        const hasRole = await role.check();
        if (!hasRole) {
          console.log(`   添加${role.name}: ${owner.address}`);
          const tx = await role.add();
          const receipt = await tx.wait();
          console.log(`   🚀 添加交易: ${receipt.hash}`);
          console.log(`   ✅ ${role.name}添加成功`);
        } else {
          console.log(`   ✅ ${role.name}已存在`);
        }
      }
      
      console.log(`   ✅ 审批人员确认完成`);
    });
  });

  after(async function () {
    console.log(`\n🎉 MiningPool Vesting计划创建完成！`);
    
    console.log(`\n📊 创建结果:`);
    console.log(`   ✅ 新Vesting计划已创建`);
    console.log(`   ✅ MiningPool已配置新计划`);
    console.log(`   ✅ 可释放金额已确认`);
    console.log(`   ✅ 审批人员已准备就绪`);
    
    console.log(`\n🔗 重要信息:`);
    console.log(`   📝 新计划ID: ${newVestingScheduleId}`);
    console.log(`   🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    console.log(`   🏊 MiningPool合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.MiningPool}`);
    
    console.log(`\n🚀 现在可以运行完整的MiningPool提现测试了！`);
    console.log(`   命令: npm run test:mining-complete`);
  });
});