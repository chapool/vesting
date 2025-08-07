# HZ Token Vesting 前端设计方案

## 1. 页面概览

### 1.1 页面结构
```
Vesting Dashboard
├── 全局统计区域
├── 用户钱包连接区域  
├── 用户个人概览区域
├── 按类别分组的计划区域
└── 个人计划详情区域
```

### 1.2 核心功能
- **全局统计展示**：显示整个Vesting合约的总体释放情况
- **个人概览展示**：显示连接钱包用户的个人统计信息
- **分类计划管理**：按挖矿、生态、团队、基石轮分类展示
- **代币释放操作**：用户可以领取自己的可释放代币
- **进度可视化**：图表展示释放进度和时间轴

## 2. 页面组件设计

### 2.1 全局统计组件 (GlobalStats)
```jsx
// 显示内容
- 合约总锁定代币数量
- 合约总已释放代币数量  
- 总释放进度百分比
- 活跃计划数量

// 调用的合约方法
- getVestingSchedulesTotalAmount()
- getVestingSchedulesReleasedAmount()
```

### 2.2 钱包连接组件 (WalletConnection)
```jsx
// 功能
- 钱包连接/断开
- 显示当前连接地址
- 网络状态检查
```

### 2.3 个人概览组件 (PersonalOverview)
```jsx
// 显示内容（基于连接的钱包地址）
- 个人总分配数量
- 已释放数量
- 当前可释放数量
- 仍锁定数量
- 拥有的计划数量

// 调用的合约方法
- getBeneficiaryVestingSummary(userAddress)
```

### 2.4 分类展示组件 (CategoryView)
```jsx
// 显示内容（4个类别标签）
- MINING (挖矿奖励)
- ECOSYSTEM (运营与生态发展) 
- TEAM (团队和顾问)
- CORNERSTONE (基石轮投资)

// 每个类别显示
- 该类别总数量
- 该类别已释放数量
- 该类别可释放数量
- 该类别的计划ID列表

// 调用的合约方法  
- getBeneficiarySchedulesByCategory(userAddress)
```

### 2.5 计划详情组件 (ScheduleDetails)
```jsx
// 显示内容（每个计划）
- 计划基本信息（总量、已释放、可释放、锁定）
- 释放进度条（百分比显示）
- 时间进度条（时间轴显示）
- 剩余释放时间
- 计划状态（活跃/已完成/已撤销）
- 释放类型（LINEAR/MILESTONE/CLIFF_LINEAR）

// 调用的合约方法
- getBeneficiaryVestingSchedules(userAddress)
- getVestingProgress(scheduleId) // 获取详细进度
```

### 2.6 释放操作组件 (ReleaseAction)
```jsx
// 功能
- 显示当前可释放总额
- 批量释放按钮（释放所有可释放代币）
- 单个计划释放按钮
- 释放数量输入框（可选择释放部分）
- 交易确认和状态显示

// 调用的合约方法
- computeReleasableAmount(scheduleId) // 计算可释放数量
- release(scheduleId, amount) // 执行释放
```

## 3. 合约ABI

### 3.1 所需的合约函数ABI
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "getBeneficiaryVestingSchedules",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "initialized",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "beneficiary",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "cliff",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "start",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "slicePeriodSeconds",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "revocable",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "amountTotal",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "released",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "revoked",
            "type": "bool"
          },
          {
            "internalType": "enum IVesting.AllocationCategory",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "enum IVesting.VestingType",
            "name": "vestingType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IVesting.VestingSchedule[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "getBeneficiaryVestingSummary",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasableAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "scheduleCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct IVesting.BeneficiarySummary",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "vestingScheduleId",
        "type": "bytes32"
      }
    ],
    "name": "getVestingProgress",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasableAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "progressPercent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timeProgress",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "remainingTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct IVesting.VestingProgress",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "getBeneficiarySchedulesByCategory",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IVesting.AllocationCategory",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bytes32[]",
            "name": "scheduleIds",
            "type": "bytes32[]"
          },
          {
            "internalType": "uint256",
            "name": "totalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "releasableAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct IVesting.CategorySchedules[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVestingSchedulesTotalAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVestingSchedulesReleasedAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "vestingScheduleId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "vestingScheduleId",
        "type": "bytes32"
      }
    ],
    "name": "computeReleasableAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
```

## 4. 数据结构说明

### 4.1 枚举类型
```javascript
// AllocationCategory (分配类型)
const AllocationCategory = {
  MINING: 0,        // 挖矿奖励
  ECOSYSTEM: 1,     // 运营与生态发展  
  TEAM: 2,          // 团队和顾问
  CORNERSTONE: 3    // 基石轮投资
}

