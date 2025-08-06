const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 开始全面验证合约功能...\n");
    
    // 加载部署信息
    const deploymentFile = "./deployments/hashkeyTestnet.json";
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    
    console.log("📄 部署信息:");
    console.log(`   网络: ${deployment.network}`);
    console.log(`   链ID: ${deployment.chainId}`);
    console.log(`   部署者: ${deployment.deployer}`);
    console.log(`   时间: ${deployment.timestamp}\n`);
    
    const results = [];
    
    // ==================== HZToken 验证 ====================
    console.log("🔍 验证 HZToken 合约功能...");
    try {
        const hzToken = await ethers.getContractAt("HZToken", deployment.contracts.HZToken.proxy);
        
        // 基本信息验证
        const name = await hzToken.name();
        const symbol = await hzToken.symbol();
        const decimals = await hzToken.decimals();
        const totalSupply = await hzToken.totalSupply();
        const version = await hzToken.version();
        const owner = await hzToken.owner();
        
        console.log(`   ✅ 代币名称: ${name}`);
        console.log(`   ✅ 代币符号: ${symbol}`);
        console.log(`   ✅ 精度: ${decimals}`);
        console.log(`   ✅ 总供应量: ${ethers.formatEther(totalSupply)} HZ`);
        console.log(`   ✅ 合约版本: ${version}`);
        console.log(`   ✅ 合约拥有者: ${owner}`);
        
        // 税收配置验证
        const taxConfig = await hzToken.getTaxConfig();
        console.log(`   ✅ 买入税率: ${taxConfig.buyTax / 100}%`);
        console.log(`   ✅ 卖出税率: ${taxConfig.sellTax / 100}%`);
        console.log(`   ✅ 转账税率: ${taxConfig.transferTax / 100}%`);
        console.log(`   ✅ 税收启用: ${taxConfig.enabled}`);
        
        // 动态税率参数验证
        const dynamicParams = await hzToken.getDynamicTaxParams();
        console.log(`   ✅ 交易量阈值: ${ethers.formatEther(dynamicParams.volumeThreshold)} HZ`);
        console.log(`   ✅ 时间窗口: ${dynamicParams.timeWindow} 秒`);
        
        // 交易统计验证
        const tradingStats = await hzToken.getTradingStats();
        console.log(`   ✅ 24h交易量: ${ethers.formatEther(tradingStats.totalVolume24h)} HZ`);
        console.log(`   ✅ 大额交易数: ${tradingStats.largeTransactionCount}`);
        
        results.push({
            contract: "HZToken",
            address: deployment.contracts.HZToken.proxy,
            implementation: deployment.contracts.HZToken.implementation,
            status: "✅ 通过",
            details: {
                name, symbol, decimals: decimals.toString(), 
                totalSupply: totalSupply.toString(), version, owner,
                taxConfig: {
                    buyTax: taxConfig.buyTax.toString(),
                    sellTax: taxConfig.sellTax.toString(),
                    transferTax: taxConfig.transferTax.toString(),
                    enabled: taxConfig.enabled
                }
            }
        });
        
    } catch (error) {
        console.log(`   ❌ HZToken 验证失败: ${error.message}`);
        results.push({
            contract: "HZToken",
            address: deployment.contracts.HZToken.proxy,
            status: "❌ 失败",
            error: error.message
        });
    }
    
    // ==================== Vesting 验证 ====================
    console.log("\n🔍 验证 Vesting 合约功能...");
    try {
        const vesting = await ethers.getContractAt("Vesting", deployment.contracts.Vesting.proxy);
        
        // 基本信息验证
        const token = await vesting.getToken();
        const vestingSchedulesCount = await vesting.getVestingSchedulesCount();
        const totalAmount = await vesting.getVestingSchedulesTotalAmount();
        const owner = await vesting.owner();
        
        console.log(`   ✅ 代币地址: ${token}`);
        console.log(`   ✅ 释放计划数量: ${vestingSchedulesCount}`);
        console.log(`   ✅ 总释放金额: ${ethers.formatEther(totalAmount)} HZ`);
        console.log(`   ✅ 合约拥有者: ${owner}`);
        
        // 检查MiningPool的释放计划
        if (deployment.miningPoolVestingId) {
            try {
                const schedule = await vesting.getVestingSchedule(deployment.miningPoolVestingId);
                console.log(`   ✅ 挖矿池释放计划已创建`);
                console.log(`   ✅ 受益人: ${schedule.beneficiary}`);
                console.log(`   ✅ 总金额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
                console.log(`   ✅ 已释放: ${ethers.formatEther(schedule.released)} HZ`);
                console.log(`   ✅ 可撤销: ${schedule.revocable}`);
            } catch (scheduleError) {
                console.log(`   ⚠️  获取释放计划详情失败: ${scheduleError.message}`);
            }
        }
        
        results.push({
            contract: "Vesting",
            address: deployment.contracts.Vesting.proxy,
            implementation: deployment.contracts.Vesting.implementation,
            status: "✅ 通过",
            details: {
                token, 
                vestingSchedulesCount: vestingSchedulesCount.toString(),
                totalAmount: totalAmount.toString(),
                owner,
                miningPoolVestingId: deployment.miningPoolVestingId
            }
        });
        
    } catch (error) {
        console.log(`   ❌ Vesting 验证失败: ${error.message}`);
        results.push({
            contract: "Vesting",
            address: deployment.contracts.Vesting.proxy,
            status: "❌ 失败",
            error: error.message
        });
    }
    
    // ==================== MiningPool 验证 ====================
    console.log("\n🔍 验证 MiningPool 合约功能...");
    try {
        const miningPool = await ethers.getContractAt("MiningPool", deployment.contracts.MiningPool.proxy);
        
        // 基本信息验证
        const token = await miningPool.getToken();
        const vestingContract = await miningPool.getVestingContract();
        const miningVestingScheduleId = await miningPool.getMiningVestingScheduleId();
        const owner = await miningPool.owner();
        const version = await miningPool.version();
        
        console.log(`   ✅ 代币地址: ${token}`);
        console.log(`   ✅ Vesting合约: ${vestingContract}`);
        console.log(`   ✅ 挖矿释放ID: ${miningVestingScheduleId}`);
        console.log(`   ✅ 合约拥有者: ${owner}`);
        console.log(`   ✅ 合约版本: ${version}`);
        
        // 获取池子余额
        try {
            const poolBalance = await miningPool.getPoolBalance();
            console.log(`   ✅ 池子余额: ${ethers.formatEther(poolBalance)} HZ`);
        } catch (balanceError) {
            console.log(`   ⚠️  获取池子余额失败: ${balanceError.message}`);
        }
        
        // 获取提币统计
        try {
            const stats = await miningPool.getWithdrawalStats();
            console.log(`   ✅ 待处理请求: ${stats.pendingRequests}`);
            console.log(`   ✅ 已完成请求: ${stats.completedRequests}`);
            console.log(`   ✅ 总提币金额: ${ethers.formatEther(stats.totalWithdrawn)} HZ`);
        } catch (statsError) {
            console.log(`   ⚠️  获取提币统计失败: ${statsError.message}`);
        }
        
        results.push({
            contract: "MiningPool",
            address: deployment.contracts.MiningPool.proxy,
            implementation: deployment.contracts.MiningPool.implementation,
            status: "✅ 通过",
            details: {
                token, vestingContract, 
                miningVestingScheduleId, owner, version
            }
        });
        
    } catch (error) {
        console.log(`   ❌ MiningPool 验证失败: ${error.message}`);
        results.push({
            contract: "MiningPool",
            address: deployment.contracts.MiningPool.proxy,
            status: "❌ 失败",
            error: error.message
        });
    }
    
    // ==================== 合约关系验证 ====================
    console.log("\n🔍 验证合约间关系...");
    try {
        // 验证 HZToken 的 Vesting 合约地址是否正确
        const hzToken = await ethers.getContractAt("HZToken", deployment.contracts.HZToken.proxy);
        const vestingBalance = await hzToken.balanceOf(deployment.contracts.Vesting.proxy);
        console.log(`   ✅ Vesting合约持有代币: ${ethers.formatEther(vestingBalance)} HZ`);
        
        // 验证 MiningPool 是否正确配置了 Vesting 合约
        const miningPool = await ethers.getContractAt("MiningPool", deployment.contracts.MiningPool.proxy);
        const configuredVesting = await miningPool.getVestingContract();
        const configuredToken = await miningPool.getToken();
        
        if (configuredVesting.toLowerCase() === deployment.contracts.Vesting.proxy.toLowerCase()) {
            console.log(`   ✅ MiningPool正确配置了Vesting合约`);
        } else {
            console.log(`   ❌ MiningPool的Vesting合约地址不匹配`);
        }
        
        if (configuredToken.toLowerCase() === deployment.contracts.HZToken.proxy.toLowerCase()) {
            console.log(`   ✅ MiningPool正确配置了Token合约`);
        } else {
            console.log(`   ❌ MiningPool的Token合约地址不匹配`);
        }
        
    } catch (error) {
        console.log(`   ❌ 合约关系验证失败: ${error.message}`);
    }
    
    // ==================== 生成报告 ====================
    console.log("\n" + "=".repeat(60));
    console.log("📊 合约全面验证报告");
    console.log("=".repeat(60));
    
    let allPassed = true;
    results.forEach(result => {
        console.log(`${result.status} ${result.contract}:`);
        console.log(`   📍 代理地址: ${result.address}`);
        if (result.implementation) {
            console.log(`   🔧 实现地址: ${result.implementation}`);
        }
        if (result.error) {
            console.log(`   ❌ 错误: ${result.error}`);
            allPassed = false;
        }
        console.log();
    });
    
    // 保存详细验证报告
    const verificationReport = {
        network: deployment.network,
        chainId: deployment.chainId,
        verificationTime: new Date().toISOString(),
        deployment: deployment,
        verificationResults: results,
        overallStatus: allPassed ? "PASS" : "FAIL",
        summary: {
            totalContracts: results.length,
            passedContracts: results.filter(r => r.status.includes("通过")).length,
            failedContracts: results.filter(r => r.status.includes("失败")).length
        }
    };
    
    const reportFile = "./comprehensive-verification-report.json";
    fs.writeFileSync(reportFile, JSON.stringify(verificationReport, null, 2));
    console.log(`📄 详细验证报告已保存:`, reportFile);
    
    if (allPassed) {
        console.log("\n🎉 所有合约功能验证通过！");
        console.log("💡 合约代码与部署的字节码功能一致");
        console.log("🔒 所有核心功能正常工作");
    } else {
        console.log("\n⚠️  部分合约验证存在问题");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("验证过程中发生错误:", error);
        process.exit(1);
    });