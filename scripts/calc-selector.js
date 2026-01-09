const { ethers } = require("ethers");

/**
 * Calculate function selector(s) using ethers (v6).
 *
 * Usage:
 *   node scripts/calc-selector.js "getBeneficiaryVestingSummary(address)"
 *   node scripts/calc-selector.js "balanceOf(address)" "transfer(address,uint256)"
 */
async function main() {
  const signatures = process.argv.slice(2);
  if (signatures.length === 0) {
    console.error('Usage: node scripts/calc-selector.js "getBeneficiaryVestingSummary(address)"');
    process.exit(1);
  }

  for (const sig of signatures) {
    const hash = ethers.id(sig); // keccak256(utf8(sig))
    const selector = "0x" + hash.slice(2, 10);
    console.log(`${sig}`);
    console.log(`  keccak256: ${hash}`);
    console.log(`  selector : ${selector}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = main;


















