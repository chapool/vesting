# CPOP系统部署指南

## 部署前准备

### 环境要求
- Node.js >= 16.0.0
- Hardhat ^2.19.0
- Solidity ^0.8.20
- OpenZeppelin Contracts Upgradeable ^4.9.0
- 账户抽象相关依赖

### 依赖安装
```bash
npm install --save @openzeppelin/contracts-upgradeable
npm install --save @account-abstraction/contracts
npm install --save @eth-infinitism/bundler
```

### 网络配置
```javascript
// hardhat.config.js
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    gasPrice: 20000000000,
  },
  mainnet: {
    url: process.env.MAINNET_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    gasPrice: "auto",
  }
}
```

## 部署脚本

### 1. 核心合约部署脚本

```javascript
// scripts/deploy-cpotp-core.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const deploymentResults = {};
    
    // 1. 部署 CPOPToken
    console.log("Deploying CPOPToken...");
    const CPOPToken = await ethers.getContractFactory("CPOPToken");
    const cpotpToken = await upgrades.deployProxy(
        CPOPToken,
        [
            "CPOP Points", // name
            "CPOP",        // symbol
            deployer.address // initial admin
        ],
        { 
            initializer: "initialize",
            kind: "uups"
        }
    );
    await cpotpToken.deployed();
    deploymentResults.cpotpToken = cpotpToken.address;
    console.log("CPOPToken deployed to:", cpotpToken.address);
    
    // 2. 部署 EntryPoint (如果需要)
    console.log("Deploying EntryPoint...");
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();
    deploymentResults.entryPoint = entryPoint.address;
    console.log("EntryPoint deployed to:", entryPoint.address);
    
    // 3. 部署 CPOPAAWallet Factory
    console.log("Deploying CPOPAAWallet Factory...");
    const CPOPAAWalletFactory = await ethers.getContractFactory("CPOPAAWalletFactory");
    const walletFactory = await CPOPAAWalletFactory.deploy(
        entryPoint.address,
        cpotpToken.address
    );
    await walletFactory.deployed();
    deploymentResults.walletFactory = walletFactory.address;
    console.log("CPOPAAWallet Factory deployed to:", walletFactory.address);
    
    // 4. 部署 CPOPPaymaster
    console.log("Deploying CPOPPaymaster...");
    const CPOPPaymaster = await ethers.getContractFactory("CPOPPaymaster");
    const paymaster = await CPOPPaymaster.deploy(
        entryPoint.address,
        cpotpToken.address
    );
    await paymaster.deployed();
    deploymentResults.paymaster = paymaster.address;
    console.log("CPOPPaymaster deployed to:", paymaster.address);
    
    // 保存部署结果
    const fs = require('fs');
    fs.writeFileSync(
        'deployments/cpotp-core-deployment.json',
        JSON.stringify(deploymentResults, null, 2)
    );
    
    console.log("Core deployment completed!");
    return deploymentResults;
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { main };
```

### 2. 应用层合约部署脚本

