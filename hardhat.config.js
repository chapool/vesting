require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

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
    // HashKey Chain Testnet
    hashkeyTestnet: {
      url: "https://testnet.hsk.xyz",
      chainId: 133,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
    // HashKey Chain Mainnet
    hashkeyMainnet: {
      url: "https://mainnet.hsk.xyz",
      chainId: 177,
      accounts: process.env.PRIVATE_KEY 
        ? [process.env.PRIVATE_KEY] 
        : process.env.MNEMONIC 
        ? { 
            mnemonic: process.env.MNEMONIC,
            path: "m/44'/60'/0'/0",
            initialIndex: 9, // 从索引9开始（你的钱包地址）
            count: 1
          }
        : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      // HashKey Chain的验证暂时不需要API Key
      // 如果将来HashKey Chain支持API验证，可以在这里添加
      hashkeyTestnet: "no-api-key-needed",
      hashkeyMainnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "hashkeyTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://testnet-explorer.hsk.xyz/api",
          browserURL: "https://testnet-explorer.hsk.xyz"
        }
      },
      {
        network: "hashkeyMainnet", 
        chainId: 177,
        urls: {
          apiURL: "https://explorer.hsk.xyz/api",
          browserURL: "https://explorer.hsk.xyz"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "HSK", // HashKey Chain native token
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