# HZ Token 智能合约部署文档

## 📋 部署概览

本文档记录了 HZ Token 智能合约系统在 HashKey Chain 测试网的部署信息和操作指南。

### 🌐 网络信息

| 项目 | 值 |
|------|------|
| **网络名称** | HashKey Chain Testnet |
| **RPC 端点** | https://testnet.hsk.xyz |
| **Chain ID** | 133 |
| **原生代币** | HSK |
| **区块浏览器** | https://testnet-explorer.hsk.xyz |

## 🚀 测试网部署记录

### 部署详情

| 项目 | 值 |
|------|------|
| **部署时间** | 2025-08-05 08:47:53 UTC |
| **部署账户** | `0xB6e176A9E5A86AD4FA3Acad9eE605269055cE251` |
| **部署区块** | 15598508 |
| **Gas 使用** | 优化启用 (200次运行) |
| **Solidity 版本** | 0.8.30 |

### 📋 合约地址表

#### 主要合约 (代理地址)

| 合约名称 | 代理地址 | 实现地址 | 状态 |
|----------|----------|----------|------|
| **HZToken** | `0xAC3879CB86d1B815B1519c4805A21070649493Af` | `0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64` | ✅ 已升级 |
| **Vesting** | `0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7` | `0x6695523171c3711C5A733E4d5230a76ce3816A75` | ✅ 已升级 |
| **MiningPool** | `0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa` | `0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3` | ✅ 已升级 |

#### 浏览器链接

