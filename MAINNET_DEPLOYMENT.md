# 主网部署指南

## 部署概述

本文档记录了HZToken生态系统在以太坊主网的部署过程和配置信息。

## 合约部署地址

### 核心合约
```
HZToken (Proxy): 0x... (待部署)
HZToken (Implementation): 0x... (待部署)
Vesting Contract: 0x... (待部署)
MiningPool Contract: 0x... (待部署)
```

### 部署配置
- **网络**: Ethereum Mainnet
- **Gas Price**: 动态调整
- **部署账户**: 0x... (多签钱包)
- **初始供应量**: 1,000,000,000 HZ
- **代币符号**: HZ
- **小数位**: 18

## 部署前检查清单

### 1. 环境准备
- [ ] 确认部署账户有足够ETH用于Gas费用
- [ ] 验证Hardhat配置正确
- [ ] 确认所有合约通过测试
- [ ] 代码审计完成
- [ ] 多签钱包设置完成

### 2. 合约验证
- [ ] 所有合约在测试网验证通过
- [ ] 安全审计报告完成
- [ ] 社区代码审查完成
- [ ] Gas优化完成

### 3. 部署参数
- [ ] 代币名称和符号确认
- [ ] 总供应量配置
- [ ] Vesting时间表确认
- [ ] 税收参数设置
- [ ] 管理员权限分配

## 部署步骤

### 1. 部署核心合约
```bash
# 设置主网环境变量
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_mainnet_private_key"
export ETHERSCAN_API_KEY="your_etherscan_api_key"

# 部署合约
npx hardhat run scripts/deploy.js --network mainnet

# 验证合约
npx hardhat verify --network mainnet DEPLOYED_ADDRESS
```

### 2. 初始化配置
```bash
# 配置税收参数
npx hardhat run scripts/configure-tax.js --network mainnet

# 设置Vesting计划
npx hardhat run scripts/setup-vesting.js --network mainnet

# 配置Mining Pool
npx hardhat run scripts/setup-mining.js --network mainnet
```

### 3. 权限转移
```bash
# 将所有权转移到多签钱包
npx hardhat run scripts/transfer-ownership.js --network mainnet
```

## 安全注意事项

### 多签钱包配置
- **Gnosis Safe**: 3/5 多签配置
- **签名者**: [列出所有签名者地址]
- **确认阈值**: 3个签名

### 权限管理
- 所有关键操作需要多签确认
- 紧急暂停权限限制在核心团队
- 升级权限通过时间锁控制

### 监控设置
- 合约事件监控
- 异常交易报警
- Gas费用追踪
- 大额转账通知

## 部署后验证

### 1. 功能测试
- [ ] 代币转账功能
- [ ] 税收机制正常
- [ ] Vesting释放正常
- [ ] Mining奖励分发
- [ ] 暂停/恢复功能

### 2. 安全验证
- [ ] 权限配置正确
- [ ] 多签钱包正常工作
- [ ] 紧急暂停可用
- [ ] 升级机制安全

### 3. 集成测试
- [ ] DEX流动性添加
- [ ] 前端接口测试
- [ ] 钱包兼容性
- [ ] 区块浏览器显示

## 应急预案

### 紧急情况处理
1. **发现安全漏洞**
   - 立即暂停合约
   - 通知所有用户
   - 准备修复方案

2. **合约升级需求**
   - 通过多签提案
   - 社区投票决定
   - 时间锁延迟执行

3. **流动性危机**
   - 激活紧急流动性
   - 调整税收参数
   - 社区沟通方案

## 社区沟通

### 公告渠道
- 官方网站
- Twitter公告
- Discord/Telegram群组
- 技术文档更新

### 透明度要求
- 部署地址公开
- 合约代码验证
- 审计报告发布
- 定期进度更新

## 合规要求

### 法律审查
- 代币经济学合规性
- 监管要求遵循
- KYC/AML政策
- 税务处理指导

### 文档要求
- 白皮书更新
- 技术文档完善
- 用户条款制定
- 风险提示发布

## 维护计划

### 定期检查
- 智能合约健康监控
- Gas效率优化
- 安全参数调整
- 社区反馈收集

### 升级路径
- 版本发布计划
- 兼容性维护
- 功能增强规划
- 社区治理完善

---

**注意**: 主网部署是不可逆转的过程，请确保所有检查项目都已完成，并获得团队和社区的充分确认后再执行部署操作。