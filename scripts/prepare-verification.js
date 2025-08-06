const fs = require("fs");
const path = require("path");

async function main() {
    console.log("📋 准备 Blockscout 合约验证信息...\n");
    
    // 加载部署信息
    const deploymentFile = "./deployments/hashkeyTestnet.json";
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    
    // 合约信息
    const contracts = [
        {
            name: "HZToken",
            address: deployment.contracts.HZToken.implementation,
            flattenedFile: "HZToken_flattened.sol"
        },
        {
            name: "Vesting",
            address: deployment.contracts.Vesting.implementation,
            flattenedFile: "Vesting_flattened.sol"
        },
        {
            name: "MiningPool",
            address: deployment.contracts.MiningPool.implementation,
            flattenedFile: "MiningPool_flattened.sol"
        }
    ];
    
    console.log("🔧 编译器配置:");
    console.log("   Solidity 版本: 0.8.30");
    console.log("   优化器: 启用");
    console.log("   优化次数: 200");
    console.log("   EVM 版本: paris");
    console.log("   许可证: MIT\n");
    
    // 为每个合约生成验证信息
    const verificationInfo = [];
    
    for (const contract of contracts) {
        console.log(`📝 准备 ${contract.name} 验证信息...`);
        
        // 检查扁平化文件是否存在
        if (!fs.existsSync(contract.flattenedFile)) {
            console.log(`❌ 扁平化文件不存在: ${contract.flattenedFile}`);
            continue;
        }
        
        // 读取扁平化源代码
        const sourceCode = fs.readFileSync(contract.flattenedFile, 'utf8');
        
        // 清理源代码（移除重复的 SPDX 和 pragma）
        const cleanedSource = cleanSourceCode(sourceCode);
        
        const info = {
            contractName: contract.name,
            contractAddress: contract.address,
            sourceCode: cleanedSource,
            compilerVersion: "v0.8.30+commit.5b4cc3d1",
            optimization: true,
            optimizationRuns: 200,
            constructorArguments: "", // 实现合约没有构造函数参数
            evmVersion: "paris",
            license: "MIT"
        };
        
        verificationInfo.push(info);
        
        console.log(`✅ ${contract.name} 信息准备完成`);
        console.log(`   地址: ${contract.address}`);
        console.log(`   源代码行数: ${cleanedSource.split('\\n').length}`);
    }
    
    // 保存验证信息到文件
    const outputFile = "./verification-data.json";
    fs.writeFileSync(outputFile, JSON.stringify(verificationInfo, null, 2));
    
    console.log(`\\n📄 验证信息已保存到: ${outputFile}`);
    
    // 生成验证指南
    generateVerificationGuide(verificationInfo);
    
    console.log("\\n🎯 下一步操作:");
    console.log("1. 访问 https://testnet-explorer.hsk.xyz/contract-verification");
    console.log("2. 按照 VERIFICATION_GUIDE.md 中的说明进行手动验证");
    console.log("3. 或使用自动化脚本进行验证");
}

function cleanSourceCode(sourceCode) {
    const lines = sourceCode.split('\\n');
    const cleanedLines = [];
    let seenSPDX = false;
    let seenPragma = false;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 只保留第一个 SPDX 许可证标识符
        if (trimmedLine.includes('SPDX-License-Identifier')) {
            if (!seenSPDX) {
                cleanedLines.push(line);
                seenSPDX = true;
            }
            continue;
        }
        
        // 只保留第一个 pragma solidity
        if (trimmedLine.includes('pragma solidity')) {
            if (!seenPragma) {
                cleanedLines.push(line);
                seenPragma = true;
            }
            continue;
        }
        
        // 移除空的 import 行和注释行（但保留文档注释）
        if (trimmedLine === '' || 
            trimmedLine.startsWith('//') && !trimmedLine.startsWith('/**') ||
            trimmedLine.startsWith('import') && trimmedLine.includes('from')) {
            continue;
        }
        
        cleanedLines.push(line);
    }
    
    return cleanedLines.join('\\n');
}

