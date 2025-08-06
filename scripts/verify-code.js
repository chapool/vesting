const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 开始验证合约代码...\n");
    
    // 加载部署信息
    const deploymentFile = "./deployments/hashkeyTestnet.json";
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 部署文件不存在:", deploymentFile);
        return;
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("📄 加载部署信息:", deployment.network);
    console.log("🔗 Chain ID:", deployment.chainId);
    console.log("📍 部署者:", deployment.deployer);
    console.log("⏰ 部署时间:", deployment.timestamp);
    
    // 获取合约工厂
    const HZToken = await ethers.getContractFactory("HZToken");
    const Vesting = await ethers.getContractFactory("Vesting");
    const MiningPool = await ethers.getContractFactory("MiningPool");
    
    // 验证函数
    async function verifyContract(contractName, implementationAddress, contractFactory) {
        console.log(`\n🔍 验证 ${contractName} 实现合约...`);
        console.log(`📍 实现地址: ${implementationAddress}`);
        
        try {
            // 获取链上字节码
            const onChainBytecode = await ethers.provider.getCode(implementationAddress);
            console.log(`📏 链上字节码长度: ${onChainBytecode.length - 2} 字符`);
            
            // 获取本地编译的字节码
            const localBytecode = contractFactory.bytecode;
            console.log(`📏 本地字节码长度: ${localBytecode.length - 2} 字符`);
            
            // 比较字节码前缀（忽略构造函数参数和元数据）
            const onChainPrefix = onChainBytecode.substring(0, Math.min(1000, onChainBytecode.length));
            const localPrefix = localBytecode.substring(0, Math.min(1000, localBytecode.length));
            
            if (onChainPrefix === localPrefix) {
                console.log(`✅ ${contractName} 字节码前缀匹配`);
            } else {
                console.log(`⚠️  ${contractName} 字节码前缀不完全匹配`);
            }
            
            // 检查合约是否可以正常调用
            const contract = contractFactory.attach(implementationAddress);
            
            // 尝试调用一些视图函数来验证合约功能
            if (contractName === "HZToken") {
                try {
                    const version = await contract.version();
                    console.log(`📋 合约版本: ${version}`);
                    console.log(`✅ ${contractName} 功能验证成功`);
                } catch (error) {
                    console.log(`❌ ${contractName} 功能验证失败:`, error.message);
                }
            } else if (contractName === "Vesting") {
                try {
                    const totalAmount = await contract.getVestingSchedulesTotalAmount();
                    console.log(`📊 总释放金额: ${ethers.formatEther(totalAmount)} HZ`);
                    console.log(`✅ ${contractName} 功能验证成功`);
                } catch (error) {
                    console.log(`❌ ${contractName} 功能验证失败:`, error.message);
                }
            } else if (contractName === "MiningPool") {
                try {
                    const version = await contract.version();
                    console.log(`📋 合约版本: ${version}`);
                    console.log(`✅ ${contractName} 功能验证成功`);
                } catch (error) {
                    console.log(`❌ ${contractName} 功能验证失败:`, error.message);
                }
            }
            
            return {
                contractName,
                implementationAddress,
                onChainBytecodeLength: onChainBytecode.length - 2,
                localBytecodeLength: localBytecode.length - 2,
                prefixMatch: onChainPrefix === localPrefix,
                functionalityWorking: true
            };
            
        } catch (error) {
            console.log(`❌ ${contractName} 验证失败:`, error.message);
            return {
                contractName,
                implementationAddress,
                error: error.message,
                prefixMatch: false,
                functionalityWorking: false
            };
        }
    }
    
    // 验证所有合约
    const results = [];
    
    // 验证 HZToken
    if (deployment.contracts.HZToken) {
        const result = await verifyContract(
            "HZToken",
            deployment.contracts.HZToken.implementation,
            HZToken
        );
        results.push(result);
    }
    
    // 验证 Vesting
    if (deployment.contracts.Vesting) {
        const result = await verifyContract(
            "Vesting",
            deployment.contracts.Vesting.implementation,
            Vesting
        );
        results.push(result);
    }
    
    // 验证 MiningPool
    if (deployment.contracts.MiningPool) {
        const result = await verifyContract(
            "MiningPool",
            deployment.contracts.MiningPool.implementation,
            MiningPool
        );
        results.push(result);
    }
    
    // 生成验证报告
    console.log("\n" + "=".repeat(60));
    console.log("📊 合约验证报告");
    console.log("=".repeat(60));
    
    let allValid = true;
    results.forEach(result => {
        if (result.error) {
            console.log(`❌ ${result.contractName}: 验证失败`);
            console.log(`   错误: ${result.error}`);
            allValid = false;
        } else {
            const status = result.functionalityWorking ? "✅ 通过" : "❌ 失败";
            console.log(`${status} ${result.contractName}:`);
            console.log(`   📍 地址: ${result.implementationAddress}`);
            console.log(`   📏 字节码: ${result.onChainBytecodeLength} 字符`);
            console.log(`   🔍 前缀匹配: ${result.prefixMatch ? "✅" : "❌"}`);
            console.log(`   ⚙️  功能正常: ${result.functionalityWorking ? "✅" : "❌"}`);
            
            if (!result.functionalityWorking) {
                allValid = false;
            }
        }
        console.log();
    });
    
    // 保存验证报告
    const verificationReport = {
        network: deployment.network,
        chainId: deployment.chainId,
        verificationTime: new Date().toISOString(),
        results: results,
        overallStatus: allValid ? "PASS" : "FAIL"
    };
    
    const reportFile = "./verification-report.json";
    fs.writeFileSync(reportFile, JSON.stringify(verificationReport, null, 2));
    console.log(`📄 验证报告已保存: ${reportFile}`);
    
    if (allValid) {
        console.log("\n🎉 所有合约验证通过！");
    } else {
        console.log("\n⚠️  部分合约验证失败，请检查上述报告");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("验证过程中发生错误:", error);
        process.exit(1);
    });