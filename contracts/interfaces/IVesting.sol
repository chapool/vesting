// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IVesting
 * @dev Vesting 合约接口定义
 * 定义了代币释放管理的核心功能接口
 */
interface IVesting {
    
    // ==================== 枚举定义 ====================
    
    /**
     * @dev 分配类型枚举
     */
    enum AllocationCategory {
        MINING,        // 挖矿奖励
        ECOSYSTEM,     // 运营与生态发展
        TEAM,          // 团队和顾问
        CORNERSTONE    // 基石轮投资
    }
    
    /**
     * @dev 释放类型枚举
     */
    enum VestingType {
        LINEAR,        // 线性释放
        MILESTONE,     // 分期释放
        CLIFF_LINEAR   // Cliff + 线性
    }
    
    // ==================== 结构体定义 ====================
    
    /**
     * @dev Vesting 计划结构体
     */
    struct VestingSchedule {
        bool initialized;           // 是否已初始化
        address beneficiary;        // 受益人地址
        uint256 cliff;             // 悬崖期时长（秒）
        uint256 start;             // 开始时间戳
        uint256 duration;          // 总释放周期（秒）
        uint256 slicePeriodSeconds; // 释放间隔（秒）
        bool revocable;            // 是否可撤销
        uint256 amountTotal;       // 总代币数量
        uint256 released;          // 已释放数量
        bool revoked;              // 是否已撤销
        AllocationCategory category; // 分配类型标识
        VestingType vestingType;   // 释放类型
    }
    
    // ==================== 管理接口 ====================
    
    /**
     * @dev 创建 Vesting 计划
     * @param beneficiary 受益人地址
     * @param start 开始时间戳
     * @param cliff 悬崖期时长（秒）
     * @param duration 总释放周期（秒）
     * @param slicePeriodSeconds 释放间隔（秒）
     * @param revocable 是否可撤销
     * @param amount 总代币数量
     * @param category 分配类型
     * @param vestingType 释放类型
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 start,
        uint256 cliff,
        uint256 duration,
        uint256 slicePeriodSeconds,
        bool revocable,
        uint256 amount,
        AllocationCategory category,
        VestingType vestingType
    ) external;
    
    /**
     * @dev 撤销 Vesting 计划
     * @param vestingScheduleId 计划ID
     */
    function revoke(bytes32 vestingScheduleId) external;
    
    /**
     * @dev Owner 代为释放用户的可用代币（无需用户授权）
     * @param vestingScheduleId 计划ID
     * @param amount 释放数量
     */
    function releaseForBeneficiary(bytes32 vestingScheduleId, uint256 amount) external;
    
    /**
     * @dev 批量代为释放代币
     * @param vestingScheduleIds 计划ID数组
     * @param amounts 对应的释放数量数组
     */
    function batchReleaseForBeneficiaries(
        bytes32[] calldata vestingScheduleIds, 
        uint256[] calldata amounts
    ) external;
    
    // ==================== 用户接口 ====================
    
    /**
     * @dev 用户释放自己的代币
     * @param vestingScheduleId 计划ID
     * @param amount 释放数量
     */
    function release(bytes32 vestingScheduleId, uint256 amount) external;
    
    // ==================== 查询接口 ====================
    
    /**
     * @dev 计算可释放金额
     * @param vestingScheduleId 计划ID
     * @return 可释放金额
     */
    function computeReleasableAmount(bytes32 vestingScheduleId) external view returns (uint256);
    
    /**
     * @dev 获取 Vesting 计划详情
     * @param vestingScheduleId 计划ID
     * @return Vesting 计划结构体
     */
    function getVestingSchedule(bytes32 vestingScheduleId) external view returns (VestingSchedule memory);
    
    /**
     * @dev 获取受益人的计划数量
     * @param beneficiary 受益人地址
     * @return 计划数量
     */
    function getVestingSchedulesCountByBeneficiary(address beneficiary) external view returns (uint256);
    
    /**
     * @dev 根据索引获取受益人的计划ID
     * @param beneficiary 受益人地址
     * @param index 索引
     * @return 计划ID
     */
    function getVestingIdAtIndex(address beneficiary, uint256 index) external view returns (bytes32);
    
    /**
     * @dev 获取总锁定代币数量
     * @return 总锁定代币数量
     */
    function getVestingSchedulesTotalAmount() external view returns (uint256);
    
    /**
     * @dev 获取总已释放代币数量
     * @return 总已释放代币数量
     */
    function getVestingSchedulesReleasedAmount() external view returns (uint256);
    
    /**
     * @dev 获取所有计划ID
     * @return 计划ID数组
     */
    function getVestingSchedulesIds() external view returns (bytes32[] memory);
    
    /**
     * @dev 获取代币合约地址
     * @return 代币合约地址
     */
    function getToken() external view returns (address);
    
