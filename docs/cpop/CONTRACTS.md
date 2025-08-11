# CPOP系统合约详细设计

## 合约架构总览

CPOP积分系统由6个核心合约组成，采用混合架构设计：核心功能在链上实现，复杂业务逻辑在链下处理，通过标准化接口相互协作。支持CPOT代币双向流通。

## 1. CPOPToken 合约 - 核心积分代币

### 基础信息
- **继承**: ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable
- **功能**: 轻量化积分代币，专门为APP内使用设计
- **特点**: 白名单转账限制，支持多种积分来源

### 核心数据结构

```solidity
// 积分来源枚举
enum PointSource { 
    DAILY_SIGNIN,    // 每日签到
    TASK_COMPLETE,   // 任务完成  
    REFERRAL,        // 推荐奖励
    PURCHASE,        // 购买奖励
    ACTIVITY,        // 活动奖励
    ADMIN_GRANT      // 管理员发放
}

// 积分来源配置
struct SourceConfig {
    uint256 baseAmount;     // 基础奖励数量
    uint256 multiplier;     // 倍率 (基点制)
    uint256 dailyLimit;     // 每日获取上限
    bool enabled;           // 是否启用
}

// 用户成长数据
struct UserLevel {
    uint8 level;            // 用户等级 (1-100)
    uint256 totalEarned;    // 累计获得积分
    uint256 totalSpent;     // 累计消费积分
    bool isVIP;             // VIP状态
    uint256 vipExpiry;      // VIP过期时间
    uint256 lastLevelUpdate; // 最后等级更新时间
}

// 每日限额追踪
struct DailyTracker {
    uint256 earnedToday;    // 今日已获得
    uint256 lastResetTime;  // 上次重置时间
    mapping(PointSource => uint256) sourceEarned; // 各来源今日获得
}
```

### 关键功能

#### 积分发放系统
```solidity
function mintPoints(
    address to,
    uint256 amount,
    PointSource source,
    string memory reason
) external onlyRole(MINTER_ROLE);

function batchMintPoints(
    address[] calldata recipients,
    uint256[] calldata amounts,
    PointSource source,
    string memory reason
) external onlyRole(MINTER_ROLE);
```

#### 白名单转账控制
```solidity
mapping(address => bool) public isWhitelistedContract;

function _update(address from, address to, uint256 amount) internal override {
    // 只允许在白名单合约间转移
    if (from != address(0) && to != address(0)) {
        require(
            isWhitelistedContract[from] || isWhitelistedContract[to],
            "CPOP: transfer not allowed"
        );
    }
    super._update(from, to, amount);
}
```

#### 用户等级管理
```solidity
function updateUserLevel(address user) public returns (uint8 newLevel) {
    UserLevel storage userLevel = userLevels[user];
    uint8 calculatedLevel = _calculateLevel(userLevel.totalEarned);
    
    if (calculatedLevel > userLevel.level) {
        userLevel.level = calculatedLevel;
        userLevel.lastLevelUpdate = block.timestamp;
        emit LevelUp(user, calculatedLevel);
    }
    
    return userLevel.level;
}
```

### 权限角色
- `MINTER_ROLE`: 积分发放权限 (Activity, Recharge等合约)
- `BURNER_ROLE`: 积分销毁权限 (Exchange, Consumer等合约)
- `PAUSER_ROLE`: 暂停合约权限 (管理员)
- `WHITELIST_MANAGER_ROLE`: 白名单管理权限

## 2. CPOPAAWallet 合约 - 账户抽象钱包

### EIP-4337 兼容实现
基于EntryPoint v0.6标准实现完整的账户抽象功能。

### 核心数据结构

```solidity
// 守护者配置
struct Guardian {
    address guardianAddress;    // 守护者地址
    bool isActive;             // 是否激活
    uint256 addedTime;         // 添加时间
}

// 恢复请求
struct RecoveryRequest {
    address newOwner;          // 新所有者
    uint256 requestTime;       // 请求时间
    uint256 executionTime;     // 可执行时间 (延迟执行)
    bytes32 requestHash;       // 请求哈希
    bool executed;             // 是否已执行
}

// 消费限制
struct SpendingLimit {
    uint256 dailyLimit;        // 每日限额
    uint256 spentToday;        // 今日已消费
    uint256 lastResetTime;     // 上次重置时间
    bool enabled;              // 是否启用
}
```

### 社交恢复机制

```solidity
uint256 public constant RECOVERY_DELAY = 2 days;
uint256 public constant GUARDIAN_THRESHOLD = 2; // 需要2个守护者确认

function initiateRecovery(
    address newOwner,
    bytes[] calldata guardianSignatures
) external {
    require(guardianSignatures.length >= GUARDIAN_THRESHOLD, "Insufficient guardians");
    
    // 验证守护者签名
    bytes32 recoveryHash = keccak256(abi.encodePacked(newOwner, block.timestamp));
    _verifyGuardianSignatures(recoveryHash, guardianSignatures);
    
    // 创建恢复请求
    recoveryRequest = RecoveryRequest({
        newOwner: newOwner,
        requestTime: block.timestamp,
        executionTime: block.timestamp + RECOVERY_DELAY,
        requestHash: recoveryHash,
        executed: false
    });
    
    emit RecoveryInitiated(newOwner, block.timestamp + RECOVERY_DELAY);
}

function executeRecovery() external {
    require(block.timestamp >= recoveryRequest.executionTime, "Recovery delay not passed");
    require(!recoveryRequest.executed, "Already executed");
    
    address oldOwner = owner();
    _transferOwnership(recoveryRequest.newOwner);
    recoveryRequest.executed = true;
    
    emit RecoveryExecuted(oldOwner, recoveryRequest.newOwner);
}
```

### 批量操作支持

```solidity
struct Call {
    address target;
    uint256 value;
    bytes data;
}

function executeBatch(Call[] calldata calls) external onlyOwner {
    for (uint256 i = 0; i < calls.length; i++) {
        (bool success, bytes memory result) = calls[i].target.call{value: calls[i].value}(calls[i].data);
        require(success, "Batch call failed");
        emit BatchCallExecuted(i, calls[i].target, calls[i].value, result);
    }
}
```

### 消费限制机制

```solidity
function _checkSpendingLimit(uint256 amount) internal {
    if (!spendingLimit.enabled) return;
    
    // 检查是否需要重置每日限额
    if (block.timestamp >= spendingLimit.lastResetTime + 1 days) {
        spendingLimit.spentToday = 0;
        spendingLimit.lastResetTime = block.timestamp;
    }
    
    require(
        spendingLimit.spentToday + amount <= spendingLimit.dailyLimit,
        "Daily spending limit exceeded"
    );
    
    spendingLimit.spentToday += amount;
}
```

## 3. CPOPPaymaster 合约 - Gas费代付

### EIP-4337 Paymaster实现

```solidity
// Gas配置
struct GasConfig {
    uint256 pointsPerGas;       // 积分与gas的兑换比例 (wei)
    uint256 maxGasPrice;        // 最大gas价格限制
    uint256 dailyGasLimit;      // 每用户每日gas限额 (wei)
    bool enabled;               // 是否启用
}

// 用户Gas使用追踪
struct UserGasUsage {
    uint256 usedToday;         // 今日已使用gas
    uint256 lastResetTime;     // 上次重置时间
}
```

### 核心功能

```solidity
function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external view override returns (bytes memory context, uint256 validationData) {
    // 验证用户积分余额
    address sender = userOp.sender;
    uint256 requiredPoints = (maxCost * gasConfig.pointsPerGas) / 1e18;
    
    require(cpotpToken.balanceOf(sender) >= requiredPoints, "Insufficient points for gas");
    require(gasConfig.enabled, "Paymaster disabled");
    
    // 检查每日gas限额
    _checkDailyGasLimit(sender, maxCost);
    
    return (abi.encodePacked(sender, requiredPoints), 0);
}

function postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost
) external override onlyEntryPoint {
    (address sender, uint256 maxPoints) = abi.decode(context, (address, uint256));
    
    if (mode == PostOpMode.opSucceeded || mode == PostOpMode.opReverted) {
        uint256 actualPoints = (actualGasCost * gasConfig.pointsPerGas) / 1e18;
        
        // 从用户积分中扣除gas费用
        cpotpToken.burnFrom(sender, actualPoints);
        
        // 更新用户gas使用记录
        _updateUserGasUsage(sender, actualGasCost);
        
        emit GasPaidWithPoints(sender, actualGasCost, actualPoints);
    }
}
```

## 4. CPOPConsumer 合约 - 通用积分消费

### 设计理念
采用混合架构设计：
- **链上职责**: 专注于积分销毁和权限管理
- **链下服务**: 处理商品管理、订单处理、物流服务
- **成本优化**: 大幅降低Gas费用，提升用户体验

### 数据结构

```solidity
// 消费原因枚举
enum ConsumeReason {
    MALL_PURCHASE,      // 商城购买
    SERVICE_FEE,        // 服务费用
    PREMIUM_FEATURE,    // 高级功能
    UCARD_TOPUP,        // U卡充值
    UCARD_CONSUMPTION,  // U卡消费
    CUSTOM              // 自定义消费
}

// 授权商户信息
struct AuthorizedMerchant {
    string merchantId;          // 商户ID
    string merchantName;        // 商户名称
    bool isActive;             // 是否激活
    uint256 dailyLimit;        // 每日消费限额
    uint256 consumedToday;     // 今日已消费
    uint256 lastResetTime;     // 上次重置时间
}

// 消费记录
struct ConsumeRecord {
    address user;              // 消费用户
    uint256 amount;            // 消费数量
    ConsumeReason reason;      // 消费原因
    string merchantId;         // 商户ID
    bytes32 orderHash;         // 订单哈希
    uint256 timestamp;         // 消费时间
    string metadata;           // 元数据
}

// U卡充值记录
struct UCardTopup {
    address user;              // 充值用户
    string cardId;             // 卡片ID
    uint256 cpotpAmount;       // 积分数量
    uint256 fiatAmount;        // 对应法币金额 (精度18位)
    uint256 exchangeRate;      // 汇率 (CPOP:USD，精度18位)
    uint256 timestamp;         // 充值时间
    bytes32 txHash;            // 交易哈希
    bool processed;            // 是否已处理
}

// U卡信息
struct UCardInfo {
    string cardId;             // 卡片唯一ID
    address owner;             // 卡片所有者
    bool isActive;             // 是否激活
    uint256 totalTopup;        // 累计充值积分
    uint256 totalSpent;        // 累计消费积分
    uint256 lastTopupTime;     // 最后充值时间
    string cardType;           // 卡片类型 (virtual/physical)
}
```

### 核心功能

```solidity
// 授权商户消费积分
function consumePoints(
    address user,
    uint256 amount,
    ConsumeReason reason,
    bytes32 orderHash,
    string memory metadata
) external onlyAuthorizedMerchant returns (uint256 recordId) {
    require(user != address(0), "Invalid user address");
    require(amount > 0, "Amount must be positive");
    
    string memory merchantId = merchantInfo[msg.sender].merchantId;
    
    // 检查商户每日限额
    _checkMerchantDailyLimit(msg.sender, amount);
    
    // 检查用户消费限额
    _checkUserSpendingLimit(user, amount);
    
    // 🔥 销毁用户积分
    cpotpToken.burnFrom(user, amount);
    
    // 记录消费
    recordId = ++lastRecordId;
    consumeRecords[recordId] = ConsumeRecord({
        user: user,
        amount: amount,
        reason: reason,
        merchantId: merchantId,
        orderHash: orderHash,
        timestamp: block.timestamp,
        metadata: metadata
    });
    
    // 更新统计
    _updateConsumptionStats(user, msg.sender, amount);
    
    emit PointsConsumed(
        recordId, user, amount, reason, merchantId, orderHash
    );
    
    return recordId;
}

// 批量消费（用于复杂订单）
function batchConsumePoints(
    address[] calldata users,
    uint256[] calldata amounts,
    ConsumeReason reason,
    bytes32 batchHash,
    string memory metadata
) external onlyAuthorizedMerchant {
    require(users.length == amounts.length, "Array length mismatch");
    
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < users.length; i++) {
        totalAmount += amounts[i];
    }
    
    // 检查商户批量限额
    _checkMerchantDailyLimit(msg.sender, totalAmount);
    
    string memory merchantId = merchantInfo[msg.sender].merchantId;
    
    for (uint256 i = 0; i < users.length; i++) {
        if (amounts[i] == 0) continue;
        
        // 销毁积分
        cpotpToken.burnFrom(users[i], amounts[i]);
        
        // 记录消费
        uint256 recordId = ++lastRecordId;
        consumeRecords[recordId] = ConsumeRecord({
            user: users[i],
            amount: amounts[i],
            reason: reason,
            merchantId: merchantId,
            orderHash: batchHash,
            timestamp: block.timestamp,
            metadata: metadata
        });
        
        emit PointsConsumed(
            recordId, users[i], amounts[i], reason, merchantId, batchHash
        );
    }
    
    emit BatchConsumeCompleted(batchHash, users.length, totalAmount);
}

// U卡充值功能
function topupUCard(
    string memory cardId,
    uint256 cpotpAmount,
    uint256 fiatAmount,
    uint256 exchangeRate
) external returns (uint256 topupId) {
    require(bytes(cardId).length > 0, "Invalid card ID");
    require(cpotpAmount > 0, "Amount must be positive");
    require(fiatAmount > 0, "Fiat amount must be positive");
    
    address user = _msgSender();
    
    // 检查U卡是否存在且属于用户
    require(uCards[cardId].owner == user, "Card not owned by user");
    require(uCards[cardId].isActive, "Card not active");
    
    // 检查用户积分余额
    require(cpotpToken.balanceOf(user) >= cpotpAmount, "Insufficient CPOP balance");
    
    // 🔥 销毁用户积分用于充值
    cpotpToken.burnFrom(user, cpotpAmount);
    
    // 记录充值
    topupId = ++lastTopupId;
    uCardTopups[topupId] = UCardTopup({
        user: user,
        cardId: cardId,
        cpotpAmount: cpotpAmount,
        fiatAmount: fiatAmount,
        exchangeRate: exchangeRate,
        timestamp: block.timestamp,
        txHash: keccak256(abi.encodePacked(block.timestamp, user, cpotpAmount)),
        processed: false
    });
    
    // 更新U卡统计
    uCards[cardId].totalTopup += cpotpAmount;
    uCards[cardId].lastTopupTime = block.timestamp;
    
    emit UCardTopup(topupId, user, cardId, cpotpAmount, fiatAmount);
    
    return topupId;
}

// 批量处理U卡充值（后台服务调用）
function processUCardTopups(
    uint256[] calldata topupIds
) external onlyRole(UCARD_PROCESSOR_ROLE) {
    for (uint256 i = 0; i < topupIds.length; i++) {
        uint256 topupId = topupIds[i];
        UCardTopup storage topup = uCardTopups[topupId];
        
        if (!topup.processed) {
            topup.processed = true;
            
            // 这里可以调用外部支付系统API
            // 将积分转换为相应的法币余额加载到U卡中
            
            emit UCardTopupProcessed(topupId, topup.user, topup.cardId, topup.fiatAmount);
        }
    }
}
```

