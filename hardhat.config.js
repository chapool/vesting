require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();
// Attempt to load opBNB-specific env if present (non-fatal if missing)
try {
  require("dotenv").config({ path: ".env.opBNB", override: true });
} catch (e) {
  // ignore if file not present
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
      allowUnlimitedContractSize: false,
      blockGasLimit: 30000000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
      },
    },
    opbnb: {
      url: process.env.OPBNB_RPC_URL || "",
      chainId: 204,
      accounts: process.env.OPBNB_PRIVATE_KEY
        ? [process.env.OPBNB_PRIVATE_KEY]
        : process.env.MNEMONIC
        ? {
            mnemonic: process.env.MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: Number(process.env.ACCOUNT_INDEX || 0),
            count: 1,
          }
        : [],
      gasPrice: process.env.OPBNB_GAS_PRICE ? Number(process.env.OPBNB_GAS_PRICE) : "auto",
      gas: "auto",
      timeout: Number(process.env.NETWORK_TIMEOUT || 60000),
    },
  },
  etherscan: {
    apiKey: {
      opbnb: process.env.ETHERSCAN_API_KEY || process.env.NODEREAL_API_KEY || process.env.BSCSCAN_API_KEY,
    },
    customChains: [
      {
        network: "opbnb",
        chainId: 204,
        urls: {
          apiURL: process.env.NODEREAL_API_KEY
            ? `https://open-platform.nodereal.io/${process.env.NODEREAL_API_KEY}/op-bnb-mainnet/contract/`
            : "https://api.etherscan.io/v2/api?chainid=204",
          browserURL: "https://opbnb.bscscan.com",
        },
      },
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "BNB",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [],
  },
  mocha: {
    timeout: 60000,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
