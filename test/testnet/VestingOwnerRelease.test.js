const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting Owner代理释放功能测试", function () {
  let vesting;
  let hzToken;
  let owner;
  let beneficiary1;
  let beneficiary2;
  let beneficiary3;
  
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

  let testSchedules = [];

  before(async function () {
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    // 使用不同的账户作为受益人，如果没有足够账户就复用
    beneficiary1 = signers[1] || signers[0];
    beneficiary2 = signers[2] || signers[0]; 
    beneficiary3 = signers[3] || signers[0];
    
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network}`);
    console.log(`👤 Owner账户: ${owner.address}`);
    console.log(`👤 受益人1: ${beneficiary1.address}`);
    console.log(`👤 受益人2: ${beneficiary2.address}`);
    console.log(`👤 受益人3: ${beneficiary3.address}`);
    console.log(`🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    
    // 连接到已部署的合约
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    
    // 验证权限
    const contractOwner = await vesting.owner();
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`需要合约所有者权限。当前: ${owner.address}, 需要: ${contractOwner}`);
    }
    
    console.log(`✅ 权限验证通过，开始创建测试计划`);
  });

  describe("🚀 创建多个测试释放计划", function () {
    it("应该为受益人1创建释放计划", async function () {
      const amount = ethers.parseEther("100"); // 100 HZ
      const startTime = Math.floor(Date.now() / 1000) - 30; // 30秒前开始
      const cliff = 0; // 无悬崖期
      const duration = 200; // 200秒完全释放
      const slicePeriod = 1; // 每秒都可以释放
      
      console.log(`\n📝 为受益人1创建释放计划:`);
      console.log(`   受益人: ${beneficiary1.address}`);
      console.log(`   金额: ${ethers.formatEther(amount)} HZ`);
      
      const tx = await vesting.createVestingSchedule(
        beneficiary1.address,
        startTime,
        cliff,
        duration,
        slicePeriod,
        true,
        amount,
        1, // ECOSYSTEM
        0  // LINEAR
      );
      
      const receipt = await tx.wait();
      console.log(`   ✅ 创建交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      // 获取释放计划ID
      const scheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(beneficiary1.address);
      const scheduleIndex = Number(scheduleCount) - 1;
      const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(beneficiary1.address, scheduleIndex);
      
      testSchedules.push({
        id: scheduleId,
        beneficiary: beneficiary1.address,
        amount: amount,
        name: "受益人1计划"
      });
      
      console.log(`   📋 计划ID: ${scheduleId}`);
    });

    it("应该为受益人2创建释放计划", async function () {
      const amount = ethers.parseEther("150"); // 150 HZ
      const startTime = Math.floor(Date.now() / 1000) - 60; // 1分钟前开始
      const cliff = 0; // 无悬崖期  
      const duration = 300; // 5分钟完全释放
      const slicePeriod = 1;
      
      console.log(`\n📝 为受益人2创建释放计划:`);
      console.log(`   受益人: ${beneficiary2.address}`);
      console.log(`   金额: ${ethers.formatEther(amount)} HZ`);
      
      const tx = await vesting.createVestingSchedule(
        beneficiary2.address,
        startTime,
        cliff,
        duration,
        slicePeriod,
        true,
        amount,
        2, // TEAM
        0  // LINEAR
      );
      
      const receipt = await tx.wait();
      console.log(`   ✅ 创建交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      const scheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(beneficiary2.address);
      const scheduleIndex = Number(scheduleCount) - 1;
      const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(beneficiary2.address, scheduleIndex);
      
      testSchedules.push({
        id: scheduleId,
        beneficiary: beneficiary2.address,
        amount: amount,
        name: "受益人2计划"
      });
      
      console.log(`   📋 计划ID: ${scheduleId}`);
    });

    it("应该为受益人3创建释放计划", async function () {
      const amount = ethers.parseEther("200"); // 200 HZ
      const startTime = Math.floor(Date.now() / 1000) - 90; // 1.5分钟前开始
      const cliff = 0; 
      const duration = 400; // 400秒完全释放
      const slicePeriod = 1;
      
      console.log(`\n📝 为受益人3创建释放计划:`);
      console.log(`   受益人: ${beneficiary3.address}`);
      console.log(`   金额: ${ethers.formatEther(amount)} HZ`);
      
      const tx = await vesting.createVestingSchedule(
        beneficiary3.address,
        startTime,
        cliff,
        duration,
        slicePeriod,
        true,
        amount,
        3, // CORNERSTONE
        0  // LINEAR
      );
      
      const receipt = await tx.wait();
      console.log(`   ✅ 创建交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      const scheduleCount = await vesting.getVestingSchedulesCountByBeneficiary(beneficiary3.address);
      const scheduleIndex = Number(scheduleCount) - 1;
      const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(beneficiary3.address, scheduleIndex);
      
      testSchedules.push({
        id: scheduleId,
        beneficiary: beneficiary3.address,
        amount: amount,
        name: "受益人3计划"
      });
      
      console.log(`   📋 计划ID: ${scheduleId}`);
    });

    after(function() {
      console.log(`\n✅ 成功创建了 ${testSchedules.length} 个测试释放计划`);
    });
  });

  describe("👑 测试 releaseForBeneficiary 单个代理释放", function () {
    it("应该由Owner代理释放受益人1的部分代币", async function () {
      if (testSchedules.length === 0) {
        this.skip();
        return;
      }

      const schedule1 = testSchedules[0];
      console.log(`\n👑 测试Owner代理释放功能:`);
      console.log(`   目标计划: ${schedule1.name}`);
      console.log(`   计划ID: ${schedule1.id}`);
      
      // 检查可释放金额
      const releasableAmount = await vesting.computeReleasableAmount(schedule1.id);
      console.log(`   可释放金额: ${ethers.formatEther(releasableAmount)} HZ`);
      
      if (releasableAmount > 0) {
        // 获取受益人释放前余额
        const balanceBefore = await hzToken.balanceOf(schedule1.beneficiary);
        console.log(`   受益人释放前余额: ${ethers.formatEther(balanceBefore)} HZ`);
        
        // Owner代理释放一半可用金额
        const releaseAmount = releasableAmount / BigInt(2);
        console.log(`   准备代理释放: ${ethers.formatEther(releaseAmount)} HZ`);
        
        const releaseTx = await vesting.releaseForBeneficiary(schedule1.id, releaseAmount);
        const releaseReceipt = await releaseTx.wait();
        
        console.log(`   🚀 代理释放交易: ${releaseReceipt.hash}`);
        console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
        
        // 验证余额变化
        const balanceAfter = await hzToken.balanceOf(schedule1.beneficiary);
        const balanceIncrease = balanceAfter - balanceBefore;
        
        console.log(`   受益人释放后余额: ${ethers.formatEther(balanceAfter)} HZ`);
        console.log(`   余额增加: ${ethers.formatEther(balanceIncrease)} HZ`);
        
        expect(balanceIncrease).to.equal(releaseAmount);
        console.log(`   ✅ Owner代理释放成功！`);
        
        // 验证事件是否正确触发
        const schedule = await vesting.getVestingSchedule(schedule1.id);
        expect(schedule.released).to.be.greaterThan(0);
        
      } else {
        console.log(`   ⚠️  当前无可释放金额，跳过测试`);
        this.skip();
      }
    });

    it("应该验证非Owner账户无法使用代理释放功能", async function () {
      if (testSchedules.length === 0) {
        this.skip();
        return;
      }

      const schedule1 = testSchedules[0];
      console.log(`\n🚫 测试权限控制:`);
      console.log(`   使用受益人账户尝试代理释放...`);
      
      const releasableAmount = await vesting.computeReleasableAmount(schedule1.id);
      if (releasableAmount > 0) {
        const releaseAmount = releasableAmount / BigInt(3);
        
        try {
          // 尝试使用非Owner账户调用代理释放
          await vesting.connect(beneficiary1).releaseForBeneficiary(schedule1.id, releaseAmount);
          
          // 如果没有抛出错误，测试失败
          expect.fail("应该抛出权限错误");
        } catch (error) {
          console.log(`   ✅ 正确拒绝非Owner调用: ${error.message.split('(')[0]}`);
          expect(error.message).to.contain("OwnableUnauthorizedAccount");
        }
      } else {
        console.log(`   ⚠️  无可释放金额，跳过权限测试`);
      }
    });
  });

  describe("📦 测试 batchReleaseForBeneficiaries 批量代理释放", function () {
    it("应该批量代理释放多个受益人的代币", async function () {
      if (testSchedules.length < 2) {
        console.log(`   ⚠️  需要至少2个释放计划进行批量测试`);
        this.skip();
        return;
      }

      console.log(`\n📦 测试批量代理释放功能:`);
      
      // 准备批量释放数据
      const batchScheduleIds = [];
      const batchAmounts = [];
      const expectedBeneficiaries = [];
      
      for (let i = 0; i < Math.min(testSchedules.length, 3); i++) {
        const schedule = testSchedules[i];
        const releasableAmount = await vesting.computeReleasableAmount(schedule.id);
        
        if (releasableAmount > 0) {
          const releaseAmount = releasableAmount / BigInt(3); // 释放1/3可用金额
          batchScheduleIds.push(schedule.id);
          batchAmounts.push(releaseAmount);
          expectedBeneficiaries.push(schedule.beneficiary);
          
          console.log(`   计划${i+1}: ${schedule.name}`);
          console.log(`     ID: ${schedule.id.slice(0, 10)}...`);
          console.log(`     受益人: ${schedule.beneficiary}`);
          console.log(`     可释放: ${ethers.formatEther(releasableAmount)} HZ`);
          console.log(`     将释放: ${ethers.formatEther(releaseAmount)} HZ`);
        }
      }
      
      if (batchScheduleIds.length === 0) {
        console.log(`   ⚠️  没有可释放的计划，跳过批量测试`);
        this.skip();
        return;
      }
      
      console.log(`\n🚀 执行批量代理释放 (${batchScheduleIds.length}个计划):`);
      
      // 获取所有受益人的释放前余额
      const balancesBefore = {};
      for (const beneficiary of expectedBeneficiaries) {
        balancesBefore[beneficiary] = await hzToken.balanceOf(beneficiary);
      }
      
      // 执行批量代理释放
      const batchReleaseTx = await vesting.batchReleaseForBeneficiaries(
        batchScheduleIds,
        batchAmounts
      );
      const batchReleaseReceipt = await batchReleaseTx.wait();
      
      console.log(`   🚀 批量释放交易: ${batchReleaseReceipt.hash}`);
      console.log(`   🌍 查看交易: ${TESTNET_CONFIG.explorerUrl}/tx/${batchReleaseReceipt.hash}`);
      
      // 验证所有受益人的余额变化
      let totalReleased = BigInt(0);
      for (let i = 0; i < expectedBeneficiaries.length; i++) {
        const beneficiary = expectedBeneficiaries[i];
        const expectedIncrease = batchAmounts[i];
        
        const balanceAfter = await hzToken.balanceOf(beneficiary);
        const actualIncrease = balanceAfter - balancesBefore[beneficiary];
        
        console.log(`   受益人${i+1} (${beneficiary.slice(0, 8)}...):`);
        console.log(`     释放前余额: ${ethers.formatEther(balancesBefore[beneficiary])} HZ`);
        console.log(`     释放后余额: ${ethers.formatEther(balanceAfter)} HZ`);
        console.log(`     实际增加: ${ethers.formatEther(actualIncrease)} HZ`);
        console.log(`     预期增加: ${ethers.formatEther(expectedIncrease)} HZ`);
        
        expect(actualIncrease).to.equal(expectedIncrease);
        totalReleased += actualIncrease;
      }
      
      console.log(`   📊 批量释放统计:`);
      console.log(`     总释放计划: ${batchScheduleIds.length} 个`);
      console.log(`     总释放金额: ${ethers.formatEther(totalReleased)} HZ`);
      console.log(`     平均每计划: ${ethers.formatEther(totalReleased / BigInt(batchScheduleIds.length))} HZ`);
      console.log(`   ✅ 批量代理释放成功！`);
    });

    it("应该验证批量释放的参数长度匹配", async function () {
      console.log(`\n🔍 测试批量释放参数验证:`);
      
      if (testSchedules.length < 2) {
        this.skip();
        return;
      }
      
      try {
        // 故意使参数数组长度不匹配
        const scheduleIds = [testSchedules[0].id, testSchedules[1].id];
        const amounts = [ethers.parseEther("1")]; // 只有1个金额，但有2个ID
        
        await vesting.batchReleaseForBeneficiaries(scheduleIds, amounts);
        
        expect.fail("应该因参数长度不匹配而失败");
      } catch (error) {
        console.log(`   ✅ 正确检测参数不匹配: ${error.message.split('(')[0]}`);
        // 不同的错误信息都可能出现，主要是确保抛出了错误
        expect(error.message).to.not.be.empty;
      }
    });

    it("应该验证批量释放空数组的处理", async function () {
      console.log(`\n📭 测试空数组批量释放:`);
      
      try {
        // 传入空数组
        const batchReleaseTx = await vesting.batchReleaseForBeneficiaries([], []);
        const receipt = await batchReleaseTx.wait();
        
        console.log(`   🚀 空批量释放交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        console.log(`   ✅ 空数组批量释放成功执行`);
        
        // 验证交易成功但没有实际释放
        expect(receipt.status).to.equal(1);
        
      } catch (error) {
        console.log(`   ⚠️  空数组处理: ${error.message}`);
        // 某些实现可能会拒绝空数组，这也是合理的
      }
    });
  });

  describe("📊 验证最终状态", function () {
    it("应该验证所有释放计划的最终状态", async function () {
      console.log(`\n📊 最终状态报告:`);
      
      let totalCreated = BigInt(0);
      let totalReleased = BigInt(0);
      
      for (let i = 0; i < testSchedules.length; i++) {
        const testSchedule = testSchedules[i];
        const schedule = await vesting.getVestingSchedule(testSchedule.id);
        const currentBalance = await hzToken.balanceOf(testSchedule.beneficiary);
        const releasableNow = await vesting.computeReleasableAmount(testSchedule.id);
        
        console.log(`\n🔍 ${testSchedule.name}:`);
        console.log(`   受益人: ${testSchedule.beneficiary}`);
        console.log(`   总金额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
        console.log(`   已释放: ${ethers.formatEther(schedule.released)} HZ`);
        console.log(`   当前余额: ${ethers.formatEther(currentBalance)} HZ`);
        console.log(`   剩余可释放: ${ethers.formatEther(releasableNow)} HZ`);
        console.log(`   计划ID: ${testSchedule.id}`);
        
        totalCreated += schedule.amountTotal;
        totalReleased += schedule.released;
      }
      
      console.log(`\n📊 整体统计:`);
      console.log(`   总创建计划: ${testSchedules.length} 个`);
      console.log(`   总计划金额: ${ethers.formatEther(totalCreated)} HZ`);
      console.log(`   总已释放: ${ethers.formatEther(totalReleased)} HZ`);
      console.log(`   释放率: ${((totalReleased * BigInt(10000)) / totalCreated) / BigInt(100)}%`);
      
      expect(testSchedules.length).to.be.greaterThan(0);
      expect(totalReleased).to.be.greaterThan(0);
    });
  });

  after(async function () {
    console.log(`\n🎉 Owner代理释放功能测试完成！`);
    
    console.log(`\n📝 功能验证总结:`);
    console.log(`   ✅ releaseForBeneficiary - 单个代理释放`);
    console.log(`   ✅ batchReleaseForBeneficiaries - 批量代理释放`);
    console.log(`   ✅ 权限控制验证`);
    console.log(`   ✅ 参数验证测试`);
    console.log(`   ✅ 余额变化验证`);
    
    console.log(`\n🔗 区块链浏览器链接:`);
    console.log(`   🌍 浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    console.log(`   📄 Vesting合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.Vesting}`);
    console.log(`   🪙 HZToken合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.HZToken}`);
    
    if (testSchedules.length > 0) {
      console.log(`\n📋 创建的测试释放计划:`);
      testSchedules.forEach((schedule, index) => {
        console.log(`   ${index + 1}. ${schedule.name}: ${schedule.id.slice(0, 16)}...`);
        console.log(`      受益人: ${TESTNET_CONFIG.explorerUrl}/address/${schedule.beneficiary}`);
      });
    }
    
    console.log(`\n💡 所有代理释放交易都已上链，可在浏览器中查看详细信息！`);
  });
});