### 商户管理

```solidity
// 添加授权商户
function addAuthorizedMerchant(
    address merchantAddress,
    string memory merchantId,
    string memory merchantName,
    uint256 dailyLimit
) external onlyRole(MERCHANT_MANAGER_ROLE) {
    require(merchantAddress != address(0), "Invalid address");
    require(bytes(merchantId).length > 0, "Invalid merchant ID");
    
    merchantInfo[merchantAddress] = AuthorizedMerchant({
        merchantId: merchantId,
        merchantName: merchantName,
        isActive: true,
        dailyLimit: dailyLimit,
        consumedToday: 0,
        lastResetTime: block.timestamp
    });
    
    authorizedMerchants[merchantAddress] = true;
    
    emit MerchantAuthorized(merchantAddress, merchantId, merchantName);
}

// 更新商户限额
function updateMerchantLimit(
    address merchantAddress,
    uint256 newDailyLimit
) external onlyRole(MERCHANT_MANAGER_ROLE) {
    require(authorizedMerchants[merchantAddress], "Merchant not authorized");
    
    merchantInfo[merchantAddress].dailyLimit = newDailyLimit;
    
    emit MerchantLimitUpdated(merchantAddress, newDailyLimit);
}

// U卡管理功能
function createUCard(
    address user,
    string memory cardId,
    string memory cardType
) external onlyRole(UCARD_MANAGER_ROLE) {
    require(user != address(0), "Invalid user address");
    require(bytes(cardId).length > 0, "Invalid card ID");
    require(uCards[cardId].owner == address(0), "Card already exists");
    
    uCards[cardId] = UCardInfo({
        cardId: cardId,
        owner: user,
        isActive: true,
        totalTopup: 0,
        totalSpent: 0,
        lastTopupTime: 0,
        cardType: cardType
    });
    
    userCards[user].push(cardId);
    
    emit UCardCreated(cardId, user, cardType);
}

function deactivateUCard(string memory cardId) external onlyRole(UCARD_MANAGER_ROLE) {
    require(uCards[cardId].owner != address(0), "Card does not exist");
    
    uCards[cardId].isActive = false;
    
    emit UCardDeactivated(cardId, uCards[cardId].owner);
}

// 获取用户的U卡列表
function getUserCards(address user) external view returns (string[] memory) {
    return userCards[user];
}

// 获取U卡信息
function getUCardInfo(string memory cardId) external view returns (UCardInfo memory) {
    return uCards[cardId];
}
```

### 事件定义

```solidity
event PointsConsumed(
    uint256 indexed recordId,
    address indexed user,
    uint256 amount,
    ConsumeReason reason,
    string merchantId,
    bytes32 indexed orderHash
);

event BatchConsumeCompleted(
    bytes32 indexed batchHash,
    uint256 userCount,
    uint256 totalAmount
);

event MerchantAuthorized(
    address indexed merchantAddress,
    string merchantId,
    string merchantName
);

// U卡相关事件
event UCardCreated(
    string indexed cardId,
    address indexed owner,
    string cardType
);

event UCardDeactivated(
    string indexed cardId,
    address indexed owner
);

event UCardTopup(
    uint256 indexed topupId,
    address indexed user,
    string indexed cardId,
    uint256 cpotpAmount,
    uint256 fiatAmount
);

event UCardTopupProcessed(
    uint256 indexed topupId,
    address indexed user,
    string indexed cardId,
    uint256 fiatAmount
);

event UCardConsumption(
    string indexed cardId,
    address indexed user,
    uint256 fiatAmount,
    string merchantName,
    bytes32 indexed txHash
);
```

### 链下商城服务集成

```javascript
// 链下商城服务示例
class MallService {
    async purchaseProduct(userId, productId, quantity) {
        // 1. 检查商品库存（链下数据库）
        const product = await this.getProduct(productId);
        if (product.stock < quantity) {
            throw new Error('Insufficient stock');
        }
        
        // 2. 计算总价
        const totalCost = product.price * quantity;
        
        // 3. 创建订单（链下）
        const order = await this.createOrder({
            userId, productId, quantity, totalCost
        });
        
        // 4. 调用合约消费积分（链上）
        const orderHash = ethers.utils.id(JSON.stringify(order));
        const tx = await cpotpConsumer.consumePoints(
            userId,
            totalCost,
            ConsumeReason.MALL_PURCHASE,
            orderHash,
            JSON.stringify({ orderId: order.id })
        );
        
        // 5. 更新订单状态
        await this.updateOrderStatus(order.id, 'CONFIRMED', tx.hash);
        
        return order;
    }
}

// U卡服务集成示例
class UCardService {
    async topupUCard(userId, cardId, cpotpAmount) {
        // 1. 获取实时汇率（CPOP:USD）
        const exchangeRate = await this.getCurrentExchangeRate();
        const fiatAmount = (cpotpAmount * exchangeRate) / 1e18;
        
        // 2. 检查用户积分余额
        const balance = await cpotpToken.balanceOf(userId);
        if (balance < cpotpAmount) {
            throw new Error('Insufficient CPOP balance');
        }
        
        // 3. 调用合约充值
        const tx = await cpotpConsumer.topupUCard(
            cardId,
            cpotpAmount,
            ethers.utils.parseUnits(fiatAmount.toString(), 18),
            ethers.utils.parseUnits(exchangeRate.toString(), 18)
        );
        
        // 4. 等待交易确认
        const receipt = await tx.wait();
        const topupId = this.extractTopupIdFromReceipt(receipt);
        
        // 5. 通知支付系统处理充值
        await this.notifyPaymentSystem({
            topupId,
            cardId,
            fiatAmount,
            txHash: receipt.transactionHash
        });
        
        return {
            topupId,
            cpotpAmount,
            fiatAmount,
            exchangeRate,
            txHash: receipt.transactionHash
        };
    }
    
    // 处理U卡消费回调
    async handleCardConsumption(cardId, fiatAmount, merchantName, externalTxId) {
        // 1. 验证消费请求
        const cardInfo = await cpotpConsumer.getUCardInfo(cardId);
        if (!cardInfo.isActive) {
            throw new Error('Card is not active');
        }
        
        // 2. 记录消费（不销毁积分，因为已经在传统支付系统中处理）
        const consumptionRecord = {
            cardId,
            user: cardInfo.owner,
            fiatAmount,
            merchantName,
            timestamp: Date.now(),
            externalTxId
        };
        
        // 3. 存储到数据库
        await this.recordConsumption(consumptionRecord);
        
        // 4. 发送链上事件（可选，用于审计）
        const txHash = ethers.utils.id(JSON.stringify(consumptionRecord));
        await cpotpConsumer.emit('UCardConsumption', [
            cardId,
            cardInfo.owner,
            ethers.utils.parseUnits(fiatAmount.toString(), 18),
            merchantName,
            txHash
        ]);
        
        return consumptionRecord;
    }
    
    // 获取实时汇率
    async getCurrentExchangeRate() {
        // 这里对接外部汇率API
        // 返回 CPOP:USD 的汇率
        return 0.01; // 示例：1 CPOP = 0.01 USD
    }
    
    // 批量处理充值
    async processPendingTopups() {
        const pendingTopups = await this.getPendingTopups();
        const topupIds = pendingTopups.map(t => t.topupId);
        
        if (topupIds.length > 0) {
            // 调用合约批量处理
            const tx = await cpotpConsumer.processUCardTopups(topupIds);
            await tx.wait();
            
            // 更新支付系统中的卡余额
            for (const topup of pendingTopups) {
                await this.updateCardBalance(topup.cardId, topup.fiatAmount);
            }
        }
    }
}
```

