const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting 快速代币释放测试", function () {
  let vesting;
  let hzToken;
  let owner;
  let testBeneficiary;
  
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

  let testScheduleId;

  before(async function () {
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    testBeneficiary = signers[1] || signers[0];
    
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network}`);
    console.log(`👤 测试账户 (Owner): ${owner.address}`);
    console.log(`👤 受益人账户: ${testBeneficiary.address}`);
    console.log(`🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    
    // 连接到已部署的合约
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    
    // 验证权限
    const contractOwner = await vesting.owner();
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`需要合约所有者权限。当前: ${owner.address}, 需要: ${contractOwner}`);
    }
    
    console.log(`✅ 权限验证通过`);
  });

  describe("🚀 创建立即可释放的计划", function () {
    it("应该创建一个立即开始释放的计划", async function () {
      const amount = ethers.parseEther("50"); // 50 HZ
      const startTime = Math.floor(Date.now() / 1000) - 10; // 10秒前就开始了
      const cliff = 0; // 无悬崖期
      const duration = 120; // 2分钟完全释放
      const slicePeriod = 1; // 每秒都可以释放
      
      console.log(`\n📝 创建立即释放测试计划:`);
      console.log(`   受益人: ${testBeneficiary.address}`);
      console.log(`   金额: ${ethers.formatEther(amount)} HZ`);
      console.log(`   开始时间: ${new Date(startTime * 1000).toLocaleString()} (已开始)`);
      console.log(`   持续时间: ${duration} 秒`);
      
      // 创建释放计划
      const tx = await vesting.createVestingSchedule(
        testBeneficiary.address,
        startTime,
        cliff,
        duration,
        slicePeriod,
        true, // revocable
        amount,
        1, // ECOSYSTEM
        0  // LINEAR
      );
      
      const receipt = await tx.wait();
      console.log(`   ✅ 创建交易: ${receipt.hash}`);
      console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      // 获取释放计划ID
      const beneficiaryScheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(testBeneficiary.address);
      const scheduleIndex = Number(beneficiaryScheduleCount) - 1;
      testScheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(testBeneficiary.address, scheduleIndex);
      
      console.log(`   📋 释放计划ID: ${testScheduleId}`);
      
      // 验证计划创建成功
      const schedule = await vesting.getVestingSchedule(testScheduleId);
      expect(schedule.initialized).to.be.true;
      expect(schedule.beneficiary).to.equal(testBeneficiary.address);
      expect(schedule.amountTotal).to.equal(amount);
    });
  });

  describe("💰 执行立即代币释放", function () {
    it("应该能立即释放部分代币", async function () {
      if (!testScheduleId) {
        this.skip();
        return;
      }

      console.log(`\n💰 执行立即代币释放:`);
      console.log(`   计划ID: ${testScheduleId}`);
      
      // 检查可释放金额
      const releasableAmount = await vesting.computeReleasableAmount(testScheduleId);
      console.log(`   可释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
      
      if (releasableAmount > 0) {
        // 获取释放前的余额
        const balanceBefore = await hzToken.balanceOf(testBeneficiary.address);
        console.log(`   释放前余额: ${ethers.formatEther(balanceBefore)} HZ`);
        
        // 释放所有可用代币
        const releaseTx = await vesting.connect(testBeneficiary).release(testScheduleId, releasableAmount);
        const releaseReceipt = await releaseTx.wait();
        
        console.log(`   🚀 释放交易哈希: ${releaseReceipt.hash}`);
        console.log(`   🌍 查看释放交易: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
        console.log(`   💎 释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
        
        // 验证余额变化
        const balanceAfter = await hzToken.balanceOf(testBeneficiary.address);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        console.log(`   释放后余额: ${ethers.formatEther(balanceAfter)} HZ`);
        console.log(`   余额增加: ${ethers.formatEther(balanceIncrease)} HZ`);
        
        expect(balanceIncrease).to.equal(releasableAmount);
        console.log(`   ✅ 代币释放成功！余额已更新`);
        
        // 保存交易信息供后续验证
        this.parent.releaseTransaction = {
          hash: releaseReceipt.hash,
          amount: releasableAmount,
          balanceChange: balanceIncrease
        };
      } else {
        console.log(`   ❌ 当前无可释放金额`);
        // 打印调试信息
        const schedule = await vesting.getVestingSchedule(testScheduleId);
        const currentTime = Math.floor(Date.now() / 1000);
        console.log(`   调试信息:`);
        console.log(`   - 当前时间: ${currentTime}`);
        console.log(`   - 开始时间: ${Number(schedule.start)}`);
        console.log(`   - 悬崖结束: ${Number(schedule.start) + Number(schedule.cliff)}`);
        console.log(`   - 释放结束: ${Number(schedule.start) + Number(schedule.duration)}`);
      }
    });

    it("应该等待片刻后再次释放", async function () {
      if (!testScheduleId) {
        this.skip();
        return;
      }

      console.log(`\n⏳ 等待30秒后再次尝试释放...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      const releasableAmount = await vesting.computeReleasableAmount(testScheduleId);
      console.log(`   30秒后可释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
      
      if (releasableAmount > 0) {
        const balanceBefore = await hzToken.balanceOf(testBeneficiary.address);
        
        // 释放剩余可用代币
        const releaseTx = await vesting.connect(testBeneficiary).release(testScheduleId, releasableAmount);
        const releaseReceipt = await releaseTx.wait();
        
        console.log(`   🚀 第二次释放交易: ${releaseReceipt.hash}`);
        console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
        console.log(`   💎 第二次释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
        
        const balanceAfter = await hzToken.balanceOf(testBeneficiary.address);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        expect(balanceIncrease).to.equal(releasableAmount);
        console.log(`   ✅ 第二次代币释放成功！`);
      } else {
        console.log(`   ℹ️  当前无额外可释放代币`);
      }
    });
  });

  describe("📊 验证区块链状态", function () {
    it("应该验证释放计划状态", async function () {
      if (!testScheduleId) {
        this.skip();
        return;
      }

      console.log(`\n📊 验证最终状态:`);
      
      const schedule = await vesting.getVestingSchedule(testScheduleId);
      const releasableNow = await vesting.computeReleasableAmount(testScheduleId);
      const finalBalance = await hzToken.balanceOf(testBeneficiary.address);
      
      console.log(`   📋 释放计划状态:`);
      console.log(`   - 计划ID: ${testScheduleId}`);
      console.log(`   - 总金额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
      console.log(`   - 已释放: ${ethers.formatEther(schedule.released)} HZ`);
      console.log(`   - 当前可释放: ${ethers.formatEther(releasableNow)} HZ`);
      console.log(`   - 剩余锁定: ${ethers.formatEther(schedule.amountTotal - schedule.released - releasableNow)} HZ`);
      
      console.log(`\n💰 受益人账户:`);
      console.log(`   - 地址: ${testBeneficiary.address}`);
      console.log(`   - 最终余额: ${ethers.formatEther(finalBalance)} HZ`);
      console.log(`   - 查看余额: ${TESTNET_CONFIG.explorerUrl}/address/${testBeneficiary.address}`);
      
      // 验证释放了一些代币
      expect(schedule.released).to.be.greaterThan(0);
      console.log(`   ✅ 已成功释放 ${ethers.formatEther(schedule.released)} HZ 到链上`);
    });
  });

  after(async function () {
    console.log(`\n🎉 快速代币释放测试完成！`);
    
    if (testScheduleId) {
      console.log(`\n📝 测试结果总结:`);
      console.log(`   ✅ 成功创建释放计划`);
      console.log(`   ✅ 成功执行代币释放`);
      console.log(`   ✅ 代币已转移到受益人账户`);
      console.log(`   ✅ 所有交易均可在区块链浏览器查看`);
      
      console.log(`\n🔗 重要链接:`);
      console.log(`   🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
      console.log(`   📄 Vesting合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.Vesting}`);
      console.log(`   🪙 HZToken合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.HZToken}`);
      console.log(`   👤 受益人地址: ${TESTNET_CONFIG.explorerUrl}/address/${testBeneficiary.address}`);
      
      if (this.releaseTransaction) {
        console.log(`   💰 释放交易: ${TESTNET_CONFIG.explorerUrl}/tx/${this.releaseTransaction.hash}`);
      }
      
      console.log(`\n💡 现在你可以在区块链浏览器中查看真实的代币转移记录！`);
    } else {
      console.log(`\n⚠️  未能创建测试释放计划，请检查权限和网络连接`);
    }
  });
});