```javascript
// scripts/deploy-cpotp-apps.js
const { ethers, upgrades } = require("hardhat");
const coreDeployment = require("../deployments/cpotp-core-deployment.json");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying application contracts with account:", deployer.address);
    
    const deploymentResults = { ...coreDeployment };
    
    // 1. 部署 CPOPActivity
    console.log("Deploying CPOPActivity...");
    const CPOPActivity = await ethers.getContractFactory("CPOPActivity");
    const activity = await upgrades.deployProxy(
        CPOPActivity,
        [
            coreDeployment.cpotpToken,
            deployer.address
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await activity.deployed();
    deploymentResults.activity = activity.address;
    console.log("CPOPActivity deployed to:", activity.address);
    
    // 2. 部署 CPOPConsumer
    console.log("Deploying CPOPConsumer...");
    const CPOPConsumer = await ethers.getContractFactory("CPOPConsumer");
    const consumer = await upgrades.deployProxy(
        CPOPConsumer,
        [
            coreDeployment.cpotpToken,
            deployer.address
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await consumer.deployed();
    deploymentResults.consumer = consumer.address;
    console.log("CPOPConsumer deployed to:", consumer.address);
    
    // 3. 部署 CPOPRecharge (CPOT充值系统)
    console.log("Deploying CPOPRecharge...");
    const CPOPRecharge = await ethers.getContractFactory("CPOPRecharge");
    const recharge = await upgrades.deployProxy(
        CPOPRecharge,
        [
            coreDeployment.cpotpToken,
            process.env.CPOT_TOKEN_ADDRESS, // HZToken address
            deployer.address
        ],
        {
            initializer: "initialize", 
            kind: "uups"
        }
    );
    await recharge.deployed();
    deploymentResults.recharge = recharge.address;
    console.log("CPOPRecharge deployed to:", recharge.address);
    
    // 4. 部署 CPOPExchange (需要 CPOT 代币地址)
    const cpotTokenAddress = process.env.CPOT_TOKEN_ADDRESS; // HZToken address
    if (!cpotTokenAddress) {
        throw new Error("CPOT_TOKEN_ADDRESS environment variable is required");
    }
    
    console.log("Deploying CPOPExchange...");
    const CPOPExchange = await ethers.getContractFactory("CPOPExchange");
    const exchange = await upgrades.deployProxy(
        CPOPExchange,
        [
            coreDeployment.cpotpToken,
            cpotTokenAddress,
            deployer.address
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await exchange.deployed();
    deploymentResults.exchange = exchange.address;
    console.log("CPOPExchange deployed to:", exchange.address);
    
    // 保存完整部署结果
    const fs = require('fs');
    fs.writeFileSync(
        'deployments/cpotp-full-deployment.json',
        JSON.stringify(deploymentResults, null, 2)
    );
    
    console.log("Application deployment completed!");
    return deploymentResults;
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { main };
```

### 3. 权限配置脚本

```javascript
// scripts/configure-permissions.js
const { ethers } = require("hardhat");
const deployment = require("../deployments/cpotp-full-deployment.json");

async function main() {
    const [admin] = await ethers.getSigners();
    console.log("Configuring permissions with account:", admin.address);
    
    // 获取合约实例
    const cpotpToken = await ethers.getContractAt("CPOPToken", deployment.cpotpToken);
    const activity = await ethers.getContractAt("CPOPActivity", deployment.activity);
    const consumer = await ethers.getContractAt("CPOPConsumer", deployment.consumer);
    const recharge = await ethers.getContractAt("CPOPRecharge", deployment.recharge);
    const exchange = await ethers.getContractAt("CPOPExchange", deployment.exchange);
    const paymaster = await ethers.getContractAt("CPOPPaymaster", deployment.paymaster);
    
    // 角色哈希
    const MINTER_ROLE = await cpotpToken.MINTER_ROLE();
    const BURNER_ROLE = await cpotpToken.BURNER_ROLE();
    const WHITELIST_MANAGER_ROLE = await cpotpToken.WHITELIST_MANAGER_ROLE();
    
    console.log("Configuring CPOP Token permissions...");
    
    // 1. 授予 Activity 合约 MINTER_ROLE (发放任务奖励)
    await cpotpToken.grantRole(MINTER_ROLE, deployment.activity);
    console.log("✓ Granted MINTER_ROLE to Activity contract");
    
    // 1.1. 授予 Recharge 合约 MINTER_ROLE (CPOT充值铸造积分)
    await cpotpToken.grantRole(MINTER_ROLE, deployment.recharge);
    console.log("✓ Granted MINTER_ROLE to Recharge contract");
    
    // 2. 授予 Consumer 合约 BURNER_ROLE (消费积分)
    await cpotpToken.grantRole(BURNER_ROLE, deployment.consumer);
    console.log("✓ Granted BURNER_ROLE to Consumer contract");
    
    // 3. 授予 Exchange 合约 BURNER_ROLE (兑换时销毁)
    await cpotpToken.grantRole(BURNER_ROLE, deployment.exchange);
    console.log("✓ Granted BURNER_ROLE to Exchange contract");
    
    // 4. 授予 Paymaster 合约 BURNER_ROLE (Gas 费用)
    await cpotpToken.grantRole(BURNER_ROLE, deployment.paymaster);
    console.log("✓ Granted BURNER_ROLE to Paymaster contract");
    
    // 5. 配置白名单 (允许合约间转账)
    await cpotpToken.addToWhitelist(deployment.activity);
    await cpotpToken.addToWhitelist(deployment.consumer);
    await cpotpToken.addToWhitelist(deployment.recharge);
    await cpotpToken.addToWhitelist(deployment.exchange);
    await cpotpToken.addToWhitelist(deployment.paymaster);
    console.log("✓ Added contracts to whitelist");
    
    // 6. 配置 Exchange 合约权限 (需要 CPOT 铸造权限)
    const cpotToken = await ethers.getContractAt("HZToken", process.env.CPOT_TOKEN_ADDRESS);
    // 假设 HZToken 有类似的权限系统
    // await cpotToken.grantRole(MINTER_ROLE, deployment.exchange);
    
    console.log("Permission configuration completed!");
    
    // 验证配置
    await verifyPermissions();
}

async function verifyPermissions() {
    console.log("\nVerifying permissions...");
    const deployment = require("../deployments/cpotp-full-deployment.json");
    const cpotpToken = await ethers.getContractAt("CPOPToken", deployment.cpotpToken);
    
    const MINTER_ROLE = await cpotpToken.MINTER_ROLE();
    const BURNER_ROLE = await cpotpToken.BURNER_ROLE();
    
    // 验证角色分配
    const activityHasMinter = await cpotpToken.hasRole(MINTER_ROLE, deployment.activity);
    const consumerHasBurner = await cpotpToken.hasRole(BURNER_ROLE, deployment.consumer);
    const exchangeHasBurner = await cpotpToken.hasRole(BURNER_ROLE, deployment.exchange);
    
    console.log(`Activity MINTER_ROLE: ${activityHasMinter ? '✓' : '✗'}`);
    console.log(`Consumer BURNER_ROLE: ${consumerHasBurner ? '✓' : '✗'}`);
    console.log(`Exchange BURNER_ROLE: ${exchangeHasBurner ? '✓' : '✗'}`);
    
    // 验证白名单
    const activityWhitelisted = await cpotpToken.isWhitelistedContract(deployment.activity);
    console.log(`Activity whitelisted: ${activityWhitelisted ? '✓' : '✗'}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { main };
```

### 4. 初始化配置脚本

```javascript
// scripts/initialize-system.js
const { ethers } = require("hardhat");
const deployment = require("../deployments/cpotp-full-deployment.json");

async function main() {
    const [admin] = await ethers.getSigners();
    console.log("Initializing system with account:", admin.address);
    
    // 获取合约实例
    const cpotpToken = await ethers.getContractAt("CPOPToken", deployment.cpotpToken);
    const activity = await ethers.getContractAt("CPOPActivity", deployment.activity);
    const consumer = await ethers.getContractAt("CPOPConsumer", deployment.consumer);
    const recharge = await ethers.getContractAt("CPOPRecharge", deployment.recharge);
    const exchange = await ethers.getContractAt("CPOPExchange", deployment.exchange);
    
    console.log("1. Configuring CPOP Token sources...");
    // 配置积分来源
    const sources = [
        { source: 0, baseAmount: ethers.utils.parseUnits("10", 18), multiplier: 100, dailyLimit: ethers.utils.parseUnits("50", 18), enabled: true }, // DAILY_SIGNIN
        { source: 1, baseAmount: ethers.utils.parseUnits("20", 18), multiplier: 100, dailyLimit: ethers.utils.parseUnits("200", 18), enabled: true }, // TASK_COMPLETE
        { source: 2, baseAmount: ethers.utils.parseUnits("50", 18), multiplier: 100, dailyLimit: ethers.utils.parseUnits("500", 18), enabled: true }, // REFERRAL
        { source: 3, baseAmount: ethers.utils.parseUnits("5", 18), multiplier: 100, dailyLimit: ethers.utils.parseUnits("100", 18), enabled: true },  // PURCHASE
        { source: 4, baseAmount: ethers.utils.parseUnits("30", 18), multiplier: 100, dailyLimit: ethers.utils.parseUnits("300", 18), enabled: true }, // ACTIVITY
    ];
    
    for (const config of sources) {
        await cpotpToken.configureSource(
            config.source,
            config.baseAmount,
            config.multiplier,
            config.dailyLimit,
            config.enabled
        );
        console.log(`✓ Configured source ${config.source}`);
    }
    
    console.log("2. Setting up default tasks...");
    // 创建默认每日签到任务
    await activity.createTask(
        0, // DAILY_SIGNIN
        "Daily Sign In",
        "Sign in daily to earn points",
        ethers.utils.parseUnits("10", 18), // 10 CPOP reward
        Math.floor(Date.now() / 1000), // start now
        Math.floor(Date.now() / 1000) + (365 * 24 * 3600), // 1 year duration
        1000000, // max participants
        true, // repeatable
        24 * 3600 // 24 hours repeat interval
    );
    console.log("✓ Created daily sign-in task");
    
    console.log("3. Setting up CPOT recharge configuration...");
    // 配置CPOT充值参数
    await recharge.updateRechargeConfig(
        100, // baseExchangeRate: 1 CPOT = 100 CPOP
        ethers.utils.parseUnits("1", 18), // minRechargeAmount: 1 CPOT
        ethers.utils.parseUnits("10000", 18), // maxRechargeAmount: 10,000 CPOT
        ethers.utils.parseUnits("1000", 18), // dailyLimit: 1,000 CPOT per day
        true // enabled: true
    );
    console.log("✓ Configured recharge parameters");
    
    // 设置充值奖励门槛
    await recharge.setBonusThresholds(
        ethers.utils.parseUnits("100", 18), // threshold1: 100 CPOT
        1000, // rate1: 10% bonus
        ethers.utils.parseUnits("500", 18), // threshold2: 500 CPOT  
        2000  // rate2: 20% bonus
    );
    console.log("✓ Configured recharge bonus thresholds");
    
    console.log("4. Setting up exchange configuration...");
    // 配置兑换参数
    await exchange.setExchangeConfig(
        ethers.utils.parseUnits("1000", 18), // exchangeRate: 1000 CPOP = 1 CPOT
        ethers.utils.parseUnits("1000", 18), // minExchangeAmount: 1000 CPOP
        ethers.utils.parseUnits("100000", 18), // maxExchangeAmount: 100,000 CPOP
        ethers.utils.parseUnits("10000", 18), // dailyLimit: 10,000 CPOP per day
        ethers.utils.parseUnits("10", 18), // processingFee: 10 CPOP
        false, // autoApprovalEnabled: false (require manual approval)
        ethers.utils.parseUnits("5000", 18) // autoApprovalLimit: 5,000 CPOP
    );
    console.log("✓ Configured exchange parameters");
    
    console.log("5. Setting up authorized merchants and U-Card system...");
    // 添加授权商户（替代直接的商城产品管理）
    await consumer.addAuthorizedMerchant(
        admin.address, // 临时使用admin作为商户地址，实际部署时使用专门的商户服务地址
        "mall_service",
        "Official Mall Service",
        ethers.utils.parseUnits("100000", 18) // 每日10万积分限额
    );
    console.log("✓ Added authorized merchant: Official Mall Service");
    
    await consumer.addAuthorizedMerchant(
        admin.address, // 可以添加多个商户
        "ucard_service", 
        "U-Card Top-up Service",
        ethers.utils.parseUnits("500000", 18) // 每日50万积分限额（U卡充值需要更高限额）
    );
    console.log("✓ Added authorized merchant: U-Card Service");
    
    // 创建示例U卡
    await consumer.createUCard(
        admin.address,
        "UCARD_DEMO_001", 
        "virtual"
    );
    console.log("✓ Created demo U-Card");
    
    console.log("6. Configure U-Card exchange rates...");
    // 这里可以设置初始汇率或配置汇率更新权限
    console.log("✓ U-Card system configured");
    
    console.log("System initialization completed!");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { main };
```

## 部署流程

### 测试网部署

```bash
# 1. 设置环境变量
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_private_key"
export CPOT_TOKEN_ADDRESS="0x..." # HZToken address on testnet

# 2. 编译合约
npx hardhat compile

# 3. 部署核心合约
npx hardhat run scripts/deploy-cpotp-core.js --network sepolia

# 4. 部署应用合约
npx hardhat run scripts/deploy-cpotp-apps.js --network sepolia

# 5. 配置权限
npx hardhat run scripts/configure-permissions.js --network sepolia

# 6. 初始化系统
npx hardhat run scripts/initialize-system.js --network sepolia

# 7. 验证合约 (可选)
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

### 主网部署

```bash
# 1. 设置主网环境变量
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/YOUR_KEY"
export PRIVATE_KEY="your_mainnet_private_key"
export CPOT_TOKEN_ADDRESS="0x..." # HZToken address on mainnet

# 2. 部署到主网 (使用相同脚本)
npx hardhat run scripts/deploy-cpotp-core.js --network mainnet
npx hardhat run scripts/deploy-cpotp-apps.js --network mainnet
npx hardhat run scripts/configure-permissions.js --network mainnet
npx hardhat run scripts/initialize-system.js --network mainnet
```

## 部署后验证

### 1. 功能测试脚本

```javascript
// scripts/test-deployment.js
const { ethers } = require("hardhat");
const deployment = require("../deployments/cpotp-full-deployment.json");

async function main() {
    const [admin, user] = await ethers.getSigners();
    console.log("Testing deployment...");
    
    const cpotpToken = await ethers.getContractAt("CPOPToken", deployment.cpotpToken);
    const activity = await ethers.getContractAt("CPOPActivity", deployment.activity);
    
    // 测试1: 每日签到
    console.log("Testing daily sign-in...");
    const signInTx = await activity.connect(user).dailySignIn();
    await signInTx.wait();
    
    const balance = await cpotpToken.balanceOf(user.address);
    console.log(`User balance after sign-in: ${ethers.utils.formatUnits(balance, 18)} CPOP`);
    
    // 测试2: 检查用户等级
    const userLevel = await cpotpToken.getUserLevel(user.address);
    console.log(`User level: ${userLevel.level}, Total earned: ${ethers.utils.formatUnits(userLevel.totalEarned, 18)}`);
    
    console.log("✓ Deployment test completed successfully!");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
```

### 2. 监控和维护

```javascript
// scripts/system-status.js
async function getSystemStatus() {
    const deployment = require("../deployments/cpotp-full-deployment.json");
    
    const cpotpToken = await ethers.getContractAt("CPOPToken", deployment.cpotpToken);
    const activity = await ethers.getContractAt("CPOPActivity", deployment.activity);
    const mall = await ethers.getContractAt("CPOPMall", deployment.mall);
    const exchange = await ethers.getContractAt("CPOPExchange", deployment.exchange);
    
    console.log("=== CPOP System Status ===");
    
    // 代币统计
    const totalSupply = await cpotpToken.totalSupply();
    console.log(`Total CPOP Supply: ${ethers.utils.formatUnits(totalSupply, 18)}`);
    
    // 活跃任务数量
    const activeTasksCount = await activity.getActiveTasksCount();
    console.log(`Active Tasks: ${activeTasksCount}`);
    
    // 商城商品数量
    const productsCount = await mall.getProductsCount();
    console.log(`Mall Products: ${productsCount}`);
    
    // 待处理兑换请求
    const pendingExchanges = await exchange.getPendingExchangesCount();
    console.log(`Pending Exchanges: ${pendingExchanges}`);
    
    console.log("=========================");
}
```

## 升级策略

### 合约升级脚本

```javascript
// scripts/upgrade-contract.js
const { ethers, upgrades } = require("hardhat");

async function upgradeContract(contractName, proxyAddress) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    console.log(`Upgrading ${contractName}...`);
    const upgraded = await upgrades.upgradeProxy(proxyAddress, ContractFactory);
    await upgraded.deployed();
    
    console.log(`${contractName} upgraded at:`, upgraded.address);
    return upgraded.address;
}

// 使用示例
// await upgradeContract("CPOPToken", deployment.cpotpToken);
```

这个部署指南提供了完整的CPOP系统部署流程，包括合约部署、权限配置、初始化和测试验证等各个环节。