## 5. CPOPExchange 合约 - CPOT兑换系统

### 数据结构

```solidity
// 兑换状态
enum ExchangeStatus { 
    PENDING,     // 待审核
    APPROVED,    // 已批准
    REJECTED,    // 已拒绝
    COMPLETED    // 已完成
}

// 兑换请求
struct ExchangeRequest {
    uint256 requestId;
    address user;
    uint256 cpotpAmount;        // 申请兑换的CPOP数量
    uint256 cpotAmount;         // 对应的CPOT数量
    ExchangeStatus status;
    uint256 requestTime;
    uint256 processTime;        // 处理时间
    address approver;           // 审批人
    string reason;              // 拒绝原因
    bytes32 txHash;            // CPOT转账交易哈希
}

// 兑换配置
struct ExchangeConfig {
    uint256 exchangeRate;       // 兑换比例 (CPOP:CPOT = 1000:1)
    uint256 minExchangeAmount;  // 最小兑换数量
    uint256 maxExchangeAmount;  // 最大兑换数量
    uint256 dailyLimit;         // 每日兑换限额
    uint256 processingFee;      // 处理费用 (CPOP)
    bool autoApprovalEnabled;   // 自动审批开关
    uint256 autoApprovalLimit;  // 自动审批限额
}

// 用户兑换统计
struct UserExchangeStats {
    uint256 totalExchanged;     // 累计兑换CPOP
    uint256 totalReceived;      // 累计获得CPOT
    uint256 exchangedToday;     // 今日已兑换
    uint256 lastResetTime;      // 上次重置时间
    uint256 requestCount;       // 申请次数
}
```

### 核心功能

```solidity
function requestExchange(uint256 cpotpAmount) external returns (uint256 requestId) {
    require(cpotpAmount >= exchangeConfig.minExchangeAmount, "Below minimum amount");
    require(cpotpAmount <= exchangeConfig.maxExchangeAmount, "Exceeds maximum amount");
    
    address user = msg.sender;
    
    // 检查每日限额
    _checkDailyExchangeLimit(user, cpotpAmount);
    
    // 计算CPOT数量和手续费
    uint256 cpotAmount = (cpotpAmount * 1e18) / exchangeConfig.exchangeRate;
    uint256 totalCost = cpotpAmount + exchangeConfig.processingFee;
    
    // 销毁用户的CPOP (包含手续费)
    cpotpToken.burnFrom(user, totalCost);
    
    // 创建兑换请求
    requestId = ++lastRequestId;
    exchangeRequests[requestId] = ExchangeRequest({
        requestId: requestId,
        user: user,
        cpotpAmount: cpotpAmount,
        cpotAmount: cpotAmount,
        status: ExchangeStatus.PENDING,
        requestTime: block.timestamp,
        processTime: 0,
        approver: address(0),
        reason: "",
        txHash: bytes32(0)
    });
    
    emit ExchangeRequested(requestId, user, cpotpAmount, cpotAmount);
    
    // 检查是否符合自动审批条件
    if (exchangeConfig.autoApprovalEnabled && cpotpAmount <= exchangeConfig.autoApprovalLimit) {
        _autoApproveRequest(requestId);
    }
    
    return requestId;
}

function approveExchange(uint256 requestId) external onlyRole(APPROVER_ROLE) {
    ExchangeRequest storage request = exchangeRequests[requestId];
    require(request.status == ExchangeStatus.PENDING, "Request not pending");
    
    request.status = ExchangeStatus.APPROVED;
    request.processTime = block.timestamp;
    request.approver = msg.sender;
    
    // 铸造CPOT给用户
    cpotToken.mint(request.user, request.cpotAmount);
    
    request.status = ExchangeStatus.COMPLETED;
    request.txHash = keccak256(abi.encodePacked(block.timestamp, request.user, request.cpotAmount));
    
    emit ExchangeCompleted(requestId, request.user, request.cpotpAmount, request.cpotAmount);
}
```

## 6. CPOPRecharge 合约 - CPOT充值系统

### 设计理念
实现CPOT代币到CPOP积分的双向流通，允许用户使用已有的CPOT代币充值获得积分，形成完整的代币经济闭环。

### 数据结构

```solidity
// 充值记录状态
enum RechargeStatus {
    PENDING,        // 待处理
    CONFIRMED,      // 已确认
    FAILED,         // 失败
    CANCELLED       // 已取消
}

// 充值记录
struct RechargeRecord {
    uint256 rechargeId;         // 充值ID
    address user;               // 充值用户
    uint256 cpotAmount;         // CPOT代币数量
    uint256 cpotpAmount;        // 获得的CPOP积分数量
    uint256 exchangeRate;       // 兑换比例 (CPOT:CPOP)
    uint256 bonusRate;          // 奖励倍率 (基点制)
    RechargeStatus status;      // 充值状态
    uint256 timestamp;          // 充值时间
    bytes32 txHash;             // 交易哈希
}

// 充值配置
struct RechargeConfig {
    uint256 baseExchangeRate;   // 基础兑换比例 (1 CPOT = ? CPOP)
    uint256 minRechargeAmount;  // 最小充值数量
    uint256 maxRechargeAmount;  // 最大充值数量
    uint256 dailyLimit;         // 每日充值限额
    bool enabled;               // 是否启用充值
    uint256 bonusThreshold1;    // 第一档奖励门槛
    uint256 bonusRate1;         // 第一档奖励倍率
    uint256 bonusThreshold2;    // 第二档奖励门槛
    uint256 bonusRate2;         // 第二档奖励倍率
}

// 用户充值统计
struct UserRechargeStats {
    uint256 totalRecharged;     // 累计充值CPOT
    uint256 totalReceived;      // 累计获得CPOP
    uint256 rechargedToday;     // 今日已充值
    uint256 lastResetTime;      // 上次重置时间
    uint256 rechargeCount;      // 充值次数
    uint256 totalBonus;         // 累计获得奖励
}
```

### 核心功能

```solidity
// CPOT充值兑换CPOP
function rechargeCPOP(uint256 cpotAmount) external returns (uint256 rechargeId) {
    require(rechargeConfig.enabled, "Recharge disabled");
    require(cpotAmount >= rechargeConfig.minRechargeAmount, "Below minimum amount");
    require(cpotAmount <= rechargeConfig.maxRechargeAmount, "Exceeds maximum amount");
    
    address user = _msgSender();
    
    // 检查每日限额
    _checkDailyRechargeLimit(user, cpotAmount);
    
    // 计算获得的CPOP数量（包含奖励）
    uint256 cpotpAmount = _calculateCPOPAmount(cpotAmount);
    uint256 bonusRate = _calculateBonusRate(cpotAmount);
    
    // 从用户账户转移CPOT到合约（销毁或存储到国库）
    cpotToken.transferFrom(user, address(this), cpotAmount);
    
    // 可选：销毁CPOT代币以减少总供应量
    if (shouldBurnCPOT) {
        cpotToken.burn(cpotAmount);
    }
    
    // 铸造CPOP积分给用户
    cpotpToken.mint(user, cpotpAmount);
    
    // 记录充值
    rechargeId = ++lastRechargeId;
    rechargeRecords[rechargeId] = RechargeRecord({
        rechargeId: rechargeId,
        user: user,
        cpotAmount: cpotAmount,
        cpotpAmount: cpotpAmount,
        exchangeRate: rechargeConfig.baseExchangeRate,
        bonusRate: bonusRate,
        status: RechargeStatus.CONFIRMED,
        timestamp: block.timestamp,
        txHash: keccak256(abi.encodePacked(block.timestamp, user, cpotAmount))
    });
    
    // 更新用户统计
    _updateUserRechargeStats(user, cpotAmount, cpotpAmount);
    
    emit CPOTRecharged(rechargeId, user, cpotAmount, cpotpAmount, bonusRate);
    
    return rechargeId;
}

// 批量处理充值（大额充值可能需要审核）
function batchConfirmRecharges(uint256[] calldata rechargeIds) 
    external 
    onlyRole(RECHARGE_MANAGER_ROLE) 
{
    for (uint256 i = 0; i < rechargeIds.length; i++) {
        uint256 rechargeId = rechargeIds[i];
        RechargeRecord storage record = rechargeRecords[rechargeId];
        
        if (record.status == RechargeStatus.PENDING) {
            // 执行充值
            cpotToken.transferFrom(record.user, address(this), record.cpotAmount);
            cpotpToken.mint(record.user, record.cpotpAmount);
            
            record.status = RechargeStatus.CONFIRMED;
            
            emit RechargeConfirmed(rechargeId, record.user);
        }
    }
}
```

### 奖励机制

```solidity
// 计算充值奖励
function _calculateCPOPAmount(uint256 cpotAmount) internal view returns (uint256) {
    // 基础兑换
    uint256 baseCPOP = cpotAmount * rechargeConfig.baseExchangeRate;
    
    // 计算奖励倍率
    uint256 bonusRate = _calculateBonusRate(cpotAmount);
    
    // 应用奖励
    uint256 bonusAmount = (baseCPOP * bonusRate) / 10000;
    
    return baseCPOP + bonusAmount;
}

function _calculateBonusRate(uint256 cpotAmount) internal view returns (uint256) {
    // 分档奖励机制
    if (cpotAmount >= rechargeConfig.bonusThreshold2) {
        return rechargeConfig.bonusRate2; // 例如：20% 奖励
    } else if (cpotAmount >= rechargeConfig.bonusThreshold1) {
        return rechargeConfig.bonusRate1; // 例如：10% 奖励
    } else {
        return 0; // 无奖励
    }
}

// VIP用户特殊倍率
function _getVIPBonusRate(address user) internal view returns (uint256) {
    UserLevel memory userLevel = cpotpToken.getUserLevel(user);
    
    if (userLevel.isVIP) {
        return 500; // VIP额外5%奖励
    }
    
    // 基于等级的奖励
    if (userLevel.level >= 50) {
        return 300; // 高等级用户额外3%
    } else if (userLevel.level >= 20) {
        return 200; // 中等级用户额外2%
    } else if (userLevel.level >= 10) {
        return 100; // 低等级用户额外1%
    }
    
    return 0;
}
```

### 配置管理

```solidity
// 更新充值配置
function updateRechargeConfig(
    uint256 baseExchangeRate,
    uint256 minAmount,
    uint256 maxAmount,
    uint256 dailyLimit,
    bool enabled
) external onlyRole(CONFIG_MANAGER_ROLE) {
    require(baseExchangeRate > 0, "Invalid exchange rate");
    require(maxAmount >= minAmount, "Invalid amount range");
    
    rechargeConfig.baseExchangeRate = baseExchangeRate;
    rechargeConfig.minRechargeAmount = minAmount;
    rechargeConfig.maxRechargeAmount = maxAmount;
    rechargeConfig.dailyLimit = dailyLimit;
    rechargeConfig.enabled = enabled;
    
    emit RechargeConfigUpdated(baseExchangeRate, minAmount, maxAmount, dailyLimit, enabled);
}

// 设置奖励门槛
function setBonusThresholds(
    uint256 threshold1,
    uint256 rate1,
    uint256 threshold2,
    uint256 rate2
) external onlyRole(CONFIG_MANAGER_ROLE) {
    require(threshold2 > threshold1, "Invalid threshold order");
    require(rate2 >= rate1, "Invalid rate order");
    require(rate1 <= 5000 && rate2 <= 5000, "Rate too high"); // 最大50%奖励
    
    rechargeConfig.bonusThreshold1 = threshold1;
    rechargeConfig.bonusRate1 = rate1;
    rechargeConfig.bonusThreshold2 = threshold2;
    rechargeConfig.bonusRate2 = rate2;
    
    emit BonusThresholdsUpdated(threshold1, rate1, threshold2, rate2);
}
```

### 查询功能

```solidity
// 预览充值结果
function previewRecharge(address user, uint256 cpotAmount) 
    external 
    view 
    returns (
        uint256 cpotpAmount,
        uint256 bonusAmount,
        uint256 totalBonus,
        bool eligible
    ) 
{
    if (!rechargeConfig.enabled || cpotAmount < rechargeConfig.minRechargeAmount) {
        return (0, 0, 0, false);
    }
    
    // 基础兑换
    uint256 baseCPOP = cpotAmount * rechargeConfig.baseExchangeRate;
    
    // 充值奖励
    uint256 rechargeBonusRate = _calculateBonusRate(cpotAmount);
    uint256 rechargeBonus = (baseCPOP * rechargeBonusRate) / 10000;
    
    // VIP/等级奖励
    uint256 vipBonusRate = _getVIPBonusRate(user);
    uint256 vipBonus = (baseCPOP * vipBonusRate) / 10000;
    
    cpotpAmount = baseCPOP + rechargeBonus + vipBonus;
    bonusAmount = rechargeBonus + vipBonus;
    totalBonus = rechargeBonusRate + vipBonusRate;
    eligible = true;
}

// 获取用户充值统计
function getUserRechargeStats(address user) 
    external 
    view 
    returns (UserRechargeStats memory) 
{
    return userRechargeStats[user];
}

// 获取充值记录
function getRechargeRecord(uint256 rechargeId) 
    external 
    view 
    returns (RechargeRecord memory) 
{
    return rechargeRecords[rechargeId];
}
```

### 事件定义

```solidity
event CPOTRecharged(
    uint256 indexed rechargeId,
    address indexed user,
    uint256 cpotAmount,
    uint256 cpotpAmount,
    uint256 bonusRate
);

event RechargeConfirmed(
    uint256 indexed rechargeId,
    address indexed user
);

event RechargeConfigUpdated(
    uint256 baseExchangeRate,
    uint256 minAmount,
    uint256 maxAmount,
    uint256 dailyLimit,
    bool enabled
);

event BonusThresholdsUpdated(
    uint256 threshold1,
    uint256 rate1,
    uint256 threshold2,
    uint256 rate2
);

event RechargeFailed(
    uint256 indexed rechargeId,
    address indexed user,
    string reason
);
```

## 7. CPOPActivity 合约 - 任务活动系统

### 数据结构

```solidity
// 任务类型
enum TaskType {
    DAILY_SIGNIN,    // 每日签到
    INVITE_FRIENDS,  // 邀请好友
    COMPLETE_TRADE,  // 完成交易
    SOCIAL_SHARE,    // 社交分享
    SURVEY,          // 问卷调查
    CUSTOM           // 自定义任务
}

// 任务状态
enum TaskStatus {
    ACTIVE,          // 进行中
    PAUSED,          // 暂停
    COMPLETED,       // 已结束
    CANCELLED        // 已取消
}

// 任务信息
struct Task {
    uint256 taskId;
    TaskType taskType;
    string title;               // 任务标题
    string description;         // 任务描述
    uint256 pointsReward;       // 积分奖励
    uint256 startTime;          // 开始时间
    uint256 endTime;            // 结束时间
    uint256 maxParticipants;    // 最大参与人数
    uint256 currentParticipants; // 当前参与人数
    TaskStatus status;
    bool isRepeatable;          // 是否可重复完成
    uint256 repeatInterval;     // 重复间隔 (秒)
    bytes32 verificationHash;   // 验证哈希
}

// 用户任务完成记录
struct UserTaskRecord {
    uint256 taskId;
    address user;
    uint256 completedTime;
    uint256 pointsEarned;
    bool verified;              // 是否已验证
    string proof;               // 完成证明
}

// 活动信息
struct Activity {
    uint256 activityId;
    string name;
    string description;
    uint256 bonusMultiplier;    // 奖励倍数 (基点制)
    uint256 startTime;
    uint256 endTime;
    bool isActive;
    uint256[] includedTasks;    // 包含的任务ID
}
```

