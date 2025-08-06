const fs = require("fs");

function main() {
    console.log("📋 准备手动验证信息...\n");
    
    // 加载部署信息
    const deployment = JSON.parse(fs.readFileSync("./deployments/hashkeyTestnet.json", "utf8"));
    
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
    
    console.log("🔧 验证配置信息:");
    console.log("   Solidity 版本: v0.8.30+commit.5b4cc3d1");
    console.log("   优化器: 启用 ✅");
    console.log("   优化次数: 200");
    console.log("   EVM 版本: paris");
    console.log("   许可证: MIT\n");
    
    console.log("📍 待验证的实现合约:\n");
    
    // 生成验证信息表格
    contracts.forEach((contract, index) => {
        console.log(`${index + 1}. **${contract.name}** 实现合约`);
        console.log(`   📍 地址: ${contract.address}`);
        console.log(`   🔗 浏览器: https://testnet-explorer.hsk.xyz/address/${contract.address}`);
        console.log(`   📝 验证页面: https://testnet-explorer.hsk.xyz/contract-verification`);
        console.log(`   📄 源代码文件: ${contract.flattenedFile}`);
        
        // 检查文件大小
        if (fs.existsSync(contract.flattenedFile)) {
            const stats = fs.statSync(contract.flattenedFile);
            const lines = fs.readFileSync(contract.flattenedFile, 'utf8').split('\n').length;
            console.log(`   📊 源代码: ${lines} 行, ${(stats.size / 1024).toFixed(1)} KB`);
        }
        console.log();
    });
    
    // 生成详细的验证指南
    const guide = generateDetailedGuide(contracts);
    fs.writeFileSync("./MANUAL_VERIFICATION.md", guide);
    
    console.log("📖 详细验证指南已生成: MANUAL_VERIFICATION.md");
    console.log("🚀 请按照指南进行手动验证");
}

function generateDetailedGuide(contracts) {
    return `# HashKey Chain Testnet 合约手动验证指南

## 🎯 验证目标

通过 Blockscout 浏览器验证以下实现合约的源代码:

${contracts.map((contract, index) => `
${index + 1}. **${contract.name}**: \`${contract.address}\`
`).join('')}

## 🔧 统一验证配置

所有合约使用相同的编译配置:

| 配置项 | 值 |
|--------|------|
| **Solidity Compiler** | v0.8.30+commit.5b4cc3d1 |
| **Optimization** | Enabled ✅ |
| **Runs** | 200 |
| **EVM Version** | paris |
| **License** | MIT |
| **Constructor Arguments** | 空 (实现合约) |

## 📝 逐个验证步骤

${contracts.map((contract, index) => `
### ${index + 1}. 验证 ${contract.name} 实现合约

#### 🔗 验证链接
直接访问: https://testnet-explorer.hsk.xyz/contract-verification

#### 📋 填写表单

1. **Contract Address** (合约地址)
   \`\`\`
   ${contract.address}
   \`\`\`

2. **Contract Name** (合约名称)
   \`\`\`
   ${contract.name}
   \`\`\`

3. **Compiler Version** (编译器版本)
   选择: \`v0.8.30+commit.5b4cc3d1\`

4. **Optimization** (优化)
   选择: \`Yes\` ✅

5. **Optimization Runs** (优化次数)
   输入: \`200\`

6. **EVM Version** (EVM版本)
   选择: \`paris\`

7. **License Type** (许可证)
   选择: \`MIT\`

8. **Constructor Arguments** (构造参数)
   留空 (实现合约无构造参数)

#### 📄 源代码上传

**方法 1: 文件上传**
- 选择 "Upload Source Files"
- 上传文件: \`${contract.flattenedFile}\`

**方法 2: 粘贴代码**
- 选择 "Paste Source Code"
- 复制 \`${contract.flattenedFile}\` 的全部内容粘贴

#### ✅ 提交验证
点击 "Verify and Publish" 按钮

#### 🔍 检查结果
验证成功后，访问合约页面查看源代码:
https://testnet-explorer.hsk.xyz/address/${contract.address}

---
`).join('')}

## 🚨 常见问题解决

### ❌ 编译错误
1. **Compiler Version Mismatch**
   - 确保选择 \`v0.8.30+commit.5b4cc3d1\`
   - 不要选择其他 0.8.30 版本

2. **Optimization Settings**
   - 必须启用优化: \`Yes\`
   - 运行次数必须: \`200\`

3. **Source Code Issues**
   - 使用完整的扁平化文件
   - 确保文件编码为 UTF-8
   - 检查是否有特殊字符

### ⚠️ 验证失败
1. **ByteCode Mismatch**
   - 检查 EVM 版本是否为 \`paris\`
   - 确认编译器版本完全匹配
   - 验证优化设置

2. **Source Code Format**
   - 使用 Hardhat flatten 生成的文件
   - 不要手动修改扁平化代码
   - 确保包含所有依赖

### 🔄 重新验证
如果验证失败:
1. 检查所有配置项
2. 重新生成扁平化文件
3. 清除浏览器缓存
4. 联系 HashKey Chain 支持

## 📊 验证状态检查

验证成功的标志:
- ✅ 合约页面显示绿色勾号
- ✅ "Contract" 标签可见源代码
- ✅ 可以查看和搜索函数
- ✅ ABI 和字节码可见

验证后的合约页面:
${contracts.map(contract => `
- **${contract.name}**: https://testnet-explorer.hsk.xyz/address/${contract.address}
`).join('')}

## 🤖 备选方案

如果手动验证困难，可以尝试:

1. **使用 API 验证**
   \`\`\`bash
   npx hardhat run scripts/blockscout-verify.js --network hashkeyTestnet
   \`\`\`

2. **联系技术支持**
   - HashKey Chain 官方支持
   - 社区技术论坛

## 📞 技术支持

- **HashKey Chain 官网**: https://hsk.xyz
- **测试网浏览器**: https://testnet-explorer.hsk.xyz
- **文档中心**: 查看官方文档

---

**生成时间**: ${new Date().toLocaleString()}
**网络**: HashKey Chain Testnet (133)
**工具**: Blockscout Explorer

> 💡 提示: 建议优先验证 HZToken，然后是 Vesting，最后是 MiningPool
`;
}

main();