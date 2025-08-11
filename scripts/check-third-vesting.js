const { ethers } = require("hardhat");

async function main() {
    console.log("检查第三个地址的vesting状态...");
    
    const beneficiary = "0xab622527830f1e4f59603a357b757b25cfacf360";
    console.log(`受益人地址: ${beneficiary}`);
    
    // 获取部署的合约地址
    const deploymentData = require("../deployments/hashkeyTestnet.json");
    const vestingAddress = deploymentData.contracts.Vesting.proxy;
    const tokenAddress = deploymentData.contracts.HZToken.proxy;
    
    console.log(`Vesting合约地址: ${vestingAddress}`);
    console.log(`Token合约地址: ${tokenAddress}`);
    
    // 连接合约
    const Vesting = await ethers.getContractFactory("Vesting");
    const vesting = Vesting.attach(vestingAddress);
    
    const HZToken = await ethers.getContractFactory("HZToken");
    const token = HZToken.attach(tokenAddress);
    
    try {
        // 获取受益人汇总信息
        console.log("\n=== 受益人汇总信息 ===");
        const summary = await vesting.getBeneficiaryVestingSummary(beneficiary);
        console.log(`总分配数量: ${ethers.formatEther(summary.totalAmount)} HZ`);
        console.log(`已释放数量: ${ethers.formatEther(summary.releasedAmount)} HZ`);
        console.log(`当前可释放: ${ethers.formatEther(summary.releasableAmount)} HZ`);
        console.log(`仍锁定数量: ${ethers.formatEther(summary.lockedAmount)} HZ`);
        console.log(`计划总数: ${summary.scheduleCount.toString()}`);
        
        // 检查受益人代币余额
        const balance = await token.balanceOf(beneficiary);
        console.log(`\n=== 受益人代币余额 ===`);
        console.log(`${beneficiary} 的HZ余额: ${ethers.formatEther(balance)} HZ`);
        
        // 如果还有可释放的代币，尝试释放
        if (summary.releasableAmount > 0) {
            console.log(`\n=== 释放剩余可释放代币 ===`);
            const totalSchedules = Number(summary.scheduleCount);
            
            for (let i = 0; i < totalSchedules; i++) {
                const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(beneficiary, i);
                
                try {
                    const releasable = await vesting.computeReleasableAmount(scheduleId);
                    
                    if (releasable > 0) {
                        console.log(`释放计划 ${i}: ${ethers.formatEther(releasable)} HZ`);
                        try {
                            const tx = await vesting.releaseForBeneficiary(scheduleId, releasable);
                            await tx.wait();
                            console.log(`✓ 释放成功, Hash: ${tx.hash}`);
                        } catch (error) {
                            console.log(`✗ 释放失败: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.log(`计划 ${i}: 查询可释放金额失败 - ${error.message}`);
                }
            }
            
            // 再次检查余额
            const finalBalance = await token.balanceOf(beneficiary);
            console.log(`\n最终余额: ${ethers.formatEther(finalBalance)} HZ`);
        }
        
        // 获取按类别分组的信息
        console.log("\n=== 按类别分组的信息 ===");
        const categorySchedules = await vesting.getBeneficiarySchedulesByCategory(beneficiary);
        
        const categoryNames = ["MINING", "ECOSYSTEM", "TEAM", "CORNERSTONE"];
        
        for (let i = 0; i < categorySchedules.length; i++) {
            const catSchedule = categorySchedules[i];
            const categoryName = categoryNames[catSchedule.category];
            
            console.log(`\n${categoryName} 类别:`);
            console.log(`  - 计划数量: ${catSchedule.scheduleIds.length}`);
            console.log(`  - 总分配: ${ethers.formatEther(catSchedule.totalAmount)} HZ`);
            console.log(`  - 已释放: ${ethers.formatEther(catSchedule.releasedAmount)} HZ`);
            console.log(`  - 可释放: ${ethers.formatEther(catSchedule.releasableAmount)} HZ`);
        }
        
        // 获取所有计划的详细信息
        console.log("\n=== 所有计划概览 ===");
        const schedules = await vesting.getBeneficiaryVestingSchedules(beneficiary);
        
        for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];
            const categoryName = categoryNames[Number(schedule.category)];
            const vestingTypeNames = ["LINEAR", "MILESTONE", "CLIFF_LINEAR"];
            const vestingTypeName = vestingTypeNames[Number(schedule.vestingType)];
            
            console.log(`\n计划 ${i}:`);
            console.log(`  - 类别: ${categoryName}`);
            console.log(`  - 类型: ${vestingTypeName}`);
            console.log(`  - 总金额: ${ethers.formatEther(schedule.amountTotal)} HZ`);
            console.log(`  - 已释放: ${ethers.formatEther(schedule.released)} HZ`);
            console.log(`  - 可撤销: ${schedule.revocable}`);
            console.log(`  - 是否撤销: ${schedule.revoked}`);
            
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = Number(schedule.start);
            const endTime = startTime + Number(schedule.duration);
            const cliffEnd = startTime + Number(schedule.cliff);
            
            if (currentTime < cliffEnd) {
                console.log(`  - 状态: Cliff期 (还需等待 ${Math.ceil((cliffEnd - currentTime) / 86400)} 天)`);
            } else if (currentTime < endTime) {
                const progress = ((currentTime - startTime) / Number(schedule.duration)) * 100;
                console.log(`  - 状态: 释放中 (进度: ${progress.toFixed(2)}%)`);
            } else {
                console.log(`  - 状态: 释放完成`);
            }
        }
        
    } catch (error) {
        console.error(`查询失败: ${error.message}`);
        console.error(error);
    }
    
    console.log("\n🎉 第三个地址的vesting状态检查完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });