// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IHZToken
 * @dev HZ Token 合约接口定义
 * 扩展了标准 ERC20 接口，增加了铸造、销毁、暂停、黑名单和交易税功能
 */
interface IHZToken is IERC20 {
    
    
    // ==================== 管理功能接口 ====================
    
    /**
     * @dev 铸造代币
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external;
    
    /**
     * @dev 销毁调用者的代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) external;
    
    /**
     * @dev 销毁指定账户的代币（需要授权）
     * @param account 被销毁代币的账户
     * @param amount 销毁数量
     */
    function burnFrom(address account, uint256 amount) external;
    
    /**
     * @dev 暂停合约
     */
    function pause() external;
    
    /**
     * @dev 取消暂停
     */
    function unpause() external;
    
    // ==================== 黑名单管理接口 ====================
    
    /**
     * @dev 添加地址到黑名单
     * @param account 要添加的地址
     */
    function addToBlacklist(address account) external;
    
    /**
     * @dev 从黑名单移除地址
     * @param account 要移除的地址
     */
    function removeFromBlacklist(address account) external;
    
    /**
     * @dev 检查地址是否在黑名单中
     * @param account 要检查的地址
     * @return 是否在黑名单中
     */
    function isBlacklisted(address account) external view returns (bool);
    
    // ==================== 动态交易税管理接口 ====================
    
    /**
     * @dev 设置动态税收配置
     * @param buyTax 买入税率（基点）
     * @param sellTax 卖出税率（基点）
     * @param transferTax 转账税率（基点）
     * @param liquidityTax 流动性税率（基点）
     * @param dynamicEnabled 是否启用动态税率
     * @param maxDynamicRate 动态调整最大倍数（基点）
     */
    function setTaxConfig(
        uint256 buyTax,
        uint256 sellTax,
        uint256 transferTax,
        uint256 liquidityTax,
        bool dynamicEnabled,
        uint256 maxDynamicRate
    ) external;
    
    /**
     * @dev 设置税收接收地址
     * @param recipient 税收接收地址
     */
    function setTaxRecipient(address recipient) external;
    
    /**
     * @dev 启用或禁用交易税
     * @param enabled 是否启用
     */
    function setTaxEnabled(bool enabled) external;
    
    /**
     * @dev 设置AMM池地址
     * @param pool 池地址
     * @param isPool 是否为AMM池
     */
    function setAMM(address pool, bool isPool) external;
    
    /**
     * @dev 批量设置AMM池地址
     * @param pools 池地址数组
     * @param flags 是否为AMM池的标志数组
     */
    function batchSetAMM(address[] calldata pools, bool[] calldata flags) external;
    
    /**
     * @dev 设置免税地址
     * @param account 账户地址
     * @param exempt 是否免税
     */
    function setTaxExempt(address account, bool exempt) external;
    
    /**
     * @dev 批量设置免税地址
     * @param accounts 账户地址数组
     * @param flags 是否免税的标志数组
     */
    function batchSetTaxExempt(address[] calldata accounts, bool[] calldata flags) external;
    
    /**
     * @dev 设置流动性池地址
     * @param pool 池地址
     * @param isPool 是否为流动性池
     */
    function setLiquidityPool(address pool, bool isPool) external;
    
    /**
     * @dev 设置动态税率参数
     * @param volumeThreshold 交易量阈值
     * @param timeWindow 时间窗口
     * @param priceImpactFactor 价格影响因子
     * @param volatilityFactor 波动性因子
     */
    function setDynamicTaxParams(
        uint256 volumeThreshold,
        uint256 timeWindow,
        uint256 priceImpactFactor,
        uint256 volatilityFactor
    ) external;
    
    // ==================== 查询和统计功能接口 ====================
    
    /**
     * @dev 预览税收计算（不执行交易）
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 交易金额
     * @return taxAmount 税收金额
     * @return transferAmount 实际转账金额
     * @return taxType 税收类型
     * @return baseTaxRate 基础税率
     * @return dynamicMultiplier 动态调整倍数
     */
    function previewTax(address from, address to, uint256 amount) 
        external view returns (
            uint256 taxAmount,
            uint256 transferAmount,
            string memory taxType,
            uint256 baseTaxRate,
            uint256 dynamicMultiplier
        );
    
    /**
     * @dev 获取交易统计
     * @return totalVolume24h 24小时总交易量
     * @return largeTransactionCount 大额交易数量
     * @return averageTransactionSize 平均交易大小
     * @return lastStatsUpdate 最后统计更新时间
     * @return recentTransactionCount 最近交易记录数量
     */
    function getTradingStats() external view returns (
        uint256 totalVolume24h,
        uint256 largeTransactionCount,
        uint256 averageTransactionSize,
        uint256 lastStatsUpdate,
        uint256 recentTransactionCount
    );
    
    /**
     * @dev 获取税收配置
     * @return buyTax 买入税率
     * @return sellTax 卖出税率
     * @return transferTax 转账税率
     * @return liquidityTax 流动性税率
     * @return dynamicTaxEnabled 动态税率是否启用
     * @return maxDynamicRate 最大动态调整倍数
     * @return recipient 税收接收地址
     * @return enabled 税收是否启用
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
    );
    
    /**
     * @dev 获取动态税率参数
     * @return volumeThreshold 交易量阈值
     * @return timeWindow 时间窗口
     * @return priceImpactFactor 价格影响因子
     * @return volatilityFactor 波动性因子
     */
    function getDynamicTaxParams() external view returns (
        uint256 volumeThreshold,
        uint256 timeWindow,
        uint256 priceImpactFactor,
        uint256 volatilityFactor
    );
    
