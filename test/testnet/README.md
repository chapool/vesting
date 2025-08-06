# Vesting 合约测试网测试指南

## 🎯 测试目标

专门测试已部署在 HashKey Chain Testnet 上的 Vesting 合约功能。

## 🌐 测试网配置

| 项目 | 值 |
|------|------|
| **网络名称** | HashKey Chain Testnet |
| **Chain ID** | 133 |
| **RPC URL** | 根据 hardhat.config.js 配置 |
| **浏览器** | https://testnet-explorer.hsk.xyz |

## 📄 合约地址

| 合约 | 代理地址 | 实现地址 |
|------|----------|----------|
| **HZToken** | `0xAC3879CB86d1B815B1519c4805A21070649493Af` | `0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64` |
| **Vesting** | `0x84Be95c1A2Bef81F41f3c563F0E79D5C1f6B46e7` | `0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2` |
| **MiningPool** | `0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa` | `0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3` |

## 🔑 挖矿释放计划

- **计划ID**: `0x7d68a4befde415f47272589f7d4fe36f47d882cbbb2d12752e21bb78a9635538`
- **受益人**: MiningPool合约 (`0xf2C9640eBE2fb83d89F44994e25a2d7341880Daa`)
- **分配金额**: 25,000,000 HZ (25M)
- **分配类型**: MINING (0)

## 🧪 测试功能

### ✅ 基础状态验证
- 合约地址连接验证
- 代币合约配置验证
- 所有者权限验证
- 合约暂停状态验证

### ✅ 释放计划状态查询
- 总释放计划数量
- 总锁定代币数量
- 总已释放代币数量
- 释放计划ID列表

### ✅ 挖矿释放计划验证
- 挖矿计划存在性验证
- 受益人地址验证 (应为MiningPool)
- 分配金额验证 (应为25M HZ)
- 当前可释放金额计算
- 释放时间参数验证

### ✅ 分配类型统计
- 挖矿类别代币分配统计
- 其他分配类别查询
- 分配与释放金额对比

### ✅ 合约关联验证
- MiningPool中Vesting地址配置
- MiningPool中释放计划ID配置
- 合约间关系一致性

### ✅ 代币余额验证
- Vesting合约代币余额
- MiningPool合约代币余额
- 余额分布合理性验证

## 🚀 运行测试

### 环境准备

1. **确保网络配置**
   ```bash
   # 检查 hardhat.config.js 中是否有 hashkeyTestnet 网络配置
   ```

2. **账户配置**
   - 确保测试账户有足够的测试币支付 Gas
   - 测试账户不需要是合约 owner（仅进行只读测试）

### 执行测试

```bash
# 运行 Vesting 合约测试
npm run test:vesting

# 或者直接使用 hardhat
npx hardhat test test/testnet/VestingTestnet.test.js --network hashkeyTestnet
```

## 📊 预期结果

测试将验证以下内容：

1. **✅ 连接成功**: 成功连接到测试网上的合约
2. **✅ 配置正确**: 合约配置与部署信息一致
3. **✅ 计划存在**: 挖矿释放计划已正确创建
4. **✅ 金额匹配**: 分配金额与预期一致
5. **✅ 关系正确**: 合约间关联关系正确配置
6. **✅ 余额合理**: 代币分布符合预期

## ⚠️ 注意事项

1. **只读测试**: 此测试只进行状态查询，不会修改合约状态
2. **网络连接**: 需要稳定的网络连接到 HashKey Chain Testnet
3. **Gas费用**: 查询操作消耗极少的 Gas
4. **权限限制**: 测试账户无需特殊权限

## 🔧 故障排查

### 连接问题
```bash
# 检查网络配置
npx hardhat compile
npx hardhat console --network hashkeyTestnet
```

### 合约地址问题
- 验证合约地址是否正确
- 检查网络是否匹配

### RPC问题
- 检查 RPC 端点是否可用
- 尝试更换 RPC 提供商

## 📝 测试报告

测试完成后会输出详细的验证结果，包括：

- 合约状态信息
- 释放计划详情
- 代币分配统计
- 时间参数分析
- 验证结果总结

---

**测试文件**: `VestingTestnet.test.js`  
**创建时间**: 2025-08-06  
**测试网络**: HashKey Chain Testnet (133)