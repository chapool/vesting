const { ethers } = require("hardhat");

async function main() {
  console.log("🌐 Testing HashKey Chain Network Connections");
  console.log("=" .repeat(50));
  
  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Current Network: ${hre.network.name}`);
  console.log(`🔢 Chain ID: ${network.chainId}`);
  console.log(`🌍 RPC URL: ${hre.network.config.url || 'N/A'}`);
  
  try {
    // 获取最新区块信息
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`📦 Latest Block: ${blockNumber}`);
    
    // 获取网络Gas价格
    const gasPrice = await ethers.provider.getFeeData();
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} Gwei`);
    
    // 如果有私钥，显示账户信息
    if (process.env.PRIVATE_KEY) {
      const [deployer] = await ethers.getSigners();
      const balance = await ethers.provider.getBalance(deployer.address);
      
      console.log(`👤 Account: ${deployer.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} HSK`);
    } else {
      console.log(`⚠️  No PRIVATE_KEY in .env - Account info unavailable`);
    }
    
    console.log(`✅ Successfully connected to ${hre.network.name}!`);
    
  } catch (error) {
    console.error(`❌ Connection Error: ${error.message}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });