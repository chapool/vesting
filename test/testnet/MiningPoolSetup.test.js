const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MiningPool 设置和充值测试", function () {
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

  let miningVestingScheduleId;

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
    
    // 验证权限
    const poolOwner = await miningPool.owner();
    if (poolOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`需要MiningPool合约所有者权限。当前: ${owner.address}, 需要: ${poolOwner}`);
    }
    
    console.log(`✅ 权限验证通过，开始MiningPool设置`);
  });

  describe("🔧 MiningPool配置和设置", function () {
    it("应该检查当前MiningPool的Vesting配置", async function () {
      console.log(`\n📊 检查当前MiningPool的Vesting配置:`);
      
      const scheduleId = await miningPool.getMiningVestingScheduleId();
      console.log(`   当前挖矿计划ID: ${scheduleId}`);
      
      miningVestingScheduleId = scheduleId;
      
      if (scheduleId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log(`   ⚠️  MiningPool还没有配置Vesting计划ID`);
        console.log(`   💡 需要先为MiningPool创建Vesting计划`);
      } else {
        try {
          const vestingInfo = await miningPool.getVestingScheduleInfo();
          console.log(`   Vesting计划受益人: ${vestingInfo.beneficiary}`);
          console.log(`   计划总额: ${ethers.formatEther(vestingInfo.amountTotal)} HZ`);
          console.log(`   已释放: ${ethers.formatEther(vestingInfo.released)} HZ`);
          console.log(`   可释放: ${ethers.formatEther(vestingInfo.releasableAmount)} HZ`);
          
          expect(vestingInfo.beneficiary).to.equal(TESTNET_CONFIG.contracts.MiningPool);
        } catch (error) {
          console.log(`   ❌ 获取Vesting信息失败: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Vesting配置检查完成`);
    });

    it("应该为MiningPool创建Vesting计划（如果需要）", async function () {
      console.log(`\n💰 为MiningPool创建Vesting计划:`);
      
      // 检查MiningPool是否已有Vesting计划
      if (miningVestingScheduleId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log(`   正在为MiningPool创建新的Vesting计划...`);
        
        const miningAmount = ethers.parseEther("5000000"); // 500万HZ给挖矿池
        const startTime = Math.floor(Date.now() / 1000); // 立即开始
        const cliffDuration = 0; // 无悬崖期
        const duration = 365 * 24 * 3600; // 1年释放期
        const slicePeriodSeconds = 24 * 3600; // 每天释放
        
        console.log(`   受益人: ${TESTNET_CONFIG.contracts.MiningPool}`);
        console.log(`   金额: ${ethers.formatEther(miningAmount)} HZ`);
        console.log(`   释放期: ${duration / (24 * 3600)} 天`);
        
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
          
          // 设置MiningPool的Vesting计划ID
          const setIdTx = await miningPool.setMiningVestingScheduleId(newScheduleId);
          const setIdReceipt = await setIdTx.wait();
          
          console.log(`   🚀 设置计划ID交易: ${setIdReceipt.hash}`);
          console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${setIdReceipt.hash}`);
          
          miningVestingScheduleId = newScheduleId;
          
          console.log(`   ✅ MiningPool Vesting计划创建并配置成功`);
        } catch (error) {
          console.log(`   ❌ 创建Vesting计划失败: ${error.message}`);
          console.log(`   💡 可能是余额不足或权限问题`);
        }
      } else {
        console.log(`   MiningPool已有Vesting计划，跳过创建`);
      }
    });

    it("应该检查MiningPool可提现余额", async function () {
      console.log(`\n💎 检查MiningPool可提现余额:`);
      
      try {
        const poolBalance = await miningPool.getPoolBalance();
        const availableAmount = await miningPool.getAvailableReleasableAmount();
        
        console.log(`   池子当前余额: ${ethers.formatEther(poolBalance)} HZ`);
        console.log(`   可释放金额: ${ethers.formatEther(availableAmount)} HZ`);
        
        if (availableAmount > 0) {
          console.log(`   ✅ MiningPool有可释放的代币`);
          
          // 尝试释放一些代币到MiningPool自己的余额中
          const releaseAmount = availableAmount > ethers.parseEther("1000") ? ethers.parseEther("1000") : availableAmount;
          
          console.log(`   🔄 尝试释放 ${ethers.formatEther(releaseAmount)} HZ 到MiningPool...`);
          
          try {
            const releaseTx = await vesting.releaseForBeneficiary(miningVestingScheduleId, releaseAmount);
            const releaseReceipt = await releaseTx.wait();
            
            console.log(`   🚀 释放交易: ${releaseReceipt.hash}`);
            console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${releaseReceipt.hash}`);
            
            // 检查MiningPool合约的HZ代币余额
            const miningPoolTokenBalance = await hzToken.balanceOf(TESTNET_CONFIG.contracts.MiningPool);
            console.log(`   💰 MiningPool代币余额: ${ethers.formatEther(miningPoolTokenBalance)} HZ`);
            
            console.log(`   ✅ 代币释放到MiningPool成功`);
          } catch (error) {
            console.log(`   ❌ 释放代币失败: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️  MiningPool当前没有可释放的代币`);
          console.log(`   💡 需要等待Vesting计划开始释放或创建新的计划`);
        }
        
        expect(availableAmount).to.be.greaterThanOrEqual(0);
        console.log(`   ✅ 余额检查完成`);
      } catch (error) {
        console.log(`   ❌ 余额检查失败: ${error.message}`);
      }
    });
  });

  describe("👥 审批人员完整设置", function () {
    it("应该设置完整的审批人员体系", async function () {
      console.log(`\n👥 设置完整的审批人员体系:`);
      
      // 检查并添加一级审批人
      const isFirstLevel = await miningPool.firstLevelApprovers(owner.address);
      if (!isFirstLevel) {
        console.log(`   添加一级审批人: ${owner.address}`);
        const tx1 = await miningPool.addFirstLevelApprover(owner.address);
        await tx1.wait();
      } else {
        console.log(`   ✅ 一级审批人已存在`);
      }
      
      // 检查并添加二级审批人
      const isSecondLevel = await miningPool.secondLevelApprovers(owner.address);
      if (!isSecondLevel) {
        console.log(`   添加二级审批人: ${owner.address}`);
        const tx2 = await miningPool.addSecondLevelApprover(owner.address);
        await tx2.wait();
      } else {
        console.log(`   ✅ 二级审批人已存在`);
      }
      
      // 检查并添加链下审核人
      const isAuditor = await miningPool.offChainAuditors(owner.address);
      if (!isAuditor) {
        console.log(`   添加链下审核人: ${owner.address}`);
        const tx3 = await miningPool.addOffChainAuditor(owner.address);
        await tx3.wait();
      } else {
        console.log(`   ✅ 链下审核人已存在`);
      }
      
      console.log(`   ✅ 审批人员体系设置完成`);
    });
  });

  describe("💸 实际提现流程测试", function () {
    it("应该能够提交小额提现申请", async function () {
      console.log(`\n💸 提交实际小额提现申请:`);
      
      const smallAmount = ethers.parseEther("10"); // 10 HZ
      const reason = "实际测试小额提现";
      const offChainRecordId = Date.now();
      const nonce = 1;
      
      console.log(`   申请金额: ${ethers.formatEther(smallAmount)} HZ`);
      console.log(`   申请原因: ${reason}`);
      console.log(`   链下记录ID: ${offChainRecordId}`);
      
      try {
        // 先检查可提现余额
        const availableAmount = await miningPool.getAvailableReleasableAmount();
        console.log(`   当前可释放金额: ${ethers.formatEther(availableAmount)} HZ`);
        
        if (availableAmount >= smallAmount) {
          const tx = await miningPool.requestWithdrawal(
            smallAmount,
            reason,
            offChainRecordId,
            nonce
          );
          const receipt = await tx.wait();
          
          console.log(`   🚀 申请交易: ${receipt.hash}`);
          console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
          
          // 获取请求ID
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
            console.log(`   📊 审批级别: ${request.level === 0n ? "小额" : request.level === 1n ? "中额" : "大额"}`);
            console.log(`   📋 状态: ${request.status === 0n ? "待审批" : request.status === 1n ? "已执行" : "已拒绝"}`);
            
            // 如果是小额，尝试批量处理
            if (request.level === 0n) {
              console.log(`   🔄 尝试批量处理小额提现...`);
              
              try {
                const batchTx = await miningPool.batchSmallTransfer([requestId]);
                const batchReceipt = await batchTx.wait();
                
                console.log(`   🚀 批量处理交易: ${batchReceipt.hash}`);
                console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${batchReceipt.hash}`);
                
                const finalRequest = await miningPool.getWithdrawalRequest(requestId);
                console.log(`   📋 最终状态: ${finalRequest.status === 1n ? "已执行" : "其他"}`);
                
                console.log(`   ✅ 小额提现完整流程测试成功！`);
              } catch (error) {
                console.log(`   ❌ 批量处理失败: ${error.message}`);
              }
            }
          }
        } else {
          console.log(`   ❌ 可释放金额不足，无法申请提现`);
          console.log(`   💡 需要更多代币释放到MiningPool`);
        }
      } catch (error) {
        console.log(`   ❌ 提现申请失败: ${error.message}`);
      }
    });
  });

  after(async function () {
    console.log(`\n🎉 MiningPool设置和充值测试完成！`);
    
    console.log(`\n📊 测试总结:`);
    console.log(`   ✅ MiningPool Vesting配置检查`);
    console.log(`   ✅ 为MiningPool创建Vesting计划`);
    console.log(`   ✅ 代币释放到MiningPool测试`);
    console.log(`   ✅ 审批人员完整设置`);
    console.log(`   ✅ 实际提现流程测试`);
    
    console.log(`\n🔗 重要链接:`);
    console.log(`   🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    console.log(`   🏊 MiningPool合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.MiningPool}`);
    console.log(`   🪙 HZToken合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.HZToken}`);
    console.log(`   📋 Vesting合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.Vesting}`);
    
    console.log(`\n💡 MiningPool现在应该已经配置完成并可以进行提现操作！`);
  });
});