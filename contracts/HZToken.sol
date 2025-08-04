// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IHZToken.sol";
import "./Constants.sol";

/**
 * @title HZToken
 * @dev HZ Token 是 HZ 生态系统的核心代币合约，基于 ERC-20 标准实现
 * 具备铸造、销毁、暂停、黑名单和交易税等扩展功能，采用可升级设计
 */
contract HZToken is 
    Initializable, 
    ERC20Upgradeable, 
    ERC20BurnableUpgradeable, 
    ERC20PausableUpgradeable, 
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    Constants,
    IHZToken
{
    // ==================== 代币基本信息 ====================
    // 注意：角色常量和总供应量常量现在从 Constants 抽象合约继承
    
    // ==================== 黑名单管理 ====================
    mapping(address => bool) private _blacklisted;
    
    // ==================== 动态交易税配置 ====================
    struct TaxConfig {
        uint256 buyTax;          // 买入税 (基点)
        uint256 sellTax;         // 卖出税 (基点)
        uint256 transferTax;     // 转账税 (基点)
        uint256 liquidityTax;    // 流动性税 (基点)
        bool dynamicTaxEnabled;  // 动态税率开关
        uint256 maxDynamicRate;  // 动态调整最大倍数 (基点，100=1倍)
    }
    
    TaxConfig public taxConfig;
    address public taxRecipient;
    bool public taxEnabled;
    
    // AMM和交易所地址管理
    mapping(address => bool) public isAMM;           // AMM池标识
    mapping(address => bool) public isTaxExempt;     // 免税地址
    mapping(address => bool) public isLiquidityPool; // 流动性池标识
    
    // 动态税率调整参数
    struct DynamicTaxParams {
        uint256 volumeThreshold;     // 交易量阈值
        uint256 timeWindow;          // 时间窗口
        uint256 priceImpactFactor;   // 价格影响因子
        uint256 volatilityFactor;    // 波动性因子
    }
    
    DynamicTaxParams public dynamicParams;
    
    // 交易统计数据
    struct TradingStats {
        uint256 totalVolume24h;      // 24小时交易量
        uint256 lastStatsUpdate;     // 上次统计更新时间
        uint256 largeTransactionCount; // 大额交易计数
        uint256 averageTransactionSize; // 平均交易大小
    }
    
    TradingStats public tradingStats;
    
    // 交易历史记录（用于动态调整）
    struct TransactionRecord {
        uint256 amount;
        uint256 timestamp;
        bool isBuy;
        bool isSell;
    }
    
    TransactionRecord[] private recentTransactions;
    
    // 注意：最大税率常量现在从 Constants 抽象合约继承 (MAX_TRANSACTION_TAX_RATE)
    
    // ==================== 版本控制（用于可升级合约）====================
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param name_ 代币名称
     * @param symbol_ 代币符号
     * @param vestingContract Vesting 合约地址
     */
    function initialize(string memory name_, string memory symbol_, address vestingContract) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(_msgSender());
        __ReentrancyGuard_init();

        // 初始化动态税收配置
        taxConfig = TaxConfig({
            buyTax: DEFAULT_TRANSACTION_TAX_RATE,      // 默认1%买入税
            sellTax: DEFAULT_TRANSACTION_TAX_RATE,     // 默认1%卖出税
            transferTax: DEFAULT_TRANSACTION_TAX_RATE / 2, // 默认0.5%转账税
            liquidityTax: DEFAULT_TRANSACTION_TAX_RATE / 4, // 默认0.25%流动性税
            dynamicTaxEnabled: false,                   // 默认关闭动态税率
            maxDynamicRate: 300                        // 最大3倍动态调整
        });
        
        // 初始化动态税率参数
        dynamicParams = DynamicTaxParams({
            volumeThreshold: TOTAL_SUPPLY / 1000,      // 0.1%总供应量作为阈值
            timeWindow: 1 hours,                       // 1小时时间窗口
            priceImpactFactor: 150,                    // 1.5倍价格影响因子
            volatilityFactor: 200                      // 2倍波动性因子
        });
        
        // 初始化交易统计
        tradingStats.lastStatsUpdate = block.timestamp;
        
        // 初始铸造：将所有代币铸造到 Vesting 合约
        require(vestingContract != address(0), "HZ: vesting contract cannot be zero");
        _mint(vestingContract, TOTAL_SUPPLY);
    }

    // ==================== 管理功能实现 ====================
    
    /**
     * @dev 销毁调用者的代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) public override(ERC20BurnableUpgradeable, IHZToken) {
        _burn(_msgSender(), amount);
    }
    
    /**
     * @dev 销毁指定账户的代币
     * @param account 被销毁代币的账户
     * @param amount 销毁数量
     * @notice owner可以直接销毁任何用户的代币，非owner需要授权
     */
    function burnFrom(address account, uint256 amount) public override(ERC20BurnableUpgradeable, IHZToken) {
        address sender = _msgSender();
        
        // 如果调用者是owner，可以直接销毁，无需授权
        if (sender != owner()) {
            _spendAllowance(account, sender, amount);
        }
        
        _burn(account, amount);
    }

    /**
     * @dev 铸造代币
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= TOTAL_SUPPLY, "HZ: exceeds max supply");
        _mint(to, amount);
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 取消暂停
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== 黑名单管理实现 ====================

    /**
     * @dev 添加地址到黑名单
     * @param account 要添加的地址
     */
    function addToBlacklist(address account) external onlyOwner {
        require(!_blacklisted[account], "HZ: already blacklisted");
        _blacklisted[account] = true;
        emit BlacklistAdded(account);
    }

    /**
     * @dev 从黑名单移除地址
     * @param account 要移除的地址
     */
    function removeFromBlacklist(address account) external onlyOwner {
        require(_blacklisted[account], "HZ: not blacklisted");
        _blacklisted[account] = false;
        emit BlacklistRemoved(account);
    }

    /**
     * @dev 检查地址是否在黑名单中
     * @param account 要检查的地址
     * @return 是否在黑名单中
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    // ==================== 动态交易税管理实现 ====================

    /**
     * @dev 设置动态税收配置
     */
    function setTaxConfig(
        uint256 buyTax,
        uint256 sellTax,
        uint256 transferTax,
        uint256 liquidityTax,
        bool dynamicEnabled,
        uint256 maxDynamicRate
    ) external onlyOwner {
        require(buyTax <= MAX_TRANSACTION_TAX_RATE, "HZ: buy tax too high");
        require(sellTax <= MAX_TRANSACTION_TAX_RATE, "HZ: sell tax too high");
        require(transferTax <= MAX_TRANSACTION_TAX_RATE, "HZ: transfer tax too high");
        require(liquidityTax <= MAX_TRANSACTION_TAX_RATE, "HZ: liquidity tax too high");
        require(maxDynamicRate <= 500, "HZ: max dynamic rate too high"); // 最大5倍
        
        taxConfig.buyTax = buyTax;
        taxConfig.sellTax = sellTax;
        taxConfig.transferTax = transferTax;
        taxConfig.liquidityTax = liquidityTax;
        taxConfig.dynamicTaxEnabled = dynamicEnabled;
        taxConfig.maxDynamicRate = maxDynamicRate;
        
        emit TaxConfigUpdated(buyTax, sellTax, transferTax, liquidityTax, dynamicEnabled);
    }

    /**
     * @dev 设置税收接收地址
     */
    function setTaxRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "HZ: invalid tax recipient");
        taxRecipient = recipient;
        emit TaxRecipientUpdated(recipient);
    }

    /**
     * @dev 启用或禁用税收系统
     */
    function setTaxEnabled(bool enabled) external onlyOwner {
        taxEnabled = enabled;
        emit TaxEnabledUpdated(enabled);
    }

    /**
     * @dev 设置AMM池地址
     */
    function setAMM(address pool, bool isPool) external onlyOwner {
        require(pool != address(0), "HZ: invalid pool address");
        isAMM[pool] = isPool;
        emit AMMUpdated(pool, isPool);
    }

    /**
     * @dev 批量设置AMM池地址
     */
    function batchSetAMM(address[] calldata pools, bool[] calldata flags) external onlyOwner {
        require(pools.length == flags.length, "HZ: arrays length mismatch");
        
        for (uint256 i = 0; i < pools.length; i++) {
            require(pools[i] != address(0), "HZ: invalid pool address");
            isAMM[pools[i]] = flags[i];
            emit AMMUpdated(pools[i], flags[i]);
        }
    }

    /**
     * @dev 设置免税地址
     */
    function setTaxExempt(address account, bool exempt) external onlyOwner {
        require(account != address(0), "HZ: invalid account address");
        isTaxExempt[account] = exempt;
        emit TaxExemptUpdated(account, exempt);
    }

    /**
     * @dev 批量设置免税地址
     */
    function batchSetTaxExempt(address[] calldata accounts, bool[] calldata flags) external onlyOwner {
        require(accounts.length == flags.length, "HZ: arrays length mismatch");
        
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "HZ: invalid account address");
            isTaxExempt[accounts[i]] = flags[i];
            emit TaxExemptUpdated(accounts[i], flags[i]);
        }
    }

    /**
     * @dev 设置流动性池地址
     */
    function setLiquidityPool(address pool, bool isPool) external onlyOwner {
        require(pool != address(0), "HZ: invalid pool address");
        isLiquidityPool[pool] = isPool;
        emit LiquidityPoolUpdated(pool, isPool);
    }

    /**
     * @dev 设置动态税率参数
     */
    function setDynamicTaxParams(
        uint256 volumeThreshold,
        uint256 timeWindow,
        uint256 priceImpactFactor,
        uint256 volatilityFactor
    ) external onlyOwner {
        require(volumeThreshold > 0, "HZ: invalid volume threshold");
        require(timeWindow >= 10 minutes && timeWindow <= 24 hours, "HZ: invalid time window");
        require(priceImpactFactor >= 100 && priceImpactFactor <= 500, "HZ: invalid price impact factor");
        require(volatilityFactor >= 100 && volatilityFactor <= 1000, "HZ: invalid volatility factor");
        
        dynamicParams.volumeThreshold = volumeThreshold;
        dynamicParams.timeWindow = timeWindow;
        dynamicParams.priceImpactFactor = priceImpactFactor;
        dynamicParams.volatilityFactor = volatilityFactor;
        
        emit DynamicTaxParamsUpdated(volumeThreshold, timeWindow, priceImpactFactor, volatilityFactor);
    }

    // ==================== 内部函数重写 ====================


    /**
     * @dev 计算动态税收
     */
    function _calculateDynamicTax(address from, address to, uint256 amount) internal view returns (uint256) {
        // 获取基础税率
        uint256 baseTaxRate = _getBaseTaxRate(from, to);
        
        if (baseTaxRate == 0) return 0;
        
        // 如果动态税率关闭，返回基础税率
        if (!taxConfig.dynamicTaxEnabled) {
            return (amount * baseTaxRate) / 10000;
        }
        
        // 计算动态调整因子
        uint256 dynamicMultiplier = _calculateDynamicMultiplier(from, to, amount);
        
        // 应用动态调整
        uint256 adjustedTaxRate = (baseTaxRate * dynamicMultiplier) / 100;
        
        // 确保不超过最大动态税率
        uint256 maxTaxRate = (baseTaxRate * taxConfig.maxDynamicRate) / 100;
        if (adjustedTaxRate > maxTaxRate) {
            adjustedTaxRate = maxTaxRate;
        }
        
        return (amount * adjustedTaxRate) / 10000;
    }

    /**
     * @dev 获取基础税率
     */
    function _getBaseTaxRate(address from, address to) internal view returns (uint256) {
        // 流动性相关交易
        if (isLiquidityPool[from] || isLiquidityPool[to]) {
            return taxConfig.liquidityTax;
        }
        
        // 买入交易 (从AMM池转出)
        if (isAMM[from] && !isAMM[to]) {
            return taxConfig.buyTax;
        }
        
        // 卖出交易 (转入AMM池)
        if (!isAMM[from] && isAMM[to]) {
            return taxConfig.sellTax;
        }
        
        // 普通转账
        return taxConfig.transferTax;
    }

    /**
     * @dev 计算动态调整倍数
     */
    function _calculateDynamicMultiplier(address from, address to, uint256 amount) internal view returns (uint256) {
        uint256 multiplier = BASE_DYNAMIC_MULTIPLIER; // 基础倍数1.0x
        
        // 基于交易金额的调整
        uint256 amountFactor = _calculateAmountFactor(amount);
        multiplier = (multiplier * amountFactor) / 100;
        
        // 基于交易量的调整
        uint256 volumeFactor = _calculateVolumeFactor();
        multiplier = (multiplier * volumeFactor) / 100;
        
        // 基于交易类型的调整
        uint256 typeFactor = _calculateTypeFactor(from, to);
        multiplier = (multiplier * typeFactor) / 100;
        
        // 基于时间的调整（市场活跃度）
        uint256 timeFactor = _calculateTimeFactor();
        multiplier = (multiplier * timeFactor) / 100;
        
        return multiplier;
    }

    /**
     * @dev 基于交易金额计算调整因子
     */
    function _calculateAmountFactor(uint256 amount) internal view returns (uint256) {
        if (amount <= dynamicParams.volumeThreshold) {
            return 100; // 小额交易，正常税率
        } else if (amount <= dynamicParams.volumeThreshold * 5) {
            return 120; // 中等金额，税率增加20%
        } else if (amount <= dynamicParams.volumeThreshold * 10) {
            return 150; // 大额交易，税率增加50%
        } else {
            return dynamicParams.priceImpactFactor; // 巨额交易，使用价格影响因子
        }
    }

    /**
     * @dev 基于24小时交易量计算调整因子
     */
    function _calculateVolumeFactor() internal view returns (uint256) {
        if (tradingStats.totalVolume24h <= TOTAL_SUPPLY / 100) {
            return 90; // 低交易量，税率降低10%
        } else if (tradingStats.totalVolume24h <= TOTAL_SUPPLY / 50) {
            return 100; // 正常交易量
        } else if (tradingStats.totalVolume24h <= TOTAL_SUPPLY / 20) {
            return 110; // 高交易量，税率增加10%
        } else {
            return 130; // 异常高交易量，税率增加30%
        }
    }

    /**
     * @dev 基于交易类型计算调整因子
     */
    function _calculateTypeFactor(address from, address to) internal view returns (uint256) {
        // 卖出交易通常税率更高
        if (!isAMM[from] && isAMM[to]) {
            return 120; // 卖出增加20%
        }
        
        // 买入交易可能有优惠
        if (isAMM[from] && !isAMM[to]) {
            return 90; // 买入减少10%
        }
        
        return 100; // 普通转账
    }

    /**
     * @dev 基于时间因子计算调整（市场活跃度）
     */
    function _calculateTimeFactor() internal view returns (uint256) {
        // 简单的时间因子：基于最近交易频率
        if (recentTransactions.length == 0) return 100;
        
        uint256 recentTransactionCount = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < recentTransactions.length; i++) {
            if (currentTime - recentTransactions[i].timestamp <= 1 hours) {
                recentTransactionCount++;
            }
        }
        
        if (recentTransactionCount <= 10) {
            return 95;  // 低活跃度，税率略降
        } else if (recentTransactionCount <= 50) {
            return 100; // 正常活跃度
        } else {
            return 115; // 高活跃度，税率略升
        }
    }

    /**
     * @dev 获取交易类型
     */
    function _getTaxType(address from, address to) internal view returns (string memory) {
        if (isLiquidityPool[from] || isLiquidityPool[to]) {
            return "liquidity";
        } else if (isAMM[from] && !isAMM[to]) {
            return "buy";
        } else if (!isAMM[from] && isAMM[to]) {
            return "sell";
        } else {
            return "transfer";
        }
    }

    /**
     * @dev 重写 _update 以支持暂停功能、黑名单检查和动态税收
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        // 黑名单检查（仅对转账操作，不影响铸造和销毁）
        if (from != address(0)) {
            require(!_blacklisted[from], "HZ: sender blacklisted");
        }
        if (to != address(0)) {
            require(!_blacklisted[to], "HZ: recipient blacklisted");
        }
        
        // 更新交易统计（仅对转账操作）
        if (from != address(0) && to != address(0)) {
            _updateTradingStats(from, to, amount);
        }
        
        // 应用税收逻辑（仅对转账操作）
        if (from != address(0) && to != address(0) && taxEnabled && taxRecipient != address(0) && !isTaxExempt[from] && !isTaxExempt[to]) {
            uint256 taxAmount = _calculateDynamicTax(from, to, amount);
            
            if (taxAmount > 0) {
                // 先执行税收转账
                super._update(from, taxRecipient, taxAmount);
                // 减少实际转账金额
                amount = amount - taxAmount;
                
                emit TaxDeducted(from, to, taxAmount, _getTaxType(from, to));
            }
        }
        
        // 执行实际转账/铸造/销毁
        super._update(from, to, amount);
    }


    // ==================== 统计和查询功能 ====================

    /**
     * @dev 更新交易统计
     */
    function _updateTradingStats(address from, address to, uint256 amount) internal {
        uint256 currentTime = block.timestamp;
        
        // 更新24小时交易量
        if (currentTime > tradingStats.lastStatsUpdate + 24 hours) {
            tradingStats.totalVolume24h = 0;
            tradingStats.largeTransactionCount = 0;
            tradingStats.lastStatsUpdate = currentTime;
        }
        
        tradingStats.totalVolume24h += amount;
        
        // 记录大额交易
        if (amount > dynamicParams.volumeThreshold * 5) {
            tradingStats.largeTransactionCount++;
        }
        
        // 更新平均交易大小
        tradingStats.averageTransactionSize = tradingStats.totalVolume24h / (tradingStats.largeTransactionCount + 1);
        
        // 记录最近交易
        _recordRecentTransaction(from, to, amount);
    }

    /**
     * @dev 记录最近交易
     */
    function _recordRecentTransaction(address from, address to, uint256 amount) internal {
        // 如果数组已满，移除最旧的记录
        if (recentTransactions.length >= MAX_RECENT_TRANSACTIONS) {
            for (uint256 i = 0; i < recentTransactions.length - 1; i++) {
                recentTransactions[i] = recentTransactions[i + 1];
            }
            recentTransactions.pop();
        }
        
        // 添加新记录
        recentTransactions.push(TransactionRecord({
            amount: amount,
            timestamp: block.timestamp,
            isBuy: isAMM[from] && !isAMM[to],
            isSell: !isAMM[from] && isAMM[to]
        }));
    }

    /**
     * @dev 预览税收计算（不执行交易）
     */
    function previewTax(address from, address to, uint256 amount) 
        external view returns (
            uint256 taxAmount,
            uint256 transferAmount,
            string memory taxType,
            uint256 baseTaxRate,
            uint256 dynamicMultiplier
        ) {
        
        if (!taxEnabled || taxRecipient == address(0) || isTaxExempt[from] || isTaxExempt[to]) {
            return (0, amount, "exempt", 0, 100);
        }
        
        baseTaxRate = _getBaseTaxRate(from, to);
        taxType = _getTaxType(from, to);
        
        if (taxConfig.dynamicTaxEnabled) {
            dynamicMultiplier = _calculateDynamicMultiplier(from, to, amount);
        } else {
            dynamicMultiplier = BASE_DYNAMIC_MULTIPLIER;
        }
        
        taxAmount = _calculateDynamicTax(from, to, amount);
        transferAmount = amount - taxAmount;
    }

    /**
     * @dev 获取交易统计
     */
    function getTradingStats() external view returns (
        uint256 totalVolume24h,
        uint256 largeTransactionCount,
        uint256 averageTransactionSize,
        uint256 lastStatsUpdate,
        uint256 recentTransactionCount
    ) {
        return (
            tradingStats.totalVolume24h,
            tradingStats.largeTransactionCount,
            tradingStats.averageTransactionSize,
            tradingStats.lastStatsUpdate,
            recentTransactions.length
        );
    }

    /**
     * @dev 获取税收配置
     */
    function getTaxConfig() external view returns (
        uint256 buyTax,
        uint256 sellTax,
        uint256 transferTax,
        uint256 liquidityTax,
        bool dynamicTaxEnabled,
        uint256 maxDynamicRate,
        address recipient,
        bool enabled
    ) {
        return (
            taxConfig.buyTax,
            taxConfig.sellTax,
            taxConfig.transferTax,
            taxConfig.liquidityTax,
            taxConfig.dynamicTaxEnabled,
            taxConfig.maxDynamicRate,
            taxRecipient,
            taxEnabled
        );
    }

    /**
     * @dev 获取动态税率参数
     */
    function getDynamicTaxParams() external view returns (
        uint256 volumeThreshold,
        uint256 timeWindow,
        uint256 priceImpactFactor,
        uint256 volatilityFactor
    ) {
        return (
            dynamicParams.volumeThreshold,
            dynamicParams.timeWindow,
            dynamicParams.priceImpactFactor,
            dynamicParams.volatilityFactor
        );
    }

    /**
     * @dev 获取最近交易记录
     */
    function getRecentTransactions(uint256 count) external view returns (
        uint256[] memory amounts,
        uint256[] memory timestamps,
        bool[] memory isBuy,
        bool[] memory isSell
    ) {
        uint256 length = recentTransactions.length;
        if (count > length) count = length;
        
        amounts = new uint256[](count);
        timestamps = new uint256[](count);
        isBuy = new bool[](count);
        isSell = new bool[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 index = length - count + i;
            amounts[i] = recentTransactions[index].amount;
            timestamps[i] = recentTransactions[index].timestamp;
            isBuy[i] = recentTransactions[index].isBuy;
            isSell[i] = recentTransactions[index].isSell;
        }
    }

    /**
     * @dev 手动更新统计数据（管理员功能）
     */
    function updateStats() external onlyOwner {
        uint256 currentTime = block.timestamp;
        
        // 如果超过24小时，重置统计
        if (currentTime > tradingStats.lastStatsUpdate + 24 hours) {
            tradingStats.totalVolume24h = 0;
            tradingStats.largeTransactionCount = 0;
            tradingStats.averageTransactionSize = 0;
        }
        
        tradingStats.lastStatsUpdate = currentTime;
        
        emit StatsUpdated(currentTime);
    }

    /**
     * @dev 清理旧的交易记录
     */
    function cleanupOldTransactions() external {
        uint256 currentTime = block.timestamp;
        uint256 cutoffTime = currentTime - dynamicParams.timeWindow;
        
        // 移除过期的交易记录
        uint256 validCount = 0;
        for (uint256 i = 0; i < recentTransactions.length; i++) {
            if (recentTransactions[i].timestamp >= cutoffTime) {
                if (validCount != i) {
                    recentTransactions[validCount] = recentTransactions[i];
                }
                validCount++;
            }
        }
        
        // 调整数组长度
        while (recentTransactions.length > validCount) {
            recentTransactions.pop();
        }
        
        emit TransactionHistoryCleanup(recentTransactions.length);
    }

    /**
     * @dev 获取合约版本
     */
    function version() external pure returns (string memory) {
        return "2.1.0";
    }
}