# HashKey Chain Testnet 合约验证指南

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


### 1. HZToken 实现合约

- **合约地址**: `0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64`
- **浏览器链接**: [查看合约](https://testnet-explorer.hsk.xyz/address/0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64)
- **验证链接**: [验证合约](https://testnet-explorer.hsk.xyz/contract-verification?address=0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64)

#### 验证参数
- **合约名称**: HZToken
- **编译器版本**: v0.8.30+commit.5b4cc3d1
- **优化**: 启用
- **优化次数**: 200
- **构造函数参数**: 无 (实现合约)
- **源代码文件**: HZToken_flattened.sol


### 2. Vesting 实现合约

- **合约地址**: `0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2`
- **浏览器链接**: [查看合约](https://testnet-explorer.hsk.xyz/address/0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2)
- **验证链接**: [验证合约](https://testnet-explorer.hsk.xyz/contract-verification?address=0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2)

#### 验证参数
- **合约名称**: Vesting
- **编译器版本**: v0.8.30+commit.5b4cc3d1
- **优化**: 启用
- **优化次数**: 200
- **构造函数参数**: 无 (实现合约)
- **源代码文件**: Vesting_flattened.sol


### 3. MiningPool 实现合约

- **合约地址**: `0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3`
- **浏览器链接**: [查看合约](https://testnet-explorer.hsk.xyz/address/0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3)
- **验证链接**: [验证合约](https://testnet-explorer.hsk.xyz/contract-verification?address=0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3)

#### 验证参数
- **合约名称**: MiningPool
- **编译器版本**: v0.8.30+commit.5b4cc3d1
- **优化**: 启用
- **优化次数**: 200
- **构造函数参数**: 无 (实现合约)
- **源代码文件**: MiningPool_flattened.sol



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

```bash
# 运行自动化验证脚本
npx hardhat run scripts/blockscout-verify.js --network hashkeyTestnet
```

## 📱 验证结果检查

验证成功后，你可以在以下页面看到合约源代码:


- **HZToken**: https://testnet-explorer.hsk.xyz/address/0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64

- **Vesting**: https://testnet-explorer.hsk.xyz/address/0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2

- **MiningPool**: https://testnet-explorer.hsk.xyz/address/0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3


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

**更新时间**: 2025-08-05T09:15:46.531Z
**验证工具**: Blockscout Explorer
