// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IMiningPool
 * @dev MiningPool 合约接口定义
 * 定义了挖矿奖励分发的三级审批机制接口
 */
interface IMiningPool {
    
    // ==================== 枚举定义 ====================
    
    /**
     * @dev 审批级别枚举
     */
    enum ApprovalLevel {
        SMALL,   // 小额（自动审批）
        MEDIUM,  // 中额（需要一级审批）
        LARGE    // 大额（需要二级审批）
    }
    
    /**
     * @dev 提款申请状态枚举
     */
    enum WithdrawalStatus {
        PENDING,        // 待审核
        APPROVED,       // 已批准
        REJECTED,       // 已拒绝
        EXECUTED        // 已执行
    }
    
    // ==================== 结构体定义 ====================
    
    /**
     * @dev 提款申请结构体
     */
    struct WithdrawalRequest {
        uint256 id;                    // 申请ID
        address beneficiary;           // 受益人地址
        uint256 amount;               // 提款金额
        ApprovalLevel level;          // 审批级别
        WithdrawalStatus status;      // 申请状态
        uint256 timestamp;            // 申请时间
        address approver1;            // 一级审批人
        address approver2;            // 二级审批人
        uint256 approvedAt;           // 批准时间
        string reason;                // 申请原因
        uint256 offChainRecordId;     // 链下提现记录ID
    }
    
    // ==================== 管理接口 ====================
    
    /**
     * @dev 设置审批阈值
     * @param smallThreshold 小额阈值
     * @param mediumThreshold 中额阈值
     */
    function setThresholds(uint256 smallThreshold, uint256 mediumThreshold) external;
    
    /**
     * @dev 添加一级审批人
     * @param approver 审批人地址
     */
    function addFirstLevelApprover(address approver) external;
    
    /**
     * @dev 移除一级审批人
     * @param approver 审批人地址
     */
    function removeFirstLevelApprover(address approver) external;
    
    /**
     * @dev 添加二级审批人
     * @param approver 审批人地址
     */
    function addSecondLevelApprover(address approver) external;
    
    /**
     * @dev 移除二级审批人
     * @param approver 审批人地址
     */
    function removeSecondLevelApprover(address approver) external;
    
    /**
     * @dev 一级审批
     * @param requestId 申请ID
     */
    function approveFirstLevel(uint256 requestId) external;
    
    /**
     * @dev 二级审批
     * @param requestId 申请ID
     */
    function approveSecondLevel(uint256 requestId) external;
    
    /**
     * @dev 拒绝申请
     * @param requestId 申请ID
     * @param rejectionReason 拒绝原因
     */
    function rejectRequest(uint256 requestId, string calldata rejectionReason) external;
    
    /**
     * @dev 紧急提款功能
     * @param to 接收地址
     * @param amount 提款金额
     */
    function emergencyWithdraw(address to, uint256 amount) external;
    
    /**
     * @dev 设置请求冷却期
     * @param cooldown 冷却期时间（秒）
     */
    function setRequestCooldown(uint256 cooldown) external;
    
    /**
     * @dev 设置每日限额
     * @param userLimit 用户每日限额
     * @param globalLimit 全局每日限额
     */
    function setDailyLimits(uint256 userLimit, uint256 globalLimit) external;
    
    /**
     * @dev 设置请求过期时间
     * @param expiryTime 过期时间（秒）
     */
    function setRequestExpiryTime(uint256 expiryTime) external;
    
    /**
     * @dev 清理过期请求
     * @param expiredIds 过期请求ID数组
     */
    function cleanupExpiredRequests(uint256[] calldata expiredIds) external;
    
    // ==================== 用户接口 ====================
    
    /**
     * @dev 提交提款申请
     * @param amount 提款金额
     * @param reason 申请原因
     * @param offChainRecordId 链下记录ID
     * @param nonce 防重复随机数
     * @return 申请ID
     */
    function requestWithdrawal(uint256 amount, string calldata reason, uint256 offChainRecordId, uint256 nonce) external returns (uint256);
    
    /**
     * @dev 批量转账小额提现（仅限链下审核人）
     * @param requestIds 提现请求ID数组
     */
    function batchSmallTransfer(uint256[] calldata requestIds) external;
    
