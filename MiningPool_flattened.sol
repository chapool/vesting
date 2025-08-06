// Sources flattened with hardhat v2.26.1 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (proxy/utils/Initializable.sol)

pragma solidity ^0.8.20;

/**
 * @dev This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
 * behind a proxy. Since proxied contracts do not make use of a constructor, it's common to move constructor logic to an
 * external initializer function, usually called `initialize`. It then becomes necessary to protect this initializer
 * function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.
 *
 * The initialization functions use a version number. Once a version number is used, it is consumed and cannot be
 * reused. This mechanism prevents re-execution of each "step" but allows the creation of new initialization steps in
 * case an upgrade adds a module that needs to be initialized.
 *
 * For example:
 *
 * [.hljs-theme-light.nopadding]
 * ```solidity
 * contract MyToken is ERC20Upgradeable {
 *     function initialize() initializer public {
 *         __ERC20_init("MyToken", "MTK");
 *     }
 * }
 *
 * contract MyTokenV2 is MyToken, ERC20PermitUpgradeable {
 *     function initializeV2() reinitializer(2) public {
 *         __ERC20Permit_init("MyToken");
 *     }
 * }
 * ```
 *
 * TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
 * possible by providing the encoded function call as the `_data` argument to {ERC1967Proxy-constructor}.
 *
 * CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
 * that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.
 *
 * [CAUTION]
 * ====
 * Avoid leaving a contract uninitialized.
 *
 * An uninitialized contract can be taken over by an attacker. This applies to both a proxy and its implementation
 * contract, which may impact the proxy. To prevent the implementation contract from being used, you should invoke
 * the {_disableInitializers} function in the constructor to automatically lock it when it is deployed:
 *
 * [.hljs-theme-light.nopadding]
 * ```
 * /// @custom:oz-upgrades-unsafe-allow constructor
 * constructor() {
 *     _disableInitializers();
 * }
 * ```
 * ====
 */
abstract contract Initializable {
    /**
     * @dev Storage of the initializable contract.
     *
     * It's implemented on a custom ERC-7201 namespace to reduce the risk of storage collisions
     * when using with upgradeable contracts.
     *
     * @custom:storage-location erc7201:openzeppelin.storage.Initializable
     */
    struct InitializableStorage {
        /**
         * @dev Indicates that the contract has been initialized.
         */
        uint64 _initialized;
        /**
         * @dev Indicates that the contract is in the process of being initialized.
         */
        bool _initializing;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    /**
     * @dev The contract is already initialized.
     */
    error InvalidInitialization();

    /**
     * @dev The contract is not initializing.
     */
    error NotInitializing();

    /**
     * @dev Triggered when the contract has been initialized or reinitialized.
     */
    event Initialized(uint64 version);

    /**
     * @dev A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
     * `onlyInitializing` functions can be used to initialize parent contracts.
     *
     * Similar to `reinitializer(1)`, except that in the context of a constructor an `initializer` may be invoked any
     * number of times. This behavior in the constructor can be useful during testing and is not expected to be used in
     * production.
     *
     * Emits an {Initialized} event.
     */
    modifier initializer() {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        // Cache values to avoid duplicated sloads
        bool isTopLevelCall = !$._initializing;
        uint64 initialized = $._initialized;

        // Allowed calls:
        // - initialSetup: the contract is not in the initializing state and no previous version was
        //                 initialized
        // - construction: the contract is initialized at version 1 (no reinitialization) and the
        //                 current contract is just being deployed
        bool initialSetup = initialized == 0 && isTopLevelCall;
        bool construction = initialized == 1 && address(this).code.length == 0;

        if (!initialSetup && !construction) {
            revert InvalidInitialization();
        }
        $._initialized = 1;
        if (isTopLevelCall) {
            $._initializing = true;
        }
        _;
        if (isTopLevelCall) {
            $._initializing = false;
            emit Initialized(1);
        }
    }

    /**
     * @dev A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
     * contract hasn't been initialized to a greater version before. In its scope, `onlyInitializing` functions can be
     * used to initialize parent contracts.
     *
     * A reinitializer may be used after the original initialization step. This is essential to configure modules that
     * are added through upgrades and that require initialization.
     *
     * When `version` is 1, this modifier is similar to `initializer`, except that functions marked with `reinitializer`
     * cannot be nested. If one is invoked in the context of another, execution will revert.
     *
     * Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
     * a contract, executing them in the right order is up to the developer or operator.
     *
     * WARNING: Setting the version to 2**64 - 1 will prevent any future reinitialization.
     *
     * Emits an {Initialized} event.
     */
    modifier reinitializer(uint64 version) {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing || $._initialized >= version) {
            revert InvalidInitialization();
        }
        $._initialized = version;
        $._initializing = true;
        _;
        $._initializing = false;
        emit Initialized(version);
    }

    /**
     * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
     * {initializer} and {reinitializer} modifiers, directly or indirectly.
     */
    modifier onlyInitializing() {
        _checkInitializing();
        _;
    }

    /**
     * @dev Reverts if the contract is not in an initializing state. See {onlyInitializing}.
     */
    function _checkInitializing() internal view virtual {
        if (!_isInitializing()) {
            revert NotInitializing();
        }
    }

    /**
     * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
     * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
     * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
     * through proxies.
     *
     * Emits an {Initialized} event the first time it is successfully executed.
     */
    function _disableInitializers() internal virtual {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing) {
            revert InvalidInitialization();
        }
        if ($._initialized != type(uint64).max) {
            $._initialized = type(uint64).max;
            emit Initialized(type(uint64).max);
        }
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function _getInitializedVersion() internal view returns (uint64) {
        return _getInitializableStorage()._initialized;
    }

    /**
     * @dev Returns `true` if the contract is currently initializing. See {onlyInitializing}.
     */
    function _isInitializing() internal view returns (bool) {
        return _getInitializableStorage()._initializing;
    }

    /**
     * @dev Pointer to storage slot. Allows integrators to override it with a custom storage location.
     *
     * NOTE: Consider following the ERC-7201 formula to derive storage locations.
     */
    function _initializableStorageSlot() internal pure virtual returns (bytes32) {
        return INITIALIZABLE_STORAGE;
    }

    /**
     * @dev Returns a pointer to the storage namespace.
     */
    // solhint-disable-next-line var-name-mixedcase
    function _getInitializableStorage() private pure returns (InitializableStorage storage $) {
        bytes32 slot = _initializableStorageSlot();
        assembly {
            $.slot := slot
        }
    }
}