### 核心功能

```solidity
function completeTask(
    uint256 taskId,
    string memory proof
) external returns (uint256 pointsEarned) {
    Task storage task = tasks[taskId];
    require(task.status == TaskStatus.ACTIVE, "Task not active");
    require(block.timestamp >= task.startTime && block.timestamp <= task.endTime, "Task not in valid time");
    
    address user = msg.sender;
    
    // 检查是否可以完成任务
    require(_canCompleteTask(user, taskId), "Cannot complete task");
    
    // 检查参与人数限制
    require(task.currentParticipants < task.maxParticipants, "Task full");
    
    // 计算奖励积分 (包含活动倍数)
    pointsEarned = _calculateTaskReward(taskId);
    
    // 记录任务完成
    userTaskRecords[user][taskId] = UserTaskRecord({
        taskId: taskId,
        user: user,
        completedTime: block.timestamp,
        pointsEarned: pointsEarned,
        verified: false,
        proof: proof
    });
    
    // 发放积分奖励
    cpotpToken.mintPoints(user, pointsEarned, PointSource.TASK_COMPLETE, task.title);
    
    task.currentParticipants++;
    
    emit TaskCompleted(taskId, user, pointsEarned, proof);
    
    return pointsEarned;
}

function dailySignIn() external returns (uint256 pointsEarned) {
    address user = msg.sender;
    require(!userSignins[user][_getDateKey()], "Already signed in today");
    
    // 计算连续签到奖励
    uint256 consecutiveDays = _getConsecutiveSignInDays(user);
    pointsEarned = _calculateSignInReward(consecutiveDays);
    
    // 记录签到
    userSignins[user][_getDateKey()] = true;
    userSigninStats[user].totalSignins++;
    userSigninStats[user].consecutiveDays = consecutiveDays + 1;
    userSigninStats[user].lastSigninTime = block.timestamp;
    
    // 发放积分
    cpotpToken.mintPoints(user, pointsEarned, PointSource.DAILY_SIGNIN, "Daily Sign In");
    
    emit DailySignIn(user, consecutiveDays + 1, pointsEarned);
    
    return pointsEarned;
}
```

## 部署配置

### 部署顺序
1. **CPOPToken** - 核心积分代币
2. **CPOPAAWallet** - 账户抽象钱包
3. **CPOPPaymaster** - Gas费代付
4. **CPOPConsumer** - 通用积分消费
5. **CPOPRecharge** - CPOT充值系统
6. **CPOPActivity** - 任务活动系统
7. **CPOPExchange** - CPOT兑换系统

### 权限配置
```solidity
// CPOPToken权限分配
CPOPToken.grantRole(MINTER_ROLE, CPOPActivity);
CPOPToken.grantRole(MINTER_ROLE, CPOPRecharge);
CPOPToken.grantRole(MINTER_ROLE, admin);
CPOPToken.grantRole(BURNER_ROLE, CPOPConsumer);
CPOPToken.grantRole(BURNER_ROLE, CPOPExchange);
CPOPToken.grantRole(BURNER_ROLE, CPOPPaymaster);

// 白名单配置
CPOPToken.addToWhitelist(CPOPActivity);
CPOPToken.addToWhitelist(CPOPConsumer);
CPOPToken.addToWhitelist(CPOPRecharge);
CPOPToken.addToWhitelist(CPOPExchange);
```

## 8. CPOPUCardRecords 合约 - U卡交易记录系统

### 设计理念
CPOPUCardRecords合约负责将所有U卡相关的交易记录、充值提现等操作记录到区块链上，确保交易的透明性、可追溯性和不可篡改性。采用隐私保护与透明性平衡的设计。

### 数据结构设计

#### 记录状态和类型定义
```solidity
// 记录状态
enum RecordStatus {
    PENDING,    // 待处理
    SUCCESS,    // 成功
    FAILED,     // 失败
    CANCELLED   // 已取消
}

// 消费类型
enum SpendCategory {
    ONLINE,         // 线上消费
    OFFLINE,        // 线下消费
    SUBSCRIPTION,   // 订阅服务
    TRANSFER,       // 转账
    REFUND,         // 退款
    OTHER           // 其他
}

// 余额变动原因
enum ChangeReason {
    TOPUP,      // 充值
    SPEND,      // 消费
    WITHDRAW,   // 提现
    FEE,        // 手续费
    REFUND,     // 退款
    ADJUSTMENT  // 调整
}

// 记录类型
enum RecordType {
    TOPUP,
    SPEND,
    WITHDRAW,
    BALANCE_CHANGE
}
```

#### 核心记录结构
```solidity
// 充值记录结构
struct TopUpRecord {
    bytes32 recordId;           // 唯一记录ID
    address user;               // 用户地址
    bytes32 cardIdHash;         // U卡ID哈希（隐私保护）
    uint256 cpotpAmount;        // 消耗的CPOP积分数量
    uint256 fiatAmount;         // 充值的法币金额（以美分为单位）
    uint256 exchangeRate;       // 汇率（CPOP:USD，精度18位）
    uint256 timestamp;          // 充值时间戳
    RecordStatus status;        // 记录状态
    bytes32 transactionHash;    // 金融服务交易哈希
    bytes32 dataHash;          // 敏感数据哈希（完整性验证）
}

// 消费记录结构
struct SpendRecord {
    bytes32 recordId;           // 唯一记录ID
    bytes32 cardIdHash;         // U卡ID哈希（隐私保护）
    uint256 amount;             // 消费金额（美分）
    bytes32 merchantHash;       // 商户信息哈希（隐私保护）
    SpendCategory category;     // 消费类型
    uint256 timestamp;          // 消费时间戳
    RecordStatus status;        // 记录状态
    bytes32 settlementHash;     // 清算哈希
    string encryptedMetadata;   // 加密的元数据
}

// 提现记录结构
struct WithdrawRecord {
    bytes32 recordId;           // 唯一记录ID
    bytes32 cardIdHash;         // U卡ID哈希（隐私保护）
    uint256 amount;             // 提现金额（美分）
    uint256 fee;                // 手续费（美分）
    bytes32 targetAccountHash;  // 目标账户哈希（隐私保护）
    uint256 timestamp;          // 提现时间戳
    RecordStatus status;        // 记录状态
    bytes32 transactionHash;    // 外部交易哈希
    string reason;              // 提现原因
}

// 余额变动记录结构
struct BalanceChangeRecord {
    bytes32 recordId;           // 唯一记录ID
    bytes32 cardIdHash;         // U卡ID哈希（隐私保护）
    int256 deltaAmount;         // 余额变动（正数为增加，负数为减少）
    uint256 balanceAfter;       // 变动后余额
    ChangeReason reason;        // 变动原因
    bytes32 relatedRecordId;    // 关联的记录ID
    uint256 timestamp;          // 时间戳
    bytes32 merkleProof;        // Merkle证明（数据完整性）
}

// 批量操作记录
struct BatchRecord {
    bytes32 batchId;            // 批次ID
    RecordType recordType;      // 记录类型
    uint256 recordCount;        // 记录数量
    bytes32 merkleRoot;         // Merkle根（批量数据完整性）
    uint256 timestamp;          // 批次时间戳
    address processor;          // 处理者地址
}
```