    /**
     * @dev 按分配类型统计代币数量
     * @param category 分配类型
     * @return totalAmount 总分配数量
     * @return releasedAmount 已释放数量
     */
    function getAmountByCategory(AllocationCategory category) 
        external view returns (uint256 totalAmount, uint256 releasedAmount);
    
    /**
     * @dev 计算指定地址和索引的计划ID
     * @param holder 持有者地址
     * @param index 索引
     * @return 计划ID
     */
    function computeVestingScheduleIdForAddressAndIndex(address holder, uint256 index)
        external pure returns (bytes32);
    
    // ==================== 前端展示接口 ====================
    
    /**
     * @dev 受益人汇总信息结构体
     */
    struct BeneficiarySummary {
        uint256 totalAmount;        // 总分配数量
        uint256 releasedAmount;     // 已释放数量
        uint256 releasableAmount;   // 当前可释放数量
        uint256 lockedAmount;       // 仍锁定数量
        uint256 scheduleCount;      // 计划数量
    }
    
    /**
     * @dev 计划进度信息结构体
     */
    struct VestingProgress {
        uint256 totalAmount;        // 总数量
        uint256 releasedAmount;     // 已释放数量
        uint256 releasableAmount;   // 可释放数量
        uint256 lockedAmount;       // 锁定数量
        uint256 progressPercent;    // 进度百分比(0-10000，代表0%-100%，精确到0.01%)
        uint256 timeProgress;       // 时间进度百分比(0-10000)
        uint256 remainingTime;      // 剩余时间(秒)
        bool isActive;              // 是否活跃(未撤销且未完全释放)
    }
    
    /**
     * @dev 按类别分组的计划信息结构体
     */
    struct CategorySchedules {
        AllocationCategory category;
        bytes32[] scheduleIds;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 releasableAmount;
    }
    
    /**
     * @dev 获取受益人的所有vesting计划详情
     * @param beneficiary 受益人地址
     * @return 计划详情数组
     */
    function getBeneficiaryVestingSchedules(address beneficiary) 
        external view returns (VestingSchedule[] memory);
    
    /**
     * @dev 获取受益人的汇总信息
     * @param beneficiary 受益人地址
     * @return 汇总信息结构体
     */
    function getBeneficiaryVestingSummary(address beneficiary)
        external view returns (BeneficiarySummary memory);
    
    /**
     * @dev 获取vesting计划的进度信息
     * @param vestingScheduleId 计划ID
     * @return 进度信息结构体
     */
    function getVestingProgress(bytes32 vestingScheduleId)
        external view returns (VestingProgress memory);
    
    /**
     * @dev 获取受益人按类别分组的计划信息
     * @param beneficiary 受益人地址
     * @return 按类别分组的计划信息数组
     */
    function getBeneficiarySchedulesByCategory(address beneficiary)
        external view returns (CategorySchedules[] memory);
    
    // ==================== 事件定义 ====================
    
    /**
     * @dev Vesting 计划创建事件
     * @param vestingScheduleId 计划ID
     * @param beneficiary 受益人地址
     * @param amount 代币数量
     */
    event VestingScheduleCreated(bytes32 indexed vestingScheduleId, address indexed beneficiary, uint256 amount);
    
    /**
     * @dev 带分配类型的 Vesting 计划创建事件
     * @param vestingScheduleId 计划ID
     * @param beneficiary 受益人地址
     * @param amount 代币数量
     * @param category 分配类型
     */
    event VestingScheduleCreatedWithCategory(
        bytes32 indexed vestingScheduleId, 
        address indexed beneficiary, 
        uint256 amount, 
        AllocationCategory category
    );
    
    /**
     * @dev 代币释放事件
     * @param vestingScheduleId 计划ID
     * @param beneficiary 受益人地址
     * @param amount 释放数量
     */
    event TokensReleased(bytes32 indexed vestingScheduleId, address indexed beneficiary, uint256 amount);
    
    /**
     * @dev Vesting 计划撤销事件
     * @param vestingScheduleId 计划ID
     * @param beneficiary 受益人地址
     * @param unreleased 未释放数量
     */
    event VestingScheduleRevoked(bytes32 indexed vestingScheduleId, address indexed beneficiary, uint256 unreleased);
    
    /**
     * @dev Owner 代理释放事件
     * @param vestingScheduleId 计划ID
     * @param beneficiary 受益人地址
     * @param amount 释放数量
     */
    event TokensReleasedByOwner(bytes32 indexed vestingScheduleId, address indexed beneficiary, uint256 amount);
    
    /**
     * @dev 批量代理释放事件
     * @param vestingScheduleIds 计划ID数组
     * @param totalAmount 总释放数量
     */
    event BatchTokensReleasedByOwner(bytes32[] vestingScheduleIds, uint256 totalAmount);
    
    /**
     * @dev 代币合约设置事件
     * @param token 代币合约地址
     */
    event TokenSet(address indexed token);
}