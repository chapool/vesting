// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IMiningPool.sol";
import "./Constants.sol";
import "./interfaces/IVesting.sol";

/**
 * @title MiningPool
 * @dev MiningPool 合约管理 HZ Token 的挖矿奖励分发，采用分级授权机制
 * 支持不同额度的提币请求通过不同层级的审批流程
 */
contract MiningPool is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, Constants, IMiningPool {
    using SafeERC20 for IERC20;

    // ==================== 状态变量 ====================
    
    // ERC20 代币合约
    IERC20 private _token;
    
    // Vesting 合约
    IVesting private _vestingContract;
    
    // MiningPool 在 Vesting 合约中的计划ID
    bytes32 private _miningVestingScheduleId;
    
    // 审批阈值配置
    uint256 public smallAmountThreshold;   // 小额阈值（自动批准）
    uint256 public mediumAmountThreshold;  // 中额阈值（需要一级审批）
    
    // 审批人员配置
    mapping(address => bool) public firstLevelApprovers;   // 一级审批人
    mapping(address => bool) public secondLevelApprovers;  // 二级审批人
    mapping(address => bool) public offChainAuditors;     // 链下审核人
    
    // 最小和最大提现金额限制
    uint256 public minWithdrawAmount;
    uint256 public maxWithdrawAmount;
    
    // 分层ID系统
    struct IdManager {
        uint256 nextOnChainId;
        mapping(uint256 => uint256) offChainToOnChain;  // 链下ID -> 链上ID
        mapping(uint256 => uint256) onChainToOffChain;  // 链上ID -> 链下ID
        mapping(uint256 => bool) offChainIdExists;      // 链下ID是否已使用
        mapping(bytes32 => bool) requestHashExists;     // 请求哈希是否存在（防重复）
    }
    
    IdManager private idManager;
    
    // 冷却期机制
    mapping(address => uint256) public lastRequestTime;  // 用户最后请求时间
    uint256 public requestCooldown = DEFAULT_REQUEST_COOLDOWN;           // 请求冷却期
    
    // 每日限额机制
    mapping(address => mapping(uint256 => uint256)) public dailyUserWithdrawn;  // 用户每日已提现
    mapping(uint256 => uint256) public dailyGlobalWithdrawn;                   // 全局每日已提现
    uint256 public dailyUserLimit = DEFAULT_DAILY_USER_LIMIT;                          // 用户每日限额
    uint256 public dailyGlobalLimit = DEFAULT_DAILY_GLOBAL_LIMIT;                     // 全局每日限额
    
    // 请求过期时间
    uint256 public requestExpiryTime = DEFAULT_REQUEST_EXPIRY;
    
    // 提款申请存储
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    uint256 public nextRequestId;
    
    // 用户申请记录
    mapping(address => uint256[]) public userRequests;
    
    // 统计数据
    uint256 public totalWithdrawn;
    uint256 public totalRequests;
    uint256 public totalReleasedMiningTokens;   // 已释放的挖矿代币总数
    uint256 public totalSmallWithdrawals;       // 小额提现总数
    uint256 public totalMediumWithdrawals;      // 中额提现总数
    uint256 public totalLargeWithdrawals;       // 大额提现总数
    
    // 版本控制（用于可升级合约）
    uint256[50] private __gap;

    // ==================== 修饰符 ====================
    
    /**
     * @dev 确保代币合约已设置
     */
    modifier onlyWhenTokenSet() {
        require(address(_token) != address(0), "MiningPool: token not set");
        _;
    }

    /**
     * @dev 确保Vesting合约已设置
     */
    modifier onlyWhenVestingSet() {
        require(address(_vestingContract) != address(0), "MiningPool: vesting contract not set");
        _;
    }

    /**
     * @dev 确保挖矿Vesting计划ID已设置
     */
    modifier onlyWhenScheduleIdSet() {
        require(_miningVestingScheduleId != bytes32(0), "MiningPool: mining vesting schedule ID not set");
        _;
    }

    /**
     * @dev 确保所有关键组件已设置
     */
    modifier onlyWhenFullyConfigured() {
        require(address(_token) != address(0), "MiningPool: token not set");
        require(address(_vestingContract) != address(0), "MiningPool: vesting contract not set");
        require(_miningVestingScheduleId != bytes32(0), "MiningPool: mining vesting schedule ID not set");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数 - 简化版本，关键参数可后续设置
     */
    function initialize() public initializer {
        __Ownable_init(_msgSender());
        __ReentrancyGuard_init();
        
        // 使用Constants中的默认阈值
        smallAmountThreshold = MINING_POOL_SMALL_THRESHOLD;
        mediumAmountThreshold = MINING_POOL_MEDIUM_THRESHOLD;
        
        // 设置默认最小和最大提现金额
        minWithdrawAmount = DEFAULT_MIN_WITHDRAW; // 最小1个代币
        maxWithdrawAmount = DEFAULT_MAX_WITHDRAW; // 最大100万代币
        
        // 初始化ID管理器
        idManager.nextOnChainId = 1;
        nextRequestId = 1;
    }

    // ==================== 管理接口实现 ====================

    /**
     * @dev 设置代币合约地址
     */
    function setToken(address token_) external onlyOwner {
        require(token_ != address(0), "MiningPool: token address cannot be zero");
        _token = IERC20(token_);
        emit TokenUpdated(token_);
    }

    /**
     * @dev 设置Vesting合约地址
     */
    function setVestingContract(address vestingContract_) external onlyOwner {
        require(vestingContract_ != address(0), "MiningPool: vesting address cannot be zero");
        _vestingContract = IVesting(vestingContract_);
        emit VestingContractUpdated(vestingContract_);
    }

    /**
     * @dev 设置挖矿Vesting计划ID
     */
    function setMiningVestingScheduleId(bytes32 miningVestingScheduleId_) external onlyOwner {
        _miningVestingScheduleId = miningVestingScheduleId_;
        emit MiningVestingScheduleIdUpdated(miningVestingScheduleId_);
    }

    /**
     * @dev 获取代币合约地址
     */
    function getToken() external view returns (address) {
        return address(_token);
    }

    /**
     * @dev 获取Vesting合约地址
     */
    function getVestingContract() external view returns (address) {
        return address(_vestingContract);
    }

    /**
     * @dev 获取挖矿Vesting计划ID
     */
    function getMiningVestingScheduleId() external view returns (bytes32) {
        return _miningVestingScheduleId;
    }

    /**
     * @dev 设置审批阈值
     */
    function setThresholds(uint256 smallThreshold_, uint256 mediumThreshold_) 
        external onlyOwner {
        require(mediumThreshold_ > smallThreshold_, "MiningPool: invalid thresholds");
        
        smallAmountThreshold = smallThreshold_;
        mediumAmountThreshold = mediumThreshold_;
        
        emit ThresholdUpdated(smallThreshold_, mediumThreshold_);
    }

    /**
     * @dev 添加一级审批人
     */
    function addFirstLevelApprover(address approver) external onlyOwner {
        require(approver != address(0), "MiningPool: invalid approver address");
        require(!firstLevelApprovers[approver], "MiningPool: already first level approver");
        
        firstLevelApprovers[approver] = true;
        emit ApproverAdded(approver, 1);
    }

    /**
     * @dev 移除一级审批人
     */
    function removeFirstLevelApprover(address approver) external onlyOwner {
        require(firstLevelApprovers[approver], "MiningPool: not first level approver");
        
        firstLevelApprovers[approver] = false;
        emit ApproverRemoved(approver, 1);
    }

    /**
     * @dev 添加二级审批人
     */
    function addSecondLevelApprover(address approver) external onlyOwner {
        require(approver != address(0), "MiningPool: invalid approver address");
        require(!secondLevelApprovers[approver], "MiningPool: already second level approver");
        
        secondLevelApprovers[approver] = true;
        emit ApproverAdded(approver, 2);
    }

    /**
     * @dev 移除二级审批人
     */
    function removeSecondLevelApprover(address approver) external onlyOwner {
        require(secondLevelApprovers[approver], "MiningPool: not second level approver");
        
        secondLevelApprovers[approver] = false;
        emit ApproverRemoved(approver, 2);
    }

    /**
     * @dev 添加链下审核人
     */
    function addOffChainAuditor(address auditor) external onlyOwner {
        require(auditor != address(0), "MiningPool: invalid auditor address");
        require(!offChainAuditors[auditor], "MiningPool: already off-chain auditor");
        
        offChainAuditors[auditor] = true;
        emit OffChainAuditorAdded(auditor);
    }

    /**
     * @dev 移除链下审核人
     */
    function removeOffChainAuditor(address auditor) external onlyOwner {
        require(offChainAuditors[auditor], "MiningPool: not off-chain auditor");
        
        offChainAuditors[auditor] = false;
        emit OffChainAuditorRemoved(auditor);
    }

    /**
     * @dev 设置提现金额限制
     */
    function setWithdrawalLimits(uint256 minAmount, uint256 maxAmount) external onlyOwner {
        require(minAmount > 0, "MiningPool: min amount must be greater than 0");
        require(maxAmount >= minAmount, "MiningPool: max amount must be >= min amount");
        
        minWithdrawAmount = minAmount;
        maxWithdrawAmount = maxAmount;
        
        emit WithdrawalLimitsUpdated(minAmount, maxAmount);
    }

    /**
     * @dev 设置请求冷却期
     */
    function setRequestCooldown(uint256 cooldown) external onlyOwner {
        require(cooldown <= MAX_COOLDOWN_PERIOD, "MiningPool: cooldown too long");
        requestCooldown = cooldown;
        emit RequestCooldownUpdated(cooldown);
    }

    /**
     * @dev 设置每日限额
     */
    function setDailyLimits(uint256 userLimit, uint256 globalLimit) external onlyOwner {
        require(globalLimit >= userLimit, "MiningPool: global limit must be >= user limit");
        dailyUserLimit = userLimit;
        dailyGlobalLimit = globalLimit;
        emit DailyLimitsUpdated(userLimit, globalLimit);
    }

    /**
     * @dev 设置请求过期时间
     */
    function setRequestExpiryTime(uint256 expiryTime) external onlyOwner {
        require(expiryTime >= MIN_EXPIRY_TIME && expiryTime <= MAX_EXPIRY_TIME, "MiningPool: invalid expiry time");
        requestExpiryTime = expiryTime;
        emit RequestExpiryTimeUpdated(expiryTime);
    }

    /**
     * @dev 一级审批
     */
    function approveFirstLevel(uint256 requestId) external {
        require(firstLevelApprovers[_msgSender()], "MiningPool: not authorized first level approver");
        
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.status == WithdrawalStatus.PENDING, "MiningPool: request not pending");
        require(request.level == ApprovalLevel.MEDIUM || request.level == ApprovalLevel.LARGE, 
                "MiningPool: invalid approval level");
        
        request.approver1 = _msgSender();
        
        emit WithdrawalApproved(requestId, _msgSender(), 1);
        
        // 如果是中额且已获得一级审批，执行提款
        if (request.level == ApprovalLevel.MEDIUM) {
            _executeWithdrawal(requestId);
        }
    }

    /**
     * @dev 二级审批
     */
    function approveSecondLevel(uint256 requestId) external {
        require(secondLevelApprovers[_msgSender()], "MiningPool: not authorized second level approver");
        
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.status == WithdrawalStatus.PENDING, "MiningPool: request not pending");
        require(request.level == ApprovalLevel.LARGE, "MiningPool: not large amount request");
        require(request.approver1 != address(0), "MiningPool: first level approval required");
        
        request.approver2 = _msgSender();
        
        emit WithdrawalApproved(requestId, _msgSender(), 2);
        
        // 大额申请获得二级审批后执行
        _executeWithdrawal(requestId);
    }

    /**
     * @dev 拒绝申请
     */
    function rejectRequest(uint256 requestId, string calldata rejectionReason) external {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.status == WithdrawalStatus.PENDING, "MiningPool: request not pending");
        
        bool canReject = false;
        
        // 检查拒绝权限
        if (request.level == ApprovalLevel.MEDIUM || request.level == ApprovalLevel.LARGE) {
            canReject = firstLevelApprovers[_msgSender()];
        }
        if (request.level == ApprovalLevel.LARGE) {
            canReject = canReject || secondLevelApprovers[_msgSender()];
        }
        
        require(canReject || _msgSender() == owner(), "MiningPool: not authorized to reject");
        
        request.status = WithdrawalStatus.REJECTED;
        
        emit WithdrawalRejected(requestId, _msgSender(), rejectionReason);
    }

    /**
     * @dev 清理过期请求
     */
    function cleanupExpiredRequests(uint256[] calldata expiredIds) external {
        require(expiredIds.length > 0, "MiningPool: empty expired ids");
        
        uint256 currentTime = block.timestamp;
        uint256 cleanedCount = 0;
        
        for (uint256 i = 0; i < expiredIds.length; i++) {
            WithdrawalRequest storage request = withdrawalRequests[expiredIds[i]];
            
            if (request.id != 0 && 
                request.status == WithdrawalStatus.PENDING && 
                currentTime > request.timestamp + requestExpiryTime) {
                
                request.status = WithdrawalStatus.REJECTED;
                cleanedCount++;
                
                emit WithdrawalRejected(expiredIds[i], address(0), "Request expired");
            }
        }
        
        emit ExpiredRequestsCleaned(_msgSender(), cleanedCount);
    }

    /**
     * @dev 批量转账小额提现（仅限链下审核人）
     */
    function batchSmallTransfer(uint256[] calldata requestIds) external nonReentrant onlyWhenFullyConfigured {
        require(offChainAuditors[_msgSender()], "MiningPool: not authorized off-chain auditor");
        require(requestIds.length > 0, "MiningPool: empty request ids");
        
        uint256 totalAmount = 0;
        
        // 验证所有请求并计算总金额
        for (uint256 i = 0; i < requestIds.length; i++) {
            WithdrawalRequest storage request = withdrawalRequests[requestIds[i]];
            require(request.id != 0, "MiningPool: request not found");
            require(request.status == WithdrawalStatus.PENDING, "MiningPool: request not pending");
            require(request.level == ApprovalLevel.SMALL, "MiningPool: not small amount request");
            require(request.amount >= minWithdrawAmount && request.amount <= maxWithdrawAmount, 
                    "MiningPool: amount out of limits");
            
            totalAmount += request.amount;
        }
        
        // 检查 Vesting 中的可释放金额
        uint256 releasableAmount = _vestingContract.computeReleasableAmount(_miningVestingScheduleId);
        require(totalAmount <= releasableAmount, "MiningPool: insufficient releasable amount from vesting");
        
        // 从 Vesting 合约中释放代币到 MiningPool 合约
        _vestingContract.releaseForBeneficiary(_miningVestingScheduleId, totalAmount);
        
        // 批量转账并更新请求状态
        for (uint256 i = 0; i < requestIds.length; i++) {
            WithdrawalRequest storage request = withdrawalRequests[requestIds[i]];
            
            // 转账给受益人
            _token.safeTransfer(request.beneficiary, request.amount);
            
            // 更新请求状态
            request.status = WithdrawalStatus.EXECUTED;
            request.approvedAt = block.timestamp;
            
            emit WithdrawalExecuted(requestIds[i], request.beneficiary, request.amount);
        }
        
        // 更新统计数据
        totalWithdrawn += totalAmount;
        totalSmallWithdrawals += totalAmount;
        totalReleasedMiningTokens += totalAmount;
        
        emit BatchSmallTransfer(_msgSender(), totalAmount, requestIds.length);
    }

    /**
     * @dev 紧急提款功能（从 Vesting 释放）
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner nonReentrant onlyWhenFullyConfigured {
        require(to != address(0), "MiningPool: invalid recipient");
        
        // 检查 Vesting 中的可释放金额
        uint256 releasableAmount = _vestingContract.computeReleasableAmount(_miningVestingScheduleId);
        require(amount <= releasableAmount, "MiningPool: insufficient releasable amount");
        
        // 从 Vesting 释放到 MiningPool
        _vestingContract.releaseForBeneficiary(_miningVestingScheduleId, amount);
        
        // 转给指定地址
        _token.safeTransfer(to, amount);
    }

    // ==================== 用户接口实现 ====================

    /**
     * @dev 提交提款申请
     */
    function requestWithdrawal(
        uint256 amount, 
        string calldata reason, 
        uint256 offChainRecordId,
        uint256 nonce
    ) external nonReentrant onlyWhenFullyConfigured returns (uint256) {
        address user = _msgSender();
        
        // 冷却期检查
        require(block.timestamp >= lastRequestTime[user] + requestCooldown, 
                "MiningPool: request cooldown period not met");
        
        // 金额限制检查
        require(amount >= minWithdrawAmount && amount <= maxWithdrawAmount, 
                "MiningPool: amount out of limits");
        
        // 每日限额检查
        uint256 todayKey = _getTodayKey();
        require(dailyUserWithdrawn[user][todayKey] + amount <= dailyUserLimit,
                "MiningPool: exceeds daily user limit");
        require(dailyGlobalWithdrawn[todayKey] + amount <= dailyGlobalLimit,
                "MiningPool: exceeds daily global limit");
        
        // 防重复提交检查
        bytes32 requestHash = _generateRequestHash(user, amount, offChainRecordId, nonce);
        require(!idManager.requestHashExists[requestHash], "MiningPool: duplicate request");
        
        // 链下ID唯一性检查
        require(!idManager.offChainIdExists[offChainRecordId], "MiningPool: off-chain ID already used");
        
        // 检查 Vesting 合约中的可释放金额
        uint256 releasableAmount = _vestingContract.computeReleasableAmount(_miningVestingScheduleId);
        require(amount <= releasableAmount, "MiningPool: insufficient releasable amount from vesting");
        
        // 生成链上ID
        uint256 onChainId = idManager.nextOnChainId++;
        
        // 建立ID映射
        idManager.offChainToOnChain[offChainRecordId] = onChainId;
        idManager.onChainToOffChain[onChainId] = offChainRecordId;
        idManager.offChainIdExists[offChainRecordId] = true;
        idManager.requestHashExists[requestHash] = true;
        
        // 确定审批级别
        ApprovalLevel level = _determineApprovalLevel(amount);
        
        // 创建提款申请
        WithdrawalRequest storage request = withdrawalRequests[onChainId];
        request.id = onChainId;
        request.beneficiary = user;
        request.amount = amount;
        request.level = level;
        request.status = WithdrawalStatus.PENDING;
        request.timestamp = block.timestamp;
        request.reason = reason;
        request.offChainRecordId = offChainRecordId;
        
        // 更新用户记录
        userRequests[user].push(onChainId);
        lastRequestTime[user] = block.timestamp;
        totalRequests++;
        
        // 更新每日统计（预扣，执行时不再检查）
        dailyUserWithdrawn[user][todayKey] += amount;
        dailyGlobalWithdrawn[todayKey] += amount;
        
        emit WithdrawalRequested(onChainId, user, amount, level);
        emit IdMappingCreated(onChainId, offChainRecordId, requestHash);
        
        return onChainId;
    }

    // ==================== 查询接口实现 ====================

    /**
     * @dev 获取提款申请详情
     */
    function getWithdrawalRequest(uint256 requestId) 
        external view returns (WithdrawalRequest memory) {
        return withdrawalRequests[requestId];
    }

    /**
     * @dev 获取用户的申请列表
     */
    function getUserRequests(address user) external view returns (uint256[] memory) {
        return userRequests[user];
    }

    /**
     * @dev 获取池子余额（从 Vesting 合约中的可释放金额）
     */
    function getPoolBalance() external view onlyWhenVestingSet onlyWhenScheduleIdSet returns (uint256) {
        return _vestingContract.computeReleasableAmount(_miningVestingScheduleId);
    }

    /**
     * @dev 批量查询申请状态
     */
    function getRequestsStatus(uint256[] calldata requestIds) 
        external view returns (WithdrawalStatus[] memory) {
        WithdrawalStatus[] memory statuses = new WithdrawalStatus[](requestIds.length);
        
        for (uint256 i = 0; i < requestIds.length; i++) {
            statuses[i] = withdrawalRequests[requestIds[i]].status;
        }
        
        return statuses;
    }

    /**
     * @dev 获取待审批的申请数量
     */
    function getPendingRequestsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextRequestId; i++) {
            if (withdrawalRequests[i].status == WithdrawalStatus.PENDING) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev 获取代币合约地址
     */
    function getToken() external view returns (address) {
        return address(_token);
    }
    
    /**
     * @dev 获取 Vesting 合约地址
     */
    function getVestingContract() external view returns (address) {
        return address(_vestingContract);
    }
    
    /**
     * @dev 获取 MiningPool 在 Vesting 中的计划ID
     */
    function getMiningVestingScheduleId() external view returns (bytes32) {
        return _miningVestingScheduleId;
    }
    
    /**
     * @dev 获取 Vesting 计划的详细信息
     */
    function getVestingScheduleInfo() external view onlyWhenVestingSet onlyWhenScheduleIdSet returns (IVesting.VestingSchedule memory) {
        return _vestingContract.getVestingSchedule(_miningVestingScheduleId);
    }

    /**
     * @dev 获取已释放的挖矿代币总数
     */
    function getTotalReleasedMiningTokens() external view returns (uint256) {
        return totalReleasedMiningTokens;
    }

    /**
     * @dev 获取当前可释放的挖矿代币数量
     */
    function getAvailableReleasableAmount() external view onlyWhenVestingSet onlyWhenScheduleIdSet returns (uint256) {
        return _vestingContract.computeReleasableAmount(_miningVestingScheduleId);
    }

    /**
     * @dev 获取各类提现统计
     */
    function getWithdrawalStatistics() external view returns (
        uint256 small,
        uint256 medium, 
        uint256 large,
        uint256 totalExtracted,
        uint256 totalReleased
    ) {
        return (
            totalSmallWithdrawals,
            totalMediumWithdrawals,
            totalLargeWithdrawals,
            totalWithdrawn,
            totalReleasedMiningTokens
        );
    }

    /**
     * @dev 获取提现金额限制
     */
    function getWithdrawalLimits() external view returns (uint256 min, uint256 max) {
        return (minWithdrawAmount, maxWithdrawAmount);
    }

    /**
     * @dev 检查是否为链下审核人
     */
    function isOffChainAuditor(address auditor) external view returns (bool) {
        return offChainAuditors[auditor];
    }

    /**
     * @dev 批量获取请求信息
     */
    function getBatchRequestInfo(uint256[] calldata requestIds) 
        external view returns (WithdrawalRequest[] memory) {
        WithdrawalRequest[] memory requests = new WithdrawalRequest[](requestIds.length);
        for (uint256 i = 0; i < requestIds.length; i++) {
            requests[i] = withdrawalRequests[requestIds[i]];
        }
        return requests;
    }

    /**
     * @dev 通过链下ID查询请求
     */
    function getRequestByOffChainId(uint256 offChainId) 
        external view returns (WithdrawalRequest memory) {
        uint256 onChainId = idManager.offChainToOnChain[offChainId];
        require(onChainId != 0, "MiningPool: off-chain ID not found");
        return withdrawalRequests[onChainId];
    }

    /**
     * @dev 批量验证链下ID
     */
    function validateOffChainIds(uint256[] calldata offChainIds) 
        external view returns (bool[] memory valid, uint256[] memory onChainIds) {
        valid = new bool[](offChainIds.length);
        onChainIds = new uint256[](offChainIds.length);
        
        for (uint256 i = 0; i < offChainIds.length; i++) {
            onChainIds[i] = idManager.offChainToOnChain[offChainIds[i]];
            valid[i] = onChainIds[i] != 0;
        }
    }

    /**
     * @dev 获取用户今日已提现金额
     */
    function getUserDailyWithdrawn(address user) external view returns (uint256) {
        return dailyUserWithdrawn[user][_getTodayKey()];
    }

    /**
     * @dev 获取今日全局已提现金额
     */
    function getTodayGlobalWithdrawn() external view returns (uint256) {
        return dailyGlobalWithdrawn[_getTodayKey()];
    }

    /**
     * @dev 获取用户剩余每日限额
     */
    function getUserRemainingDailyLimit(address user) external view returns (uint256) {
        uint256 withdrawn = dailyUserWithdrawn[user][_getTodayKey()];
        return withdrawn >= dailyUserLimit ? 0 : dailyUserLimit - withdrawn;
    }

    /**
     * @dev 获取全局剩余每日限额
     */
    function getGlobalRemainingDailyLimit() external view returns (uint256) {
        uint256 withdrawn = dailyGlobalWithdrawn[_getTodayKey()];
        return withdrawn >= dailyGlobalLimit ? 0 : dailyGlobalLimit - withdrawn;
    }

    /**
     * @dev 检查请求是否过期
     */
    function isRequestExpired(uint256 requestId) external view returns (bool) {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        return request.id != 0 && 
               request.status == WithdrawalStatus.PENDING && 
               block.timestamp > request.timestamp + requestExpiryTime;
    }

    /**
     * @dev 获取用户下次可请求时间
     */
    function getUserNextRequestTime(address user) external view returns (uint256) {
        return lastRequestTime[user] + requestCooldown;
    }

    // ==================== 内部函数 ====================

    /**
     * @dev 内部函数：执行提款
     */
    function _executeWithdrawal(uint256 requestId) private {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.status == WithdrawalStatus.PENDING, "MiningPool: request not pending");
        
        // 从 Vesting 合约中释放代币到 MiningPool 合约
        // 注意：MiningPool 应该是 Vesting 计划的受益人
        _vestingContract.releaseForBeneficiary(_miningVestingScheduleId, request.amount);
        
        // 将代币转给实际的申请用户
        _token.safeTransfer(request.beneficiary, request.amount);
        
        request.status = WithdrawalStatus.EXECUTED;
        request.approvedAt = block.timestamp;
        totalWithdrawn += request.amount;
        totalReleasedMiningTokens += request.amount;
        
        // 更新分类统计
        if (request.level == ApprovalLevel.SMALL) {
            totalSmallWithdrawals += request.amount;
        } else if (request.level == ApprovalLevel.MEDIUM) {
            totalMediumWithdrawals += request.amount;
        } else if (request.level == ApprovalLevel.LARGE) {
            totalLargeWithdrawals += request.amount;
        }
        
        emit WithdrawalExecuted(requestId, request.beneficiary, request.amount);
    }

    /**
     * @dev 内部函数：确定审批级别
     */
    function _determineApprovalLevel(uint256 amount) private view returns (ApprovalLevel) {
        if (amount <= smallAmountThreshold) {
            return ApprovalLevel.SMALL;
        } else if (amount <= mediumAmountThreshold) {
            return ApprovalLevel.MEDIUM;
        } else {
            return ApprovalLevel.LARGE;
        }
    }

    /**
     * @dev 内部函数：获取今日key
     */
    function _getTodayKey() private view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY; // 以天为单位
    }

    /**
     * @dev 内部函数：生成请求哈希
     */
    function _generateRequestHash(
        address user,
        uint256 amount,
        uint256 offChainId,
        uint256 nonce
    ) private view returns (bytes32) {
        return keccak256(abi.encode(user, amount, offChainId, nonce, block.timestamp));
    }

    /**
     * @dev 获取合约版本
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}