### 核心功能接口

#### 记录功能
```solidity
// 记录充值操作
function recordTopUp(
    address user,
    bytes32 cardIdHash,
    uint256 cpotpAmount,
    uint256 fiatAmount,
    uint256 exchangeRate,
    bytes32 transactionHash
) external onlyAuthorized returns (bytes32 recordId) {
    require(user != address(0), "Invalid user address");
    require(cpotpAmount > 0, "Amount must be positive");
    require(fiatAmount > 0, "Fiat amount must be positive");
    
    recordId = _generateRecordId(user, cardIdHash, block.timestamp);
    
    // 创建记录
    topUpRecords[recordId] = TopUpRecord({
        recordId: recordId,
        user: user,
        cardIdHash: cardIdHash,
        cpotpAmount: cpotpAmount,
        fiatAmount: fiatAmount,
        exchangeRate: exchangeRate,
        timestamp: block.timestamp,
        status: RecordStatus.PENDING,
        transactionHash: transactionHash,
        dataHash: _computeDataHash(user, cardIdHash, cpotpAmount, fiatAmount)
    });
    
    // 记录到热存储
    _addToHotStorage(recordId, RecordType.TOPUP);
    
    emit TopUpRecorded(recordId, user, cpotpAmount, fiatAmount, block.timestamp);
    
    return recordId;
}

// 记录消费操作
function recordSpend(
    bytes32 cardIdHash,
    uint256 amount,
    bytes32 merchantHash,
    SpendCategory category,
    string memory encryptedMetadata
) external onlyAuthorized returns (bytes32 recordId) {
    require(amount > 0, "Amount must be positive");
    
    recordId = _generateRecordId(address(0), cardIdHash, block.timestamp);
    
    spendRecords[recordId] = SpendRecord({
        recordId: recordId,
        cardIdHash: cardIdHash,
        amount: amount,
        merchantHash: merchantHash,
        category: category,
        timestamp: block.timestamp,
        status: RecordStatus.PENDING,
        settlementHash: bytes32(0), // 初始为空，清算后更新
        encryptedMetadata: encryptedMetadata
    });
    
    _addToHotStorage(recordId, RecordType.SPEND);
    
    emit SpendRecorded(recordId, cardIdHash, amount, category, block.timestamp);
    
    return recordId;
}

// 记录提现操作
function recordWithdraw(
    bytes32 cardIdHash,
    uint256 amount,
    uint256 fee,
    bytes32 targetAccountHash,
    string memory reason
) external onlyAuthorized returns (bytes32 recordId) {
    require(amount > 0, "Amount must be positive");
    
    recordId = _generateRecordId(address(0), cardIdHash, block.timestamp);
    
    withdrawRecords[recordId] = WithdrawRecord({
        recordId: recordId,
        cardIdHash: cardIdHash,
        amount: amount,
        fee: fee,
        targetAccountHash: targetAccountHash,
        timestamp: block.timestamp,
        status: RecordStatus.PENDING,
        transactionHash: bytes32(0),
        reason: reason
    });
    
    _addToHotStorage(recordId, RecordType.WITHDRAW);
    
    emit WithdrawRecorded(recordId, cardIdHash, amount, fee, block.timestamp);
    
    return recordId;
}

// 批量记录操作（Gas优化）
function batchRecordOperations(
    RecordType[] memory types,
    bytes[] memory data
) external onlyAuthorized returns (bytes32 batchId) {
    require(types.length == data.length, "Array length mismatch");
    require(types.length <= MAX_BATCH_SIZE, "Batch too large");
    
    batchId = keccak256(abi.encodePacked(block.timestamp, msg.sender, types.length));
    
    bytes32[] memory recordIds = new bytes32[](types.length);
    
    for (uint256 i = 0; i < types.length; i++) {
        if (types[i] == RecordType.TOPUP) {
            recordIds[i] = _processBatchTopUp(data[i]);
        } else if (types[i] == RecordType.SPEND) {
            recordIds[i] = _processBatchSpend(data[i]);
        } else if (types[i] == RecordType.WITHDRAW) {
            recordIds[i] = _processBatchWithdraw(data[i]);
        }
    }
    
    // 计算Merkle根
    bytes32 merkleRoot = _calculateMerkleRoot(recordIds);
    
    // 存储批次记录
    batchRecords[batchId] = BatchRecord({
        batchId: batchId,
        recordType: RecordType.TOPUP, // 混合类型时使用第一个
        recordCount: types.length,
        merkleRoot: merkleRoot,
        timestamp: block.timestamp,
        processor: msg.sender
    });
    
    emit BatchRecorded(batchId, types.length, merkleRoot);
    
    return batchId;
}
```

#### 查询功能
```solidity
// 查询用户的所有充值记录
function getUserTopUpRecords(
    address user,
    uint256 fromTimestamp,
    uint256 toTimestamp
) external view returns (bytes32[] memory recordIds) {
    return _getUserRecordsByType(user, RecordType.TOPUP, fromTimestamp, toTimestamp);
}

// 查询指定U卡的消费记录
function getCardSpendRecords(
    bytes32 cardIdHash,
    uint256 fromTimestamp,
    uint256 toTimestamp
) external view onlyOwnerOrAuthorized(cardIdHash) returns (bytes32[] memory) {
    return _getCardRecordsByType(cardIdHash, RecordType.SPEND, fromTimestamp, toTimestamp);
}

// 查询余额变动历史
function getBalanceHistory(
    bytes32 cardIdHash,
    uint256 fromTimestamp,
    uint256 toTimestamp
) external view onlyOwnerOrAuthorized(cardIdHash) returns (bytes32[] memory) {
    return _getCardRecordsByType(cardIdHash, RecordType.BALANCE_CHANGE, fromTimestamp, toTimestamp);
}

// 获取记录详情（支持多种类型）
function getRecordDetails(bytes32 recordId, RecordType recordType) 
    external 
    view 
    returns (bytes memory recordData) 
{
    if (recordType == RecordType.TOPUP) {
        TopUpRecord memory record = topUpRecords[recordId];
        recordData = abi.encode(record);
    } else if (recordType == RecordType.SPEND) {
        SpendRecord memory record = spendRecords[recordId];
        recordData = abi.encode(record);
    } else if (recordType == RecordType.WITHDRAW) {
        WithdrawRecord memory record = withdrawRecords[recordId];
        recordData = abi.encode(record);
    }
}
```

### 隐私保护机制

#### 数据加密和哈希
```solidity
// 卡ID哈希处理
function _hashCardId(string memory cardId, bytes32 salt) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(cardId, salt));
}

// 商户信息哈希
function _hashMerchantInfo(string memory merchantName, string memory location) 
    internal 
    pure 
    returns (bytes32) 
{
    return keccak256(abi.encodePacked(merchantName, location));
}

// 敏感数据加密（链下执行，链上存储密文）
function _encryptSensitiveData(bytes memory data, bytes32 key) 
    internal 
    pure 
    returns (string memory) 
{
    // 实际实现中会调用加密库
    // 这里返回加密后的数据
    return string(abi.encodePacked("encrypted_", data));
}

// 数据完整性验证
function _computeDataHash(
    address user,
    bytes32 cardIdHash,
    uint256 amount1,
    uint256 amount2
) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(user, cardIdHash, amount1, amount2, "CPOP_INTEGRITY"));
}
```

