const { ethers } = require("hardhat");

async function main() {
    console.log("查询受益人的所有vesting计划详情...");
    
    const beneficiary = "0xB6e176A9E5A86AD4FA3Acad9eE605269055cE251";
    console.log(`受益人地址: ${beneficiary}`);
    
    // 获取部署的合约地址
    const deploymentData = require("../deployments/hashkeyTestnet.json");
    const vestingAddress = deploymentData.contracts.Vesting.proxy;
    
    console.log(`Vesting合约地址: ${vestingAddress}`);
    
    // 连接合约
    const Vesting = await ethers.getContractFactory("Vesting");
    const vesting = Vesting.attach(vestingAddress);
    
    try {
        // 使用 getBeneficiaryVestingSchedules 获取所有计划
        console.log("\n=== 调用 getBeneficiaryVestingSchedules ===");
        const schedules = await vesting.getBeneficiaryVestingSchedules(beneficiary);
        
        console.log(`找到 ${schedules.length} 个vesting计划\n`);
        
        // 枚举定义
        const categoryNames = ["MINING", "ECOSYSTEM", "TEAM", "CORNERSTONE"];
        const vestingTypeNames = ["LINEAR", "MILESTONE", "CLIFF_LINEAR"];
        
        // 遍历并显示每个计划的详细信息
        for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];
            
            console.log(`=== 计划 ${i} ===`);
            console.log(`初始化状态: ${schedule.initialized}`);
            console.log(`受益人: ${schedule.beneficiary}`);
            console.log(`开始时间: ${schedule.start.toString()} (${new Date(Number(schedule.start) * 1000).toLocaleString()})`);
            console.log(`Cliff期: ${schedule.cliff.toString()} 秒 (${Math.floor(Number(schedule.cliff) / 86400)} 天)`);
            console.log(`持续时间: ${schedule.duration.toString()} 秒 (${Math.floor(Number(schedule.duration) / 86400)} 天)`);
            console.log(`释放间隔: ${schedule.slicePeriodSeconds.toString()} 秒`);
            console.log(`可撤销: ${schedule.revocable}`);
            console.log(`总金额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
            console.log(`已释放: ${ethers.formatEther(schedule.released)} HZ`);
            console.log(`是否撤销: ${schedule.revoked}`);
            console.log(`分配类别: ${categoryNames[Number(schedule.category)]}`);
            console.log(`释放类型: ${vestingTypeNames[Number(schedule.vestingType)]}`);
            
            // 计算计划ID
            const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(beneficiary, i);
            console.log(`计划ID: ${scheduleId}`);
            
            // 获取当前可释放金额
            try {
                const releasableAmount = await vesting.computeReleasableAmount(scheduleId);
                console.log(`当前可释放: ${ethers.formatEther(releasableAmount)} HZ`);
            } catch (error) {
                console.log(`获取可释放金额失败: ${error.message}`);
            }
            
            // 计算进度
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = Number(schedule.start);
            const endTime = startTime + Number(schedule.duration);
            const cliffEnd = startTime + Number(schedule.cliff);
            
            console.log(`当前时间: ${currentTime} (${new Date(currentTime * 1000).toLocaleString()})`);
            console.log(`Cliff结束时间: ${cliffEnd} (${new Date(cliffEnd * 1000).toLocaleString()})`);
            console.log(`释放结束时间: ${endTime} (${new Date(endTime * 1000).toLocaleString()})`);
            
            // 状态判断
            if (currentTime < cliffEnd) {
                console.log(`状态: Cliff期 (还需等待 ${Math.ceil((cliffEnd - currentTime) / 86400)} 天)`);
            } else if (currentTime < endTime) {
                const progress = ((currentTime - startTime) / Number(schedule.duration)) * 100;
                console.log(`状态: 释放中 (进度: ${progress.toFixed(2)}%)`);
            } else {
                console.log(`状态: 释放完成`);
            }
            
            console.log(`剩余锁定: ${ethers.formatEther(schedule.amountTotal - schedule.released)} HZ`);
            
            console.log(""); // 空行分隔
        }
        
        // 获取汇总信息
        console.log("\n=== 受益人汇总信息 ===");
        const summary = await vesting.getBeneficiaryVestingSummary(beneficiary);
        console.log(`总分配数量: ${ethers.formatEther(summary.totalAmount)} HZ`);
        console.log(`已释放数量: ${ethers.formatEther(summary.releasedAmount)} HZ`);
        console.log(`当前可释放: ${ethers.formatEther(summary.releasableAmount)} HZ`);
        console.log(`仍锁定数量: ${ethers.formatEther(summary.lockedAmount)} HZ`);
        console.log(`计划总数: ${summary.scheduleCount.toString()}`);
        
        // 按类别统计
        console.log("\n=== 按类别统计 ===");
        const categorySchedules = await vesting.getBeneficiarySchedulesByCategory(beneficiary);
        
        for (let i = 0; i < categorySchedules.length; i++) {
            const catSchedule = categorySchedules[i];
            const categoryName = categoryNames[Number(catSchedule.category)];
            
            console.log(`\n${categoryName} 类别:`);
            console.log(`  - 计划数量: ${catSchedule.scheduleIds.length}`);
            console.log(`  - 计划IDs: ${catSchedule.scheduleIds.join(', ')}`);
            console.log(`  - 总分配: ${ethers.formatEther(catSchedule.totalAmount)} HZ`);
            console.log(`  - 已释放: ${ethers.formatEther(catSchedule.releasedAmount)} HZ`);
            console.log(`  - 可释放: ${ethers.formatEther(catSchedule.releasableAmount)} HZ`);
        }
        
        // 检查受益人代币余额
        const HZToken = await ethers.getContractFactory("HZToken");
        const tokenAddress = deploymentData.contracts.HZToken.proxy;
        const token = HZToken.attach(tokenAddress);
        
        const balance = await token.balanceOf(beneficiary);
        console.log(`\n=== 受益人代币余额 ===`);
        console.log(`${beneficiary} 的HZ余额: ${ethers.formatEther(balance)} HZ`);
        
    } catch (error) {
        console.error(`查询失败: ${error.message}`);
        console.error(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });