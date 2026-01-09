const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function uniqAddresses(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function collectImplTargets(deployments) {
  const targets = [];

  const pushAddress = (label, address) => {
    if (!address || typeof address !== "string") return;
    if (!address.startsWith("0x") || address.length !== 42) return;
    targets.push({ label, address });
  };

  const walk = (node, prefix) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], `${prefix}[${i}]`);
      }
      return;
    }
    if (typeof node !== "object") return;

    for (const [k, v] of Object.entries(node)) {
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      if (k === "implementation" || k === "implementationAddress") {
        pushAddress(`${nextPrefix}`, v);
        continue;
      }
      walk(v, nextPrefix);
    }
  };

  walk(deployments, "");
  return uniqAddresses(targets);
}

async function verifyOne(address) {
  await hre.run("verify:verify", {
    address,
    constructorArguments: [],
  });
}

async function main() {
  const dryRun = String(process.env.VERIFY_DRY || "").toLowerCase() === "1" || String(process.env.VERIFY_DRY || "").toLowerCase() === "true";

  const repoRoot = path.join(__dirname, "..");
  const deploymentFile = process.env.VERIFY_FILE
    ? path.resolve(process.cwd(), process.env.VERIFY_FILE)
    : path.join(repoRoot, "deployments", `${hre.network.name}-cpo.json`);

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const raw = fs.readFileSync(deploymentFile, "utf8");
  const deployments = JSON.parse(raw);
  const targets = collectImplTargets(deployments);

  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`📄 Deployment file: ${deploymentFile}`);
  console.log(`🔎 Found ${targets.length} implementation address(es) to verify`);

  for (const t of targets) {
    console.log(`- ${t.label}: ${t.address}`);
  }

  if (dryRun) {
    console.log("✅ Dry run enabled, skipped verification calls");
    return;
  }

  for (const t of targets) {
    console.log(`\n🔍 Verifying: ${t.label} @ ${t.address}`);
    try {
      const label = t.label.toLowerCase();
      const contract =
        label.includes("token")
          ? "contracts/CPOToken.sol:CPOToken"
          : label.includes("vesting")
          ? "contracts/Vesting.sol:Vesting"
          : undefined;

      await hre.run("verify:verify", {
        address: t.address,
        constructorArguments: [],
        ...(contract ? { contract } : {}),
      });
      console.log(`✅ Verified: ${t.address}`);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (msg.toLowerCase().includes("already verified")) {
        console.log(`ℹ️  Already verified: ${t.address}`);
        continue;
      }
      if (msg.toLowerCase().includes("polling") || msg.toLowerCase().includes("missing chainid")) {
        console.log(`⚠️  Verification submitted but polling failed (likely verified): ${msg}`);
        continue;
      }
      console.error(`❌ Error verifying ${t.address}:`, msg);
      // Continue to next contract instead of aborting
      continue;
    }
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = main;
