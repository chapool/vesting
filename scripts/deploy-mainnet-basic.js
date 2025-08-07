const { ethers, upgrades, network } = require("hardhat");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting basic mainnet deployment on network:", network.name);
  console.log("📋 Deploying: HZToken + Vesting contracts only");
  console.log("⚠️  NOT deploying: MiningPool contract");
  console.log("⚠️  NOT creating: Any vesting schedules");
  
  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Ensure sufficient balance for mainnet deployment
  const minBalance = ethers.parseEther("0.1"); // Minimum 0.1 ETH for mainnet
  if (balance < minBalance) {
    console.error("❌ Insufficient balance for mainnet deployment!");
    console.error("   Current:", ethers.formatEther(balance), "ETH");
    console.error("   Required:", ethers.formatEther(minBalance), "ETH");
    process.exit(1);
  }
  
  const deployments = {};
  
  try {
    // 1. Deploy Vesting contract first (Upgradeable)
    console.log("\n📦 Step 1: Deploying Vesting contract...");
    const Vesting = await ethers.getContractFactory("Vesting");
    console.log("   🔄 Deploying proxy contract...");
    
    const vesting = await upgrades.deployProxy(
      Vesting,
      [
        ethers.ZeroAddress  // token address (will be set after HZToken deployment)
      ],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await vesting.waitForDeployment();
    
    const vestingAddress = await vesting.getAddress();
    const vestingImpl = await upgrades.erc1967.getImplementationAddress(vestingAddress);
    
    deployments.Vesting = {
      proxy: vestingAddress,
      implementation: vestingImpl
    };
    
    console.log("   ✅ Vesting contract deployed successfully!");
    console.log("      Proxy Address:", vestingAddress);
    console.log("      Implementation:", vestingImpl);

    // 2. Deploy HZToken contract (Upgradeable)
    console.log("\n📦 Step 2: Deploying HZToken contract...");
    const HZToken = await ethers.getContractFactory("HZToken");
    console.log("   🔄 Deploying proxy contract...");
    
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
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await hzToken.waitForDeployment();
    
    const hzTokenAddress = await hzToken.getAddress();
    const hzTokenImpl = await upgrades.erc1967.getImplementationAddress(hzTokenAddress);
    
    deployments.HZToken = {
      proxy: hzTokenAddress,
      implementation: hzTokenImpl
    };
    
    console.log("   ✅ HZToken contract deployed successfully!");
    console.log("      Proxy Address:", hzTokenAddress);
    console.log("      Implementation:", hzTokenImpl);

    // 3. Configure Vesting contract with HZToken address
    console.log("\n🔧 Step 3: Configuring contracts...");
    console.log("   🔄 Setting HZToken address in Vesting contract...");
    
    const setTokenTx = await vesting.setToken(hzTokenAddress);
    console.log("   ⏳ Waiting for transaction confirmation...");
    const setTokenReceipt = await setTokenTx.wait();
    
    console.log("   ✅ HZToken address configured in Vesting contract!");
    console.log("      Transaction:", setTokenReceipt.hash);

    // 4. Verify basic configuration
    console.log("\n🔍 Step 4: Verifying deployment...");
    
    // Check HZToken basic info
    const tokenName = await hzToken.name();
    const tokenSymbol = await hzToken.symbol();
    const tokenDecimals = await hzToken.decimals();
    const totalSupply = await hzToken.totalSupply();
    const vestingContractInToken = await hzToken.vestingContract();
    
    console.log("   📊 HZToken verification:");
    console.log("      Name:", tokenName);
    console.log("      Symbol:", tokenSymbol);
    console.log("      Decimals:", tokenDecimals);
    console.log("      Total Supply:", ethers.formatEther(totalSupply), "HZ");
    console.log("      Vesting Contract:", vestingContractInToken);
    
    // Check Vesting basic info
    const tokenInVesting = await vesting.getToken();
    const vestingOwner = await vesting.owner();
    
    console.log("   📊 Vesting verification:");
    console.log("      Token Contract:", tokenInVesting);
    console.log("      Owner:", vestingOwner);
    
    // Verify cross-references
    if (vestingContractInToken.toLowerCase() !== vestingAddress.toLowerCase()) {
      throw new Error("❌ HZToken vesting contract address mismatch!");
    }
    if (tokenInVesting.toLowerCase() !== hzTokenAddress.toLowerCase()) {
      throw new Error("❌ Vesting token contract address mismatch!");
    }
    
    console.log("   ✅ All contract configurations verified!");

    // 5. Check token distribution
    console.log("\n💰 Step 5: Checking token distribution...");
    
    const deployerBalance = await hzToken.balanceOf(deployer.address);
    const vestingBalance = await hzToken.balanceOf(vestingAddress);
    
    console.log("   📊 Token distribution:");
    console.log("      Deployer balance:", ethers.formatEther(deployerBalance), "HZ");
    console.log("      Vesting balance:", ethers.formatEther(vestingBalance), "HZ");
    console.log("      Total accounted:", ethers.formatEther(deployerBalance + vestingBalance), "HZ");

    // 6. Save deployment information
    console.log("\n💾 Step 6: Saving deployment information...");
    
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      gasUsed: {
        vesting: "Estimated ~2-3M gas",
        hzToken: "Estimated ~3-4M gas",
        configuration: setTokenReceipt.gasUsed.toString()
      },
      contracts: deployments,
      constructorArgs: {
        Vesting: [ethers.ZeroAddress],
        HZToken: ["HZ Token", "HZ", vestingAddress]
      },
      tokenInfo: {
        name: tokenName,
        symbol: tokenSymbol,
        decimals: Number(tokenDecimals),
        totalSupply: totalSupply.toString(),
        totalSupplyFormatted: ethers.formatEther(totalSupply) + " HZ"
      },
      balances: {
        deployer: deployerBalance.toString(),
        vesting: vestingBalance.toString(),
        deployerFormatted: ethers.formatEther(deployerBalance) + " HZ",
        vestingFormatted: ethers.formatEther(vestingBalance) + " HZ"
      },
      warnings: [
        "MiningPool contract NOT deployed",
        "No vesting schedules created",
        "All tokens currently held by deployer and vesting contract",
        "Manual vesting schedule creation required later"
      ]
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!existsSync(deploymentsDir)) {
      mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment file
    const deploymentFile = path.join(deploymentsDir, `${network.name}-basic.json`);
    writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("   ✅ Deployment info saved to:", deploymentFile);

    // 7. Display comprehensive summary
    console.log("\n🎉 MAINNET DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("═".repeat(60));
    console.log(`📍 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`⏰ Timestamp: ${deploymentInfo.timestamp}`);
    console.log(`📦 Block Number: ${deploymentInfo.blockNumber}`);
    console.log();
    
    console.log("📋 DEPLOYED CONTRACTS:");
    console.log("─".repeat(40));
    console.log("🪙 HZToken (Upgradeable UUPS)");
    console.log(`   Proxy:          ${deployments.HZToken.proxy}`);
    console.log(`   Implementation: ${deployments.HZToken.implementation}`);
    console.log();
    console.log("📅 Vesting (Upgradeable UUPS)");
    console.log(`   Proxy:          ${deployments.Vesting.proxy}`);
    console.log(`   Implementation: ${deployments.Vesting.implementation}`);
    console.log();
    
    console.log("💰 TOKEN INFORMATION:");
    console.log("─".repeat(40));
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${tokenDecimals}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} HZ`);
    console.log();
    
    console.log("🔗 IMPORTANT ADDRESSES:");
    console.log("─".repeat(40));
    console.log(`   HZToken:    ${hzTokenAddress}`);
    console.log(`   Vesting:    ${vestingAddress}`);
    console.log(`   Deployer:   ${deployer.address}`);
    console.log();
    
    console.log("⚠️  IMPORTANT NOTES:");
    console.log("─".repeat(40));
    console.log("   ❗ MiningPool contract NOT deployed (as requested)");
    console.log("   ❗ No vesting schedules created (as requested)");
    console.log("   ❗ All tokens currently available to deployer");
    console.log("   ❗ Create vesting schedules manually when needed");
    console.log();
    
    console.log("🔄 NEXT STEPS:");
    console.log("─".repeat(40));
    console.log("   1. 🔍 Verify contracts on block explorer:");
    console.log(`      npx hardhat verify --network ${network.name} ${hzTokenAddress}`);
    console.log(`      npx hardhat verify --network ${network.name} ${vestingAddress}`);
    console.log("   2. 🔐 Consider transferring ownership to multisig wallet");
    console.log("   3. 📋 Create vesting schedules as needed");
    console.log("   4. 🏊 Deploy MiningPool contract when ready");
    console.log("   5. ✅ Test all contract interactions thoroughly");
    console.log();
    
    return deployments;

  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error("═".repeat(50));
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    
    // If any contracts were deployed, save partial deployment info
    if (Object.keys(deployments).length > 0) {
      console.log("\n⚠️  PARTIAL DEPLOYMENT DETECTED:");
      console.log("Saving partial deployment information...");
      
      const partialInfo = {
        network: network.name,
        chainId: network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        status: "FAILED",
        error: error.message,
        partialDeployments: deployments
      };
      
      const deploymentsDir = path.join(__dirname, "..", "deployments");
      if (!existsSync(deploymentsDir)) {
        mkdirSync(deploymentsDir, { recursive: true });
      }
      
      const failedFile = path.join(deploymentsDir, `${network.name}-basic-FAILED.json`);
      writeFileSync(failedFile, JSON.stringify(partialInfo, null, 2));
      console.log("Partial deployment saved to:", failedFile);
    }
    
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Script execution completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script execution failed!");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;