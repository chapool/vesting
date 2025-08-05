const { run, network } = require("hardhat");
const { readFileSync, existsSync } = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting verification on network:", network.name);

  // Load deployment data
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!existsSync(deploymentFile)) {
    console.error("❌ No deployment file found for network:", network.name);
    console.error("   Please deploy contracts first");
    process.exit(1);
  }

  const deploymentData = JSON.parse(readFileSync(deploymentFile, 'utf8'));
  console.log("📄 Loaded deployment data");

  // Check if network supports verification
  const supportedNetworks = ['mainnet', 'sepolia', 'bscMainnet', 'bscTestnet'];
  if (!supportedNetworks.includes(network.name)) {
    console.log("⚠️  Verification not supported on network:", network.name);
    return;
  }

  try {
    const contracts = deploymentData.contracts;
    const constructorArgs = deploymentData.constructorArgs;

    // Verify MiningPool Implementation first
    console.log("\n🔍 Verifying MiningPool implementation...");
    try {
      await run("verify:verify", {
        address: contracts.MiningPool.implementation,
        constructorArguments: []
      });
      console.log("✅ MiningPool implementation verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ MiningPool implementation already verified");
      } else {
        console.error("❌ MiningPool implementation verification failed:", error.message);
      }
    }

    // Verify MiningPool Proxy
    console.log("\n🔍 Verifying MiningPool proxy...");
    try {
      await run("verify:verify", {
        address: contracts.MiningPool.proxy,
        constructorArguments: [
          contracts.MiningPool.implementation,
          "0x" // Empty initialization data since we use initializer
        ],
        contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
      });
      console.log("✅ MiningPool proxy verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ MiningPool proxy already verified");
      } else {
        console.error("❌ MiningPool proxy verification failed:", error.message);
      }
    }

    // Verify Vesting Implementation
    console.log("\n🔍 Verifying Vesting implementation...");
    try {
      await run("verify:verify", {
        address: contracts.Vesting.implementation,
        constructorArguments: []
      });
      console.log("✅ Vesting implementation verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Vesting implementation already verified");
      } else {
        console.error("❌ Vesting implementation verification failed:", error.message);
      }
    }

    // Verify Vesting Proxy
    console.log("\n🔍 Verifying Vesting proxy...");
    try {
      await run("verify:verify", {
        address: contracts.Vesting.proxy,
        constructorArguments: [
          contracts.Vesting.implementation,
          "0x"
        ],
        contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
      });
      console.log("✅ Vesting proxy verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Vesting proxy already verified");
      } else {
        console.error("❌ Vesting proxy verification failed:", error.message);
      }
    }

    // Verify HZToken Implementation last
    console.log("\n🔍 Verifying HZToken implementation...");
    try {
      await run("verify:verify", {
        address: contracts.HZToken.implementation,
        constructorArguments: []
      });
      console.log("✅ HZToken implementation verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ HZToken implementation already verified");
      } else {
        console.error("❌ HZToken implementation verification failed:", error.message);
      }
    }

    // Verify HZToken Proxy (ERC1967Proxy)
    console.log("\n🔍 Verifying HZToken proxy...");
    try {
      await run("verify:verify", {
        address: contracts.HZToken.proxy,
        constructorArguments: [
          contracts.HZToken.implementation,
          "0x" // Empty initialization data since we use initializer
        ],
        contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
      });
      console.log("✅ HZToken proxy verified");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ HZToken proxy already verified");
      } else {
        console.error("❌ HZToken proxy verification failed:", error.message);
      }
    }

    console.log("\n🎉 Verification Summary:");
    console.log("═══════════════════════════════════");
    console.log(`Network: ${network.name}`);
    console.log("\n📋 Verified Contracts:");
    console.log(`MiningPool Proxy:     ${contracts.MiningPool.proxy}`);
    console.log(`MiningPool Implementation: ${contracts.MiningPool.implementation}`);
    console.log(`Vesting Proxy:        ${contracts.Vesting.proxy}`);
    console.log(`Vesting Implementation: ${contracts.Vesting.implementation}`);
    console.log(`HZToken Proxy:        ${contracts.HZToken.proxy}`);
    console.log(`HZToken Implementation: ${contracts.HZToken.implementation}`);

    // Get explorer URLs
    const getExplorerUrl = (address) => {
      switch (network.name) {
        case 'mainnet':
          return `https://etherscan.io/address/${address}`;
        case 'sepolia':
          return `https://sepolia.etherscan.io/address/${address}`;
        case 'bscMainnet':
          return `https://bscscan.com/address/${address}`;
        case 'bscTestnet':
          return `https://testnet.bscscan.com/address/${address}`;
        default:
          return address;
      }
    };

    console.log("\n🔗 Explorer Links:");
    console.log(`MiningPool: ${getExplorerUrl(contracts.MiningPool.proxy)}`);
    console.log(`Vesting: ${getExplorerUrl(contracts.Vesting.proxy)}`);
    console.log(`HZToken: ${getExplorerUrl(contracts.HZToken.proxy)}`);

  } catch (error) {
    console.error("\n❌ Verification process failed:");
    console.error(error);
    process.exit(1);
  }
}

// Function to verify a single contract
async function verifyContract(address, constructorArguments = [], contractPath = "") {
  try {
    const options = {
      address,
      constructorArguments
    };

    if (contractPath) {
      options.contract = contractPath;
    }

    await run("verify:verify", options);
    console.log(`✅ Contract ${address} verified successfully`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ Contract ${address} already verified`);
      return true;
    } else {
      console.error(`❌ Contract ${address} verification failed:`, error.message);
      return false;
    }
  }
}

module.exports = {
  main,
  verifyContract
};

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}