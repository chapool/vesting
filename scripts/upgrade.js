const { ethers, upgrades, network } = require("hardhat");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const path = require("path");

async function main() {
  console.log("🔄 Starting upgrade process on network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Upgrading with account:", deployer.address);

  // Load existing deployment
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!existsSync(deploymentFile)) {
    console.error("❌ No deployment file found for network:", network.name);
    process.exit(1);
  }

  const deploymentData = JSON.parse(readFileSync(deploymentFile, 'utf8'));
  console.log("📄 Loaded deployment data");

  try {
    const upgrades_performed = [];

    // Upgrade MiningPool first (no dependencies on other contracts for upgrade)
    console.log("\n🔄 Upgrading MiningPool...");
    const MiningPool = await ethers.getContractFactory("MiningPool");
    const miningPoolProxy = deploymentData.contracts.MiningPool.proxy;
    
    const upgradedMiningPool = await upgrades.upgradeProxy(miningPoolProxy, MiningPool);
    await upgradedMiningPool.waitForDeployment();
    
    const newMiningPoolImpl = await upgrades.erc1967.getImplementationAddress(miningPoolProxy);
    deploymentData.contracts.MiningPool.implementation = newMiningPoolImpl;
    
    console.log("✅ MiningPool upgraded");
    console.log("   New implementation:", newMiningPoolImpl);
    
    upgrades_performed.push({
      contract: "MiningPool",
      proxy: miningPoolProxy,
      newImplementation: newMiningPoolImpl
    });

    // Upgrade Vesting
    console.log("\n🔄 Upgrading Vesting...");
    const Vesting = await ethers.getContractFactory("Vesting");
    const vestingProxy = deploymentData.contracts.Vesting.proxy;
    
    const upgradedVesting = await upgrades.upgradeProxy(vestingProxy, Vesting);
    await upgradedVesting.waitForDeployment();
    
    const newVestingImpl = await upgrades.erc1967.getImplementationAddress(vestingProxy);
    deploymentData.contracts.Vesting.implementation = newVestingImpl;
    
    console.log("✅ Vesting upgraded");
    console.log("   New implementation:", newVestingImpl);
    
    upgrades_performed.push({
      contract: "Vesting",
      proxy: vestingProxy,
      newImplementation: newVestingImpl
    });

    // Upgrade HZToken last
    console.log("\n🔄 Upgrading HZToken...");
    const HZToken = await ethers.getContractFactory("HZToken");
    const hzTokenProxy = deploymentData.contracts.HZToken.proxy;
    
    const upgradedHZToken = await upgrades.upgradeProxy(hzTokenProxy, HZToken);
    await upgradedHZToken.waitForDeployment();
    
    const newHZTokenImpl = await upgrades.erc1967.getImplementationAddress(hzTokenProxy);
    deploymentData.contracts.HZToken.implementation = newHZTokenImpl;
    
    console.log("✅ HZToken upgraded");
    console.log("   New implementation:", newHZTokenImpl);
    
    upgrades_performed.push({
      contract: "HZToken",
      proxy: hzTokenProxy,
      newImplementation: newHZTokenImpl
    });

    // Update deployment data
    deploymentData.lastUpgrade = {
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      upgrader: deployer.address,
      upgrades: upgrades_performed
    };

    if (!deploymentData.upgradeHistory) {
      deploymentData.upgradeHistory = [];
    }
    deploymentData.upgradeHistory.push(deploymentData.lastUpgrade);

    // Save updated deployment file
    writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("\n📄 Updated deployment info saved");

    console.log("\n🎉 All contracts upgraded successfully!");

  } catch (error) {
    console.error("\n❌ Upgrade failed:");
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;