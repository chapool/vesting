const { ethers, upgrades, network } = require("hardhat");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const path = require("path");

// Ensure .env.opBNB is loaded for this script context (useful for names/symbols, etc.)
require("dotenv").config({ path: path.join(__dirname, "..", ".env.opBNB") });

async function main() {
  console.log("🚀 Starting opBNB deployment (dry-script, will not execute unless you run it)");
  console.log("📋 Deploying: CPOToken (Upgradeable UUPS) + Vesting (Upgradeable UUPS)");
  console.log("🌐 Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const deployments = {};

  // 1) Deploy Vesting first so token can mint TOTAL_SUPPLY to it
  console.log("\n📦 Deploying Vesting (UUPS)...");
  const Vesting = await ethers.getContractFactory("Vesting");
  const vesting = await upgrades.deployProxy(
    Vesting,
    [
      ethers.ZeroAddress, // token address (set after CPOToken deployment)
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  const vestingImpl = await upgrades.erc1967.getImplementationAddress(vestingAddress);
  deployments.Vesting = { proxy: vestingAddress, implementation: vestingImpl };
  console.log("✅ Vesting deployed:", vestingAddress);
  console.log("   Impl:", vestingImpl);

  // 2) Deploy CPOToken with vesting address so total supply mints to vesting
  const TOKEN_NAME = process.env.CPO_NAME || "Chapool Token";
  const TOKEN_SYMBOL = process.env.CPO_SYMBOL || "CPOT";

  console.log("\n📦 Deploying CPOToken (UUPS)...");
  const CPOToken = await ethers.getContractFactory("CPOToken");
  const cpo = await upgrades.deployProxy(
    CPOToken,
    [
      TOKEN_NAME,     // name
      TOKEN_SYMBOL,   // symbol
      vestingAddress, // vesting contract receives TOTAL_SUPPLY
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await cpo.waitForDeployment();
  const cpoAddress = await cpo.getAddress();
  const cpoImpl = await upgrades.erc1967.getImplementationAddress(cpoAddress);
  deployments.CPOToken = { proxy: cpoAddress, implementation: cpoImpl };
  console.log("✅ CPOToken deployed:", cpoAddress);
  console.log("   Impl:", cpoImpl);

  // 3) Link Vesting with token
  console.log("\n🔧 Linking Vesting.setToken(CPOToken)...");
  const tx = await vesting.setToken(cpoAddress);
  await tx.wait();
  console.log("✅ Vesting linked to CPOToken");

  // 4) Save deployment info
  const info = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    token: {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      proxy: cpoAddress,
      implementation: cpoImpl,
    },
    vesting: {
      proxy: vestingAddress,
      implementation: vestingImpl,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }
  const out = path.join(deploymentsDir, `${network.name}-cpo.json`);
  writeFileSync(out, JSON.stringify(info, null, 2));
  console.log("\n💾 Deployment info saved to:", out);

  console.log("\n🎉 Ready. This script only defines deployment; it has not been executed.");
  console.log("   To run after confirmation:");
  console.log(`   npx hardhat run --network opbnb scripts/deploy-opbnb-cpo-vesting.js`);
}

// Only execute if invoked directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = main;


