const { ethers, upgrades, network } = require("hardhat");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Hash Key Chain Mainnet deployment");
  console.log("📋 Deploying: Chapool (CPOT) Token + Vesting + MiningPool");
  console.log("⚠️  Vesting: No release schedules will be created");
  console.log("⚠️  MiningPool: No _miningVestingScheduleId will be set");
  
  const [deployer] = await ethers.getSigners();
  console.log("\n📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "HSK");
  
  // Ensure sufficient balance for mainnet deployment
  const minBalance = ethers.parseEther("0.1"); // Minimum 0.1 HSK for mainnet
  if (balance < minBalance) {
    console.error("❌ Insufficient balance for mainnet deployment!");
    console.error("   Current:", ethers.formatEther(balance), "HSK");
    console.error("   Required:", ethers.formatEther(minBalance), "HSK");
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
        ethers.ZeroAddress  // token address (will be set after Chapool deployment)
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

    // 2. Deploy Chapool Token (HZToken) contract (Upgradeable)
    console.log("\n📦 Step 2: Deploying Chapool Token contract...");
    const HZToken = await ethers.getContractFactory("HZToken");
    console.log("   🔄 Deploying proxy contract...");
    
    const chapoolToken = await upgrades.deployProxy(
      HZToken,
      [
        "Chapool",         // name
        "CPOT",            // symbol
        vestingAddress     // vesting contract address
      ],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await chapoolToken.waitForDeployment();
    
    const chapoolTokenAddress = await chapoolToken.getAddress();
    const chapoolTokenImpl = await upgrades.erc1967.getImplementationAddress(chapoolTokenAddress);
    
    deployments.ChapoolToken = {
      proxy: chapoolTokenAddress,
      implementation: chapoolTokenImpl
    };
    
    console.log("   ✅ Chapool Token contract deployed successfully!");
    console.log("      Proxy Address:", chapoolTokenAddress);
    console.log("      Implementation:", chapoolTokenImpl);

    // 3. Deploy MiningPool contract (Upgradeable)
    console.log("\n📦 Step 3: Deploying MiningPool contract...");
    const MiningPool = await ethers.getContractFactory("MiningPool");
    console.log("   🔄 Deploying proxy contract...");
    
    const miningPool = await upgrades.deployProxy(
      MiningPool,
      [], // Empty initialization as requested
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await miningPool.waitForDeployment();
    
    const miningPoolAddress = await miningPool.getAddress();
    const miningPoolImpl = await upgrades.erc1967.getImplementationAddress(miningPoolAddress);
    
    deployments.MiningPool = {
      proxy: miningPoolAddress,
      implementation: miningPoolImpl
    };
    
    console.log("   ✅ MiningPool contract deployed successfully!");
    console.log("      Proxy Address:", miningPoolAddress);
    console.log("      Implementation:", miningPoolImpl);

    // 4. Configure Vesting contract with Chapool Token address
    console.log("\n🔧 Step 4: Configuring contracts...");
    console.log("   🔄 Setting Chapool Token address in Vesting contract...");
    
    const setTokenTx = await vesting.setToken(chapoolTokenAddress);
    console.log("   ⏳ Waiting for transaction confirmation...");
    const setTokenReceipt = await setTokenTx.wait();
    
    console.log("   ✅ Chapool Token address configured in Vesting contract!");
    console.log("      Transaction:", setTokenReceipt.hash);

    // 5. Configure MiningPool basic settings (but not _miningVestingScheduleId)
    console.log("\n🔧 Step 5: Basic MiningPool configuration...");
    
    console.log("   🔄 Setting token address in MiningPool...");
    const setMiningTokenTx = await miningPool.setToken(chapoolTokenAddress);
    await setMiningTokenTx.wait();
    console.log("   ✅ Token address set in MiningPool");
    
    console.log("   🔄 Setting vesting contract address in MiningPool...");
    const setVestingTx = await miningPool.setVestingContract(vestingAddress);
    await setVestingTx.wait();
    console.log("   ✅ Vesting contract address set in MiningPool");
    
    console.log("   ⚠️  NOT setting _miningVestingScheduleId as requested");

    // 6. Verify basic configuration
    console.log("\n🔍 Step 6: Verifying deployment...");
    
    // Check Chapool Token basic info
    const tokenName = await chapoolToken.name();
    const tokenSymbol = await chapoolToken.symbol();
    const tokenDecimals = await chapoolToken.decimals();
    const totalSupply = await chapoolToken.totalSupply();
    // Note: HZToken doesn't have a vestingContract() getter function
    
    console.log("   📊 Chapool Token verification:");
    console.log("      Name:", tokenName);
    console.log("      Symbol:", tokenSymbol);
    console.log("      Decimals:", tokenDecimals);
    console.log("      Total Supply:", ethers.formatEther(totalSupply), "CPOT");
    console.log("      Note: Vesting contract address was set during initialization");
    
    // Check Vesting basic info
    const tokenInVesting = await vesting.getToken();
    const vestingOwner = await vesting.owner();
    
    console.log("   📊 Vesting verification:");
    console.log("      Token Contract:", tokenInVesting);
    console.log("      Owner:", vestingOwner);
    
    // Check MiningPool basic info
    const miningPoolToken = await miningPool.getToken();
    const miningPoolVesting = await miningPool.getVestingContract();
    const miningPoolOwner = await miningPool.owner();
    
    console.log("   📊 MiningPool verification:");
    console.log("      Token Contract:", miningPoolToken);
    console.log("      Vesting Contract:", miningPoolVesting);
    console.log("      Owner:", miningPoolOwner);
    
    // Verify cross-references
    // Note: Cannot verify vesting contract address in token as there's no getter function
    if (tokenInVesting.toLowerCase() !== chapoolTokenAddress.toLowerCase()) {
      throw new Error("❌ Vesting token contract address mismatch!");
    }
    if (miningPoolToken.toLowerCase() !== chapoolTokenAddress.toLowerCase()) {
      throw new Error("❌ MiningPool token contract address mismatch!");
    }
    if (miningPoolVesting.toLowerCase() !== vestingAddress.toLowerCase()) {
      throw new Error("❌ MiningPool vesting contract address mismatch!");
    }
    
    console.log("   ✅ All contract configurations verified!");

    // 7. Check token distribution
    console.log("\n💰 Step 7: Checking token distribution...");
    
    const deployerBalance = await chapoolToken.balanceOf(deployer.address);
    const vestingBalance = await chapoolToken.balanceOf(vestingAddress);
    const miningPoolBalance = await chapoolToken.balanceOf(miningPoolAddress);
    
    console.log("   📊 Token distribution:");
    console.log("      Deployer balance:", ethers.formatEther(deployerBalance), "CPOT");
    console.log("      Vesting balance:", ethers.formatEther(vestingBalance), "CPOT");
    console.log("      MiningPool balance:", ethers.formatEther(miningPoolBalance), "CPOT");
    console.log("      Total accounted:", ethers.formatEther(deployerBalance + vestingBalance + miningPoolBalance), "CPOT");

    // 8. Save deployment information
    console.log("\n💾 Step 8: Saving deployment information...");
    
    const deploymentInfo = {
      project: "Chapool Token System",
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      gasUsed: {
        vesting: "Estimated ~2-3M gas",
        chapoolToken: "Estimated ~3-4M gas",
        miningPool: "Estimated ~2-3M gas",
        configuration: setTokenReceipt.gasUsed.toString()
      },
      contracts: deployments,
      constructorArgs: {
        Vesting: [ethers.ZeroAddress],
        ChapoolToken: ["Chapool", "CPOT", vestingAddress],
        MiningPool: [] // Empty initialization
      },
      tokenInfo: {
        name: tokenName,
        symbol: tokenSymbol,
        decimals: Number(tokenDecimals),
        totalSupply: totalSupply.toString(),
        totalSupplyFormatted: ethers.formatEther(totalSupply) + " CPOT"
      },
      balances: {
        deployer: deployerBalance.toString(),
        vesting: vestingBalance.toString(),
        miningPool: miningPoolBalance.toString(),
        deployerFormatted: ethers.formatEther(deployerBalance) + " CPOT",
        vestingFormatted: ethers.formatEther(vestingBalance) + " CPOT",
        miningPoolFormatted: ethers.formatEther(miningPoolBalance) + " CPOT"
      },
      deploymentNotes: [
        "Vesting contract deployed without any release schedules",
        "MiningPool deployed without _miningVestingScheduleId setting",
        "All contracts successfully linked and configured",
        "Ready for manual vesting schedule creation if needed",
        "Ready for manual MiningPool schedule configuration if needed"
      ]
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!existsSync(deploymentsDir)) {
      mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment file
    const deploymentFile = path.join(deploymentsDir, `hashkeyMainnet-chapool.json`);
    writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("   ✅ Deployment info saved to:", deploymentFile);

    // 9. Display comprehensive summary
    console.log("\n🎉 HASH KEY CHAIN MAINNET DEPLOYMENT COMPLETED!");
    console.log("═".repeat(60));
    console.log(`📍 Network: Hash Key Chain Mainnet (Chain ID: ${network.config.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`⏰ Timestamp: ${deploymentInfo.timestamp}`);
    console.log(`📦 Block Number: ${deploymentInfo.blockNumber}`);
    console.log();
    
    console.log("📋 DEPLOYED CONTRACTS:");
    console.log("─".repeat(40));
    console.log("🪙 Chapool Token (CPOT) - Upgradeable UUPS");
    console.log(`   Proxy:          ${deployments.ChapoolToken.proxy}`);
    console.log(`   Implementation: ${deployments.ChapoolToken.implementation}`);
    console.log();
    console.log("📅 Vesting Contract - Upgradeable UUPS");
    console.log(`   Proxy:          ${deployments.Vesting.proxy}`);
    console.log(`   Implementation: ${deployments.Vesting.implementation}`);
    console.log();
    console.log("⛏️  MiningPool Contract - Upgradeable UUPS");
    console.log(`   Proxy:          ${deployments.MiningPool.proxy}`);
    console.log(`   Implementation: ${deployments.MiningPool.implementation}`);
    console.log();
    
    console.log("💰 TOKEN INFORMATION:");
    console.log("─".repeat(40));
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${tokenDecimals}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} CPOT`);
    console.log();
    
    console.log("🔗 IMPORTANT ADDRESSES:");
    console.log("─".repeat(40));
    console.log(`   Chapool Token: ${chapoolTokenAddress}`);
    console.log(`   Vesting:       ${vestingAddress}`);
    console.log(`   MiningPool:    ${miningPoolAddress}`);
    console.log(`   Deployer:      ${deployer.address}`);
    console.log();
    
    console.log("⚠️  DEPLOYMENT NOTES:");
    console.log("─".repeat(40));
    console.log("   ✅ All contracts deployed and linked successfully");
    console.log("   ✅ Vesting contract has NO release schedules (as requested)");
    console.log("   ✅ MiningPool has NO _miningVestingScheduleId set (as requested)");
    console.log("   ✅ All basic configurations completed");
    console.log("   ✅ Ready for manual schedule configuration when needed");
    console.log();
    
    console.log("🔄 NEXT STEPS:");
    console.log("─".repeat(40));
    console.log("   1. 🔍 Verify contracts on Hash Key Chain explorer:");
    console.log(`      npx hardhat verify --network hashkeyMainnet ${chapoolTokenAddress}`);
    console.log(`      npx hardhat verify --network hashkeyMainnet ${vestingAddress}`);
    console.log(`      npx hardhat verify --network hashkeyMainnet ${miningPoolAddress}`);
    console.log("   2. 🔐 Consider transferring ownership to multisig wallet");
    console.log("   3. 📋 Create vesting schedules manually when needed");
    console.log("   4. ⚙️  Configure MiningPool _miningVestingScheduleId when ready");
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
        project: "Chapool Token System",
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
      
      const failedFile = path.join(deploymentsDir, `hashkeyMainnet-chapool-FAILED.json`);
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