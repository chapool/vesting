const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("为第三个地址创建各种类型的释放计划...");
    
    const testBeneficiary = "0xab622527830f1e4f59603a357b757b25cfacf360";
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
    
    // 获取当前时间和计算时间参数
    const currentTime = Math.floor(Date.now() / 1000);
    const oneMinute = 60;
    const oneHour = 3600;
    const oneDay = 24 * 60 * 60;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const threeMonths = 3 * oneMonth;
    const sixMonths = 6 * oneMonth;
    const oneYear = 365 * oneDay;
    
    // 定义所有释放计划（包含立即释放和未来释放）
    const allVestingPlans = [
        // 立即可释放的计划
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
        },
        // 未来释放的计划
        {
            name: "立即释放 - TEAM类型",
            beneficiary: testBeneficiary,
            start: currentTime, // 立即开始
            cliff: 0,           // 无cliff期
            duration: oneDay,   // 持续1天
            slicePeriodSeconds: 60, // 每分钟释放一次
            revocable: true,
            amount: ethers.parseEther("1000"), // 1000 HZ
            category: 2, // TEAM
            vestingType: 0 // LINEAR
        },
        {
            name: "短期线性释放 - ECOSYSTEM类型",
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: 0,
            duration: oneWeek, // 1周
            slicePeriodSeconds: 3600, // 每小时释放
            revocable: true,
            amount: ethers.parseEther("5000"), // 5000 HZ
            category: 1, // ECOSYSTEM
            vestingType: 0 // LINEAR
        },
        {
            name: "Cliff + 线性释放 - CORNERSTONE类型",
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: oneWeek, // 1周cliff期
            duration: oneMonth, // 总共1个月
            slicePeriodSeconds: oneDay, // 每天释放
            revocable: false,
            amount: ethers.parseEther("10000"), // 10000 HZ
            category: 3, // CORNERSTONE
            vestingType: 2 // CLIFF_LINEAR
        },
        {
            name: "分期释放 - MINING类型",
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: 0,
            duration: threeMonths, // 3个月
            slicePeriodSeconds: oneWeek, // 每周释放
            revocable: true,
            amount: ethers.parseEther("25000"), // 25000 HZ
            category: 0, // MINING
            vestingType: 1 // MILESTONE
        },
        {
            name: "长期线性释放 - TEAM类型",
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: threeMonths, // 3个月cliff
            duration: oneYear,  // 1年总释放期
            slicePeriodSeconds: oneWeek, // 每周释放
            revocable: true,
            amount: ethers.parseEther("50000"), // 50000 HZ
            category: 2, // TEAM
            vestingType: 0 // LINEAR
        },
        {
            name: "超长期Cliff释放 - ECOSYSTEM类型", 
            beneficiary: testBeneficiary,
            start: currentTime,
            cliff: sixMonths, // 6个月cliff
            duration: oneYear * 2, // 2年总释放期
            slicePeriodSeconds: oneMonth, // 每月释放
            revocable: false,
            amount: ethers.parseEther("100000"), // 100000 HZ
            category: 1, // ECOSYSTEM
            vestingType: 2 // CLIFF_LINEAR
        }
    ];
    
    console.log(`准备创建 ${allVestingPlans.length} 个释放计划`);
    
    // 确保有足够的代币余额
    const totalAmount = allVestingPlans.reduce((sum, plan) => sum + plan.amount, 0n);
    console.log(`总需要代币数量: ${ethers.formatEther(totalAmount)} HZ`);
    
    // 检查当前余额
    const currentBalance = await token.balanceOf(vestingAddress);
    console.log(`Vesting合约当前余额: ${ethers.formatEther(currentBalance)} HZ`);
    
    if (currentBalance < totalAmount) {
        console.log("需要先向Vesting合约转入足够的代币...");
        const transferAmount = totalAmount - currentBalance;
        console.log(`需要转入: ${ethers.formatEther(transferAmount)} HZ`);
        
        const transferTx = await token.transfer(vestingAddress, transferAmount);
        await transferTx.wait();
        console.log("代币转入完成");
    }
    
    // 分批创建释放计划，避免超时
    const batchSize = 3;
    let immediateReleasableTotal = 0n;
    
    for (let batchStart = 0; batchStart < allVestingPlans.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, allVestingPlans.length);
        console.log(`\n=== 处理批次 ${Math.floor(batchStart / batchSize) + 1}: 计划 ${batchStart + 1}-${batchEnd} ===`);
        
        for (let i = batchStart; i < batchEnd; i++) {
            const plan = allVestingPlans[i];
            console.log(`\n创建第 ${i + 1} 个计划: ${plan.name}`);
            
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
                
                // 获取创建的计划ID
                const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(
                    plan.beneficiary, 
                    i
                );
                
                console.log(`✓ 计划创建成功!`);
                console.log(`  - 交易Hash: ${tx.hash}`);
                console.log(`  - 计划ID: ${scheduleId}`);
                console.log(`  - Gas使用: ${receipt.gasUsed.toString()}`);
                
                // 等待确认
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
                    immediateReleasableTotal += releasableAmount;
                    
                    // 检查受益人余额更新
                    const beneficiaryBalance = await token.balanceOf(testBeneficiary);
                    console.log(`  - 受益人当前余额: ${ethers.formatEther(beneficiaryBalance)} HZ`);
                }
                
            } catch (error) {
                console.log(`✗ 计划创建失败: ${error.message}`);
            }
            
            // 添加小延时
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 批次间稍长延时
        if (batchEnd < allVestingPlans.length) {
            console.log("批次完成，等待3秒后继续...");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log("\n=== 创建完成，查看受益人汇总信息 ===");
    
    // 获取受益人汇总信息
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
        
        // 如果还有可释放的代币，释放剩余部分
        if (summary.releasableAmount > 0) {
            console.log("\n=== 尝试释放剩余可释放代币 ===");
            
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
                        immediateReleasableTotal += releasable;
                    } catch (error) {
                        console.log(`✗ 释放失败: ${error.message}`);
                    }
                }
            }
        }
        
        // 检查受益人最终代币余额
        console.log("\n=== 受益人最终代币余额 ===");
        const beneficiaryBalance = await token.balanceOf(testBeneficiary);
        console.log(`${testBeneficiary} 的HZ余额: ${ethers.formatEther(beneficiaryBalance)} HZ`);
        console.log(`本次共释放: ${ethers.formatEther(immediateReleasableTotal)} HZ`);
        
    } catch (error) {
        console.log(`获取汇总信息失败: ${error.message}`);
    }
    
    console.log("\n🎉 第三个地址的释放计划创建完成!");
    console.log(`\n📋 所有计划都已为地址 ${testBeneficiary} 创建`);
    console.log("📝 包含了各种类型的释放计划:");
    console.log("   - 立即释放的短期计划");
    console.log("   - 不同类型的线性释放");
    console.log("   - Cliff + 线性释放");
    console.log("   - 分期释放");
    console.log("   - 长期和超长期释放计划");
    console.log("   - 立即可释放的代币已自动释放到账户");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });