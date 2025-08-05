const { ethers, upgrades, network } = require("hardhat");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment on network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const deployments = {};
  
  try {
    // 1. Deploy MiningPool (Upgradeable) - First with empty initialization
    console.log("\n📦 Deploying MiningPool...");
    const MiningPool = await ethers.getContractFactory("MiningPool");
    const miningPool = await upgrades.deployProxy(
      MiningPool,
      [], // Empty initialization
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    await miningPool.waitForDeployment();
    
    const miningPoolAddress = await miningPool.getAddress();
    deployments.MiningPool = {
      proxy: miningPoolAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(miningPoolAddress)
    };
    console.log("✅ MiningPool deployed to:", miningPoolAddress);
    console.log("   Implementation:", deployments.MiningPool.implementation);

    // 2. Deploy Vesting (Upgradeable)
    console.log("\n📦 Deploying Vesting...");
    const Vesting = await ethers.getContractFactory("Vesting");
    const vesting = await upgrades.deployProxy(
      Vesting,
      [
        ethers.ZeroAddress  // token address (will be set later)
      ],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    await vesting.waitForDeployment();
    
    const vestingAddress = await vesting.getAddress();
    deployments.Vesting = {
      proxy: vestingAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(vestingAddress)
    };
    console.log("✅ Vesting deployed to:", vestingAddress);
    console.log("   Implementation:", deployments.Vesting.implementation);

    // 3. Deploy HZToken (Upgradeable) - Needs vesting contract address
    console.log("\n📦 Deploying HZToken...");
    const HZToken = await ethers.getContractFactory("HZToken");
    const hzToken = await upgrades.deployProxy(
      HZToken,
      [
        "HZ Token",     // name
        "HZ",          // symbol
        vestingAddress // vesting contract address
      ],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    await hzToken.waitForDeployment();
    
    const hzTokenAddress = await hzToken.getAddress();
    deployments.HZToken = {
      proxy: hzTokenAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(hzTokenAddress)
    };
    console.log("✅ HZToken deployed to:", hzTokenAddress);
    console.log("   Implementation:", deployments.HZToken.implementation);

    // 4. Set token address in Vesting contract
    console.log("\n🔧 Setting token address in Vesting contract...");
    await vesting.setToken(hzTokenAddress);
    console.log("✅ Token address set in Vesting contract");

    // 5. Create MiningPool vesting schedule
    console.log("\n🔧 Creating MiningPool vesting schedule...");
    const currentTime = Math.floor(Date.now() / 1000);
    const miningPoolVestingId = await vesting.computeVestingScheduleIdForAddressAndIndex(miningPoolAddress, 0);
    
    // Create vesting schedule for MiningPool (25% of total supply)
    const TOTAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
    const MINING_POOL_ALLOCATION = TOTAL_SUPPLY * 25n / 100n; // 25%
    
    await vesting.createVestingSchedule(
      miningPoolAddress,                   // beneficiary (MiningPool contract)
      currentTime,                         // start time
      365 * 24 * 60 * 60,                 // cliff (1 year)
      5 * 365 * 24 * 60 * 60,             // duration (5 years)
      1,                                   // slice period (1 second)
      true,                                // revocable
      MINING_POOL_ALLOCATION,              // amount
      0,                                   // category (MINING = 0)
      0                                    // vestingType (LINEAR = 0)
    );
    console.log("✅ MiningPool vesting schedule created with ID:", miningPoolVestingId);

    // 6. Configure MiningPool with required addresses and schedule ID
    console.log("\n🔧 Configuring MiningPool...");
    await miningPool.setToken(hzTokenAddress);
    console.log("   ✅ Token address set in MiningPool");
    
    await miningPool.setVestingContract(vestingAddress);
    console.log("   ✅ Vesting contract address set in MiningPool");
    
    await miningPool.setMiningVestingScheduleId(miningPoolVestingId);
    console.log("   ✅ Mining vesting schedule ID set in MiningPool");

    // 6. Update vesting schedule beneficiary to MiningPool
    console.log("\n🔧 Updating vesting schedule beneficiary...");
    // Note: This depends on whether the vesting contract has a function to change beneficiary
    // For now, we'll document this in the deployment info
    console.log("⚠️  Manual step required: Change vesting schedule beneficiary to MiningPool address");
    
    // 7. Setup permissions
    console.log("\n🔧 Setting up permissions...");
    
    // Note: MiningPool doesn't need MINTER_ROLE since it gets tokens from Vesting contract
    // All tokens are already minted to Vesting contract during HZToken initialization
    console.log("   ✅ No additional minting permissions needed - tokens flow from Vesting");

    // Set MiningPool as vesting manager (if this function exists)
    try {
      console.log("   Setting MiningPool as vesting manager...");
      await vesting.setVestingManager(miningPoolAddress);
      console.log("   ✅ Vesting manager set");
    } catch (error) {
      console.log("   ⚠️  Note: setVestingManager function may not exist, skipping...");
    }

    // 5. Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      contracts: deployments,
      constructorArgs: {
        MiningPool: [], // Empty initialization
        Vesting: [ethers.ZeroAddress],
        HZToken: ["HZ Token", "HZ", vestingAddress]
      },
      miningPoolVestingId: miningPoolVestingId,
      miningPoolAllocation: MINING_POOL_ALLOCATION.toString()
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!existsSync(deploymentsDir)) {
      mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment file
    const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
    writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📄 Deployment info saved to:", deploymentFile);

    // 6. Display summary
    console.log("\n🎉 Deployment Summary:");
    console.log("═══════════════════════════════════════");
    console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Block: ${deploymentInfo.blockNumber}`);
    console.log("\n📋 Contract Addresses:");
    console.log(`HZToken Proxy:        ${deployments.HZToken.proxy}`);
    console.log(`HZToken Implementation: ${deployments.HZToken.implementation}`);
    console.log(`Vesting Proxy:        ${deployments.Vesting.proxy}`);
    console.log(`Vesting Implementation: ${deployments.Vesting.implementation}`);
    console.log(`MiningPool Proxy:     ${deployments.MiningPool.proxy}`);
    console.log(`MiningPool Implementation: ${deployments.MiningPool.implementation}`);
    
    console.log("\n🔗 Next Steps:");
    console.log("1. Verify contracts on block explorer:");
    console.log(`   npm run verify`);
    console.log("2. Consider transferring ownership to multisig");
    console.log("3. Test all contract interactions");
    
    return deployments;

  } catch (error) {
    console.error("\n❌ Deployment failed:");
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