- **HZToken 合约**: [查看详情](https://testnet-explorer.hsk.xyz/address/0xAC3879CB86d1B815B1519c4805A21070649493Af)
- **Vesting 合约**: [查看详情](https://testnet-explorer.hsk.xyz/address/0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7)
- **MiningPool 合约**: [查看详情](https://testnet-explorer.hsk.xyz/address/0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa)

## 🔧 合约配置

### 初始化参数

#### HZToken 配置
```javascript
名称: "HZ Token"
符号: "HZ"
总供应量: 100,000,000 HZ
初始税率: 1% (买入/卖出), 0.5% (转账)
Vesting合约地址: 0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7
```

#### MiningPool 配置
```javascript
代币地址: 0xAC3879CB86d1B815B1519c4805A21070649493Af
Vesting合约: 0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7
释放计划ID: 0x7d68a4befde415f47272589f7d4fe36f47d882cbbb2d12752e21bb78a9635538
分配数量: 25,000,000 HZ (25% 总供应量)
释放周期: 5年 (1年悬崖期)
```

#### Vesting 配置
```javascript
代币地址: 0xAC3879CB86d1B815B1519c4805A21070649493Af
受益人: 0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa (MiningPool)
释放类型: 线性释放 (LINEAR)
分配类型: 挖矿奖励 (MINING)
```

## 📊 合约规格

### 合约大小分析

| 合约名称 | 部署大小 | 初始化大小 | 升级后大小 |
|----------|----------|------------|------------|
| HZToken | 14.499 KiB | 14.733 KiB | 14.499 KiB |
| MiningPool | 17.372 KiB | 17.606 KiB | 17.372 KiB |
| Vesting | 8.873 KiB | 9.107 KiB | 11.229 KiB ⬆️ |

### 功能特性

#### HZToken 功能
- ✅ ERC-20 标准代币
- ✅ 动态税收系统 (买入/卖出/转账)
- ✅ 黑名单管理
- ✅ 暂停/恢复功能
- ✅ 可升级 (UUPS)
- ✅ 重入攻击防护
- ✅ 交易统计追踪

#### MiningPool 功能
- ✅ 分级审批提币系统
- ✅ 每日限额控制
- ✅ 冷却期机制
- ✅ 批量小额转账
- ✅ 紧急提币功能
- ✅ 可升级 (UUPS)

#### Vesting 功能
- ✅ 多类型释放计划
- ✅ 悬崖期支持
- ✅ 可撤销释放
- ✅ 批量操作
- ✅ 暂停/恢复功能
- ✅ 可升级 (UUPS)
- 🆕 **前端展示功能** (v2.0.0)
  - ✅ 受益人汇总信息查询
  - ✅ 按类别分组的计划展示
  - ✅ 详细进度信息 (百分比、时间轴)
  - ✅ 批量计划信息获取

## 🧪 测试状态

### 测试覆盖率
| 合约 | 测试用例数 | 通过率 | 覆盖率 |
|------|------------|--------|--------|
| **HZToken** | 63 | 100% | 100% |
| **MiningPool** | 57 | 100% | 100% |
| **Vesting** | 42 | 100% | 100% |
| **总计** | **162** | **100%** | **100%** |

### 安全审计
- ✅ 权限控制测试
- ✅ 重入攻击防护
- ✅ 整数溢出防护
- ✅ 输入验证测试
- ✅ 状态管理测试

## 🛠️ 开发工具配置

### Hardhat 网络配置

```javascript
hashkeyTestnet: {
  url: "https://testnet.hsk.xyz",
  chainId: 133,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  gasPrice: "auto",
},
hashkeyMainnet: {
  url: "https://mainnet.hsk.xyz", 
  chainId: 177,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  gasPrice: "auto",
}
```

### 部署命令

```bash
# 部署到测试网
npx hardhat run scripts/deploy.js --network hashkeyTestnet

# 升级合约 (如需要)
npx hardhat run scripts/upgrade.js --network hashkeyTestnet

# 验证合约 (如支持)
npx hardhat run scripts/verify.js --network hashkeyTestnet
```

## 📝 操作指南

### 基本交互示例

#### 连接钱包 (Web3)
```javascript
const provider = new ethers.JsonRpcProvider("https://testnet.hsk.xyz");
const hzToken = new ethers.Contract(
  "0xAC3879CB86d1B815B1519c4805A21070649493Af",
  hzTokenABI,
  provider
);
```

#### 查询代币信息
```javascript
// 获取代币基本信息
const name = await hzToken.name();        // "HZ Token"
const symbol = await hzToken.symbol();    // "HZ"  
const decimals = await hzToken.decimals(); // 18
const totalSupply = await hzToken.totalSupply(); // 100000000000000000000000000

// 获取账户余额
const balance = await hzToken.balanceOf("0x...");
```

#### 税收配置查询
```javascript
// 获取税收配置
const taxConfig = await hzToken.getTaxConfig();
console.log({
  buyTax: taxConfig.buyTax,           // 买入税率
  sellTax: taxConfig.sellTax,         // 卖出税率  
  transferTax: taxConfig.transferTax, // 转账税率
  enabled: taxConfig.enabled          // 是否启用
});
```

### MiningPool 操作

#### 查询池子信息
```javascript
const miningPool = new ethers.Contract(
  "0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa",
  miningPoolABI,
  provider
);

// 获取池子余额
const poolBalance = await miningPool.getPoolBalance();

// 获取提币统计
const stats = await miningPool.getWithdrawalStats();
```

#### 创建提币请求
```javascript
// 连接钱包
const signer = provider.getSigner();
const miningPoolWithSigner = miningPool.connect(signer);

// 创建提币请求
const amount = ethers.parseEther("1000"); // 1000 HZ
const tx = await miningPoolWithSigner.requestWithdrawal(amount);
await tx.wait();
```

## 🚨 注意事项

### 安全提醒
1. **私钥安全**: 请妥善保管部署私钥，不要在生产环境中暴露
2. **权限管理**: 建议将所有权转移给多签钱包
3. **测试充分**: 在主网部署前请充分测试所有功能
4. **升级谨慎**: UUPS升级需要谨慎操作，建议先在测试网验证

### 已知限制
1. **验证限制**: HashKey Chain 测试网暂不支持标准合约验证
2. **税收配置**: 需要手动配置 AMM 池地址以正确应用税收
3. **代币供应**: 初始化时铸造全部代币，无法后续增发

## 📞 技术支持

### 故障排查

如遇到以下问题：

#### 部署失败
```bash
# 检查网络连接
npx hardhat run scripts/deploy.js --network hashkeyTestnet

# 查看详细错误
DEBUG=* npx hardhat run scripts/deploy.js --network hashkeyTestnet
```

#### Gas 不足
```bash
# 检查账户余额
npx hardhat console --network hashkeyTestnet
> const balance = await ethers.provider.getBalance("YOUR_ADDRESS");
> console.log(ethers.formatEther(balance));
```

#### 合约交互失败
```bash
# 验证合约地址和 ABI
# 检查函数调用参数
# 确认交易状态
```

### 联系方式
- 技术文档: [项目文档](./docs/README.md)
- 测试报告: [TEST_REPORT.md](./TEST_REPORT.md)
- 部署记录: 本文档

---

*本文档记录了 HZ Token 在 HashKey Chain Testnet 的完整部署信息。如有疑问，请参考项目文档或联系开发团队。*

## 🔄 升级历史

### v2.0.0 升级记录 (2025-08-07)

| 项目 | 值 |
|------|------|
| **升级时间** | 2025-08-07 01:46:20 UTC |
| **升级账户** | `0xB6e176A9E5A86AD4FA3Acad9eE605269055cE251` |
| **升级区块** | 15672262 |
| **升级类型** | UUPS 代理升级 |

#### 升级详情

| 合约名称 | 升级前实现地址 | 升级后实现地址 | 状态 |
|----------|----------------|----------------|------|
| **HZToken** | `0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64` | `0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64` | ✅ 无变化 |
| **Vesting** | `0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2` | `0x6695523171c3711C5A733E4d5230a76ce3816A75` | ✅ 已升级 |
| **MiningPool** | `0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3` | `0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3` | ✅ 无变化 |

#### 新增功能 (Vesting v2.0.0)

**前端展示接口**:
- 🆕 `getBeneficiaryVestingSummary(address)` - 获取受益人汇总信息
- 🆕 `getBeneficiaryVestingSchedules(address)` - 获取受益人所有计划
- 🆕 `getBeneficiarySchedulesByCategory(address)` - 按类别分组的计划
- 🆕 `getVestingProgress(bytes32)` - 获取计划进度详情

**数据结构**:
- 🆕 `BeneficiarySummary` - 受益人汇总信息结构体
- 🆕 `VestingProgress` - 计划进度信息结构体  
- 🆕 `CategorySchedules` - 分类计划信息结构体

#### 升级验证结果

✅ **功能验证通过**:
- 全局统计函数正常工作
- 新增的前端展示函数全部可用
- 合约版本已更新为 2.0.0
- 现有数据完整性保持

📊 **升级前后对比**:
- 合约大小: 8.873 KiB → 11.229 KiB (+2.356 KiB)
- 新增函数: 4个前端展示函数
- 新增结构体: 3个数据结构
- Gas 优化: 使用内存数组优化性能

## 🔄 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2025-08-07 | v2.0.0 | **Vesting合约升级** - 新增前端展示功能 |
| 2025-08-05 | v1.0.0 | 初始测试网部署完成 |

---

**最后更新**: 2025-08-07 01:46:20 UTC  
**文档版本**: 2.0.0  
**合约版本**: HZToken v1.0.0, Vesting v2.0.0, MiningPool v1.0.0