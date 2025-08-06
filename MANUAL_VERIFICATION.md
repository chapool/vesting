# HashKey Chain Testnet 合约手动验证指南

## 🎯 验证目标

通过 Blockscout 浏览器验证以下实现合约的源代码:


1. **HZToken**: `0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64`

2. **Vesting**: `0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2`

3. **MiningPool**: `0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3`


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


### 1. 验证 HZToken 实现合约

#### 🔗 验证链接
直接访问: https://testnet-explorer.hsk.xyz/contract-verification

#### 📋 填写表单

1. **Contract Address** (合约地址)
   ```
   0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64
   ```

2. **Contract Name** (合约名称)
   ```
   HZToken
   ```

3. **Compiler Version** (编译器版本)
   选择: `v0.8.30+commit.5b4cc3d1`

4. **Optimization** (优化)
   选择: `Yes` ✅

5. **Optimization Runs** (优化次数)
   输入: `200`

6. **EVM Version** (EVM版本)
   选择: `paris`

7. **License Type** (许可证)
   选择: `MIT`

8. **Constructor Arguments** (构造参数)
   留空 (实现合约无构造参数)

#### 📄 源代码上传

**方法 1: 文件上传**
- 选择 "Upload Source Files"
- 上传文件: `HZToken_flattened.sol`

**方法 2: 粘贴代码**
- 选择 "Paste Source Code"
- 复制 `HZToken_flattened.sol` 的全部内容粘贴

#### ✅ 提交验证
点击 "Verify and Publish" 按钮

#### 🔍 检查结果
验证成功后，访问合约页面查看源代码:
https://testnet-explorer.hsk.xyz/address/0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64

---

### 2. 验证 Vesting 实现合约

#### 🔗 验证链接
直接访问: https://testnet-explorer.hsk.xyz/contract-verification

#### 📋 填写表单

1. **Contract Address** (合约地址)
   ```
   0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2
   ```

2. **Contract Name** (合约名称)
   ```
   Vesting
   ```

3. **Compiler Version** (编译器版本)
   选择: `v0.8.30+commit.5b4cc3d1`

4. **Optimization** (优化)
   选择: `Yes` ✅

5. **Optimization Runs** (优化次数)
   输入: `200`

6. **EVM Version** (EVM版本)
   选择: `paris`

7. **License Type** (许可证)
   选择: `MIT`

8. **Constructor Arguments** (构造参数)
   留空 (实现合约无构造参数)

#### 📄 源代码上传

**方法 1: 文件上传**
- 选择 "Upload Source Files"
- 上传文件: `Vesting_flattened.sol`

**方法 2: 粘贴代码**
- 选择 "Paste Source Code"
- 复制 `Vesting_flattened.sol` 的全部内容粘贴

#### ✅ 提交验证
点击 "Verify and Publish" 按钮

#### 🔍 检查结果
验证成功后，访问合约页面查看源代码:
https://testnet-explorer.hsk.xyz/address/0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2

---

### 3. 验证 MiningPool 实现合约

#### 🔗 验证链接
直接访问: https://testnet-explorer.hsk.xyz/contract-verification

#### 📋 填写表单

1. **Contract Address** (合约地址)
   ```
   0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3
   ```

2. **Contract Name** (合约名称)
   ```
   MiningPool
   ```

3. **Compiler Version** (编译器版本)
   选择: `v0.8.30+commit.5b4cc3d1`

4. **Optimization** (优化)
   选择: `Yes` ✅

5. **Optimization Runs** (优化次数)
   输入: `200`

6. **EVM Version** (EVM版本)
   选择: `paris`

7. **License Type** (许可证)
   选择: `MIT`

8. **Constructor Arguments** (构造参数)
   留空 (实现合约无构造参数)

#### 📄 源代码上传

**方法 1: 文件上传**
- 选择 "Upload Source Files"
- 上传文件: `MiningPool_flattened.sol`

**方法 2: 粘贴代码**
- 选择 "Paste Source Code"
- 复制 `MiningPool_flattened.sol` 的全部内容粘贴

#### ✅ 提交验证
点击 "Verify and Publish" 按钮

#### 🔍 检查结果
验证成功后，访问合约页面查看源代码:
https://testnet-explorer.hsk.xyz/address/0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3

---


## 🚨 常见问题解决

### ❌ 编译错误
1. **Compiler Version Mismatch**
   - 确保选择 `v0.8.30+commit.5b4cc3d1`
   - 不要选择其他 0.8.30 版本

2. **Optimization Settings**
   - 必须启用优化: `Yes`
   - 运行次数必须: `200`

3. **Source Code Issues**
   - 使用完整的扁平化文件
   - 确保文件编码为 UTF-8
   - 检查是否有特殊字符

### ⚠️ 验证失败
1. **ByteCode Mismatch**
   - 检查 EVM 版本是否为 `paris`
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

- **HZToken**: https://testnet-explorer.hsk.xyz/address/0x8cD02C155fA8D0900BA833a53AeB8A3CeCD2aE64

- **Vesting**: https://testnet-explorer.hsk.xyz/address/0x7D9CD974a0d1b6237f1e471C740cdEF0aB8158d2

- **MiningPool**: https://testnet-explorer.hsk.xyz/address/0x0eA863506Ee07C449fc8Ca7648fFA2a76c5c89e3


## 🤖 备选方案

如果手动验证困难，可以尝试:

1. **使用 API 验证**
   ```bash
   npx hardhat run scripts/blockscout-verify.js --network hashkeyTestnet
   ```

2. **联系技术支持**
   - HashKey Chain 官方支持
   - 社区技术论坛

## 📞 技术支持

- **HashKey Chain 官网**: https://hsk.xyz
- **测试网浏览器**: https://testnet-explorer.hsk.xyz
- **文档中心**: 查看官方文档

---

**生成时间**: 8/5/2025, 5:16:45 PM
**网络**: HashKey Chain Testnet (133)
**工具**: Blockscout Explorer

> 💡 提示: 建议优先验证 HZToken，然后是 Vesting，最后是 MiningPool