    /**
     * @dev 获取最近交易记录
     * @param count 要获取的记录数量
     * @return amounts 交易金额数组
     * @return timestamps 交易时间戳数组
     * @return isBuy 是否为买入交易数组
     * @return isSell 是否为卖出交易数组
     */
    function getRecentTransactions(uint256 count) external view returns (
        uint256[] memory amounts,
        uint256[] memory timestamps,
        bool[] memory isBuy,
        bool[] memory isSell
    );
    
    /**
     * @dev 手动更新统计数据（管理员功能）
     */
    function updateStats() external;
    
    /**
     * @dev 清理旧的交易记录
     */
    function cleanupOldTransactions() external;
    
    /**
     * @dev 获取合约版本
     * @return 版本号字符串
     */
    function version() external pure returns (string memory);
    
    // ==================== 公共状态变量接口 ====================
    
    /**
     * @dev 获取税收配置
     * @return buyTax 买入税率
     * @return sellTax 卖出税率
     * @return transferTax 转账税率
     * @return liquidityTax 流动性税率
     * @return dynamicTaxEnabled 动态税率是否启用
     * @return maxDynamicRate 最大动态调整倍数
     */
    function taxConfig() external view returns (uint256 buyTax, uint256 sellTax, uint256 transferTax, uint256 liquidityTax, bool dynamicTaxEnabled, uint256 maxDynamicRate);
    
    /**
     * @dev 获取税收接收地址
     * @return 税收接收地址
     */
    function taxRecipient() external view returns (address);
    
    /**
     * @dev 获取税收是否启用
     * @return 是否启用
     */
    function taxEnabled() external view returns (bool);
    
    /**
     * @dev 检查地址是否为AMM池
     * @param account 要检查的地址
     * @return 是否为AMM池
     */
    function isAMM(address account) external view returns (bool);
    
    /**
     * @dev 检查地址是否免税
     * @param account 要检查的地址
     * @return 是否免税
     */
    function isTaxExempt(address account) external view returns (bool);
    
    /**
     * @dev 检查地址是否为流动性池
     * @param account 要检查的地址
     * @return 是否为流动性池
     */
    function isLiquidityPool(address account) external view returns (bool);
    
    /**
     * @dev 获取动态税率参数
     * @return volumeThreshold 交易量阈值
     * @return timeWindow 时间窗口
     * @return priceImpactFactor 价格影响因子
     * @return volatilityFactor 波动性因子
     */
    function dynamicParams() external view returns (uint256 volumeThreshold, uint256 timeWindow, uint256 priceImpactFactor, uint256 volatilityFactor);
    
    /**
     * @dev 获取交易统计数据
     * @return totalVolume24h 24小时交易量
     * @return lastStatsUpdate 上次统计更新时间
     * @return largeTransactionCount 大额交易计数
     * @return averageTransactionSize 平均交易大小
     */
    function tradingStats() external view returns (uint256 totalVolume24h, uint256 lastStatsUpdate, uint256 largeTransactionCount, uint256 averageTransactionSize);
    
    // ==================== 事件定义 ====================
    
    /**
     * @dev 黑名单添加事件
     * @param account 被添加的地址
     */
    event BlacklistAdded(address indexed account);
    
    /**
     * @dev 黑名单移除事件
     * @param account 被移除的地址
     */
    event BlacklistRemoved(address indexed account);
    
    /**
     * @dev 动态交易税扣除事件
     * @param from 支付税费的地址
     * @param to 接收代币的地址
     * @param amount 税费金额
     * @param taxType 税收类型
     */
    event TaxDeducted(address indexed from, address indexed to, uint256 amount, string taxType);
    
    /**
     * @dev 税收配置更新事件
     * @param buyTax 买入税率
     * @param sellTax 卖出税率
     * @param transferTax 转账税率
     * @param liquidityTax 流动性税率
     * @param dynamicEnabled 动态税率是否启用
     */
    event TaxConfigUpdated(uint256 buyTax, uint256 sellTax, uint256 transferTax, uint256 liquidityTax, bool dynamicEnabled);
    
    /**
     * @dev 税收接收地址更新事件
     * @param recipient 新的税收接收地址
     */
    event TaxRecipientUpdated(address indexed recipient);
    
    /**
     * @dev 税收启用状态更新事件
     * @param enabled 是否启用
     */
    event TaxEnabledUpdated(bool enabled);
    
    /**
     * @dev AMM池地址更新事件
     * @param pool 池地址
     * @param isAMM 是否为AMM池
     */
    event AMMUpdated(address indexed pool, bool isAMM);
    
    /**
     * @dev 免税地址更新事件
     * @param account 账户地址
     * @param exempt 是否免税
     */
    event TaxExemptUpdated(address indexed account, bool exempt);
    
    /**
     * @dev 流动性池地址更新事件
     * @param pool 池地址
     * @param isPool 是否为流动性池
     */
    event LiquidityPoolUpdated(address indexed pool, bool isPool);
    
    /**
     * @dev 动态税率参数更新事件
     * @param volumeThreshold 交易量阈值
     * @param timeWindow 时间窗口
     * @param priceImpactFactor 价格影响因子
     * @param volatilityFactor 波动性因子
     */
    event DynamicTaxParamsUpdated(uint256 volumeThreshold, uint256 timeWindow, uint256 priceImpactFactor, uint256 volatilityFactor);
    
    /**
     * @dev 统计数据更新事件
     * @param timestamp 更新时间戳
     */
    event StatsUpdated(uint256 timestamp);
    
    /**
     * @dev 交易历史清理事件
     * @param remainingCount 剩余记录数量
     */
    event TransactionHistoryCleanup(uint256 remainingCount);
}