// VestingType (释放类型)
const VestingType = {
  LINEAR: 0,        // 线性释放
  MILESTONE: 1,     // 分期释放
  CLIFF_LINEAR: 2   // Cliff + 线性
}
```

### 4.2 返回数据格式示例
```javascript
// getBeneficiaryVestingSummary 返回格式
{
  totalAmount: "1000000000000000000000",      // 总分配数量 (wei)
  releasedAmount: "200000000000000000000",    // 已释放数量 (wei)
  releasableAmount: "100000000000000000000",  // 当前可释放数量 (wei)
  lockedAmount: "700000000000000000000",      // 仍锁定数量 (wei)
  scheduleCount: "3"                          // 计划数量
}

// getVestingProgress 返回格式
{
  totalAmount: "500000000000000000000",
  releasedAmount: "100000000000000000000", 
  releasableAmount: "50000000000000000000",
  lockedAmount: "350000000000000000000",
  progressPercent: "2000",                    // 20.00% (范围0-10000)
  timeProgress: "3000",                       // 30.00% (范围0-10000)  
  remainingTime: "15552000",                  // 剩余秒数
  isActive: true                              // 是否活跃
}
```

## 5. 实现流程

### 5.1 页面加载流程
1. **初始化合约连接**
   - 连接到正确的网络
   - 加载Vesting合约实例

2. **获取全局数据**
   - 调用 `getVestingSchedulesTotalAmount()`
   - 调用 `getVestingSchedulesReleasedAmount()` 
   - 计算总体释放进度

3. **检查钱包连接**
   - 如果已连接，获取用户地址
   - 如果未连接，显示连接提示

4. **获取用户数据（如果钱包已连接）**
   - 调用 `getBeneficiaryVestingSummary(userAddress)`
   - 调用 `getBeneficiarySchedulesByCategory(userAddress)`
   - 调用 `getBeneficiaryVestingSchedules(userAddress)`

### 5.2 代币释放流程
1. **检查可释放数量**
   - 调用 `computeReleasableAmount(scheduleId)` 确认数量

2. **用户确认释放**
   - 显示将要释放的数量
   - 用户确认交易

3. **执行释放交易**
   - 调用 `release(scheduleId, amount)`
   - 显示交易状态（pending/success/failed）

4. **更新数据**
   - 重新获取用户数据
   - 更新页面显示

## 6. UI/UX 建议

### 6.1 视觉设计
- **进度条**：使用渐变色彩显示释放进度
- **卡片布局**：每个计划使用卡片形式展示
- **状态指示**：用不同颜色表示计划状态（活跃/暂停/完成）
- **响应式设计**：适配移动端和桌面端

### 6.2 交互体验
- **实时更新**：设置定时器定期刷新数据
- **加载状态**：显示数据加载动画
- **错误处理**：友好的错误提示信息
- **交易反馈**：清晰的交易状态提示

### 6.3 功能增强
- **历史记录**：显示用户的释放历史
- **通知提醒**：可释放代币的提醒功能
- **数据导出**：导出个人vesting数据
- **多语言支持**：支持中英文切换

## 7. 合约地址配置

```javascript
// 合约配置 (需要根据实际部署地址修改)
const CONTRACT_CONFIG = {
  // 主网配置
  mainnet: {
    vestingAddress: "0x...", // 实际的Vesting合约地址
    tokenAddress: "0x...",   // HZ Token合约地址
    chainId: 1
  },
  // 测试网配置  
  testnet: {
    vestingAddress: "0x...", // 测试网Vesting合约地址
    tokenAddress: "0x...",   // 测试网Token合约地址
    chainId: 4 // 或其他测试网ID
  }
}
```

## 8. 技术栈推荐

### 8.1 前端框架
- **React** 或 **Vue.js**：主要UI框架
- **TypeScript**：类型安全
- **Tailwind CSS** 或 **Material-UI**：UI组件库

### 8.2 Web3集成
- **ethers.js**：与以太坊交互
- **wagmi** (React) 或 **viem**：Web3 hooks
- **RainbowKit** 或 **ConnectKit**：钱包连接

### 8.3 数据可视化
- **Chart.js** 或 **Recharts**：图表组件
- **date-fns**：时间处理
- **numeral.js**：数字格式化

这个方案提供了完整的前端实现指导，包括页面结构、组件设计、合约ABI和实现流程。前端团队可以基于这个方案开始开发Vesting管理界面。