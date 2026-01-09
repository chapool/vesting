// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Constants
 * @dev Chapool Token 生态系统的常量定义抽象合约
 * 集中管理所有系统级常量，避免硬编码和重复定义
 * 
 * 使用方式：
 * contract MyContract is Constants {
 *     function someFunction() {
 *         require(amount <= TOTAL_SUPPLY, "exceeds total supply");
 *     }
 * }
 */
abstract contract Constants {
    
    // ==================== 代币基本参数 ====================
    uint256 public constant TOTAL_SUPPLY = 10_000_000_000 * 10**18; // 100亿代币总供应量
    
    // ==================== MiningPool 审批阈值 ====================
    uint256 public constant MINING_POOL_SMALL_THRESHOLD = 10_000 * 10**18;   // 1万代币（小额批量处理）
    uint256 public constant MINING_POOL_MEDIUM_THRESHOLD = 100_000 * 10**18; // 10万代币（中额需一级审批）
    // 大额（超过10万代币）需要二级审批
    
    // ==================== MiningPool 默认配置 ====================
    uint256 public constant DEFAULT_REQUEST_COOLDOWN = 1 hours;              // 默认请求冷却期
    uint256 public constant DEFAULT_DAILY_USER_LIMIT = 50_000 * 10**18;      // 默认用户每日限额
    uint256 public constant DEFAULT_DAILY_GLOBAL_LIMIT = 1_000_000 * 10**18; // 默认全局每日限额
    uint256 public constant DEFAULT_REQUEST_EXPIRY = 30 days;                // 默认请求过期时间
    uint256 public constant DEFAULT_MIN_WITHDRAW = 1 * 10**18;               // 默认最小提现金额
    uint256 public constant DEFAULT_MAX_WITHDRAW = 1_000_000 * 10**18;       // 默认最大提现金额
    uint256 public constant MAX_COOLDOWN_PERIOD = 24 hours;                  // 最大冷却期
    uint256 public constant MIN_EXPIRY_TIME = 1 days;                        // 最小过期时间
    uint256 public constant MAX_EXPIRY_TIME = 365 days;                      // 最大过期时间
    
    // ==================== 交易税配置 ====================
    uint256 public constant MAX_TRANSACTION_TAX_RATE = 500;                  // 最大交易税率 5%（基点）
    uint256 public constant DEFAULT_TRANSACTION_TAX_RATE = 100;              // 默认交易税率 1%（基点）
    uint256 public constant MAX_RECENT_TRANSACTIONS = 100;                   // 最大交易历史记录数
    uint256 public constant BASE_DYNAMIC_MULTIPLIER = 100;                   // 基础动态倍数 1.0x
    
    // ==================== 时间常量 ====================
    uint256 public constant SECONDS_PER_DAY = 86400;                         // 一天的秒数
    uint256 public constant SECONDS_PER_HOUR = 3600;                         // 一小时的秒数
    
    // ==================== 合约版本 ====================
    string public constant CONTRACT_VERSION = "2.1.0";                      // 当前版本
}