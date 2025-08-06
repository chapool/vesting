const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// HashKey Chain Testnet Blockscout API 配置
const BLOCKSCOUT_API_URL = "https://testnet-explorer.hsk.xyz/api";
const BLOCKSCOUT_VERIFY_URL = "https://testnet-explorer.hsk.xyz/api/v2/smart-contracts/verification/via/flattened-code";

async function main() {
    console.log("🔍 开始通过 Blockscout 验证合约...\n");
    
    // 加载部署信息
    const deploymentFile = "./deployments/hashkeyTestnet.json";
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 部署文件不存在");
        return;
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("📄 加载部署信息:");
    console.log(`   网络: ${deployment.network}`);
    console.log(`   链ID: ${deployment.chainId}\n`);
    
    // 合约信息
    const contracts = [
        {
            name: "HZToken",
            address: deployment.contracts.HZToken.implementation,
            constructorArgs: []  // 实现合约通常没有构造函数参数
        },
        {
            name: "Vesting", 
            address: deployment.contracts.Vesting.implementation,
            constructorArgs: []
        },
        {
            name: "MiningPool",
            address: deployment.contracts.MiningPool.implementation, 
            constructorArgs: []
        }
    ];
    
    // 验证每个合约
    for (const contract of contracts) {
        await verifyContract(contract);
        // 等待一段时间避免API限制
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function verifyContract(contractInfo) {
    console.log(`🔍 开始验证 ${contractInfo.name} 合约...`);
    console.log(`📍 合约地址: ${contractInfo.address}`);
    
    try {
        // 1. 首先检查合约是否已经验证
        const isVerified = await checkVerificationStatus(contractInfo.address);
        if (isVerified) {
            console.log(`✅ ${contractInfo.name} 已经验证过了\n`);
            return;
        }
        
        // 2. 获取合约源代码（使用 Hardhat 的 flatten 功能）
        console.log(`📝 准备 ${contractInfo.name} 源代码...`);
        const sourceCode = await getFlattenedSource(contractInfo.name);
        
        if (!sourceCode) {
            console.log(`❌ 无法获取 ${contractInfo.name} 源代码\n`);
            return;
        }
        
        // 3. 准备验证数据
        const verificationData = {
            contract_address: contractInfo.address,
            source_code: sourceCode,
            contract_name: contractInfo.name,
            compiler_version: "v0.8.30+commit.5b4cc3d1", // Solidity 0.8.30
            optimization: true,
            optimization_runs: 200,
            constructor_arguments: contractInfo.constructorArgs.join(''),
            evm_version: "paris",
            license: "MIT"
        };
        
        // 4. 提交验证请求
        console.log(`🚀 提交 ${contractInfo.name} 验证请求...`);
        const response = await submitVerification(verificationData);
        
        if (response.success) {
            console.log(`✅ ${contractInfo.name} 验证请求已提交`);
            if (response.message) {
                console.log(`📄 响应: ${response.message}`);
            }
        } else {
            console.log(`❌ ${contractInfo.name} 验证失败: ${response.error}`);
        }
        
    } catch (error) {
        console.log(`❌ ${contractInfo.name} 验证过程中出错: ${error.message}`);
    }
    
    console.log(); // 空行分隔
}

async function checkVerificationStatus(contractAddress) {
    try {
        // 检查合约是否已验证
        const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${contractAddress}`);
        
        if (response.data && response.data.is_verified_via_sourcify) {
            return true;
        }
        
        // 也检查是否通过其他方式验证
        if (response.data && response.data.has_validated_blocks) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.log(`⚠️  检查验证状态失败: ${error.message}`);
        return false;
    }
}

async function getFlattenedSource(contractName) {
    try {
        // 读取合约源文件
        const contractPath = `./contracts/${contractName}.sol`;
        if (!fs.existsSync(contractPath)) {
            console.log(`❌ 合约文件不存在: ${contractPath}`);
            return null;
        }
        
        // 读取主合约文件
        let sourceCode = fs.readFileSync(contractPath, 'utf8');
        
        // 简单的导入解析（对于完整的扁平化，应该使用 hardhat flatten）
        // 这里我们尝试创建一个基本的扁平化版本
        const imports = sourceCode.match(/import\s+["']([^"']+)["'];/g) || [];
        let flattenedCode = sourceCode;
        
        for (const importLine of imports) {
            const importPath = importLine.match(/["']([^"']+)["']/)[1];
            
            // 处理 OpenZeppelin 和本地导入
            if (importPath.startsWith('@openzeppelin/')) {
                // 对于 OpenZeppelin，我们保持导入不变
                continue;
            } else if (importPath.startsWith('./')) {
                // 处理本地导入
                const localPath = path.join('./contracts', importPath.replace('./', ''));
                if (fs.existsSync(localPath)) {
                    const importedContent = fs.readFileSync(localPath, 'utf8');
                    // 移除导入的 SPDX 和 pragma（避免重复）
                    const cleanContent = importedContent
                        .replace(/\/\/ SPDX-License-Identifier:.*\n/g, '')
                        .replace(/pragma solidity.*;\n/g, '')
                        .replace(/import\s+["'][^"']+["'];\n/g, '');
                    flattenedCode = cleanContent + '\n\n' + flattenedCode;
                }
            }
        }
        
        return flattenedCode;
        
    } catch (error) {
        console.log(`❌ 获取源代码失败: ${error.message}`);
        return null;
    }
}

async function submitVerification(data) {
    try {
        console.log(`📤 提交到 Blockscout API...`);
        
        // 使用 form-data 格式提交
        const formData = new URLSearchParams();
        formData.append('addressHash', data.contract_address);
        formData.append('name', data.contract_name);
        formData.append('compilerVersion', data.compiler_version);
        formData.append('optimization', data.optimization ? 'true' : 'false');
        formData.append('optimizationRuns', data.optimization_runs.toString());
        formData.append('sourceCode', data.source_code);
        formData.append('constructorArguments', data.constructor_arguments);
        formData.append('evmVersion', data.evm_version);
        formData.append('licenseType', data.license);
        
        const response = await axios.post(
            `${BLOCKSCOUT_API_URL}/v2/smart-contracts/verification/via/flattened-code`,
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                timeout: 30000
            }
        );
        
        if (response.status === 200 || response.status === 201) {
            return {
                success: true,
                message: response.data.message || "验证请求已提交"
            };
        } else {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }
        
    } catch (error) {
        let errorMessage = error.message;
        
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// 添加 Hardhat flatten 支持
async function getHardhatFlattened(contractName) {
    try {
        console.log(`🔧 使用 Hardhat flatten 获取 ${contractName} 源代码...`);
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(`npx hardhat flatten contracts/${contractName}.sol`);
        
        // 清理输出，移除重复的 SPDX 和 pragma
        const lines = stdout.split('\n');
        const cleanedLines = [];
        let seenSPDX = false;
        let seenPragma = false;
        
        for (const line of lines) {
            if (line.includes('SPDX-License-Identifier')) {
                if (!seenSPDX) {
                    cleanedLines.push(line);
                    seenSPDX = true;
                }
            } else if (line.includes('pragma solidity')) {
                if (!seenPragma) {
                    cleanedLines.push(line);
                    seenPragma = true;
                }
            } else if (!line.trim().startsWith('//') || line.includes('/**') || line.includes('*/')) {
                cleanedLines.push(line);
            }
        }
        
        return cleanedLines.join('\n');
        
    } catch (error) {
        console.log(`⚠️  Hardhat flatten 失败，使用备用方法: ${error.message}`);
        return await getFlattenedSource(contractName);
    }
}

// 更新 getFlattenedSource 函数以使用 Hardhat flatten
async function getFlattenedSourceUpdated(contractName) {
    // 首先尝试使用 Hardhat flatten
    const flattenedCode = await getHardhatFlattened(contractName);
    if (flattenedCode) {
        return flattenedCode;
    }
    
    // 备用方法
    return await getFlattenedSource(contractName);
}

main()
    .then(() => {
        console.log("🎉 Blockscout 验证流程完成！");
        console.log("📱 请访问 https://testnet-explorer.hsk.xyz 查看验证结果");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ 验证失败:", error);
        process.exit(1);
    });