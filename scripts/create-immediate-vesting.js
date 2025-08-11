const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("创建立即可释放的vesting计划...");
    
    const testBeneficiary = "0x93cdC82135C7157247D0F14B98FD130DCf189834";
    console.log(`测试受益人地址: ${testBeneficiary}`);
    
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
    
    // 获取当前时间
    const currentTime = Math.floor(Date.now() / 1000);
    const oneMinute = 60;
    const oneHour = 3600;
    
    console.log(`当前时间戳: ${currentTime}`);
    
    // 获取当前已有的计划数量
    const existingCount = await vesting.getVestingSchedulesCountByBeneficiary(testBeneficiary);
    console.log(`已有计划数量: ${existingCount}`);
    
    // 创建立即可释放的计划
    const immediateVestingPlans = [
        {
            name: "立即可释放计划1 - 已过期的计划",
            beneficiary: testBeneficiary,
            start: currentTime - oneHour, // 1小时前开始
            cliff: 0,                     // 无cliff期
            duration: oneMinute,         // 1分钟释放期（已结束）
            slicePeriodSeconds: 10,      // 每10秒释放一次
            revocable: true,
            amount: ethers.parseEther("2000"), // 2000 HZ
            category: 1, // ECOSYSTEM
            vestingType: 0 // LINEAR
        },
        {
            name: "立即可释放计划2 - 正在释放的计划",
            beneficiary: testBeneficiary,
            start: currentTime - 600,    // 10分钟前开始
            cliff: 300,                  // 5分钟cliff期（已过）
            duration: oneHour,          // 1小时释放期
            slicePeriodSeconds: 60,     // 每分钟释放
            revocable: true,
            amount: ethers.parseEther("3000"), // 3000 HZ
            category: 2, // TEAM
            vestingType: 2 // CLIFF_LINEAR
        },
        {
            name: "立即可释放计划3 - 分期释放",
            beneficiary: testBeneficiary,
            start: currentTime - 1200,   // 20分钟前开始
            cliff: 0,                    // 无cliff期
            duration: oneHour * 2,       // 2小时释放期
            slicePeriodSeconds: 600,     // 每10分钟一期
            revocable: false,
            amount: ethers.parseEther("5000"), // 5000 HZ
            category: 0, // MINING
            vestingType: 1 // MILESTONE
        }
    ];
    
    console.log(`准备创建 ${immediateVestingPlans.length} 个立即可释放的计划`);
    
    // 创建立即可释放的计划
    for (let i = 0; i < immediateVestingPlans.length; i++) {
        const plan = immediateVestingPlans[i];
        console.log(`\n创建计划: ${plan.name}`);
        
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
            
            // 获取创建的计划ID - 需要考虑已有的计划数量
            const newIndex = Number(existingCount) + i;
            const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(
                plan.beneficiary, 
                newIndex
            );
            
            console.log(`✓ 计划创建成功!`);
            console.log(`  - 交易Hash: ${tx.hash}`);
            console.log(`  - 计划ID: ${scheduleId}`);
            console.log(`  - 索引: ${newIndex}`);
            console.log(`  - Gas使用: ${receipt.gasUsed.toString()}`);
            
            // 等待一小段时间确保交易确认
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 检查可释放金额
            const releasableAmount = await vesting.computeReleasableAmount(scheduleId);
            console.log(`  - 当前可释放: ${ethers.formatEther(releasableAmount)} HZ`);
            
            // 如果有可释放的代币，立即释放
            if (releasableAmount > 0) {
                console.log(`  - 尝试释放所有可释放代币...`);
                
                const releaseTx = await vesting.releaseForBeneficiary(scheduleId, releasableAmount);
                await releaseTx.wait();
                
                console.log(`  ✓ 成功释放 ${ethers.formatEther(releasableAmount)} HZ`);
                
                // 检查受益人余额更新
                const beneficiaryBalance = await token.balanceOf(testBeneficiary);
                console.log(`  - 受益人当前余额: ${ethers.formatEther(beneficiaryBalance)} HZ`);
            }
            
        } catch (error) {
            console.log(`✗ 计划创建失败: ${error.message}`);
        }
        
        // 添加延时
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n=== 最终状态检查 ===");
    
    // 获取受益人汇总信息
    try {
        const summary = await vesting.getBeneficiaryVestingSummary(testBeneficiary);
        console.log(`总分配数量: ${ethers.formatEther(summary.totalAmount)} HZ`);
        console.log(`已释放数量: ${ethers.formatEther(summary.releasedAmount)} HZ`);
        console.log(`当前可释放: ${ethers.formatEther(summary.releasableAmount)} HZ`);
        console.log(`仍锁定数量: ${ethers.formatEther(summary.lockedAmount)} HZ`);
        console.log(`总计划数: ${summary.scheduleCount.toString()}`);
        
        // 检查受益人最终代币余额
        console.log("\n=== 受益人最终代币余额 ===");
        const beneficiaryBalance = await token.balanceOf(testBeneficiary);
        console.log(`${testBeneficiary} 的HZ余额: ${ethers.formatEther(beneficiaryBalance)} HZ`);
        
        // 如果还有可释放的代币，再次尝试释放
        if (summary.releasableAmount > 0) {
            console.log("\n=== 尝试释放剩余可释放代币 ===");
            
            // 获取所有计划ID并释放可释放的代币
            const totalSchedules = Number(summary.scheduleCount);
            
            for (let i = 0; i < totalSchedules; i++) {
                const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(testBeneficiary, i);
                const releasable = await vesting.computeReleasableAmount(scheduleId);
                
                if (releasable > 0) {
                    console.log(`释放计划 ${i}: ${ethers.formatEther(releasable)} HZ`);
                    try {
                        const tx = await vesting.releaseForBeneficiary(scheduleId, releasable);
                        await tx.wait();
                        console.log(`✓ 释放成功`);
                    } catch (error) {
                        console.log(`✗ 释放失败: ${error.message}`);
                    }
                }
            }
            
            // 再次检查余额
            const finalBalance = await token.balanceOf(testBeneficiary);
            console.log(`\n最终余额: ${ethers.formatEther(finalBalance)} HZ`);
        }
        
    } catch (error) {
        console.log(`获取汇总信息失败: ${error.message}`);
    }
    
    console.log("\n🎉 立即可释放的计划创建完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });