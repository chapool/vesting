// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./Constants.sol";

/**
 * @title CPOToken
 * @dev 可升级的标准 ERC20 代币：
 * - 部署时一次性将 TOTAL_SUPPLY 铸造给 vestingContract
 * - owner 拥有 mint 权限
 * - owner 拥有免授权的 burnFrom 权限（可销毁任意账户代币）
 * - 采用 UUPS 可升级模式
 */
contract CPOToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    Constants
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param name_ 代币名称
     * @param symbol_ 代币符号
     * @param vestingContract 初始接收 TOTAL_SUPPLY 的 Vesting 合约地址
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address vestingContract
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __Ownable_init(_msgSender());

        require(vestingContract != address(0), "CPOT: vesting address zero");
        _mint(vestingContract, TOTAL_SUPPLY);
    }

    /**
     * @dev owner 铸造代币。总供应不超过 TOTAL_SUPPLY
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 销毁指定账户的代币
     * - owner 可免授权销毁任意账户代币
     * - 非 owner 需要遵循 allowance 规则
     */
    function burnFrom(address account, uint256 amount) public override(ERC20BurnableUpgradeable) {
        address sender = _msgSender();
        if (sender != owner()) {
            _spendAllowance(account, sender, amount);
        }
        _burn(account, amount);
    }

    /**
     * @dev UUPS 授权升级，只有 owner 可以升级
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev 合约版本标识（可选）
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    // 预留存储槽以便未来升级
    uint256[50] private __gap;
}