// File @openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract ContextUpgradeable is Initializable {
    function __Context_init() internal onlyInitializing {
    }

    function __Context_init_unchained() internal onlyInitializing {
    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;


/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract OwnableUpgradeable is Initializable, ContextUpgradeable {
    /// @custom:storage-location erc7201:openzeppelin.storage.Ownable
    struct OwnableStorage {
        address _owner;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Ownable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OwnableStorageLocation = 0x9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300;

    function _getOwnableStorage() private pure returns (OwnableStorage storage $) {
        assembly {
            $.slot := OwnableStorageLocation
        }
    }

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    function __Ownable_init(address initialOwner) internal onlyInitializing {
        __Ownable_init_unchained(initialOwner);
    }

    function __Ownable_init_unchained(address initialOwner) internal onlyInitializing {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        OwnableStorage storage $ = _getOwnableStorage();
        return $._owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        OwnableStorage storage $ = _getOwnableStorage();
        address oldOwner = $._owner;
        $._owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/interfaces/draft-IERC1822.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/draft-IERC1822.sol)

pragma solidity >=0.4.16;

/**
 * @dev ERC-1822: Universal Upgradeable Proxy Standard (UUPS) documents a method for upgradeability through a simplified
 * proxy whose upgrades are fully controlled by the current implementation.
 */
interface IERC1822Proxiable {
    /**
     * @dev Returns the storage slot that the proxiable contract assumes is being used to store the implementation
     * address.
     *
     * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
     * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
     * function revert if invoked through a proxy.
     */
    function proxiableUUID() external view returns (bytes32);
}


// File @openzeppelin/contracts/interfaces/IERC1967.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1967.sol)

pragma solidity >=0.4.11;

/**
 * @dev ERC-1967: Proxy Storage Slots. This interface contains the events defined in the ERC.
 */
interface IERC1967 {
    /**
     * @dev Emitted when the implementation is upgraded.
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev Emitted when the admin account has changed.
     */
    event AdminChanged(address previousAdmin, address newAdmin);

    /**
     * @dev Emitted when the beacon is changed.
     */
    event BeaconUpgraded(address indexed beacon);
}


// File @openzeppelin/contracts/proxy/beacon/IBeacon.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (proxy/beacon/IBeacon.sol)

pragma solidity >=0.4.16;

/**
 * @dev This is the interface that {BeaconProxy} expects of its beacon.
 */
interface IBeacon {
    /**
     * @dev Must return an address that can be used as a delegate call target.
     *
     * {UpgradeableBeacon} will check that this address is a contract.
     */
    function implementation() external view returns (address);
}


// File @openzeppelin/contracts/utils/Errors.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/Errors.sol)

pragma solidity ^0.8.20;

/**
 * @dev Collection of common custom errors used in multiple contracts
 *
 * IMPORTANT: Backwards compatibility is not guaranteed in future versions of the library.
 * It is recommended to avoid relying on the error API for critical functionality.
 *
 * _Available since v5.1._
 */
library Errors {
    /**
     * @dev The ETH balance of the account is not enough to perform the operation.
     */
    error InsufficientBalance(uint256 balance, uint256 needed);

    /**
     * @dev A call to an address target failed. The target may have reverted.
     */
    error FailedCall();

    /**
     * @dev The deployment failed.
     */
    error FailedDeployment();

    /**
     * @dev A necessary precompile is missing.
     */
    error MissingPrecompile(address);
}


// File @openzeppelin/contracts/utils/Address.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/Address.sol)

pragma solidity ^0.8.20;

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev There's no code at `target` (it is not a contract).
     */
    error AddressEmptyCode(address target);

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.8.20/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert Errors.InsufficientBalance(address(this).balance, amount);
        }

        (bool success, bytes memory returndata) = recipient.call{value: amount}("");
        if (!success) {
            _revert(returndata);
        }
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain `call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason or custom error, it is bubbled
     * up by this function (like regular Solidity function calls). However, if
     * the call reverted with no returned reason, this function reverts with a
     * {Errors.FailedCall} error.
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Tool to verify that a low level call to smart-contract was successful, and reverts if the target
     * was not a contract or bubbling up the revert reason (falling back to {Errors.FailedCall}) in case
     * of an unsuccessful call.
     */
    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata
    ) internal view returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            // only check if target is a contract if the call was successful and the return data is empty
            // otherwise we already know that it was a contract
            if (returndata.length == 0 && target.code.length == 0) {
                revert AddressEmptyCode(target);
            }
            return returndata;
        }
    }

    /**
     * @dev Tool to verify that a low level call was successful, and reverts if it wasn't, either by bubbling the
     * revert reason or with a default {Errors.FailedCall} error.
     */
    function verifyCallResult(bool success, bytes memory returndata) internal pure returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            return returndata;
        }
    }

    /**
     * @dev Reverts with returndata if present. Otherwise reverts with {Errors.FailedCall}.
     */
    function _revert(bytes memory returndata) private pure {
        // Look for revert reason and bubble it up if present
        if (returndata.length > 0) {
            // The easiest way to bubble the revert reason is using memory via assembly
            assembly ("memory-safe") {
                revert(add(returndata, 0x20), mload(returndata))
            }
        } else {
            revert Errors.FailedCall();
        }
    }
}


// File @openzeppelin/contracts/utils/StorageSlot.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}


// File @openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (proxy/ERC1967/ERC1967Utils.sol)

pragma solidity ^0.8.21;




/**
 * @dev This library provides getters and event emitting update functions for
 * https://eips.ethereum.org/EIPS/eip-1967[ERC-1967] slots.
 */
library ERC1967Utils {
    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /**
     * @dev The `implementation` of the proxy is invalid.
     */
    error ERC1967InvalidImplementation(address implementation);

    /**
     * @dev The `admin` of the proxy is invalid.
     */
    error ERC1967InvalidAdmin(address admin);

    /**
     * @dev The `beacon` of the proxy is invalid.
     */
    error ERC1967InvalidBeacon(address beacon);

    /**
     * @dev An upgrade function sees `msg.value > 0` that may be lost.
     */
    error ERC1967NonPayable();

    /**
     * @dev Returns the current implementation address.
     */
    function getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    /**
     * @dev Stores a new address in the ERC-1967 implementation slot.
     */
    function _setImplementation(address newImplementation) private {
        if (newImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(newImplementation);
        }
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }

    /**
     * @dev Performs implementation upgrade with additional setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) internal {
        _setImplementation(newImplementation);
        emit IERC1967.Upgraded(newImplementation);

        if (data.length > 0) {
            Address.functionDelegateCall(newImplementation, data);
        } else {
            _checkNonPayable();
        }
    }

    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    /**
     * @dev Returns the current admin.
     *
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by ERC-1967) using
     * the https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
     */
    function getAdmin() internal view returns (address) {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    /**
     * @dev Stores a new address in the ERC-1967 admin slot.
     */
    function _setAdmin(address newAdmin) private {
        if (newAdmin == address(0)) {
            revert ERC1967InvalidAdmin(address(0));
        }
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = newAdmin;
    }

    /**
     * @dev Changes the admin of the proxy.
     *
     * Emits an {IERC1967-AdminChanged} event.
     */
    function changeAdmin(address newAdmin) internal {
        emit IERC1967.AdminChanged(getAdmin(), newAdmin);
        _setAdmin(newAdmin);
    }

    /**
     * @dev The storage slot of the UpgradeableBeacon contract which defines the implementation for this proxy.
     * This is the keccak-256 hash of "eip1967.proxy.beacon" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

    /**
     * @dev Returns the current beacon.
     */
    function getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(BEACON_SLOT).value;
    }

    /**
     * @dev Stores a new beacon in the ERC-1967 beacon slot.
     */
    function _setBeacon(address newBeacon) private {
        if (newBeacon.code.length == 0) {
            revert ERC1967InvalidBeacon(newBeacon);
        }

        StorageSlot.getAddressSlot(BEACON_SLOT).value = newBeacon;

        address beaconImplementation = IBeacon(newBeacon).implementation();
        if (beaconImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(beaconImplementation);
        }
    }

    /**
     * @dev Change the beacon and trigger a setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-BeaconUpgraded} event.
     *
     * CAUTION: Invoking this function has no effect on an instance of {BeaconProxy} since v5, since
     * it uses an immutable beacon without looking at the value of the ERC-1967 beacon slot for
     * efficiency.
     */
    function upgradeBeaconToAndCall(address newBeacon, bytes memory data) internal {
        _setBeacon(newBeacon);
        emit IERC1967.BeaconUpgraded(newBeacon);

        if (data.length > 0) {
            Address.functionDelegateCall(IBeacon(newBeacon).implementation(), data);
        } else {
            _checkNonPayable();
        }
    }

    /**
     * @dev Reverts if `msg.value` is not zero. It can be used to avoid `msg.value` stuck in the contract
     * if an upgrade doesn't perform an initialization call.
     */
    function _checkNonPayable() private {
        if (msg.value > 0) {
            revert ERC1967NonPayable();
        }
    }
}


// File @openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (proxy/utils/UUPSUpgradeable.sol)

pragma solidity ^0.8.22;



/**
 * @dev An upgradeability mechanism designed for UUPS proxies. The functions included here can perform an upgrade of an
 * {ERC1967Proxy}, when this contract is set as the implementation behind such a proxy.
 *
 * A security mechanism ensures that an upgrade does not turn off upgradeability accidentally, although this risk is
 * reinstated if the upgrade retains upgradeability but removes the security mechanism, e.g. by replacing
 * `UUPSUpgradeable` with a custom implementation of upgrades.
 *
 * The {_authorizeUpgrade} function must be overridden to include access restriction to the upgrade mechanism.
 */
abstract contract UUPSUpgradeable is Initializable, IERC1822Proxiable {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable __self = address(this);

    /**
     * @dev The version of the upgrade interface of the contract. If this getter is missing, both `upgradeTo(address)`
     * and `upgradeToAndCall(address,bytes)` are present, and `upgradeTo` must be used if no function should be called,
     * while `upgradeToAndCall` will invoke the `receive` function if the second argument is the empty byte string.
     * If the getter returns `"5.0.0"`, only `upgradeToAndCall(address,bytes)` is present, and the second argument must
     * be the empty byte string if no function should be called, making it impossible to invoke the `receive` function
     * during an upgrade.
     */
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    /**
     * @dev The call is from an unauthorized context.
     */
    error UUPSUnauthorizedCallContext();

    /**
     * @dev The storage `slot` is unsupported as a UUID.
     */
    error UUPSUnsupportedProxiableUUID(bytes32 slot);

    /**
     * @dev Check that the execution is being performed through a delegatecall call and that the execution context is
     * a proxy contract with an implementation (as defined in ERC-1967) pointing to self. This should only be the case
     * for UUPS and transparent proxies that are using the current contract as their implementation. Execution of a
     * function through ERC-1167 minimal proxies (clones) would not normally pass this test, but is not guaranteed to
     * fail.
     */
    modifier onlyProxy() {
        _checkProxy();
        _;
    }

    /**
     * @dev Check that the execution is not being performed through a delegate call. This allows a function to be
     * callable on the implementing contract but not through proxies.
     */
    modifier notDelegated() {
        _checkNotDelegated();
        _;
    }

    function __UUPSUpgradeable_init() internal onlyInitializing {
    }

    function __UUPSUpgradeable_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev Implementation of the ERC-1822 {proxiableUUID} function. This returns the storage slot used by the
     * implementation. It is used to validate the implementation's compatibility when performing an upgrade.
     *
     * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
     * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
     * function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.
     */
    function proxiableUUID() external view virtual notDelegated returns (bytes32) {
        return ERC1967Utils.IMPLEMENTATION_SLOT;
    }

    /**
     * @dev Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call
     * encoded in `data`.
     *
     * Calls {_authorizeUpgrade}.
     *
     * Emits an {Upgraded} event.
     *
     * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) public payable virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, data);
    }

    /**
     * @dev Reverts if the execution is not performed via delegatecall or the execution
     * context is not of a proxy with an ERC-1967 compliant implementation pointing to self.
     */
    function _checkProxy() internal view virtual {
        if (
            address(this) == __self || // Must be called through delegatecall
            ERC1967Utils.getImplementation() != __self // Must be called through an active proxy
        ) {
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev Reverts if the execution is performed via delegatecall.
     * See {notDelegated}.
     */
    function _checkNotDelegated() internal view virtual {
        if (address(this) != __self) {
            // Must not be called through delegatecall
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
     * {upgradeToAndCall}.
     *
     * Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.
     *
     * ```solidity
     * function _authorizeUpgrade(address) internal onlyOwner {}
     * ```
     */
    function _authorizeUpgrade(address newImplementation) internal virtual;

    /**
     * @dev Performs an implementation upgrade with a security check for UUPS proxies, and additional setup call.
     *
     * As a security check, {proxiableUUID} is invoked in the new implementation, and the return value
     * is expected to be the implementation slot in ERC-1967.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function _upgradeToAndCallUUPS(address newImplementation, bytes memory data) private {
        try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
            if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
                revert UUPSUnsupportedProxiableUUID(slot);
            }
            ERC1967Utils.upgradeToAndCall(newImplementation, data);
        } catch {
            // The implementation is not UUPS
            revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
        }
    }
}


// File @openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuardUpgradeable is Initializable {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /// @custom:storage-location erc7201:openzeppelin.storage.ReentrancyGuard
    struct ReentrancyGuardStorage {
        uint256 _status;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ReentrancyGuardStorageLocation = 0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    function _getReentrancyGuardStorage() private pure returns (ReentrancyGuardStorage storage $) {
        assembly {
            $.slot := ReentrancyGuardStorageLocation
        }
    }

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    function __ReentrancyGuard_init() internal onlyInitializing {
        __ReentrancyGuard_init_unchained();
    }

    function __ReentrancyGuard_init_unchained() internal onlyInitializing {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        $._status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if ($._status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        $._status = ENTERED;
    }

    function _nonReentrantAfter() private {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        $._status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        return $._status == ENTERED;
    }
}


// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

pragma solidity >=0.6.2;


/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;


/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}


// File contracts/Constants.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Constants
 * @dev HZ Token 生态系统的常量定义抽象合约
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


// File contracts/interfaces/IMiningPool.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.30;

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


// File contracts/interfaces/IVesting.sol

// Original license: SPDX_License_Identifier: MIT
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


// File contracts/MiningPool.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.30;









/**
 * @title MiningPool
 * @dev MiningPool 合约管理 HZ Token 的挖矿奖励分发，采用分级授权机制
 * 支持不同额度的提币请求通过不同层级的审批流程
 */
contract MiningPool is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, Constants, IMiningPool {
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
    uint256 public requestCooldown;           // 请求冷却期
    
    // 每日限额机制
    mapping(address => mapping(uint256 => uint256)) public dailyUserWithdrawn;  // 用户每日已提现
    mapping(uint256 => uint256) public dailyGlobalWithdrawn;                   // 全局每日已提现
    uint256 public dailyUserLimit;                          // 用户每日限额
    uint256 public dailyGlobalLimit;                     // 全局每日限额
    
    // 请求过期时间
    uint256 public requestExpiryTime;
    
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
        
        // 初始化时间和限额相关参数
        requestCooldown = DEFAULT_REQUEST_COOLDOWN;
        dailyUserLimit = DEFAULT_DAILY_USER_LIMIT;
        dailyGlobalLimit = DEFAULT_DAILY_GLOBAL_LIMIT;
        requestExpiryTime = DEFAULT_REQUEST_EXPIRY;
        
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
        
        // MiningPool作为受益人，直接调用release释放到自己账户
        _vestingContract.release(_miningVestingScheduleId, totalAmount);
        
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
        
        // MiningPool作为受益人，直接调用release释放到自己账户
        _vestingContract.release(_miningVestingScheduleId, amount);
        
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
        
        // MiningPool作为受益人，直接调用release释放到自己账户
        _vestingContract.release(_miningVestingScheduleId, request.amount);
        
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

    /**
     * @dev 授权升级函数，只有owner可以升级合约
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // 只有owner可以升级合约
    }
}
