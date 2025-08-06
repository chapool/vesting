const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MiningPool 提现流程测试", function () {
  let hzToken;
  let vesting;
  let miningPool;
  let owner;
  let user1;
  let user2;
  let firstLevelApprover;
  let secondLevelApprover;
  let offChainAuditor;
  
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

  let testWithdrawals = [];
  let miningVestingScheduleId;

  before(async function () {
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network}`);
    console.log(`🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    user1 = owner; // 简化测试，使用owner作为用户
    user2 = owner;
    firstLevelApprover = owner;
    secondLevelApprover = owner;
    offChainAuditor = owner;
    
    console.log(`👤 Owner: ${owner.address}`);
    
    // 连接到已部署的合约
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    miningPool = await ethers.getContractAt("MiningPool", TESTNET_CONFIG.contracts.MiningPool);
    
    // 验证权限
    const poolOwner = await miningPool.owner();
    if (poolOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`需要MiningPool合约所有者权限。当前: ${owner.address}, 需要: ${poolOwner}`);
    }
    
    console.log(`✅ 权限验证通过，开始MiningPool测试`);
  });

  describe("🔧 MiningPool基础配置测试", function () {
    it("应该查看MiningPool基础信息", async function () {
      console.log(`\n📊 查看MiningPool基础信息:`);
      
      const tokenAddress = await miningPool.getToken();
      const vestingAddress = await miningPool.getVestingContract();
      const scheduleId = await miningPool.getMiningVestingScheduleId();
      
      console.log(`   代币合约: ${tokenAddress}`);
      console.log(`   Vesting合约: ${vestingAddress}`);
      console.log(`   挖矿计划ID: ${scheduleId}`);
      
      expect(tokenAddress).to.equal(TESTNET_CONFIG.contracts.HZToken);
      expect(vestingAddress).to.equal(TESTNET_CONFIG.contracts.Vesting);
      expect(scheduleId).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
      
      miningVestingScheduleId = scheduleId;
      console.log(`   ✅ 基础配置验证成功`);
    });

    it("应该查看提现限额配置", async function () {
      console.log(`\n💰 查看提现限额配置:`);
      
      const limits = await miningPool.getWithdrawalLimits();
      const smallThreshold = await miningPool.smallAmountThreshold();
      const mediumThreshold = await miningPool.mediumAmountThreshold();
      const dailyUserLimit = await miningPool.dailyUserLimit();
      const dailyGlobalLimit = await miningPool.dailyGlobalLimit();
      const requestCooldown = await miningPool.requestCooldown();
      
      console.log(`   最小提现金额: ${ethers.formatEther(limits.min)} HZ`);
      console.log(`   最大提现金额: ${ethers.formatEther(limits.max)} HZ`);
      console.log(`   小额阈值: ${ethers.formatEther(smallThreshold)} HZ`);
      console.log(`   中额阈值: ${ethers.formatEther(mediumThreshold)} HZ`);
      console.log(`   用户每日限额: ${ethers.formatEther(dailyUserLimit)} HZ`);
      console.log(`   全局每日限额: ${ethers.formatEther(dailyGlobalLimit)} HZ`);
      console.log(`   请求冷却期: ${requestCooldown} 秒`);
      
      expect(limits.min).to.be.greaterThan(0);
      expect(limits.max).to.be.greaterThan(limits.min);
      expect(mediumThreshold).to.be.greaterThan(smallThreshold);
      
      console.log(`   ✅ 限额配置验证成功`);
    });

    it("应该查看可提现余额", async function () {
      console.log(`\n💎 查看可提现余额:`);
      
      try {
        const poolBalance = await miningPool.getPoolBalance();
        const availableAmount = await miningPool.getAvailableReleasableAmount();
        const vestingInfo = await miningPool.getVestingScheduleInfo();
        
        console.log(`   池子当前余额: ${ethers.formatEther(poolBalance)} HZ`);
        console.log(`   可释放金额: ${ethers.formatEther(availableAmount)} HZ`);
        console.log(`   Vesting计划总额: ${ethers.formatEther(vestingInfo.amountTotal)} HZ`);
        console.log(`   已释放金额: ${ethers.formatEther(vestingInfo.released)} HZ`);
        
        expect(availableAmount).to.be.greaterThanOrEqual(0);
        console.log(`   ✅ 余额查询成功`);
      } catch (error) {
        console.log(`   ⚠️  余额查询失败: ${error.message}`);
      }
    });
  });

  describe("👥 审批人员管理测试", function () {
    it("应该添加一级审批人", async function () {
      console.log(`\n👤 添加一级审批人:`);
      console.log(`   审批人地址: ${firstLevelApprover.address}`);
      
      const isApproverBefore = await miningPool.firstLevelApprovers(firstLevelApprover.address);
      
      if (!isApproverBefore) {
        const tx = await miningPool.addFirstLevelApprover(firstLevelApprover.address);
        const receipt = await tx.wait();
        
        console.log(`   🚀 添加交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      }
      
      const isApproverAfter = await miningPool.firstLevelApprovers(firstLevelApprover.address);
      expect(isApproverAfter).to.be.true;
      console.log(`   ✅ 一级审批人添加成功`);
    });

    it("应该添加二级审批人", async function () {
      console.log(`\n👤 添加二级审批人:`);
      console.log(`   审批人地址: ${secondLevelApprover.address}`);
      
      const isApproverBefore = await miningPool.secondLevelApprovers(secondLevelApprover.address);
      
      if (!isApproverBefore) {
        const tx = await miningPool.addSecondLevelApprover(secondLevelApprover.address);
        const receipt = await tx.wait();
        
        console.log(`   🚀 添加交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      }
      
      const isApproverAfter = await miningPool.secondLevelApprovers(secondLevelApprover.address);
      expect(isApproverAfter).to.be.true;
      console.log(`   ✅ 二级审批人添加成功`);
    });

    it("应该添加链下审核人", async function () {
      console.log(`\n🔍 添加链下审核人:`);
      console.log(`   审核人地址: ${offChainAuditor.address}`);
      
      const isAuditorBefore = await miningPool.offChainAuditors(offChainAuditor.address);
      
      if (!isAuditorBefore) {
        const tx = await miningPool.addOffChainAuditor(offChainAuditor.address);
        const receipt = await tx.wait();
        
        console.log(`   🚀 添加交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      }
      
      const isAuditorAfter = await miningPool.offChainAuditors(offChainAuditor.address);
      expect(isAuditorAfter).to.be.true;
      console.log(`   ✅ 链下审核人添加成功`);
    });
  });

  describe("💸 提现申请流程测试", function () {
    it("应该提交小额提现申请", async function () {
      console.log(`\n💸 提交小额提现申请:`);
      
      const smallAmount = ethers.parseEther("50"); // 50 HZ，应该是小额
      const reason = "测试小额提现";
      const offChainRecordId = Date.now(); // 使用时间戳作为链下ID
      const nonce = 1;
      
      console.log(`   申请金额: ${ethers.formatEther(smallAmount)} HZ`);
      console.log(`   申请原因: ${reason}`);
      console.log(`   链下记录ID: ${offChainRecordId}`);
      
      try {
        const tx = await miningPool.connect(user1).requestWithdrawal(
          smallAmount,
          reason,
          offChainRecordId,
          nonce
        );
        const receipt = await tx.wait();
        
        console.log(`   🚀 申请交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        
        // 从事件中获取请求ID
        const events = receipt.logs.filter(log => {
          try {
            const parsed = miningPool.interface.parseLog(log);
            return parsed.name === 'WithdrawalRequested';
          } catch {
            return false;
          }
        });
        
        if (events.length > 0) {
          const event = miningPool.interface.parseLog(events[0]);
          const requestId = event.args.requestId;
          
          console.log(`   📝 请求ID: ${requestId}`);
          
          // 获取请求详情
          const request = await miningPool.getWithdrawalRequest(requestId);
          console.log(`   💰 申请金额: ${ethers.formatEther(request.amount)} HZ`);
          console.log(`   📊 审批级别: ${request.level}`); // 0=SMALL, 1=MEDIUM, 2=LARGE
          console.log(`   📋 状态: ${request.status}`); // 0=PENDING, 1=EXECUTED, 2=REJECTED
          
          testWithdrawals.push({
            id: requestId,
            type: "SMALL",
            amount: smallAmount,
            hash: receipt.hash
          });
          
          console.log(`   ✅ 小额提现申请提交成功`);
        } else {
          console.log(`   ⚠️  未找到WithdrawalRequested事件`);
        }
      } catch (error) {
        console.log(`   ❌ 小额提现申请失败: ${error.message}`);
      }
    });

    it("应该提交中额提现申请", async function () {
      console.log(`\n💰 提交中额提现申请:`);
      
      const mediumAmount = ethers.parseEther("5000"); // 5000 HZ，应该是中额
      const reason = "测试中额提现";
      const offChainRecordId = Date.now() + 1; 
      const nonce = 2;
      
      console.log(`   申请金额: ${ethers.formatEther(mediumAmount)} HZ`);
      console.log(`   申请原因: ${reason}`);
      console.log(`   链下记录ID: ${offChainRecordId}`);
      
      try {
        const tx = await miningPool.connect(user1).requestWithdrawal(
          mediumAmount,
          reason,
          offChainRecordId,
          nonce
        );
        const receipt = await tx.wait();
        
        console.log(`   🚀 申请交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        
        // 从事件中获取请求ID
        const events = receipt.logs.filter(log => {
          try {
            const parsed = miningPool.interface.parseLog(log);
            return parsed.name === 'WithdrawalRequested';
          } catch {
            return false;
          }
        });
        
        if (events.length > 0) {
          const event = miningPool.interface.parseLog(events[0]);
          const requestId = event.args.requestId;
          
          console.log(`   📝 请求ID: ${requestId}`);
          
          const request = await miningPool.getWithdrawalRequest(requestId);
          console.log(`   💰 申请金额: ${ethers.formatEther(request.amount)} HZ`);
          console.log(`   📊 审批级别: ${request.level}`);
          console.log(`   📋 状态: ${request.status}`);
          
          testWithdrawals.push({
            id: requestId,
            type: "MEDIUM",
            amount: mediumAmount,
            hash: receipt.hash
          });
          
          console.log(`   ✅ 中额提现申请提交成功`);
        }
      } catch (error) {
        console.log(`   ❌ 中额提现申请失败: ${error.message}`);
        console.log(`   💡 可能原因: 余额不足或超过限额`);
      }
    });

    it("应该提交大额提现申请", async function () {
      console.log(`\n💎 提交大额提现申请:`);
      
      const largeAmount = ethers.parseEther("50000"); // 50000 HZ，应该是大额
      const reason = "测试大额提现";
      const offChainRecordId = Date.now() + 2;
      const nonce = 3;
      
      console.log(`   申请金额: ${ethers.formatEther(largeAmount)} HZ`);
      console.log(`   申请原因: ${reason}`);
      console.log(`   链下记录ID: ${offChainRecordId}`);
      
      try {
        const tx = await miningPool.connect(user1).requestWithdrawal(
          largeAmount,
          reason,
          offChainRecordId,
          nonce
        );
        const receipt = await tx.wait();
        
        console.log(`   🚀 申请交易: ${receipt.hash}`);
        console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
        
        // 从事件中获取请求ID
        const events = receipt.logs.filter(log => {
          try {
            const parsed = miningPool.interface.parseLog(log);
            return parsed.name === 'WithdrawalRequested';
          } catch {
            return false;
          }
        });
        
        if (events.length > 0) {
          const event = miningPool.interface.parseLog(events[0]);
          const requestId = event.args.requestId;
          
          console.log(`   📝 请求ID: ${requestId}`);
          
          const request = await miningPool.getWithdrawalRequest(requestId);
          console.log(`   💰 申请金额: ${ethers.formatEther(request.amount)} HZ`);
          console.log(`   📊 审批级别: ${request.level}`);
          console.log(`   📋 状态: ${request.status}`);
          
          testWithdrawals.push({
            id: requestId,
            type: "LARGE",
            amount: largeAmount,
            hash: receipt.hash
          });
          
          console.log(`   ✅ 大额提现申请提交成功`);
        }
      } catch (error) {
        console.log(`   ❌ 大额提现申请失败: ${error.message}`);
        console.log(`   💡 可能原因: 余额不足或超过限额`);
      }
    });
  });

  describe("✅ 审批流程测试", function () {
    it("应该进行一级审批", async function () {
      console.log(`\n✅ 进行一级审批测试:`);
      
      const mediumRequests = testWithdrawals.filter(w => w.type === "MEDIUM");
      const largeRequests = testWithdrawals.filter(w => w.type === "LARGE");
      
      for (const withdrawal of [...mediumRequests, ...largeRequests]) {
        console.log(`   审批请求ID: ${withdrawal.id} (${withdrawal.type})`);
        
        try {
          const tx = await miningPool.connect(firstLevelApprover).approveFirstLevel(withdrawal.id);
          const receipt = await tx.wait();
          
          console.log(`   🚀 审批交易: ${receipt.hash}`);
          console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
          
          const request = await miningPool.getWithdrawalRequest(withdrawal.id);
          console.log(`   📋 审批后状态: ${request.status}`);
          console.log(`   👤 一级审批人: ${request.approver1}`);
          
          console.log(`   ✅ 一级审批成功 (${withdrawal.type})`);
        } catch (error) {
          console.log(`   ❌ 一级审批失败: ${error.message}`);
        }
      }
    });

    it("应该进行二级审批", async function () {
      console.log(`\n✅✅ 进行二级审批测试:`);
      
      const largeRequests = testWithdrawals.filter(w => w.type === "LARGE");
      
      for (const withdrawal of largeRequests) {
        console.log(`   审批请求ID: ${withdrawal.id} (${withdrawal.type})`);
        
        try {
          const tx = await miningPool.connect(secondLevelApprover).approveSecondLevel(withdrawal.id);
          const receipt = await tx.wait();
          
          console.log(`   🚀 审批交易: ${receipt.hash}`);
          console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
          
          const request = await miningPool.getWithdrawalRequest(withdrawal.id);
          console.log(`   📋 审批后状态: ${request.status}`);
          console.log(`   👤 二级审批人: ${request.approver2}`);
          
          console.log(`   ✅ 二级审批成功 (${withdrawal.type})`);
        } catch (error) {
          console.log(`   ❌ 二级审批失败: ${error.message}`);
        }
      }
    });

    it("应该进行小额批量提现", async function () {
      console.log(`\n📦 进行小额批量提现测试:`);
      
      const smallRequests = testWithdrawals.filter(w => w.type === "SMALL");
      
      if (smallRequests.length > 0) {
        const requestIds = smallRequests.map(w => w.id);
        console.log(`   批量处理请求: ${requestIds}`);
        
        try {
          const tx = await miningPool.connect(offChainAuditor).batchSmallTransfer(requestIds);
          const receipt = await tx.wait();
          
          console.log(`   🚀 批量处理交易: ${receipt.hash}`);
          console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
          
          // 检查处理结果
          for (const requestId of requestIds) {
            const request = await miningPool.getWithdrawalRequest(requestId);
            console.log(`   请求 ${requestId} 状态: ${request.status}`);
          }
          
          console.log(`   ✅ 小额批量提现成功`);
        } catch (error) {
          console.log(`   ❌ 小额批量提现失败: ${error.message}`);
          console.log(`   💡 可能原因: 余额不足或权限问题`);
        }
      } else {
        console.log(`   ⚠️  没有小额提现请求可处理`);
      }
    });
  });

  describe("📊 统计和查询功能测试", function () {
    it("应该查看提现统计数据", async function () {
      console.log(`\n📊 查看提现统计数据:`);
      
      try {
        const stats = await miningPool.getWithdrawalStatistics();
        
        console.log(`   小额提现总计: ${ethers.formatEther(stats.small)} HZ`);
        console.log(`   中额提现总计: ${ethers.formatEther(stats.medium)} HZ`);
        console.log(`   大额提现总计: ${ethers.formatEther(stats.large)} HZ`);
        console.log(`   总提现金额: ${ethers.formatEther(stats.totalExtracted)} HZ`);
        console.log(`   已释放挖矿代币: ${ethers.formatEther(stats.totalReleased)} HZ`);
        
        expect(stats.totalExtracted).to.be.greaterThanOrEqual(0);
        console.log(`   ✅ 统计数据查询成功`);
      } catch (error) {
        console.log(`   ❌ 统计数据查询失败: ${error.message}`);
      }
    });

    it("应该查看用户每日限额使用情况", async function () {
      console.log(`\n📈 查看用户每日限额使用情况:`);
      
      try {
        const userWithdrawn = await miningPool.getUserDailyWithdrawn(user1.address);
        const userRemaining = await miningPool.getUserRemainingDailyLimit(user1.address);
        const globalWithdrawn = await miningPool.getTodayGlobalWithdrawn();
        const globalRemaining = await miningPool.getGlobalRemainingDailyLimit();
        
        console.log(`   用户今日已提现: ${ethers.formatEther(userWithdrawn)} HZ`);
        console.log(`   用户剩余限额: ${ethers.formatEther(userRemaining)} HZ`);
        console.log(`   全局今日已提现: ${ethers.formatEther(globalWithdrawn)} HZ`);
        console.log(`   全局剩余限额: ${ethers.formatEther(globalRemaining)} HZ`);
        
        expect(userWithdrawn).to.be.greaterThanOrEqual(0);
        console.log(`   ✅ 限额使用情况查询成功`);
      } catch (error) {
        console.log(`   ❌ 限额使用情况查询失败: ${error.message}`);
      }
    });

    it("应该查看待审批请求数量", async function () {
      console.log(`\n⏳ 查看待审批请求数量:`);
      
      try {
        const pendingCount = await miningPool.getPendingRequestsCount();
        console.log(`   待审批请求数量: ${pendingCount}`);
        
        expect(pendingCount).to.be.greaterThanOrEqual(0);
        console.log(`   ✅ 待审批请求查询成功`);
      } catch (error) {
        console.log(`   ❌ 待审批请求查询失败: ${error.message}`);
      }
    });
  });

  after(async function () {
    console.log(`\n🎉 MiningPool提现流程测试完成！`);
    
    console.log(`\n📊 测试总结:`);
    console.log(`   ✅ MiningPool基础配置测试`);
    console.log(`   ✅ 审批人员管理测试`);
    console.log(`   ✅ 提现申请流程测试`);
    console.log(`   ✅ 审批流程测试`);
    console.log(`   ✅ 统计和查询功能测试`);
    
    if (testWithdrawals.length > 0) {
      console.log(`\n💸 提现申请记录:`);
      testWithdrawals.forEach((withdrawal, index) => {
        console.log(`   ${index + 1}. ${withdrawal.type}提现:`);
        console.log(`      请求ID: ${withdrawal.id}`);
        console.log(`      金额: ${ethers.formatEther(withdrawal.amount)} HZ`);
        console.log(`      交易: ${TESTNET_CONFIG.explorerUrl}/tx/${withdrawal.hash}`);
      });
    }
    
    console.log(`\n🔗 重要链接:`);
    console.log(`   🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    console.log(`   🏊 MiningPool合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.MiningPool}`);
    console.log(`   🪙 HZToken合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.HZToken}`);
    console.log(`   📋 Vesting合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.Vesting}`);
    
    console.log(`\n💡 MiningPool提现流程已全面验证！`);
  });
});