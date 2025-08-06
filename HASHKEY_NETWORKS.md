# HashKey Chain 网络配置

## 📋 网络信息

### HashKey Chain Testnet
| 参数 | 值 |
|------|------|
| **Network Name** | HashKey Chain Testnet |
| **RPC Endpoint** | https://testnet.hsk.xyz |
| **Chain ID** | 133 |
| **Native Token** | HSK |
| **Explorer** | https://testnet-explorer.hsk.xyz |

### HashKey Chain Mainnet
| 参数 | 值 |
|------|------|
| **Network Name** | HashKey Chain |
| **RPC Endpoint** | https://mainnet.hsk.xyz |
| **Chain ID** | 177 |
| **Native Token** | HSK |
| **Explorer** | https://explorer.hsk.xyz |

## 🔧 Hardhat 配置

配置已在 `hardhat.config.js` 中设置：

```javascript
networks: {
  // HashKey Chain Testnet
  hashkeyTestnet: {
    url: "https://testnet.hsk.xyz",
    chainId: 133,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    gasPrice: "auto",
    gas: "auto",
    timeout: 60000,
  },
  // HashKey Chain Mainnet
  hashkeyMainnet: {
    url: "https://mainnet.hsk.xyz",
    chainId: 177,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    gasPrice: "auto",
    gas: "auto",
    timeout: 60000,
  },
}
```

## 🚀 使用方法

### 部署到测试网
```bash
npm run deploy:testnet
# 或者
npx hardhat run scripts/deploy.js --network hashkeyTestnet
```

### 部署到主网
```bash
npm run deploy:mainnet  
# 或者
npx hardhat run scripts/deploy.js --network hashkeyMainnet
```

### 运行测试（测试网）
```bash
npm run test:vesting
npm run test:vesting-quick
npm run test:vesting-owner
```

### 验证合约
```bash
# 测试网验证
npx hardhat run scripts/verify.js --network hashkeyTestnet

# 主网验证
npx hardhat run scripts/verify.js --network hashkeyMainnet
```

### 合约升级
```bash
# 测试网升级
npx hardhat run scripts/upgrade.js --network hashkeyTestnet

# 主网升级  
npx hardhat run scripts/upgrade.js --network hashkeyMainnet
```

## 📝 环境变量设置

在 `.env` 文件中设置：

```bash
# 私钥（用于部署和交易签名）
PRIVATE_KEY=your_private_key_here

# Gas报告API（可选）
COINMARKETCAP_API_KEY=your_api_key_here
```

## ⚠️ 重要提醒

### 主网部署前检查清单
- [ ] 确认私钥对应的地址有足够的 HSK 用于 Gas 费用
- [ ] 仔细审查合约代码和配置参数  
- [ ] 在测试网上完整测试所有功能
- [ ] 确认所有测试用例通过
- [ ] 备份部署配置和合约地址
- [ ] 准备合约验证所需的源码和参数

### 安全建议
- 使用专门的部署账户，不要使用个人主账户
- 部署前进行完整的安全审计
- 考虑使用多重签名钱包进行重要操作
- 部署后及时验证合约源码

## 🌍 区块链浏览器

### 查看交易和合约
- **测试网**: https://testnet-explorer.hsk.xyz
- **主网**: https://explorer.hsk.xyz

### 添加网络到钱包

#### MetaMask 配置
**测试网:**
```
网络名称: HashKey Chain Testnet
RPC URL: https://testnet.hsk.xyz  
链 ID: 133
货币符号: HSK
区块浏览器: https://testnet-explorer.hsk.xyz
```

**主网:**
```
网络名称: HashKey Chain
RPC URL: https://mainnet.hsk.xyz
链 ID: 177  
货币符号: HSK
区块浏览器: https://explorer.hsk.xyz
```

## 📚 相关文档

- [HashKey Chain 官方文档](https://docs.hashkey.io)
- [合约部署文档](./docs/3.Deployment.md)
- [安全审计文档](./docs/4.Security.md)
- [测试指南](./test/testnet/README.md)

---

**更新时间**: 2025-08-06  
**配置版本**: v1.0.0