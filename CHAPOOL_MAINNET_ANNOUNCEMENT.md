# 🎉 Chapool Token (CPOT) 主网部署公告

## 项目概述

**Chapool Token** 是一个基于 Hash Key Chain 主网的创新代币项目，采用先进的可升级智能合约架构，为社区提供安全、透明、高效的代币服务。

---

## 🔗 合约地址信息

### 主要合约
| 合约名称 | 合约地址 | 功能描述 | 浏览器链接 |
|---------|---------|----------|----------|
| **Chapool Token (CPOT)** | `0xbA39fC9726362f76EE1688C84E302a29997A595c` | 主代币合约 | [查看合约](https://explorer.hsk.xyz/address/0xbA39fC9726362f76EE1688C84E302a29997A595c) |
| **Vesting 释放合约** | `0xB322bb70FD8370ee530382aF2350CC7943e94E7A` | 代币释放管理 | [查看合约](https://explorer.hsk.xyz/address/0xB322bb70FD8370ee530382aF2350CC7943e94E7A) |
| **MiningPool 挖矿池** | `0x17C277Fd6CB8C271777f717C88723403B5f37E99` | 挖矿奖励分发 | [查看合约](https://explorer.hsk.xyz/address/0x17C277Fd6CB8C271777f717C88723403B5f37E99) |

### 实现合约（供技术人员参考）
| 合约名称 | 实现地址 | 浏览器链接 |
|---------|----------|----------|
| Chapool Token 实现 | `0x3BfD361fB808D62519d2E85C28C47DF7eefb65ab` | [查看实现](https://explorer.hsk.xyz/address/0x3BfD361fB808D62519d2E85C28C47DF7eefb65ab) |
| Vesting 实现 | `0x382841fe76d70FC61091bE8669Ff369aa65A4fdd` | [查看实现](https://explorer.hsk.xyz/address/0x382841fe76d70FC61091bE8669Ff369aa65A4fdd) |
| MiningPool 实现 | `0x90c1d8a18859192Da043758023cb23F9B82dfE47` | [查看实现](https://explorer.hsk.xyz/address/0x90c1d8a18859192Da043758023cb23F9B82dfE47) |

---

## 💰 代币基本信息

| 项目 | 详情 |
|------|------|
| **代币名称** | Chapool |
| **代币符号** | CPOT |
| **精度** | 18 位小数 |
| **总供应量** | 10,000,000,000 CPOT（100亿枚） |
| **网络** | Hash Key Chain 主网 |
| **合约类型** | 可升级代理合约 (UUPS) |

---

## 🌐 网络信息

| 网络参数 | 值 |
|----------|---|
| **网络名称** | Hash Key Chain Mainnet |
| **Chain ID** | 177 |
| **RPC URL** | `https://mainnet.hsk.xyz` |
| **区块浏览器** | https://explorer.hsk.xyz |
| **原生代币** | HSK |

---

## 📊 当前状态

### 代币分配状态
- ✅ **总供应量：** 10,000,000,000 CPOT 已铸造
- ✅ **当前持有：** 所有代币暂存于 Vesting 合约中，等待释放计划配置
- ✅ **合约状态：** 所有合约已部署并正常运行

### 合约功能状态
- ✅ **Vesting 合约：** 已部署，暂无释放计划（根据项目规划）
- ✅ **MiningPool 合约：** 已部署，等待挖矿参数配置
- ✅ **代币合约：** 完整功能已激活，支持标准 ERC-20 操作

---

## 🔍 合约验证

所有合约已在 Hash Key Chain 区块浏览器上验证，社区成员可以：

1. 访问 **Hash Key Chain 浏览器**：https://explorer.hsk.xyz
2. 点击上方表格中的"查看合约"链接直接访问合约页面
3. 查看源代码、交易记录和合约验证状态
4. 验证合约的透明性和安全性

### 快速访问链接
- **🪙 主代币合约：** https://explorer.hsk.xyz/address/0xbA39fC9726362f76EE1688C84E302a29997A595c
- **📅 释放合约：** https://explorer.hsk.xyz/address/0xB322bb70FD8370ee530382aF2350CC7943e94E7A
- **⛏️ 挖矿池合约：** https://explorer.hsk.xyz/address/0x17C277Fd6CB8C271777f717C88723403B5f37E99

---

## 🛡️ 安全特性

### 技术架构优势
- **可升级设计：** 采用 OpenZeppelin 的 UUPS 代理模式，支持安全升级
- **多重验证：** 所有合约经过完整测试和验证
- **标准兼容：** 完全兼容 ERC-20 标准，支持所有主流钱包和 DeFi 协议

### 治理与安全
- **所有权管理：** 合约部署者持有初始管理权限
- **透明度：** 所有合约源代码公开可查
- **社区驱动：** 后续将考虑引入社区治理机制

---

## 🚀 如何添加到钱包

### MetaMask / 其他 EVM 钱包设置

**添加 Hash Key Chain 主网：**
- 网络名称：`Hash Key Chain Mainnet`
- RPC URL：`https://mainnet.hsk.xyz`
- Chain ID：`177`
- 货币符号：`HSK`
- 区块浏览器：`https://explorer.hsk.xyz`

**添加 CPOT 代币：**
- 代币合约地址：`0xbA39fC9726362f76EE1688C84E302a29997A595c`
- 代币符号：`CPOT`
- 小数位数：`18`

---

## 📈 项目路线图

### 已完成 ✅
- [x] 智能合约开发与测试
- [x] 主网部署
- [x] 合约验证
- [x] 基础设施搭建

### 即将推出 🔄
- [ ] 代币释放计划配置
- [ ] 挖矿池参数设置
- [ ] 社区治理功能
- [ ] DeFi 生态系统集成
- [ ] 跨链桥接支持

---

## 🌟 社区与支持

### 重要提醒
- 请通过官方渠道获取最新信息
- 谨防虚假代币和钓鱼网站
- 所有交易操作请仔细核对合约地址

### 技术支持
- **区块浏览器查询：** https://explorer.hsk.xyz
- **合约交互：** 请使用官方提供的合约地址
- **安全提示：** 请妥善保管您的私钥和助记词

---

## 📝 免责声明

本文档仅供信息参考，不构成投资建议。参与任何加密货币项目都存在风险，请用户在充分了解项目风险的基础上做出理性决策。

**部署时间：** 2025年8月7日  
**网络：** Hash Key Chain Mainnet  
**部署区块：** #10,105,487

---

*Chapool Token - 构建去中心化未来的基石* 🚀