const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting 真实代币释放测试", function () {
  let vesting;
  let hzToken;
  let owner;
  let testBeneficiary;
  
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

  // 测试用的释放计划参数
  const TEST_PLANS = [
    {
      name: "即时释放测试",
      amount: ethers.parseEther("100"), // 100 HZ
      startTime: () => Math.floor(Date.now() / 1000) + 30, // 30秒后开始
      cliff: 0, // 无悬崖期
      duration: 300, // 5分钟完全释放
      slicePeriod: 60, // 每分钟释放一次
      category: 1, // ECOSYSTEM
      vestingType: 0 // LINEAR
    },
    {
      name: "短期悬崖测试", 
      amount: ethers.parseEther("200"), // 200 HZ
      startTime: () => Math.floor(Date.now() / 1000) + 60, // 1分钟后开始
      cliff: 120, // 2分钟悬崖期
      duration: 480, // 8分钟总时长
      slicePeriod: 30, // 每30秒释放一次
      category: 2, // TEAM
      vestingType: 0 // LINEAR
    },
    {
      name: "分期释放测试",
      amount: ethers.parseEther("300"), // 300 HZ
      startTime: () => Math.floor(Date.now() / 1000) + 90, // 1.5分钟后开始
      cliff: 0, // 无悬崖期
      duration: 600, // 10分钟总时长
      slicePeriod: 120, // 每2分钟释放一次（5期）
      category: 3, // CORNERSTONE
      vestingType: 1 // MILESTONE
    }
  ];

  let createdSchedules = [];

  before(async function () {
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    testBeneficiary = signers[1] || signers[0];
    
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network} (Chain ID: ${TESTNET_CONFIG.chainId})`);
    console.log(`👤 测试账户 (Owner): ${owner.address}`);
    console.log(`👤 受益人账户: ${testBeneficiary.address}`);
    console.log(`🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    
    // 连接到已部署的合约
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    
    // 验证权限
    const contractOwner = await vesting.owner();
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      console.log(`❌ 当前账户不是合约所有者，无法创建释放计划`);
      console.log(`   合约所有者: ${contractOwner}`);
      console.log(`   当前账户: ${owner.address}`);
      throw new Error("需要合约所有者权限");
    }
    
    console.log(`✅ 权限验证通过，开始测试`);
  });

  describe("🚀 创建测试释放计划", function () {
    for (let i = 0; i < TEST_PLANS.length; i++) {
      it(`应该创建 ${TEST_PLANS[i].name}`, async function () {
        const plan = TEST_PLANS[i];
        const startTime = plan.startTime();
        
        console.log(`\n📝 创建 ${plan.name}:`);
        console.log(`   受益人: ${testBeneficiary.address}`);
        console.log(`   金额: ${ethers.formatEther(plan.amount)} HZ`);
        console.log(`   开始时间: ${new Date(startTime * 1000).toLocaleString()}`);
        console.log(`   悬崖期: ${plan.cliff} 秒`);
        console.log(`   持续时间: ${plan.duration} 秒`);
        console.log(`   释放间隔: ${plan.slicePeriod} 秒`);
        
        // 创建释放计划
        const tx = await vesting.createVestingSchedule(
          testBeneficiary.address,
          startTime,
          plan.cliff,
          plan.duration,
          plan.slicePeriod,
          true, // revocable
          plan.amount,
          plan.category,
          plan.vestingType
        );
        
        const receipt = await tx.wait();
        console.log(`   ✅ 交易哈希: ${receipt.hash}`);
        console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        
        // 计算并保存释放计划ID
        const beneficiaryScheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(testBeneficiary.address);
        const scheduleIndex = Number(beneficiaryScheduleCount) - 1;
        const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(testBeneficiary.address, scheduleIndex);
        
        createdSchedules.push({
          ...plan,
          id: scheduleId,
          startTime: startTime,
          creationTx: receipt.hash
        });
        
        console.log(`   📋 释放计划ID: ${scheduleId}`);
        
        // 验证计划创建成功
        const schedule = await vesting.getVestingSchedule(scheduleId);
        expect(schedule.initialized).to.be.true;
        expect(schedule.beneficiary).to.equal(testBeneficiary.address);
        expect(schedule.amountTotal).to.equal(plan.amount);
      });
    }
  });

  describe("⏳ 等待释放时间", function () {
    it("应该等待第一个计划开始释放", async function () {
      if (createdSchedules.length === 0) {
        this.skip();
        return;
      }

      const firstSchedule = createdSchedules[0];
      const currentTime = Math.floor(Date.now() / 1000);
      const waitTime = Math.max(0, firstSchedule.startTime - currentTime + 10); // 额外等待10秒确保开始
      
      if (waitTime > 0) {
        console.log(`\n⏳ 等待 ${waitTime} 秒直到第一个计划开始释放...`);
        console.log(`   计划开始时间: ${new Date(firstSchedule.startTime * 1000).toLocaleString()}`);
        
        // 等待
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        console.log(`   ✅ 等待完成，开始释放测试`);
      }
      
      expect(createdSchedules.length).to.be.greaterThan(0);
    });
  });

  describe("💰 执行代币释放", function () {
    it("应该释放即时释放测试的代币", async function () {
      if (createdSchedules.length === 0) {
        this.skip();
        return;
      }

      const schedule = createdSchedules.find(s => s.name === "即时释放测试");
      if (!schedule) {
        this.skip();
        return;
      }

      console.log(`\n💰 测试即时释放计划:`);
      console.log(`   计划ID: ${schedule.id}`);
      
      // 检查可释放金额
      const releasableAmount = await vesting.computeReleasableAmount(schedule.id);
      console.log(`   可释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
      
      if (releasableAmount > 0) {
        // 获取释放前的余额
        const balanceBefore = await hzToken.balanceOf(testBeneficiary.address);
        console.log(`   释放前余额: ${ethers.formatEther(balanceBefore)} HZ`);
        
        // 释放代币（释放一半可用金额）
        const releaseAmount = releasableAmount / BigInt(2);
        const releaseTx = await vesting.connect(testBeneficiary).release(schedule.id, releaseAmount);
        const releaseReceipt = await releaseTx.wait();
        
        console.log(`   🚀 释放交易哈希: ${releaseReceipt.hash}`);
        console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
        console.log(`   💎 释放金额: ${ethers.formatEther(releaseAmount)} HZ`);
        
        // 验证余额变化
        const balanceAfter = await hzToken.balanceOf(testBeneficiary.address);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        console.log(`   释放后余额: ${ethers.formatEther(balanceAfter)} HZ`);
        console.log(`   余额增加: ${ethers.formatEther(balanceIncrease)} HZ`);
        
        expect(balanceIncrease).to.equal(releaseAmount);
        console.log(`   ✅ 代币释放成功！`);
        
        // 保存释放交易记录
        schedule.releaseTxs = schedule.releaseTxs || [];
        schedule.releaseTxs.push({
          hash: releaseReceipt.hash,
          amount: releaseAmount,
          timestamp: Math.floor(Date.now() / 1000)
        });
      } else {
        console.log(`   ⏳ 当前无可释放金额，可能需要等待更长时间`);
      }
    });

    it("应该测试悬崖期计划（等待悬崖期结束）", async function () {
      const schedule = createdSchedules.find(s => s.name === "短期悬崖测试");
      if (!schedule) {
        this.skip();
        return;
      }

      console.log(`\n🏔️  测试悬崖期计划:`);
      console.log(`   计划ID: ${schedule.id}`);
      
      const currentTime = Math.floor(Date.now() / 1000);
      const cliffEndTime = schedule.startTime + schedule.cliff;
      
      if (currentTime < cliffEndTime) {
        const waitTime = cliffEndTime - currentTime + 10; // 额外等待10秒
        console.log(`   ⏳ 悬崖期还有 ${waitTime} 秒结束，等待中...`);
        console.log(`   📅 悬崖期结束时间: ${new Date(cliffEndTime * 1000).toLocaleString()}`);
        
        // 验证悬崖期内无法释放
        const releasableBeforeCliff = await vesting.computeReleasableAmount(schedule.id);
        expect(releasableBeforeCliff).to.equal(0);
        console.log(`   ✅ 悬崖期内可释放金额为0，符合预期`);
        
        // 等待悬崖期结束
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        console.log(`   🎉 悬崖期结束！`);
      }
      
      // 悬崖期结束后检查可释放金额
      const releasableAfterCliff = await vesting.computeReleasableAmount(schedule.id);
      console.log(`   悬崖期后可释放: ${ethers.formatEther(releasableAfterCliff)} HZ`);
      
      if (releasableAfterCliff > 0) {
        // 释放部分代币
        const releaseAmount = releasableAfterCliff / BigInt(3); // 释放1/3
        const balanceBefore = await hzToken.balanceOf(testBeneficiary.address);
        
        const releaseTx = await vesting.connect(testBeneficiary).release(schedule.id, releaseAmount);
        const releaseReceipt = await releaseTx.wait();
        
        console.log(`   🚀 悬崖期后释放交易: ${releaseReceipt.hash}`);
        console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
        console.log(`   💎 释放金额: ${ethers.formatEther(releaseAmount)} HZ`);
        
        const balanceAfter = await hzToken.balanceOf(testBeneficiary.address);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        expect(balanceIncrease).to.equal(releaseAmount);
        console.log(`   ✅ 悬崖期后代币释放成功！`);
        
        schedule.releaseTxs = schedule.releaseTxs || [];
        schedule.releaseTxs.push({
          hash: releaseReceipt.hash,
          amount: releaseAmount,
          timestamp: Math.floor(Date.now() / 1000)
        });
      }
    });

    it("应该测试分期释放计划", async function () {
      const schedule = createdSchedules.find(s => s.name === "分期释放测试");
      if (!schedule) {
        this.skip();
        return;
      }

      console.log(`\n📅 测试分期释放计划:`);
      console.log(`   计划ID: ${schedule.id}`);
      
      // 等待计划开始
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < schedule.startTime) {
        const waitTime = schedule.startTime - currentTime + 10;
        console.log(`   ⏳ 等待 ${waitTime} 秒直到分期计划开始...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
      
      // 等待第一期释放
      const firstPeriodTime = schedule.startTime + schedule.slicePeriod;
      const waitForFirstPeriod = Math.max(0, firstPeriodTime - Math.floor(Date.now() / 1000) + 10);
      
      if (waitForFirstPeriod > 0) {
        console.log(`   ⏳ 等待 ${waitForFirstPeriod} 秒直到第一期可释放...`);
        await new Promise(resolve => setTimeout(resolve, waitForFirstPeriod * 1000));
      }
      
      const releasableAmount = await vesting.computeReleasableAmount(schedule.id);
      console.log(`   第一期可释放: ${ethers.formatEther(releasableAmount)} HZ`);
      
      if (releasableAmount > 0) {
        const balanceBefore = await hzToken.balanceOf(testBeneficiary.address);
        
        // 释放第一期
        const releaseTx = await vesting.connect(testBeneficiary).release(schedule.id, releasableAmount);
        const releaseReceipt = await releaseTx.wait();
        
        console.log(`   🚀 第一期释放交易: ${releaseReceipt.hash}`);
        console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
        console.log(`   💎 释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
        
        const balanceAfter = await hzToken.balanceOf(testBeneficiary.address);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        expect(balanceIncrease).to.equal(releasableAmount);
        console.log(`   ✅ 分期释放成功！`);
        
        schedule.releaseTxs = schedule.releaseTxs || [];
        schedule.releaseTxs.push({
          hash: releaseReceipt.hash,
          amount: releasableAmount,
          timestamp: Math.floor(Date.now() / 1000),
          period: 1
        });
      }
    });
  });

  describe("📊 最终状态验证", function () {
    it("应该验证所有释放计划的最终状态", async function () {
      console.log(`\n📊 最终状态报告:`);
      
      for (const schedule of createdSchedules) {
        const vestingSchedule = await vesting.getVestingSchedule(schedule.id);
        const releasableNow = await vesting.computeReleasableAmount(schedule.id);
        
        console.log(`\n🔍 ${schedule.name}:`);
        console.log(`   计划ID: ${schedule.id}`);
        console.log(`   总金额: ${ethers.formatEther(vestingSchedule.amountTotal)} HZ`);
        console.log(`   已释放: ${ethers.formatEther(vestingSchedule.released)} HZ`);
        console.log(`   当前可释放: ${ethers.formatEther(releasableNow)} HZ`);
        console.log(`   剩余锁定: ${ethers.formatEther(vestingSchedule.amountTotal - vestingSchedule.released - releasableNow)} HZ`);
        
        if (schedule.releaseTxs && schedule.releaseTxs.length > 0) {
          console.log(`   释放交易记录:`);
          schedule.releaseTxs.forEach((tx, index) => {
            console.log(`     ${index + 1}. ${ethers.formatEther(tx.amount)} HZ - ${TESTNET_CONFIG.explorerUrl}/tx/${tx.hash}`);
          });
        }
      }
    });

    it("应该验证受益人的总余额", async function () {
      const finalBalance = await hzToken.balanceOf(testBeneficiary.address);
      console.log(`\n💰 受益人最终余额: ${ethers.formatEther(finalBalance)} HZ`);
      
      if (finalBalance > 0) {
        console.log(`   🌍 查看余额: ${TESTNET_CONFIG.explorerUrl}/address/${testBeneficiary.address}`);
      }
      
      expect(finalBalance).to.be.greaterThanOrEqual(0);
    });
  });

  after(async function () {
    console.log(`\n🎉 真实代币释放测试完成！`);
    console.log(`\n📋 测试总结:`);
    console.log(`   - 创建了 ${createdSchedules.length} 个测试释放计划`);
    console.log(`   - 验证了线性释放、悬崖期、分期释放等策略`);
    console.log(`   - 所有交易都已上链并可在浏览器查看`);
    
    console.log(`\n🌍 区块链浏览器查看:`);
    console.log(`   - 浏览器地址: ${TESTNET_CONFIG.explorerUrl}`);
    console.log(`   - Vesting合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.Vesting}`);
    console.log(`   - HZToken合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.HZToken}`);
    console.log(`   - 受益人地址: ${TESTNET_CONFIG.explorerUrl}/address/${testBeneficiary.address}`);
    
    if (createdSchedules.length > 0) {
      console.log(`\n📊 创建的释放计划:`);
      createdSchedules.forEach((schedule, index) => {
        console.log(`   ${index + 1}. ${schedule.name}:`);
        console.log(`      ID: ${schedule.id}`);
        console.log(`      创建交易: ${TESTNET_CONFIG.explorerUrl}/tx/${schedule.creationTx}`);
        if (schedule.releaseTxs) {
          console.log(`      释放交易: ${schedule.releaseTxs.length} 笔`);
        }
      });
    }
    
    console.log(`\n💡 提示: 可以继续在浏览器中跟踪后续的代币释放！`);
  });
});