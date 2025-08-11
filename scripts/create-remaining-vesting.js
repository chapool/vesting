const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("为Owner地址完成剩余释放计划的创建...");
    
    const testBeneficiary = "0xB6e176A9E5A86AD4FA3Acad9eE605269055cE251";
    console.log(`受益人地址: ${testBeneficiary}`);
    
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
    
    // 检查当前已有的计划数量
    const existingCount = await vesting.getVestingSchedulesCountByBeneficiary(testBeneficiary);
    console.log(`已有计划数量: ${existingCount}`);
    
    // 获取当前时间
    const currentTime = Math.floor(Date.now() / 1000);
    const oneMonth = 30 * 24 * 60 * 60;
    const oneYear = 365 * 24 * 60 * 60;
    
    // 只创建剩余的计划（假设前面已经创建了7个）
    const remainingPlans = [
        {
            name: "长期线性释放 - TEAM类型",
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: oneMonth * 3, // 3个月cliff
            duration: oneYear,  // 1年总释放期
            slicePeriodSeconds: 604800, // 每周释放
            revocable: true,
            amount: ethers.parseEther("50000"), // 50000 HZ
            category: 2, // TEAM
            vestingType: 0 // LINEAR
        },
        {
            name: "超长期Cliff释放 - ECOSYSTEM类型", 
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: oneMonth * 6, // 6个月cliff
            duration: oneYear * 2, // 2年总释放期
            slicePeriodSeconds: oneMonth, // 每月释放
            revocable: false,
            amount: ethers.parseEther("100000"), // 100000 HZ
            category: 1, // ECOSYSTEM
            vestingType: 2 // CLIFF_LINEAR
        }
    ];
    
    // 创建剩余的计划
    for (let i = 0; i < remainingPlans.length; i++) {
        const plan = remainingPlans[i];
        console.log(`\n创建剩余计划 ${i + 1}: ${plan.name}`);
        
        try {
            const tx = await vesting.createVestingSchedule(
                plan.beneficiary,
                plan.start,
                plan.cliff,
                plan.duration,
                plan.slicePeriodSeconds,
                plan.revocable,
                plan.amount,
                plan.category,
                plan.vestingType
            );
            
            const receipt = await tx.wait();
            console.log(`✓ 计划创建成功! Hash: ${tx.hash}`);
            console.log(`  Gas使用: ${receipt.gasUsed.toString()}`);
            
        } catch (error) {
            console.log(`✗ 计划创建失败: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 释放所有可释放的代币
    console.log("\n=== 释放所有可释放的代币 ===");
    
    const totalSchedules = await vesting.getVestingSchedulesCountByBeneficiary(testBeneficiary);
    console.log(`总计划数: ${totalSchedules}`);
    
    let totalReleased = 0n;
    
    for (let i = 0; i < Number(totalSchedules); i++) {
        const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(testBeneficiary, i);
        const releasable = await vesting.computeReleasableAmount(scheduleId);
        
        if (releasable > 0) {
            console.log(`释放计划 ${i}: ${ethers.formatEther(releasable)} HZ`);
            try {
                const tx = await vesting.releaseForBeneficiary(scheduleId, releasable);
                await tx.wait();
                console.log(`✓ 释放成功`);
                totalReleased += releasable;
            } catch (error) {
                console.log(`✗ 释放失败: ${error.message}`);
            }
        } else {
            console.log(`计划 ${i}: 暂无可释放代币`);
        }
    }
    
    console.log(`\n总共释放: ${ethers.formatEther(totalReleased)} HZ`);
    
    // 最终状态检查
    console.log("\n=== 最终状态检查 ===");
    
    try {
        const summary = await vesting.getBeneficiaryVestingSummary(testBeneficiary);
        console.log(`总分配数量: ${ethers.formatEther(summary.totalAmount)} HZ`);
        console.log(`已释放数量: ${ethers.formatEther(summary.releasedAmount)} HZ`);
        console.log(`当前可释放: ${ethers.formatEther(summary.releasableAmount)} HZ`);
        console.log(`仍锁定数量: ${ethers.formatEther(summary.lockedAmount)} HZ`);
        console.log(`计划总数: ${summary.scheduleCount.toString()}`);
        
        // 获取按类别分组的信息
        console.log("\n=== 按类别分组的信息 ===");
        const categorySchedules = await vesting.getBeneficiarySchedulesByCategory(testBeneficiary);
        
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
        
        // 检查受益人最终代币余额
        console.log("\n=== 受益人最终代币余额 ===");
        const beneficiaryBalance = await token.balanceOf(testBeneficiary);
        console.log(`${testBeneficiary} 的HZ余额: ${ethers.formatEther(beneficiaryBalance)} HZ`);
        
    } catch (error) {
        console.log(`获取汇总信息失败: ${error.message}`);
    }
    
    console.log("\n🎉 Owner地址的释放计划全部完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });