// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IVesting.sol";
import "./Constants.sol";

/**
 * @title Vesting
 * @dev Vesting 合约是 HZ Token 生态系统中的核心分配合约
 * 负责管理所有代币的时间锁定和释放机制，支持多种释放策略
 */
contract Vesting is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, Constants, IVesting {
    using SafeERC20 for IERC20;

    // ==================== 状态变量 ====================
    
    // ERC20 代币合约
    IERC20 private _token;
    
    // Vesting 计划映射
    mapping(bytes32 => VestingSchedule) private _schedules;
    
    // 受益人的计划数量
    mapping(address => uint256) private _holdersVestingCount;
    
    // 计划ID数组
    bytes32[] private _schedulesIds;
    
    // 统计数据
    uint256 private _schedulesTotalAmount;
    uint256 private _schedulesReleasedAmount;
    
    // 版本控制（用于可升级合约）
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数
     * @param token_ ERC20代币合约地址（可以为0，后续通过setToken设置）
     */
    function initialize(address token_) public initializer {
        __Ownable_init(_msgSender());
        __ReentrancyGuard_init();
        __Pausable_init();
        
        if (token_ != address(0)) {
            _token = IERC20(token_);
        }
    }

    // ==================== 修饰符 ====================
    
    modifier onlyIfScheduleNotRevoked(bytes32 scheduleId) {
        require(!_schedules[scheduleId].revoked, "Vesting: schedule revoked");
        _;
    }

    modifier onlyIfScheduleExists(bytes32 scheduleId) {
        require(_schedules[scheduleId].initialized, "Vesting: schedule does not exist");
        _;
    }

    // ==================== 管理接口实现 ====================

    /**
     * @dev 设置代币合约地址
     */
    function setToken(address token_) external onlyOwner {
        require(token_ != address(0), "Vesting: token address cannot be zero");
        require(address(_token) == address(0), "Vesting: token already set");
        
        _token = IERC20(token_);
        emit TokenSet(token_);
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

    /**
     * @dev 创建 Vesting 计划
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
    ) external onlyOwner whenNotPaused {
        require(beneficiary != address(0), "Vesting: beneficiary cannot be zero address");
        require(duration > 0, "Vesting: duration must be > 0");
        require(amount > 0, "Vesting: amount must be > 0");
        require(duration >= cliff, "Vesting: duration < cliff");
        require(slicePeriodSeconds >= 1, "Vesting: slicePeriodSeconds must be >= 1");
        
        bytes32 vestingScheduleId = computeVestingScheduleIdForAddressAndIndex(
            beneficiary, 
            _holdersVestingCount[beneficiary]
        );
        
        _schedules[vestingScheduleId] = VestingSchedule({
            initialized: true,
            beneficiary: beneficiary,
            cliff: cliff,
            start: start,
            duration: duration,
            slicePeriodSeconds: slicePeriodSeconds,
            revocable: revocable,
            amountTotal: amount,
            released: 0,
            revoked: false,
            category: category,
            vestingType: vestingType
        });
        
        _schedulesTotalAmount += amount;
        _schedulesIds.push(vestingScheduleId);
        _holdersVestingCount[beneficiary]++;
        
        emit VestingScheduleCreated(vestingScheduleId, beneficiary, amount);
        emit VestingScheduleCreatedWithCategory(vestingScheduleId, beneficiary, amount, category);
    }

    /**
     * @dev 撤销 Vesting 计划
     */
    function revoke(bytes32 vestingScheduleId) external onlyOwner whenNotPaused onlyIfScheduleExists(vestingScheduleId) onlyIfScheduleNotRevoked(vestingScheduleId) {
        VestingSchedule storage schedule = _schedules[vestingScheduleId];
        require(schedule.revocable, "Vesting: schedule not revocable");
        
        uint256 releasableAmount = _computeReleasableAmount(schedule);
        uint256 unreleased = schedule.amountTotal - schedule.released - releasableAmount;
        
        schedule.revoked = true;
        _schedulesTotalAmount -= unreleased;
        
        if (releasableAmount > 0) {
            schedule.released += releasableAmount;
            _schedulesReleasedAmount += releasableAmount;
            _token.safeTransfer(schedule.beneficiary, releasableAmount);
            emit TokensReleased(vestingScheduleId, schedule.beneficiary, releasableAmount);
        }
        
        emit VestingScheduleRevoked(vestingScheduleId, schedule.beneficiary, unreleased);
    }

    /**
     * @dev Owner 代为释放用户的可用代币（无需用户授权）
     */
    function releaseForBeneficiary(bytes32 vestingScheduleId, uint256 amount) 
        external onlyOwner nonReentrant whenNotPaused onlyIfScheduleExists(vestingScheduleId) onlyIfScheduleNotRevoked(vestingScheduleId) {
        
        VestingSchedule storage schedule = _schedules[vestingScheduleId];
        
        uint256 releasableAmount = _computeReleasableAmount(schedule);
        require(amount <= releasableAmount, "Vesting: amount exceeds releasable");
        
        schedule.released += amount;
        _schedulesReleasedAmount += amount;
        
        _token.safeTransfer(schedule.beneficiary, amount);
        
        emit TokensReleasedByOwner(vestingScheduleId, schedule.beneficiary, amount);
    }

    /**
     * @dev 批量代理释放功能
     */
    function batchReleaseForBeneficiaries(
        bytes32[] calldata vestingScheduleIds, 
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant whenNotPaused {
        require(vestingScheduleIds.length == amounts.length, "Vesting: arrays length mismatch");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < vestingScheduleIds.length; i++) {
            if (amounts[i] > 0) {
                VestingSchedule storage schedule = _schedules[vestingScheduleIds[i]];
                require(schedule.initialized, "Vesting: schedule not found");
                require(!schedule.revoked, "Vesting: schedule revoked");
                
                uint256 releasableAmount = _computeReleasableAmount(schedule);
                require(amounts[i] <= releasableAmount, "Vesting: amount exceeds releasable");
                
                schedule.released += amounts[i];
                _schedulesReleasedAmount += amounts[i];
                totalAmount += amounts[i];
                
                _token.safeTransfer(schedule.beneficiary, amounts[i]);
                
                emit TokensReleasedByOwner(vestingScheduleIds[i], schedule.beneficiary, amounts[i]);
            }
        }
        
        emit BatchTokensReleasedByOwner(vestingScheduleIds, totalAmount);
    }

    // ==================== 用户接口实现 ====================

    /**
     * @dev 用户释放代币
     */
    function release(bytes32 vestingScheduleId, uint256 amount) external nonReentrant whenNotPaused onlyIfScheduleExists(vestingScheduleId) onlyIfScheduleNotRevoked(vestingScheduleId) {
        VestingSchedule storage schedule = _schedules[vestingScheduleId];
        require(schedule.beneficiary == _msgSender(), "Vesting: only beneficiary can release");
        
        uint256 releasableAmount = _computeReleasableAmount(schedule);
        require(amount <= releasableAmount, "Vesting: amount exceeds releasable");
        
        schedule.released += amount;
        _schedulesReleasedAmount += amount;
        
        _token.safeTransfer(schedule.beneficiary, amount);
        
        emit TokensReleased(vestingScheduleId, schedule.beneficiary, amount);
    }

    // ==================== 查询接口实现 ====================

    /**
     * @dev 计算可释放金额
     */
    function computeReleasableAmount(bytes32 vestingScheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = _schedules[vestingScheduleId];
        require(schedule.initialized, "Vesting: schedule not found");
        return _computeReleasableAmount(schedule);
    }

    /**
     * @dev 获取 Vesting 计划详情
     */
    function getVestingSchedule(bytes32 vestingScheduleId)
        external view returns (VestingSchedule memory) {
        return _schedules[vestingScheduleId];
    }

    /**
     * @dev 获取受益人的计划数量
     */
    function getVestingSchedulesCountByBeneficiary(address beneficiary)
        external view returns (uint256) {
        return _holdersVestingCount[beneficiary];
    }

    /**
     * @dev 根据索引获取受益人的计划ID
     */
    function getVestingIdAtIndex(address beneficiary, uint256 index)
        external pure returns (bytes32) {
        return computeVestingScheduleIdForAddressAndIndex(beneficiary, index);
    }

    /**
     * @dev 获取总锁定代币数量
     */
    function getVestingSchedulesTotalAmount() external view returns (uint256) {
        return _schedulesTotalAmount;
    }

    /**
     * @dev 获取总已释放代币数量
     */
    function getVestingSchedulesReleasedAmount() external view returns (uint256) {
        return _schedulesReleasedAmount;
    }

    /**
     * @dev 获取所有计划ID
     */
    function getVestingSchedulesIds() external view returns (bytes32[] memory) {
        return _schedulesIds;
    }

    /**
     * @dev 获取代币合约地址
     */
    function getToken() external view returns (address) {
        return address(_token);
    }

    /**
     * @dev 按分配类型统计代币数量
     */
    function getAmountByCategory(AllocationCategory category) external view returns (uint256 totalAmount, uint256 releasedAmount) {
        for (uint256 i = 0; i < _schedulesIds.length; i++) {
            VestingSchedule storage schedule = _schedules[_schedulesIds[i]];
            if (schedule.category == category && !schedule.revoked) {
                totalAmount += schedule.amountTotal;
                releasedAmount += schedule.released;
            }
        }
    }

    /**
     * @dev 计算 vestingScheduleId
     */
    function computeVestingScheduleIdForAddressAndIndex(address holder, uint256 index)
        public pure returns (bytes32) {
        return keccak256(abi.encodePacked(holder, index));
    }

    // ==================== 前端展示接口实现 ====================

    /**
     * @dev 获取受益人的所有vesting计划详情
     */
    function getBeneficiaryVestingSchedules(address beneficiary) 
        external view returns (VestingSchedule[] memory) {
        uint256 scheduleCount = _holdersVestingCount[beneficiary];
        VestingSchedule[] memory schedules = new VestingSchedule[](scheduleCount);
        
        for (uint256 i = 0; i < scheduleCount; i++) {
            bytes32 scheduleId = computeVestingScheduleIdForAddressAndIndex(beneficiary, i);
            schedules[i] = _schedules[scheduleId];
        }
        
        return schedules;
    }

    /**
     * @dev 获取受益人的汇总信息
     */
    function getBeneficiaryVestingSummary(address beneficiary)
        external view returns (BeneficiarySummary memory) {
        
        uint256 scheduleCount = _holdersVestingCount[beneficiary];
        uint256 totalAmount = 0;
        uint256 releasedAmount = 0;
        uint256 releasableAmount = 0;
        
        for (uint256 i = 0; i < scheduleCount; i++) {
            bytes32 scheduleId = computeVestingScheduleIdForAddressAndIndex(beneficiary, i);
            VestingSchedule storage schedule = _schedules[scheduleId];
            
            if (!schedule.revoked) {
                totalAmount += schedule.amountTotal;
                releasedAmount += schedule.released;
                releasableAmount += _computeReleasableAmount(schedule);
            }
        }
        
        uint256 lockedAmount = totalAmount - releasedAmount - releasableAmount;
        
        return BeneficiarySummary({
            totalAmount: totalAmount,
            releasedAmount: releasedAmount,
            releasableAmount: releasableAmount,
            lockedAmount: lockedAmount,
            scheduleCount: scheduleCount
        });
    }

    /**
     * @dev 获取vesting计划的进度信息
     */
    function getVestingProgress(bytes32 vestingScheduleId)
        external view returns (VestingProgress memory) {
        
        VestingSchedule storage schedule = _schedules[vestingScheduleId];
        require(schedule.initialized, "Vesting: schedule not found");
        
        uint256 releasableAmount = _computeReleasableAmount(schedule);
        uint256 lockedAmount = schedule.amountTotal - schedule.released - releasableAmount;
        
        // 计算释放进度百分比 (0-10000)
        uint256 progressPercent = 0;
        if (schedule.amountTotal > 0) {
            progressPercent = (schedule.released * 10000) / schedule.amountTotal;
        }
        
        // 计算时间进度百分比 (0-10000)
        uint256 timeProgress = 0;
        uint256 remainingTime = 0;
        uint256 currentTime = getCurrentTime();
        
        if (currentTime >= schedule.start + schedule.duration) {
            timeProgress = 10000; // 100%
            remainingTime = 0;
        } else if (currentTime >= schedule.start) {
            uint256 elapsed = currentTime - schedule.start;
            timeProgress = (elapsed * 10000) / schedule.duration;
            remainingTime = schedule.start + schedule.duration - currentTime;
        } else {
            timeProgress = 0;
            remainingTime = schedule.start + schedule.duration - currentTime;
        }
        
        bool isActive = !schedule.revoked && (schedule.released < schedule.amountTotal);
        
        return VestingProgress({
            totalAmount: schedule.amountTotal,
            releasedAmount: schedule.released,
            releasableAmount: releasableAmount,
            lockedAmount: lockedAmount,
            progressPercent: progressPercent,
            timeProgress: timeProgress,
            remainingTime: remainingTime,
            isActive: isActive
        });
    }

    /**
     * @dev 获取受益人按类别分组的计划信息
     */
    function getBeneficiarySchedulesByCategory(address beneficiary)
        external view returns (CategorySchedules[] memory) {
        
        uint256 scheduleCount = _holdersVestingCount[beneficiary];
        if (scheduleCount == 0) {
            return new CategorySchedules[](0);
        }
        
        // 先统计有哪些类别以及每个类别的计划数量
        bool[4] memory categoryExists; // 对应4个枚举值
        uint256[4] memory categoryCounts;
        
        for (uint256 i = 0; i < scheduleCount; i++) {
            bytes32 scheduleId = computeVestingScheduleIdForAddressAndIndex(beneficiary, i);
            VestingSchedule storage schedule = _schedules[scheduleId];
            
            if (!schedule.revoked) {
                uint256 categoryIndex = uint256(schedule.category);
                if (!categoryExists[categoryIndex]) {
                    categoryExists[categoryIndex] = true;
                }
                categoryCounts[categoryIndex]++;
            }
        }
        
        // 计算实际存在的类别数量
        uint256 activeCategoryCount = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (categoryExists[i]) {
                activeCategoryCount++;
            }
        }
        
        // 创建结果数组
        CategorySchedules[] memory result = new CategorySchedules[](activeCategoryCount);
        uint256 resultIndex = 0;
        
        // 为每个存在的类别收集数据
        for (uint256 categoryIndex = 0; categoryIndex < 4; categoryIndex++) {
            if (!categoryExists[categoryIndex]) {
                continue;
            }
            
            AllocationCategory category = AllocationCategory(categoryIndex);
            uint256 categoryScheduleCount = categoryCounts[categoryIndex];
            
            // 创建这个类别的计划ID数组
            bytes32[] memory categoryIds = new bytes32[](categoryScheduleCount);
            uint256 totalAmount = 0;
            uint256 releasedAmount = 0;
            uint256 releasableAmount = 0;
            uint256 categoryIdIndex = 0;
            
            // 收集这个类别的数据
            for (uint256 i = 0; i < scheduleCount; i++) {
                bytes32 scheduleId = computeVestingScheduleIdForAddressAndIndex(beneficiary, i);
                VestingSchedule storage schedule = _schedules[scheduleId];
                
                if (!schedule.revoked && schedule.category == category) {
                    categoryIds[categoryIdIndex] = scheduleId;
                    totalAmount += schedule.amountTotal;
                    releasedAmount += schedule.released;
                    releasableAmount += _computeReleasableAmount(schedule);
                    categoryIdIndex++;
                }
            }
            
            result[resultIndex] = CategorySchedules({
                category: category,
                scheduleIds: categoryIds,
                totalAmount: totalAmount,
                releasedAmount: releasedAmount,
                releasableAmount: releasableAmount
            });
            
            resultIndex++;
        }
        
        return result;
    }

    // ==================== 内部函数 ====================

    /**
     * @dev 内部函数：计算可释放金额
     */
    function _computeReleasableAmount(VestingSchedule memory schedule) 
        private view returns (uint256) {
        
        uint256 currentTime = getCurrentTime();
        
        // 检查是否到达开始时间 + cliff
        if (currentTime < schedule.start + schedule.cliff) {
            return 0;
        }
        
        // 检查是否超过结束时间
        if (currentTime >= schedule.start + schedule.duration) {
            return schedule.amountTotal - schedule.released;
        }
        
        // 根据不同的释放类型计算可释放金额
        if (schedule.vestingType == VestingType.LINEAR) {
            return _computeLinearRelease(schedule, currentTime);
        } else if (schedule.vestingType == VestingType.MILESTONE) {
            return _computeMilestoneRelease(schedule, currentTime);
        } else if (schedule.vestingType == VestingType.CLIFF_LINEAR) {
            return _computeCliffLinearRelease(schedule, currentTime);
        }
        
        // 默认使用线性释放
        return _computeLinearRelease(schedule, currentTime);
    }
    
    /**
     * @dev 线性释放计算（基于slicePeriodSeconds的离散释放）
     */
    function _computeLinearRelease(VestingSchedule memory schedule, uint256 currentTime) 
        private pure returns (uint256) {
        
        uint256 timeFromStart = currentTime - schedule.start;
        uint256 secondsPerSlice = schedule.slicePeriodSeconds;
        uint256 vestedSlicePeriods = timeFromStart / secondsPerSlice;
        uint256 vestedSeconds = vestedSlicePeriods * secondsPerSlice;
        
        // 计算应该释放的总量
        uint256 vestedAmount = (schedule.amountTotal * vestedSeconds) 
                              / schedule.duration;
        
        return vestedAmount - schedule.released;
    }
    
    /**
     * @dev 分期释放计算
     */
    function _computeMilestoneRelease(VestingSchedule memory schedule, uint256 currentTime) 
        private pure returns (uint256) {
        
        uint256 timeFromStart = currentTime - schedule.start;
        uint256 periodsPassed = timeFromStart / schedule.slicePeriodSeconds;
        uint256 totalPeriods = schedule.duration / schedule.slicePeriodSeconds;
        
        // 分期释放：每个周期释放固定比例
        uint256 vestedAmount = (schedule.amountTotal * periodsPassed) / totalPeriods;
        
        return vestedAmount - schedule.released;
    }
    
    /**
     * @dev Cliff + 线性释放计算
     */
    function _computeCliffLinearRelease(VestingSchedule memory schedule, uint256 currentTime) 
        private pure returns (uint256) {
        
        // Cliff期过后才开始线性释放
        uint256 linearStartTime = schedule.start + schedule.cliff;
        uint256 linearDuration = schedule.duration - schedule.cliff;
        
        if (currentTime <= linearStartTime) {
            return 0;
        }
        
        uint256 timeFromLinearStart = currentTime - linearStartTime;
        uint256 secondsPerSlice = schedule.slicePeriodSeconds;
        uint256 vestedSlicePeriods = timeFromLinearStart / secondsPerSlice;
        uint256 vestedSeconds = vestedSlicePeriods * secondsPerSlice;
        
        // 计算线性释放的总量
        uint256 vestedAmount = (schedule.amountTotal * vestedSeconds) / linearDuration;
        
        return vestedAmount - schedule.released;
    }

    /**
     * @dev 获取当前时间（可在测试中重写）
     */
    function getCurrentTime() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev 获取合约版本
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    /**
     * @dev 授权升级函数，只有owner可以升级合约
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // 只有owner可以升级合约
    }
}