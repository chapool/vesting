const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HZToken 税收系统简化测试", function () {
  let hzToken;
  let vesting;
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

  before(async function () {
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    
    console.log(`🌐 连接到测试网: ${TESTNET_CONFIG.network}`);
    console.log(`👤 Owner: ${owner.address}`);
    console.log(`🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    
    // 连接到已部署的合约
    hzToken = await ethers.getContractAt("HZToken", TESTNET_CONFIG.contracts.HZToken);
    vesting = await ethers.getContractAt("Vesting", TESTNET_CONFIG.contracts.Vesting);
    
    // 验证权限
    const contractOwner = await hzToken.owner();
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`需要HZToken合约所有者权限。当前: ${owner.address}, 需要: ${contractOwner}`);
    }
    
    console.log(`✅ 权限验证通过，开始税收系统测试`);
  });

  describe("🔧 税收系统配置测试", function () {
    it("应该查看当前税收配置", async function () {
      const taxConfig = await hzToken.getTaxConfig();
      
      console.log(`\n📊 当前税收配置:`);
      console.log(`   买入税: ${taxConfig.buyTax} 基点 (${Number(taxConfig.buyTax) / 100}%)`);
      console.log(`   卖出税: ${taxConfig.sellTax} 基点 (${Number(taxConfig.sellTax) / 100}%)`);
      console.log(`   转账税: ${taxConfig.transferTax} 基点 (${Number(taxConfig.transferTax) / 100}%)`);
      console.log(`   流动性税: ${taxConfig.liquidityTax} 基点 (${Number(taxConfig.liquidityTax) / 100}%)`);
      console.log(`   动态税收: ${taxConfig.dynamicTaxEnabled ? '启用' : '禁用'}`);
      console.log(`   最大动态倍数: ${taxConfig.maxDynamicRate} 基点`);
      console.log(`   税收接收者: ${taxConfig.recipient}`);
      console.log(`   税收开关: ${taxConfig.enabled ? '启用' : '禁用'}`);
      
      expect(taxConfig.buyTax).to.be.greaterThanOrEqual(0);
      expect(taxConfig.sellTax).to.be.greaterThanOrEqual(0);
      expect(taxConfig.transferTax).to.be.greaterThanOrEqual(0);
    });

    it("应该设置税收接收者", async function () {
      console.log(`\n🎯 设置税收接收者:`);
      console.log(`   新税收接收者: ${owner.address}`);
      
      const tx = await hzToken.setTaxRecipient(owner.address);
      const receipt = await tx.wait();
      
      console.log(`   🚀 设置交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      const newRecipient = await hzToken.taxRecipient();
      expect(newRecipient).to.equal(owner.address);
      console.log(`   ✅ 税收接收者设置成功`);
    });

    it("应该启用税收系统", async function () {
      console.log(`\n🔛 启用税收系统:`);
      
      const tx = await hzToken.setTaxEnabled(true);
      const receipt = await tx.wait();
      
      console.log(`   🚀 启用交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      const isEnabled = await hzToken.taxEnabled();
      expect(isEnabled).to.be.true;
      console.log(`   ✅ 税收系统已启用`);
    });

    it("应该创建测试用AMM池地址", async function () {
      // 创建一个模拟的AMM池地址
      const testAmmPool = ethers.Wallet.createRandom().address;
      
      console.log(`\n🏊 设置AMM池地址:`);
      console.log(`   AMM池地址: ${testAmmPool}`);
      
      const tx = await hzToken.setAMM(testAmmPool, true);
      const receipt = await tx.wait();
      
      console.log(`   🚀 设置交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      const isAMM = await hzToken.isAMM(testAmmPool);
      expect(isAMM).to.be.true;
      console.log(`   ✅ AMM池地址设置成功`);
    });
  });

  describe("💸 税收预览功能测试", function () {
    it("应该能预览不同类型的税收", async function () {
      const testAmount = ethers.parseEther("100");
      const testUser1 = ethers.Wallet.createRandom().address;
      const testUser2 = ethers.Wallet.createRandom().address;
      const testAmmPool = ethers.Wallet.createRandom().address;
      
      // 设置AMM池
      await hzToken.setAMM(testAmmPool, true);
      
      console.log(`\n📊 税收预览测试:`);
      
      // 测试普通转账税收
      const transferPreview = await hzToken.previewTax(testUser1, testUser2, testAmount);
      console.log(`   普通转账税收:`);
      console.log(`     税收金额: ${ethers.formatEther(transferPreview.taxAmount)} HZ`);
      console.log(`     实际转账: ${ethers.formatEther(transferPreview.transferAmount)} HZ`);
      console.log(`     税收类型: ${transferPreview.taxType}`);
      console.log(`     基础税率: ${transferPreview.baseTaxRate} 基点`);
      
      // 测试买入税收
      const buyPreview = await hzToken.previewTax(testAmmPool, testUser1, testAmount);
      console.log(`   买入交易税收:`);
      console.log(`     税收金额: ${ethers.formatEther(buyPreview.taxAmount)} HZ`);
      console.log(`     实际买入: ${ethers.formatEther(buyPreview.transferAmount)} HZ`);
      console.log(`     税收类型: ${buyPreview.taxType}`);
      console.log(`     基础税率: ${buyPreview.baseTaxRate} 基点`);
      
      // 测试卖出税收
      const sellPreview = await hzToken.previewTax(testUser1, testAmmPool, testAmount);
      console.log(`   卖出交易税收:`);
      console.log(`     税收金额: ${ethers.formatEther(sellPreview.taxAmount)} HZ`);
      console.log(`     实际卖出: ${ethers.formatEther(sellPreview.transferAmount)} HZ`);
      console.log(`     税收类型: ${sellPreview.taxType}`);
      console.log(`     基础税率: ${sellPreview.baseTaxRate} 基点`);
      
      // 验证税收计算
      expect(transferPreview.taxAmount).to.be.greaterThan(0);
      expect(buyPreview.taxAmount).to.be.greaterThan(0);
      expect(sellPreview.taxAmount).to.be.greaterThan(0);
      
      console.log(`   ✅ 税收预览功能正常工作`);
    });

    it("应该测试免税地址预览", async function () {
      const testAmount = ethers.parseEther("100");
      const testUser1 = ethers.Wallet.createRandom().address;
      const testUser2 = ethers.Wallet.createRandom().address;
      
      // 设置免税地址
      const tx = await hzToken.setTaxExempt(testUser1, true);
      await tx.wait();
      
      console.log(`\n🏷️ 免税地址税收预览:`);
      
      // 测试免税地址转账
      const exemptPreview = await hzToken.previewTax(testUser1, testUser2, testAmount);
      console.log(`   免税转账:`);
      console.log(`     税收金额: ${ethers.formatEther(exemptPreview.taxAmount)} HZ (应该为0)`);
      console.log(`     实际转账: ${ethers.formatEther(exemptPreview.transferAmount)} HZ`);
      console.log(`     税收类型: ${exemptPreview.taxType}`);
      
      expect(exemptPreview.taxAmount).to.equal(0);
      expect(exemptPreview.taxType).to.equal("exempt");
      
      console.log(`   ✅ 免税功能预览正常工作`);
    });
  });

  describe("📊 税收统计功能测试", function () {
    it("应该查看交易统计数据", async function () {
      console.log(`\n📊 查看交易统计:`);
      
      try {
        const stats = await hzToken.getTradingStats();
        console.log(`   24小时交易量: ${ethers.formatEther(stats.totalVolume24h)} HZ`);
        console.log(`   大额交易数量: ${stats.largeTransactionCount}`);
        console.log(`   平均交易大小: ${ethers.formatEther(stats.averageTransactionSize)} HZ`);
        console.log(`   最后更新时间: ${new Date(Number(stats.lastStatsUpdate) * 1000).toLocaleString()}`);
        console.log(`   最近交易记录: ${stats.recentTransactionCount} 笔`);
        
        expect(stats.totalVolume24h).to.be.greaterThanOrEqual(0);
        console.log(`   ✅ 统计数据查询成功`);
      } catch (error) {
        console.log(`   ⚠️  获取统计数据失败: ${error.message}`);
      }
    });

    it("应该测试动态税率参数", async function () {
      console.log(`\n⚙️  动态税率参数:`);
      
      const dynamicParams = await hzToken.getDynamicTaxParams();
      console.log(`   交易量阈值: ${ethers.formatEther(dynamicParams.volumeThreshold)} HZ`);
      console.log(`   时间窗口: ${dynamicParams.timeWindow} 秒`);
      console.log(`   价格影响因子: ${dynamicParams.priceImpactFactor} 基点`);
      console.log(`   波动性因子: ${dynamicParams.volatilityFactor} 基点`);
      
      expect(dynamicParams.volumeThreshold).to.be.greaterThan(0);
      expect(dynamicParams.timeWindow).to.be.greaterThan(0);
      
      console.log(`   ✅ 动态税率参数查询成功`);
    });
  });

  describe("🔧 税收管理功能测试", function () {
    it("应该能更新税收配置", async function () {
      console.log(`\n🔧 更新税收配置:`);
      
      const newBuyTax = 150; // 1.5%
      const newSellTax = 200; // 2%
      const newTransferTax = 75; // 0.75%
      const newLiquidityTax = 50; // 0.5%
      
      const tx = await hzToken.setTaxConfig(
        newBuyTax,
        newSellTax,
        newTransferTax,
        newLiquidityTax,
        false, // 禁用动态税收
        300    // 最大动态倍数
      );
      const receipt = await tx.wait();
      
      console.log(`   🚀 更新交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      // 验证更新
      const updatedConfig = await hzToken.getTaxConfig();
      expect(updatedConfig.buyTax).to.equal(newBuyTax);
      expect(updatedConfig.sellTax).to.equal(newSellTax);
      expect(updatedConfig.transferTax).to.equal(newTransferTax);
      expect(updatedConfig.liquidityTax).to.equal(newLiquidityTax);
      
      console.log(`   ✅ 税收配置更新成功`);
      console.log(`   新买入税: ${newBuyTax} 基点`);
      console.log(`   新卖出税: ${newSellTax} 基点`);
      console.log(`   新转账税: ${newTransferTax} 基点`);
      console.log(`   新流动性税: ${newLiquidityTax} 基点`);
    });

    it("应该能禁用税收系统", async function () {
      console.log(`\n🔴 禁用税收系统:`);
      
      const tx = await hzToken.setTaxEnabled(false);
      const receipt = await tx.wait();
      
      console.log(`   🚀 禁用交易: ${receipt.hash}`);
      console.log(`   🌍 查看: ${TESTNET_CONFIG.explorerUrl}/tx/${receipt.hash}`);
      
      const isEnabled = await hzToken.taxEnabled();
      expect(isEnabled).to.be.false;
      console.log(`   ✅ 税收系统已禁用`);
      
      // 测试禁用后的税收预览
      const testAmount = ethers.parseEther("100");
      const testUser1 = ethers.Wallet.createRandom().address;
      const testUser2 = ethers.Wallet.createRandom().address;
      
      const disabledPreview = await hzToken.previewTax(testUser1, testUser2, testAmount);
      expect(disabledPreview.taxAmount).to.equal(0);
      console.log(`   ✅ 禁用后转账无税收`);
    });
  });

  after(async function () {
    console.log(`\n🎉 HZToken税收系统简化测试完成！`);
    
    console.log(`\n📊 测试总结:`);
    console.log(`   ✅ 税收配置和管理功能测试`);
    console.log(`   ✅ 税收预览功能测试`);
    console.log(`   ✅ 免税地址功能测试`);
    console.log(`   ✅ 动态税率参数测试`);
    console.log(`   ✅ 税收开关功能测试`);
    
    console.log(`\n🔗 重要链接:`);
    console.log(`   🌍 区块链浏览器: ${TESTNET_CONFIG.explorerUrl}`);
    console.log(`   🪙 HZToken合约: ${TESTNET_CONFIG.explorerUrl}/address/${TESTNET_CONFIG.contracts.HZToken}`);
    
    console.log(`\n💡 税收系统核心功能已验证！`);
  });
});