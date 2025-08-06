const axios = require('axios');
const fs = require('fs');

async function main() {
    console.log("🤖 开始自动验证合约...\n");
    
    // 加载部署信息
    const deployment = JSON.parse(fs.readFileSync("./deployments/hashkeyTestnet.json", "utf8"));
    
    // 先验证 HZToken
    const hzTokenAddress = deployment.contracts.HZToken.implementation;
    const sourceCode = fs.readFileSync("./HZToken_flattened.sol", "utf8");
    
    console.log("🔍 验证 HZToken 实现合约...");
    console.log(`📍 地址: ${hzTokenAddress}`);
    console.log(`📄 源代码: ${sourceCode.split('\n').length} 行`);
    
    const result = await verifyContract({
        address: hzTokenAddress,
        name: "HZToken",
        sourceCode: sourceCode,
        compilerVersion: "v0.8.30+commit.5b4cc3d1",
        optimization: true,
        optimizationRuns: 200,
        constructorArguments: "",
        evmVersion: "paris",
        license: "MIT"
    });
    
    if (result.success) {
        console.log("✅ HZToken 验证请求已提交");
        console.log("🔗 查看结果: https://testnet-explorer.hsk.xyz/address/" + hzTokenAddress);
    } else {
        console.log("❌ HZToken 验证失败:", result.error);
    }
}

async function verifyContract(params) {
    try {
        console.log("📤 提交验证请求到 Blockscout...");
        
        // Blockscout API 端点
        const apiUrl = "https://testnet-explorer.hsk.xyz/api/v2/smart-contracts/verification/via/flattened-code";
        
        // 构建请求数据
        const formData = new URLSearchParams();
        formData.append('addressHash', params.address);
        formData.append('name', params.name);  
        formData.append('compilerVersion', params.compilerVersion);
        formData.append('optimization', params.optimization.toString());
        formData.append('optimizationRuns', params.optimizationRuns.toString());
        formData.append('sourceCode', params.sourceCode);
        formData.append('constructorArguments', params.constructorArguments);
        formData.append('evmVersion', params.evmVersion);
        formData.append('licenseType', params.license);
        
        // 发送请求
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Hardhat-Verification-Script'
            },
            timeout: 60000
        });
        
        console.log("📨 API 响应状态:", response.status);
        
        if (response.status === 200 || response.status === 201) {
            return {
                success: true,
                data: response.data
            };
        } else {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }
        
    } catch (error) {
        console.log("❌ API 请求失败:", error.message);
        
        if (error.response) {
            console.log("📄 错误详情:", error.response.status, error.response.statusText);
            if (error.response.data) {
                console.log("📄 错误数据:", JSON.stringify(error.response.data, null, 2));
            }
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

main()
    .then(() => {
        console.log("\n🎉 自动验证流程完成!");
        console.log("📱 请访问浏览器检查验证状态");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ 自动验证失败:", error);
        process.exit(1);
    });