function generateVerificationGuide(verificationInfo) {
    const guide = `# HashKey Chain Testnet 合约验证指南

## 🌐 Blockscout 浏览器信息

- **浏览器地址**: https://testnet-explorer.hsk.xyz
- **验证页面**: https://testnet-explorer.hsk.xyz/contract-verification
- **网络**: HashKey Chain Testnet (Chain ID: 133)

## 🔧 编译器配置

| 配置项 | 值 |
|--------|------|
| **Solidity 版本** | 0.8.30 |
| **优化器** | 启用 ✅ |
| **优化次数** | 200 |
| **EVM 版本** | paris |
| **许可证类型** | MIT |

## 📋 待验证合约列表

${verificationInfo.map((contract, index) => `
### ${index + 1}. ${contract.contractName} 实现合约

- **合约地址**: \`${contract.contractAddress}\`
- **浏览器链接**: [查看合约](https://testnet-explorer.hsk.xyz/address/${contract.contractAddress})
- **验证链接**: [验证合约](https://testnet-explorer.hsk.xyz/contract-verification?address=${contract.contractAddress})

#### 验证参数
- **合约名称**: ${contract.contractName}
- **编译器版本**: ${contract.compilerVersion}
- **优化**: ${contract.optimization ? '启用' : '禁用'}
- **优化次数**: ${contract.optimizationRuns}
- **构造函数参数**: 无 (实现合约)
- **源代码文件**: ${contract.contractName}_flattened.sol

`).join('')}

## 🚀 手动验证步骤

### 步骤 1: 访问验证页面
访问 https://testnet-explorer.hsk.xyz/contract-verification

### 步骤 2: 填写基本信息
1. **Contract Address**: 输入合约地址
2. **Contract Name**: 输入合约名称 (如 HZToken)
3. **Compiler Version**: 选择 v0.8.30+commit.5b4cc3d1
4. **Optimization**: 选择 "Yes"
5. **Optimization Runs**: 输入 200

### 步骤 3: 上传源代码
1. 选择 "Solidity (Single file)" 或 "Solidity (Flattened)"
2. 上传对应的 *_flattened.sol 文件
3. 或直接粘贴源代码到文本框

### 步骤 4: 高级设置
1. **EVM Version**: 选择 "paris"
2. **License Type**: 选择 "MIT"
3. **Constructor Arguments**: 留空 (实现合约无构造参数)

### 步骤 5: 提交验证
点击 "Verify Contract" 按钮提交验证请求

## 🤖 自动化验证

如果手动验证遇到问题，可以使用自动化脚本:

\`\`\`bash
# 运行自动化验证脚本
npx hardhat run scripts/blockscout-verify.js --network hashkeyTestnet
\`\`\`

## 📱 验证结果检查

验证成功后，你可以在以下页面看到合约源代码:

${verificationInfo.map(contract => `
- **${contract.contractName}**: https://testnet-explorer.hsk.xyz/address/${contract.contractAddress}
`).join('')}

## ⚠️ 常见问题

### 验证失败
1. **编译器版本不匹配**: 确保使用 v0.8.30+commit.5b4cc3d1
2. **优化设置错误**: 确保启用优化，运行次数为 200
3. **源代码格式**: 使用扁平化的源代码文件
4. **构造函数参数**: 实现合约应该留空

### 源代码问题
1. **重复的 SPDX**: 确保只有一个 SPDX-License-Identifier
2. **重复的 pragma**: 确保只有一个 pragma solidity
3. **Import 语句**: 使用扁平化版本避免 import 问题

## 📞 技术支持

如遇到验证问题:
1. 检查编译器配置是否正确
2. 确认源代码文件格式
3. 查看 Blockscout 错误消息
4. 联系 HashKey Chain 技术支持

---

**更新时间**: ${new Date().toISOString()}
**验证工具**: Blockscout Explorer
`;

    fs.writeFileSync("./VERIFICATION_GUIDE.md", guide);
    console.log("📖 验证指南已生成: VERIFICATION_GUIDE.md");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("生成验证信息失败:", error);
        process.exit(1);
    });