    // ==================== 查询接口 ====================
    
    /**
     * @dev 获取提款申请详情
     * @param requestId 申请ID
     * @return 提款申请结构体
     */
    function getWithdrawalRequest(uint256 requestId) external view returns (WithdrawalRequest memory);
    
    /**
     * @dev 获取用户的申请列表
     * @param user 用户地址
     * @return 申请ID数组
     */
    function getUserRequests(address user) external view returns (uint256[] memory);
    
    /**
     * @dev 获取池子余额
     * @return 余额
     */
    function getPoolBalance() external view returns (uint256);
    
    /**
     * @dev 批量查询申请状态
     * @param requestIds 申请ID数组
     * @return 状态数组
     */
    function getRequestsStatus(uint256[] calldata requestIds) 
        external view returns (WithdrawalStatus[] memory);
    
    /**
     * @dev 获取待审批的申请数量
     * @return 待审批数量
     */
    function getPendingRequestsCount() external view returns (uint256);
    
    /**
     * @dev 获取代币合约地址
     * @return 代币合约地址
     */
    function getToken() external view returns (address);
    
    /**
     * @dev 获取小额阈值
     * @return 小额阈值
     */
    function smallAmountThreshold() external view returns (uint256);
    
    /**
     * @dev 获取中额阈值
     * @return 中额阈值
     */
    function mediumAmountThreshold() external view returns (uint256);
    
    /**
     * @dev 检查是否为一级审批人
     * @param approver 地址
     * @return 是否为一级审批人
     */
    function firstLevelApprovers(address approver) external view returns (bool);
    
    /**
     * @dev 检查是否为二级审批人
     * @param approver 地址
     * @return 是否为二级审批人
     */
    function secondLevelApprovers(address approver) external view returns (bool);
    
    /**
     * @dev 获取下一个申请ID
     * @return 下一个申请ID
     */
    function nextRequestId() external view returns (uint256);
    
    /**
     * @dev 获取总提取数量
     * @return 总提取数量
     */
    function totalWithdrawn() external view returns (uint256);
    
    /**
     * @dev 获取总申请数量
     * @return 总申请数量
     */
    function totalRequests() external view returns (uint256);
    
    /**
     * @dev 批量获取请求信息
     * @param requestIds 请求ID数组
     * @return 请求信息数组
     */
    function getBatchRequestInfo(uint256[] calldata requestIds) external view returns (WithdrawalRequest[] memory);
    
    /**
     * @dev 通过链下ID查询请求
     * @param offChainId 链下ID
     * @return 请求信息
     */
    function getRequestByOffChainId(uint256 offChainId) external view returns (WithdrawalRequest memory);
    
    /**
     * @dev 批量验证链下ID
     * @param offChainIds 链下ID数组
     * @return valid 有效性数组
     * @return onChainIds 对应的链上ID数组
     */
    function validateOffChainIds(uint256[] calldata offChainIds) external view returns (bool[] memory valid, uint256[] memory onChainIds);
    
    /**
     * @dev 获取用户今日已提现金额
     * @param user 用户地址
     * @return 今日已提现金额
     */
    function getUserDailyWithdrawn(address user) external view returns (uint256);
    
    /**
     * @dev 获取今日全局已提现金额
     * @return 今日全局已提现金额
     */
    function getTodayGlobalWithdrawn() external view returns (uint256);
    
    /**
     * @dev 获取用户剩余每日限额
     * @param user 用户地址
     * @return 剩余每日限额
     */
    function getUserRemainingDailyLimit(address user) external view returns (uint256);
    
    /**
     * @dev 获取全局剩余每日限额
     * @return 全局剩余每日限额
     */
    function getGlobalRemainingDailyLimit() external view returns (uint256);
    
    /**
     * @dev 检查请求是否过期
     * @param requestId 请求ID
     * @return 是否过期
     */
    function isRequestExpired(uint256 requestId) external view returns (bool);
    
    /**
     * @dev 获取用户下次可请求时间
     * @param user 用户地址
     * @return 下次可请求时间戳
     */
    function getUserNextRequestTime(address user) external view returns (uint256);
    
    // ==================== 事件定义 ====================
    
    /**
     * @dev 提款申请提交事件
     * @param requestId 申请ID
     * @param beneficiary 受益人地址
     * @param amount 申请金额
     * @param level 审批级别
     */
    event WithdrawalRequested(uint256 indexed requestId, address indexed beneficiary, uint256 amount, ApprovalLevel level);
    
    /**
     * @dev 提款申请审批事件
     * @param requestId 申请ID
     * @param approver 审批人地址
     * @param approvalLevel 审批级别
     */
    event WithdrawalApproved(uint256 indexed requestId, address indexed approver, uint8 approvalLevel);
    
    /**
     * @dev 提款申请拒绝事件
     * @param requestId 申请ID
     * @param rejector 拒绝人地址
     * @param reason 拒绝原因
     */
    event WithdrawalRejected(uint256 indexed requestId, address indexed rejector, string reason);
    
    /**
     * @dev 提款执行事件
     * @param requestId 申请ID
     * @param beneficiary 受益人地址
     * @param amount 提款金额
     */
    event WithdrawalExecuted(uint256 indexed requestId, address indexed beneficiary, uint256 amount);
    
    /**
     * @dev 阈值更新事件
     * @param smallThreshold 小额阈值
     * @param mediumThreshold 中额阈值
     */
    event ThresholdUpdated(uint256 smallThreshold, uint256 mediumThreshold);
    
    /**
     * @dev 审批人添加事件
     * @param approver 审批人地址
     * @param level 审批级别
     */
    event ApproverAdded(address indexed approver, uint8 level);
    
    /**
     * @dev 审批人移除事件
     * @param approver 审批人地址
     * @param level 审批级别
     */
    event ApproverRemoved(address indexed approver, uint8 level);
    
    /**
     * @dev 链下审核人添加事件
     * @param auditor 审核人地址
     */
    event OffChainAuditorAdded(address indexed auditor);
    
    /**
     * @dev 链下审核人移除事件
     * @param auditor 审核人地址
     */
    event OffChainAuditorRemoved(address indexed auditor);
    
    /**
     * @dev 提现限制更新事件
     * @param minAmount 最小提现金额
     * @param maxAmount 最大提现金额
     */
    event WithdrawalLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    
    /**
     * @dev 批量转账事件
     * @param auditor 执行人
     * @param totalAmount 总金额
     * @param count 转账数量
     */
    event BatchSmallTransfer(address indexed auditor, uint256 totalAmount, uint256 count);
    
    /**
     * @dev ID映射创建事件
     * @param onChainId 链上ID
     * @param offChainId 链下ID
     * @param requestHash 请求哈希
     */
    event IdMappingCreated(uint256 indexed onChainId, uint256 indexed offChainId, bytes32 requestHash);
    
    /**
     * @dev 请求冷却期更新事件
     * @param cooldown 新的冷却期时间
     */
    event RequestCooldownUpdated(uint256 cooldown);
    
    /**
     * @dev 每日限额更新事件
     * @param userLimit 用户每日限额
     * @param globalLimit 全局每日限额
     */
    event DailyLimitsUpdated(uint256 userLimit, uint256 globalLimit);
    
    /**
     * @dev 请求过期时间更新事件
     * @param expiryTime 新的过期时间
     */
    event RequestExpiryTimeUpdated(uint256 expiryTime);
    
    /**
     * @dev 过期请求清理事件
     * @param cleaner 清理执行人
     * @param cleanedCount 清理数量
     */
    event ExpiredRequestsCleaned(address indexed cleaner, uint256 cleanedCount);

    /**
     * @dev 代币合约更新事件
     * @param token 新的代币合约地址
     */
    event TokenUpdated(address indexed token);

    /**
     * @dev Vesting合约更新事件
     * @param vestingContract 新的Vesting合约地址
     */
    event VestingContractUpdated(address indexed vestingContract);

    /**
     * @dev 挖矿Vesting计划ID更新事件
     * @param scheduleId 新的计划ID
     */
    event MiningVestingScheduleIdUpdated(bytes32 indexed scheduleId);
}