#### 访问控制
```solidity
// 基于角色的访问控制
modifier onlyAuthorized() {
    require(
        hasRole(RECORDER_ROLE, msg.sender) ||
        hasRole(ADMIN_ROLE, msg.sender),
        "Unauthorized access"
    );
    _;
}

// 用户隐私保护
modifier onlyOwnerOrAuthorized(bytes32 cardIdHash) {
    require(
        _isCardOwner(msg.sender, cardIdHash) ||
        hasRole(ADMIN_ROLE, msg.sender) ||
        hasRole(AUDITOR_ROLE, msg.sender),
        "Access denied"
    );
    _;
}

// 验证卡片所有者
function _isCardOwner(address user, bytes32 cardIdHash) internal view returns (bool) {
    // 通过Consumer合约验证用户是否是卡片所有者
    return cpotpConsumer.isCardOwner(user, cardIdHash);
}
```

### Gas优化策略

#### 分层存储系统
```solidity
// 热数据存储（最近30天）
mapping(bytes32 => RecordType) public hotRecords;
mapping(bytes32 => uint256) public hotRecordTimestamps;

// 温数据存储（30-90天）
mapping(bytes32 => bytes) public warmRecords;

// 冷数据存储（90天以上）
mapping(bytes32 => string) public coldRecordsIPFS;

function _addToHotStorage(bytes32 recordId, RecordType recordType) internal {
    hotRecords[recordId] = recordType;
    hotRecordTimestamps[recordId] = block.timestamp;
    
    // 检查是否需要归档
    if (_shouldArchive()) {
        _archiveOldRecords();
    }
}

function _archiveOldRecords() internal {
    uint256 archiveThreshold = block.timestamp - 30 days;
    
    // 批量归档到温存储
    // 实际实现中会使用更高效的批处理方式
}

// IPFS存储集成
function _storeToIPFS(bytes32 recordId, bytes memory data) internal returns (string memory ipfsHash) {
    // 实际实现中会调用IPFS存储服务
    // 返回IPFS哈希
    ipfsHash = string(abi.encodePacked("Qm", recordId));
    coldRecordsIPFS[recordId] = ipfsHash;
}
```

#### 批量操作优化
```solidity
// Merkle树验证（批量数据完整性）
function _calculateMerkleRoot(bytes32[] memory leaves) internal pure returns (bytes32) {
    require(leaves.length > 0, "Empty leaves array");
    
    if (leaves.length == 1) {
        return leaves[0];
    }
    
    bytes32[] memory tree = leaves;
    uint256 n = leaves.length;
    
    while (n > 1) {
        for (uint256 i = 0; i < n / 2; i++) {
            tree[i] = keccak256(abi.encodePacked(tree[2 * i], tree[2 * i + 1]));
        }
        if (n % 2 == 1) {
            tree[n / 2] = tree[n - 1];
            n = n / 2 + 1;
        } else {
            n = n / 2;
        }
    }
    
    return tree[0];
}

// 验证Merkle证明
function verifyMerkleProof(
    bytes32[] memory proof,
    bytes32 root,
    bytes32 leaf
) public pure returns (bool) {
    bytes32 computedHash = leaf;
    
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 proofElement = proof[i];
        
        if (computedHash <= proofElement) {
            computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
        } else {
            computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
        }
    }
    
    return computedHash == root;
}
```

### 状态管理和更新

#### 记录状态更新
```solidity
// 更新记录状态
function updateRecordStatus(
    bytes32 recordId,
    RecordType recordType,
    RecordStatus newStatus,
    bytes32 transactionHash
) external onlyAuthorized {
    require(recordId != bytes32(0), "Invalid record ID");
    
    if (recordType == RecordType.TOPUP) {
        TopUpRecord storage record = topUpRecords[recordId];
        require(record.recordId == recordId, "Record not found");
        
        RecordStatus oldStatus = record.status;
        record.status = newStatus;
        
        if (newStatus == RecordStatus.SUCCESS && transactionHash != bytes32(0)) {
            record.transactionHash = transactionHash;
        }
        
        emit RecordStatusUpdated(recordId, oldStatus, newStatus, transactionHash);
        
    } else if (recordType == RecordType.SPEND) {
        SpendRecord storage record = spendRecords[recordId];
        require(record.recordId == recordId, "Record not found");
        
        RecordStatus oldStatus = record.status;
        record.status = newStatus;
        
        if (newStatus == RecordStatus.SUCCESS && transactionHash != bytes32(0)) {
            record.settlementHash = transactionHash;
        }
        
        emit RecordStatusUpdated(recordId, oldStatus, newStatus, transactionHash);
    }
    // 其他记录类型...
}

// 批量状态更新
function batchUpdateRecordStatus(
    bytes32[] memory recordIds,
    RecordType[] memory recordTypes,
    RecordStatus[] memory newStatuses
) external onlyAuthorized {
    require(
        recordIds.length == recordTypes.length && 
        recordTypes.length == newStatuses.length,
        "Array length mismatch"
    );
    
    for (uint256 i = 0; i < recordIds.length; i++) {
        updateRecordStatus(recordIds[i], recordTypes[i], newStatuses[i], bytes32(0));
    }
    
    emit BatchStatusUpdated(recordIds.length);
}
```

### 事件系统

#### 记录事件
```solidity
event TopUpRecorded(
    bytes32 indexed recordId,
    address indexed user,
    uint256 cpotpAmount,
    uint256 fiatAmount,
    uint256 timestamp
);

event SpendRecorded(
    bytes32 indexed recordId,
    bytes32 indexed cardHash,
    uint256 amount,
    SpendCategory category,
    uint256 timestamp
);

event WithdrawRecorded(
    bytes32 indexed recordId,
    bytes32 indexed cardHash,
    uint256 amount,
    uint256 fee,
    uint256 timestamp
);

event BalanceChanged(
    bytes32 indexed recordId,
    bytes32 indexed cardHash,
    int256 deltaAmount,
    uint256 balanceAfter,
    ChangeReason reason,
    uint256 timestamp
);

event RecordStatusUpdated(
    bytes32 indexed recordId,
    RecordStatus oldStatus,
    RecordStatus newStatus,
    bytes32 transactionHash
);

event BatchRecorded(
    bytes32 indexed batchId,
    uint256 recordCount,
    bytes32 merkleRoot
);

event RecordArchived(
    bytes32 indexed recordId,
    string ipfsHash,
    uint256 timestamp
);
```

### 合规性和审计功能

#### 监管报告生成
```solidity
// 生成合规报告
function generateComplianceReport(
    uint256 fromTimestamp,
    uint256 toTimestamp,
    ReportType reportType
) external view onlyRole(AUDITOR_ROLE) returns (ComplianceReport memory) {
    ComplianceReport memory report;
    
    if (reportType == ReportType.TRANSACTION_SUMMARY) {
        report = _generateTransactionSummaryReport(fromTimestamp, toTimestamp);
    } else if (reportType == ReportType.USER_ACTIVITY) {
        report = _generateUserActivityReport(fromTimestamp, toTimestamp);
    }
    
    return report;
}

// AML监控检查
function performAMLCheck(address user, uint256 amount) external view returns (AMLResult memory) {
    AMLResult memory result;
    
    // 检查大额交易
    if (amount > AML_LARGE_AMOUNT_THRESHOLD) {
        result.riskLevel = RiskLevel.HIGH;
        result.flags.push("Large amount transaction");
    }
    
    // 检查频繁交易
    uint256 dailyTransactionCount = _getDailyTransactionCount(user);
    if (dailyTransactionCount > AML_FREQUENCY_THRESHOLD) {
        result.riskLevel = RiskLevel.MEDIUM;
        result.flags.push("High frequency transactions");
    }
    
    return result;
}
```

这个合约设计确保了系统的安全性、可扩展性和用户体验的最优化。