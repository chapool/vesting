# Chapool Token (CPOT) - Vesting & Mining System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/solidity-^0.8.19-green.svg)
![Hardhat](https://img.shields.io/badge/hardhat-^2.19.0-orange.svg)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5.4.0-red.svg)
![Version](https://img.shields.io/badge/version-2.1.0-brightgreen.svg)

## 🌍 Deployed Contracts (opBNB Mainnet)

| Contract Name | Proxy Address | Implementation Address |
|---------------|---------------|------------------------|
| **CPOToken** | `0x549d576069099F524A42ABa0b7CcB1b9b148B505` | `0xEcd8E2a927A9Fb9F37f9fa64Fe0D1922368Ed73A` |
| **Vesting** | `0x084e367B171101432c1F862f28A1792e5bA374b8` | `0x9732deDA98b373807b152b6f4140a9F30CAaCDe5` |

- **Network**: opBNB
- **Chain ID**: 204
- **Explorer**: [opBNBScan](https://opbnbscan.com/)

## 📖 Introduction: What is Vesting and Cliff?

> **Note:** This section is adapted from our documentation to help you understand the design philosophy of our contracts.

If you are a founder or employee of a startup, you may have heard the terms "vesting" and "cliff". Typically, a cliff is an option within a vesting schedule. A vesting schedule is the process by which you earn ownership of equity or other employer-granted benefits (such as stock options, Restricted Stock Units (RSUs), or other forms of equity-based compensation).

Similarly, the concepts of cliff and vesting can be applied to private investments, such as private equity and Token-based private investments in the Crypto field. When investors provide funds to a startup, they usually receive corresponding equity or Tokens. Similar to employee stock options or RSUs, the investors' equity or Tokens may be subject to a vesting schedule that includes a cliff.

Vesting schedules play a crucial role in attracting and retaining talent, as well as aligning the interests of founders, teams, and investors.

### Common Types of Vesting Schedules

Not all vesting schedules are the same. Different types vary in duration, frequency, and conditions. Some common types include:

#### Time-based Vesting
This refers to employees gradually earning equity or other benefits based on their tenure at the company. Typically, employees need to work for the company for at least one year to exercise any options.

**Example:** A four-year time-based vesting schedule with 25% vesting annually means an employee owns:
- 25% of the equity after one year
- 50% after two years
- 75% after three years
- 100% after four years

#### Performance-based Vesting
Also known as Milestone-based vesting. This refers to employees earning equity or other benefits upon completing specific projects or achieving business goals.

**Example:** A performance-based vesting schedule might grant employees 50% equity upon launching a new product, and the remaining 50% when the product's profit reaches $1 million.

#### Cliff Vesting
This refers to employees fully vesting on a specified date, rather than incrementally over a longer period.

**Example:** A four-year cliff vesting schedule with a one-year cliff means:
- Employees own no equity before working for a full year
- They are eligible for 100% of the equity after one year, but it may be credited in installments over the remaining three years
- If they leave within one year, they lose all rights
- If they work for more than one year, they retain all rights

### Vesting with Cliff

As introduced above, a cliff is an option within a vesting schedule, and vesting with a cliff is a typical combination, frequently appearing in private investments, especially in the crypto space.

#### Vesting
Vesting is the process by which employees gradually earn the right to equity or exercise stock options over a period of time. The purpose is to encourage employees to stay with the company long-term and align their interests with those of the company and its shareholders.

#### Cliff
A Cliff is a period of time, such as one year, during which employees do not earn any equity or equity-based compensation rights. After the Cliff period ends, a large portion or all of the employee's equity compensation will vest at once. The purpose is to ensure employees demonstrate commitment to the company before benefiting from their equity compensation.

**Example:** A company might grant stock options that vest over four years with a one-year Cliff:
- The employee has no vested options before the end of the first year
- After the Cliff period, the remaining options may be released monthly or annually over the remaining three years

### Vesting Schedule Illustration

Let's use a diagram to help you quickly understand Vesting with a Cliff. In this example, assume a company grants stock options to an employee that vest over four years with a one-year Cliff.

```
Year:       Year 1       Year 2       Year 3       Year 4
           (Cliff)      (Vesting)    (Vesting)    (Vesting)
Release:      0%          25%          50%          75%         100%
           ├────────┤    ├────────┤   ├────────┤   ├────────┤
           No Release    Start        Continue     Finished
```

As shown, the employee receives no stock options during the first year. From the second year onwards, the employee earns options annually, monthly, or even daily (depending on the contract) until the end of the fourth year.

### Application in Crypto

In Crypto investments, Vesting schedules can be applied to:
- VC fund investments in crypto-related startups
- Private Token sales
- Equity investments in blockchain-based companies

The main goal is to balance the interests of all stakeholders, such as founders, employees, and investors, ensuring a long-term commitment to the project or company.

#### Private Token Sales
In some cases, private Token sales occur before public Token sales, ICOs, or IEOs, offering Tokens to a limited group of investors at a discounted price. To ensure long-term commitment and prevent rapid speculative trading, Tokens from these private sales may be subject to a vesting schedule that includes a Cliff period.

**Example:** Tokens might unlock gradually over a year with a three-month Cliff:
- During the Cliff period, investors cannot sell or transfer their Tokens
- Tokens unlock gradually over the remaining months

## 📋 Project Overview

Chapool Token (CPOT) is a comprehensive token ecosystem designed for enterprise use cases. It features a secure ERC-20 token, a sophisticated three-level approval mining pool, and flexible vesting mechanisms. Built on the OpenZeppelin 5.x upgradeable architecture, it provides a solid foundation for DeFi projects.

### 🎯 Core Features

#### 💰 Token System
- **Total Supply**: 10 billion Chapool tokens, fixed supply.
- **Burnable**: Supports token burning to reduce supply.
- **Upgradeable**: Uses UUPS proxy pattern for future upgrades.
- **Owner Privileges**: Owner can mint and burn tokens (burnFrom without allowance).

#### 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CPOToken      │───▶│   Vesting        │───▶│  MiningPool     │
│ (ERC20 + UUPS)  │    │ (Token Release)  │    │ (Mining Rewards)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: Latest version

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd hz-token-hardhat

# Install dependencies
npm install

# Copy environment variable template
cp .env.example .env
```

### Configuration

Edit the `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
BSCSCAN_API_KEY=your_bscscan_api_key
```

## 🛠️ Development Workflow

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deployment

```bash
# Deploy to opBNB
npx hardhat run scripts/deploy-opbnb-cpo-vesting.js --network opbnb
```

## 🔍 Contract Information

### CPOToken.sol
- **Standard ERC-20**: Implements `ERC20Upgradeable`, `ERC20BurnableUpgradeable`.
- **Total Supply**: 10 billion CPOT, all minted to the Vesting contract upon initialization.
- **Upgradeable**: Uses OpenZeppelin UUPS proxy pattern.
- **Permissions**: Owner has `mint` and privileged `burnFrom` capabilities.

### Vesting.sol
- **Vesting Management**: Manages token release schedules.
- **Strategies**: Supports Linear Vesting, Milestone Vesting, and Cliff + Linear combinations.
- **Beneficiary**: Allows setting and updating beneficiaries.

### MiningPool.sol
- **Three-Level Approval**: 
  - Small amount (< 10k CPOT): Off-chain audit + batch processing
  - Medium amount (10k-100k CPOT): First-level approval
  - Large amount (> 100k CPOT): Dual approval (First + Second level)
- **Security**: Implements daily limits, cooldown periods, and ID management.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p><strong>🚀 Chapool Token - Enterprise Smart Contract Solution 🚀</strong></p>
  <p>Built with OpenZeppelin 5.x + Latest Security Standards</p>
  <p><em>Version 2.1.0 | Updated August 4, 2025</em></p>
</div>
