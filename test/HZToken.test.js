const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("HZToken Contract", function () {
  let hzToken;
  let vesting;
  let owner;
  let user1;
  let user2;
  let taxRecipient;
  let ammPool;
  let liquidityPool;
  let unauthorized;
  
  const TOTAL_SUPPLY = ethers.parseEther("10000000000"); // 100亿代币
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 100万代币用于测试
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, taxRecipient, ammPool, liquidityPool, unauthorized] = await ethers.getSigners();
    
    // Deploy Vesting contract first
    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await upgrades.deployProxy(
      Vesting,
      [ethers.ZeroAddress], // Will set token later
      { initializer: "initialize", kind: "uups" }
    );
    await vesting.waitForDeployment();
    
    // Deploy HZToken with vesting contract address
    const HZToken = await ethers.getContractFactory("HZToken");
    hzToken = await upgrades.deployProxy(
      HZToken,
      ["HZ Token", "HZ", await vesting.getAddress()],
      { initializer: "initialize", kind: "uups" }
    );
    await hzToken.waitForDeployment();
    
    // Set token address in vesting contract
    await vesting.setToken(await hzToken.getAddress());
    
    // Mint some tokens for testing (from vesting to users)
    await vesting.createVestingSchedule(
      user1.address,
      await time.latest(),
      0, // No cliff
      365 * 24 * 60 * 60, // 1 year
      1, // 1 second slice
      true,
      INITIAL_SUPPLY,
      0, // AllocationCategory.TEAM
      0  // VestingType.LINEAR
    );
    
    // Release tokens to user1 for testing
    const scheduleId = await vesting.computeVestingScheduleIdForAddressAndIndex(user1.address, 0);
    await time.increase(24 * 60 * 60); // 1 day
    const releasableAmount = await vesting.computeReleasableAmount(scheduleId);
    await vesting.connect(user1).release(scheduleId, releasableAmount);
  });

  describe("Deployment & Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await hzToken.name()).to.equal("HZ Token");
      expect(await hzToken.symbol()).to.equal("HZ");
      expect(await hzToken.decimals()).to.equal(18);
      expect(await hzToken.totalSupply()).to.equal(TOTAL_SUPPLY);
      expect(await hzToken.owner()).to.equal(owner.address);
    });

    it("Should have correct initial tax configuration", async function () {
      const taxConfig = await hzToken.getTaxConfig();
      expect(taxConfig.buyTax).to.equal(100); // 1%
      expect(taxConfig.sellTax).to.equal(100); // 1%
      expect(taxConfig.transferTax).to.equal(50); // 0.5%
      expect(taxConfig.liquidityTax).to.equal(25); // 0.25%
      expect(taxConfig.dynamicTaxEnabled).to.be.false;
      expect(taxConfig.maxDynamicRate).to.equal(300); // 3x
      expect(taxConfig.enabled).to.be.false; // Initially disabled
    });

    it("Should prevent initialization twice", async function () {
      await expect(
        hzToken.initialize("Test", "TEST", await vesting.getAddress())
      ).to.be.revertedWithCustomError(hzToken, "InvalidInitialization");
    });

    it("Should return correct version", async function () {
      expect(await hzToken.version()).to.equal("2.1.0");
    });
  });

  describe("Basic ERC20 Functionality", function () {
    let userBalance;

    beforeEach(async function () {
      userBalance = await hzToken.balanceOf(user1.address);
    });

    it("Should transfer tokens correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      const initialBalanceUser1 = await hzToken.balanceOf(user1.address);
      const initialBalanceUser2 = await hzToken.balanceOf(user2.address);

      await hzToken.connect(user1).transfer(user2.address, transferAmount);

      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialBalanceUser1 - transferAmount);
      expect(await hzToken.balanceOf(user2.address))
        .to.equal(initialBalanceUser2 + transferAmount);
    });

    it("Should handle approve and transferFrom correctly", async function () {
      const allowanceAmount = ethers.parseEther("200");
      const transferAmount = ethers.parseEther("100");

      await hzToken.connect(user1).approve(user2.address, allowanceAmount);
      expect(await hzToken.allowance(user1.address, user2.address))
        .to.equal(allowanceAmount);

      const initialBalanceUser1 = await hzToken.balanceOf(user1.address);
      const initialBalanceUser2 = await hzToken.balanceOf(user2.address);

      await hzToken.connect(user2).transferFrom(user1.address, user2.address, transferAmount);

      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialBalanceUser1 - transferAmount);
      expect(await hzToken.balanceOf(user2.address))
        .to.equal(initialBalanceUser2 + transferAmount);
      expect(await hzToken.allowance(user1.address, user2.address))
        .to.equal(allowanceAmount - transferAmount);
    });

    it("Should reject transfer when insufficient balance", async function () {
      const transferAmount = userBalance + ethers.parseEther("1");
      
      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWithCustomError(hzToken, "ERC20InsufficientBalance");
    });

    it("Should reject transferFrom when insufficient allowance", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        hzToken.connect(user2).transferFrom(user1.address, user2.address, transferAmount)
      ).to.be.revertedWithCustomError(hzToken, "ERC20InsufficientAllowance");
    });
  });

  describe("Minting & Burning", function () {
    it("Should reject minting when at max supply", async function () {
      const mintAmount = ethers.parseEther("1000");
      const currentSupply = await hzToken.totalSupply();
      
      // Since all tokens are already minted, any mint should fail
      expect(currentSupply).to.equal(TOTAL_SUPPLY);
      
      await expect(
        hzToken.mint(user1.address, mintAmount)
      ).to.be.revertedWith("HZ: exceeds max supply");
    });

    it("Should reject minting beyond max supply", async function () {
      const currentSupply = await hzToken.totalSupply();
      const excessAmount = TOTAL_SUPPLY - currentSupply + ethers.parseEther("1");

      await expect(
        hzToken.mint(user1.address, excessAmount)
      ).to.be.revertedWith("HZ: exceeds max supply");
    });

    it("Should reject minting by non-owner", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        hzToken.connect(unauthorized).mint(user1.address, mintAmount)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow burning own tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await hzToken.balanceOf(user1.address);
      const initialSupply = await hzToken.totalSupply();

      await expect(
        hzToken.connect(user1).burn(burnAmount)
      ).to.emit(hzToken, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);

      expect(await hzToken.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
      expect(await hzToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should allow owner to burn from any account", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await hzToken.balanceOf(user1.address);
      const initialSupply = await hzToken.totalSupply();

      await expect(
        hzToken.burnFrom(user1.address, burnAmount)
      ).to.emit(hzToken, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);

      expect(await hzToken.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
      expect(await hzToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should require allowance for burnFrom by non-owner", async function () {
      const burnAmount = ethers.parseEther("100");

      // Should fail without allowance
      await expect(
        hzToken.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.be.revertedWithCustomError(hzToken, "ERC20InsufficientAllowance");

      // Should succeed with allowance
      await hzToken.connect(user1).approve(user2.address, burnAmount);
      await expect(
        hzToken.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.emit(hzToken, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });
  });

  describe("Pause/Unpause Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      expect(await hzToken.paused()).to.be.false;

      await expect(hzToken.pause())
        .to.emit(hzToken, "Paused")
        .withArgs(owner.address);
      expect(await hzToken.paused()).to.be.true;

      await expect(hzToken.unpause())
        .to.emit(hzToken, "Unpaused")
        .withArgs(owner.address);
      expect(await hzToken.paused()).to.be.false;
    });

    it("Should reject pause/unpause by non-owner", async function () {
      await expect(
        hzToken.connect(unauthorized).pause()
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");

      await hzToken.pause();

      await expect(
        hzToken.connect(unauthorized).unpause()
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });

    it("Should prevent transfers when paused", async function () {
      await hzToken.pause();
      const transferAmount = ethers.parseEther("100");

      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWithCustomError(hzToken, "EnforcedPause");
    });

    it("Should allow transfers when unpaused", async function () {
      await hzToken.pause();
      await hzToken.unpause();
      
      const transferAmount = ethers.parseEther("100");
      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.not.be.reverted;
    });
  });

  describe("Blacklist Functionality", function () {
    it("Should allow owner to add addresses to blacklist", async function () {
      expect(await hzToken.isBlacklisted(user1.address)).to.be.false;

      await expect(hzToken.addToBlacklist(user1.address))
        .to.emit(hzToken, "BlacklistAdded")
        .withArgs(user1.address);

      expect(await hzToken.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should allow owner to remove addresses from blacklist", async function () {
      await hzToken.addToBlacklist(user1.address);
      expect(await hzToken.isBlacklisted(user1.address)).to.be.true;

      await expect(hzToken.removeFromBlacklist(user1.address))
        .to.emit(hzToken, "BlacklistRemoved")
        .withArgs(user1.address);

      expect(await hzToken.isBlacklisted(user1.address)).to.be.false;
    });

    it("Should reject blacklist operations by non-owner", async function () {
      await expect(
        hzToken.connect(unauthorized).addToBlacklist(user1.address)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");

      await hzToken.addToBlacklist(user1.address);

      await expect(
        hzToken.connect(unauthorized).removeFromBlacklist(user1.address)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });

    it("Should prevent adding duplicate addresses to blacklist", async function () {
      await hzToken.addToBlacklist(user1.address);

      await expect(
        hzToken.addToBlacklist(user1.address)
      ).to.be.revertedWith("HZ: already blacklisted");
    });

    it("Should prevent removing non-blacklisted addresses", async function () {
      await expect(
        hzToken.removeFromBlacklist(user1.address)
      ).to.be.revertedWith("HZ: not blacklisted");
    });

    it("Should prevent transfers from blacklisted addresses", async function () {
      await hzToken.addToBlacklist(user1.address);
      const transferAmount = ethers.parseEther("100");

      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("HZ: sender blacklisted");
    });

    it("Should prevent transfers to blacklisted addresses", async function () {
      await hzToken.addToBlacklist(user2.address);
      const transferAmount = ethers.parseEther("100");

      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("HZ: recipient blacklisted");
    });

    it("Should prevent all operations from blacklisted addresses", async function () {
      await hzToken.addToBlacklist(user1.address);
      const burnAmount = ethers.parseEther("50");
      const transferAmount = ethers.parseEther("100");

      // Transfers should be blocked for blacklisted addresses
      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith("HZ: sender blacklisted");

      // Burning from blacklisted addresses should also be blocked
      await expect(
        hzToken.burnFrom(user1.address, burnAmount)
      ).to.be.revertedWith("HZ: sender blacklisted");

      // User's own burn should also be blocked
      await expect(
        hzToken.connect(user1).burn(burnAmount)
      ).to.be.revertedWith("HZ: sender blacklisted");
    });
  });

  describe("Tax Configuration", function () {
    it("Should allow owner to set tax configuration", async function () {
      const buyTax = 200; // 2%
      const sellTax = 300; // 3%
      const transferTax = 150; // 1.5%
      const liquidityTax = 100; // 1%

      await expect(
        hzToken.setTaxConfig(buyTax, sellTax, transferTax, liquidityTax, true, 400)
      ).to.emit(hzToken, "TaxConfigUpdated")
        .withArgs(buyTax, sellTax, transferTax, liquidityTax, true);

      const taxConfig = await hzToken.getTaxConfig();
      expect(taxConfig.buyTax).to.equal(buyTax);
      expect(taxConfig.sellTax).to.equal(sellTax);
      expect(taxConfig.transferTax).to.equal(transferTax);
      expect(taxConfig.liquidityTax).to.equal(liquidityTax);
      expect(taxConfig.dynamicTaxEnabled).to.be.true;
      expect(taxConfig.maxDynamicRate).to.equal(400);
    });

    it("Should reject invalid tax rates", async function () {
      const maxTaxRate = 500; // From Constants.sol: MAX_TRANSACTION_TAX_RATE

      await expect(
        hzToken.setTaxConfig(maxTaxRate + 1, 100, 100, 100, false, 200)
      ).to.be.revertedWith("HZ: buy tax too high");

      await expect(
        hzToken.setTaxConfig(100, maxTaxRate + 1, 100, 100, false, 200)
      ).to.be.revertedWith("HZ: sell tax too high");

      await expect(
        hzToken.setTaxConfig(100, 100, maxTaxRate + 1, 100, false, 200)
      ).to.be.revertedWith("HZ: transfer tax too high");

      await expect(
        hzToken.setTaxConfig(100, 100, 100, maxTaxRate + 1, false, 200)
      ).to.be.revertedWith("HZ: liquidity tax too high");

      await expect(
        hzToken.setTaxConfig(100, 100, 100, 100, false, 501)
      ).to.be.revertedWith("HZ: max dynamic rate too high");
    });

    it("Should allow owner to set tax recipient", async function () {
      await expect(hzToken.setTaxRecipient(taxRecipient.address))
        .to.emit(hzToken, "TaxRecipientUpdated")
        .withArgs(taxRecipient.address);

      const taxConfig = await hzToken.getTaxConfig();
      expect(taxConfig.recipient).to.equal(taxRecipient.address);
    });

    it("Should reject zero address as tax recipient", async function () {
      await expect(
        hzToken.setTaxRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("HZ: invalid tax recipient");
    });

    it("Should allow owner to enable/disable tax", async function () {
      expect((await hzToken.getTaxConfig()).enabled).to.be.false;

      await expect(hzToken.setTaxEnabled(true))
        .to.emit(hzToken, "TaxEnabledUpdated")
        .withArgs(true);

      expect((await hzToken.getTaxConfig()).enabled).to.be.true;

      await expect(hzToken.setTaxEnabled(false))
        .to.emit(hzToken, "TaxEnabledUpdated")
        .withArgs(false);

      expect((await hzToken.getTaxConfig()).enabled).to.be.false;
    });

    it("Should reject tax operations by non-owner", async function () {
      await expect(
        hzToken.connect(unauthorized).setTaxConfig(100, 100, 100, 100, false, 200)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");

      await expect(
        hzToken.connect(unauthorized).setTaxRecipient(taxRecipient.address)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");

      await expect(
        hzToken.connect(unauthorized).setTaxEnabled(true)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("AMM and Liquidity Pool Management", function () {
    it("Should allow owner to set AMM pools", async function () {
      expect(await hzToken.isAMM(ammPool.address)).to.be.false;

      await expect(hzToken.setAMM(ammPool.address, true))
        .to.emit(hzToken, "AMMUpdated")
        .withArgs(ammPool.address, true);

      expect(await hzToken.isAMM(ammPool.address)).to.be.true;

      await expect(hzToken.setAMM(ammPool.address, false))
        .to.emit(hzToken, "AMMUpdated")
        .withArgs(ammPool.address, false);

      expect(await hzToken.isAMM(ammPool.address)).to.be.false;
    });

    it("Should allow batch setting of AMM pools", async function () {
      const pools = [ammPool.address, liquidityPool.address];
      const flags = [true, true];

      await expect(hzToken.batchSetAMM(pools, flags))
        .to.emit(hzToken, "AMMUpdated")
        .withArgs(ammPool.address, true)
        .and.to.emit(hzToken, "AMMUpdated")
        .withArgs(liquidityPool.address, true);

      expect(await hzToken.isAMM(ammPool.address)).to.be.true;
      expect(await hzToken.isAMM(liquidityPool.address)).to.be.true;
    });

    it("Should reject batch AMM setting with mismatched arrays", async function () {
      const pools = [ammPool.address, liquidityPool.address];
      const flags = [true]; // Mismatched length

      await expect(
        hzToken.batchSetAMM(pools, flags)
      ).to.be.revertedWith("HZ: arrays length mismatch");
    });

    it("Should reject AMM setting with zero address", async function () {
      await expect(
        hzToken.setAMM(ethers.ZeroAddress, true)
      ).to.be.revertedWith("HZ: invalid pool address");
    });

    it("Should allow owner to set tax exempt addresses", async function () {
      expect(await hzToken.isTaxExempt(user1.address)).to.be.false;

      await expect(hzToken.setTaxExempt(user1.address, true))
        .to.emit(hzToken, "TaxExemptUpdated")
        .withArgs(user1.address, true);

      expect(await hzToken.isTaxExempt(user1.address)).to.be.true;
    });

    it("Should allow batch setting of tax exempt addresses", async function () {
      const accounts = [user1.address, user2.address];
      const flags = [true, false];

      await expect(hzToken.batchSetTaxExempt(accounts, flags))
        .to.emit(hzToken, "TaxExemptUpdated")
        .withArgs(user1.address, true)
        .and.to.emit(hzToken, "TaxExemptUpdated")
        .withArgs(user2.address, false);

      expect(await hzToken.isTaxExempt(user1.address)).to.be.true;
      expect(await hzToken.isTaxExempt(user2.address)).to.be.false;
    });

    it("Should allow owner to set liquidity pools", async function () {
      expect(await hzToken.isLiquidityPool(liquidityPool.address)).to.be.false;

      await expect(hzToken.setLiquidityPool(liquidityPool.address, true))
        .to.emit(hzToken, "LiquidityPoolUpdated")
        .withArgs(liquidityPool.address, true);

      expect(await hzToken.isLiquidityPool(liquidityPool.address)).to.be.true;
    });

    it("Should reject pool management operations by non-owner", async function () {
      await expect(
        hzToken.connect(unauthorized).setAMM(ammPool.address, true)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");

      await expect(
        hzToken.connect(unauthorized).setTaxExempt(user1.address, true)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");

      await expect(
        hzToken.connect(unauthorized).setLiquidityPool(liquidityPool.address, true)
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Dynamic Tax Parameters", function () {
    it("Should allow owner to set dynamic tax parameters", async function () {
      const volumeThreshold = ethers.parseEther("1000");
      const timeWindow = 3600; // 1 hour
      const priceImpactFactor = 150;
      const volatilityFactor = 200;

      await expect(
        hzToken.setDynamicTaxParams(volumeThreshold, timeWindow, priceImpactFactor, volatilityFactor)
      ).to.emit(hzToken, "DynamicTaxParamsUpdated")
        .withArgs(volumeThreshold, timeWindow, priceImpactFactor, volatilityFactor);

      const params = await hzToken.getDynamicTaxParams();
      expect(params.volumeThreshold).to.equal(volumeThreshold);
      expect(params.timeWindow).to.equal(timeWindow);
      expect(params.priceImpactFactor).to.equal(priceImpactFactor);
      expect(params.volatilityFactor).to.equal(volatilityFactor);
    });

    it("Should reject invalid dynamic tax parameters", async function () {
      const validVolume = ethers.parseEther("1000");
      const validTime = 3600;
      const validPrice = 150;
      const validVolatility = 200;

      // Invalid volume threshold (zero)
      await expect(
        hzToken.setDynamicTaxParams(0, validTime, validPrice, validVolatility)
      ).to.be.revertedWith("HZ: invalid volume threshold");

      // Invalid time window (too short)
      await expect(
        hzToken.setDynamicTaxParams(validVolume, 5 * 60, validPrice, validVolatility) // 5 minutes
      ).to.be.revertedWith("HZ: invalid time window");

      // Invalid time window (too long)
      await expect(
        hzToken.setDynamicTaxParams(validVolume, 25 * 60 * 60, validPrice, validVolatility) // 25 hours
      ).to.be.revertedWith("HZ: invalid time window");

      // Invalid price impact factor (too low)
      await expect(
        hzToken.setDynamicTaxParams(validVolume, validTime, 50, validVolatility)
      ).to.be.revertedWith("HZ: invalid price impact factor");

      // Invalid price impact factor (too high)
      await expect(
        hzToken.setDynamicTaxParams(validVolume, validTime, 600, validVolatility)
      ).to.be.revertedWith("HZ: invalid price impact factor");

      // Invalid volatility factor (too low)
      await expect(
        hzToken.setDynamicTaxParams(validVolume, validTime, validPrice, 50)
      ).to.be.revertedWith("HZ: invalid volatility factor");

      // Invalid volatility factor (too high)
      await expect(
        hzToken.setDynamicTaxParams(validVolume, validTime, validPrice, 1500)
      ).to.be.revertedWith("HZ: invalid volatility factor");
    });

    it("Should reject dynamic tax parameter changes by non-owner", async function () {
      await expect(
        hzToken.connect(unauthorized).setDynamicTaxParams(
          ethers.parseEther("1000"), 3600, 150, 200
        )
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Tax Application in Transfers", function () {
    beforeEach(async function () {
      // Enable tax system
      await hzToken.setTaxRecipient(taxRecipient.address);
      await hzToken.setTaxEnabled(true);
      
      // Set up AMM pool for buy/sell testing
      await hzToken.setAMM(ammPool.address, true);
      
      // Transfer some tokens from user1 to AMM pool for buy transactions  
      const userBalance = await hzToken.balanceOf(user1.address);
      const transferAmount = userBalance / 2n; // Transfer half of user's balance
      if (transferAmount > 0) {
        await hzToken.connect(user1).transfer(ammPool.address, transferAmount);
      }
    });

    it("Should apply transfer tax on normal transfers", async function () {
      const transferAmount = ethers.parseEther("1000");
      const transferTaxRate = 50; // 0.5% from initial config
      const expectedTax = (transferAmount * BigInt(transferTaxRate)) / BigInt(10000);
      const expectedTransfer = transferAmount - expectedTax;

      const initialTaxRecipientBalance = await hzToken.balanceOf(taxRecipient.address);
      const initialUser1Balance = await hzToken.balanceOf(user1.address);
      const initialUser2Balance = await hzToken.balanceOf(user2.address);

      await expect(
        hzToken.connect(user1).transfer(user2.address, transferAmount)
      ).to.emit(hzToken, "TaxDeducted")
        .withArgs(user1.address, user2.address, expectedTax, "transfer");

      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialUser1Balance - transferAmount);
      expect(await hzToken.balanceOf(user2.address))
        .to.equal(initialUser2Balance + expectedTransfer);
      expect(await hzToken.balanceOf(taxRecipient.address))
        .to.equal(initialTaxRecipientBalance + expectedTax);
    });

    it("Should apply buy tax when buying from AMM", async function () {
      const buyAmount = ethers.parseEther("1000");
      const buyTaxRate = 100; // 1% from initial config
      const expectedTax = (buyAmount * BigInt(buyTaxRate)) / BigInt(10000);
      const expectedTransfer = buyAmount - expectedTax;

      const initialTaxRecipientBalance = await hzToken.balanceOf(taxRecipient.address);
      const initialAmmBalance = await hzToken.balanceOf(ammPool.address);
      const initialUser1Balance = await hzToken.balanceOf(user1.address);

      await expect(
        hzToken.connect(ammPool).transfer(user1.address, buyAmount)
      ).to.emit(hzToken, "TaxDeducted")
        .withArgs(ammPool.address, user1.address, expectedTax, "buy");

      expect(await hzToken.balanceOf(ammPool.address))
        .to.equal(initialAmmBalance - buyAmount);
      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialUser1Balance + expectedTransfer);
      expect(await hzToken.balanceOf(taxRecipient.address))
        .to.equal(initialTaxRecipientBalance + expectedTax);
    });

    it("Should apply sell tax when selling to AMM", async function () {
      const sellAmount = ethers.parseEther("1000");
      const sellTaxRate = 100; // 1% from initial config
      const expectedTax = (sellAmount * BigInt(sellTaxRate)) / BigInt(10000);
      const expectedTransfer = sellAmount - expectedTax;

      const initialTaxRecipientBalance = await hzToken.balanceOf(taxRecipient.address);
      const initialUser1Balance = await hzToken.balanceOf(user1.address);
      const initialAmmBalance = await hzToken.balanceOf(ammPool.address);

      await expect(
        hzToken.connect(user1).transfer(ammPool.address, sellAmount)
      ).to.emit(hzToken, "TaxDeducted")
        .withArgs(user1.address, ammPool.address, expectedTax, "sell");

      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialUser1Balance - sellAmount);
      expect(await hzToken.balanceOf(ammPool.address))
        .to.equal(initialAmmBalance + expectedTransfer);
      expect(await hzToken.balanceOf(taxRecipient.address))
        .to.equal(initialTaxRecipientBalance + expectedTax);
    });

    it("Should not apply tax to exempt addresses", async function () {
      const transferAmount = ethers.parseEther("1000");
      
      // Set user1 as tax exempt
      await hzToken.setTaxExempt(user1.address, true);

      const initialTaxRecipientBalance = await hzToken.balanceOf(taxRecipient.address);
      const initialUser1Balance = await hzToken.balanceOf(user1.address);
      const initialUser2Balance = await hzToken.balanceOf(user2.address);

      await hzToken.connect(user1).transfer(user2.address, transferAmount);

      // No tax should be applied
      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialUser1Balance - transferAmount);
      expect(await hzToken.balanceOf(user2.address))
        .to.equal(initialUser2Balance + transferAmount);
      expect(await hzToken.balanceOf(taxRecipient.address))
        .to.equal(initialTaxRecipientBalance); // No change
    });

    it("Should not apply tax when tax is disabled", async function () {
      const transferAmount = ethers.parseEther("1000");
      
      // Disable tax
      await hzToken.setTaxEnabled(false);

      const initialTaxRecipientBalance = await hzToken.balanceOf(taxRecipient.address);
      const initialUser1Balance = await hzToken.balanceOf(user1.address);
      const initialUser2Balance = await hzToken.balanceOf(user2.address);

      await hzToken.connect(user1).transfer(user2.address, transferAmount);

      // No tax should be applied
      expect(await hzToken.balanceOf(user1.address))
        .to.equal(initialUser1Balance - transferAmount);
      expect(await hzToken.balanceOf(user2.address))
        .to.equal(initialUser2Balance + transferAmount);
      expect(await hzToken.balanceOf(taxRecipient.address))
        .to.equal(initialTaxRecipientBalance); // No change
    });
  });

  describe("Tax Preview Functionality", function () {
    beforeEach(async function () {
      await hzToken.setTaxRecipient(taxRecipient.address);
      await hzToken.setTaxEnabled(true);
      await hzToken.setAMM(ammPool.address, true);
    });

    it("Should preview transfer tax correctly", async function () {
      const amount = ethers.parseEther("1000");
      const preview = await hzToken.previewTax(user1.address, user2.address, amount);
      
      const expectedTax = (amount * BigInt(50)) / BigInt(10000); // 0.5% transfer tax
      
      expect(preview.taxAmount).to.equal(expectedTax);
      expect(preview.transferAmount).to.equal(amount - expectedTax);
      expect(preview.taxType).to.equal("transfer");
      expect(preview.baseTaxRate).to.equal(50);
      expect(preview.dynamicMultiplier).to.equal(100); // Base multiplier
    });

    it("Should preview buy tax correctly", async function () {
      const amount = ethers.parseEther("1000");
      const preview = await hzToken.previewTax(ammPool.address, user1.address, amount);
      
      const expectedTax = (amount * BigInt(100)) / BigInt(10000); // 1% buy tax
      
      expect(preview.taxAmount).to.equal(expectedTax);
      expect(preview.transferAmount).to.equal(amount - expectedTax);
      expect(preview.taxType).to.equal("buy");
      expect(preview.baseTaxRate).to.equal(100);
    });

    it("Should preview sell tax correctly", async function () {
      const amount = ethers.parseEther("1000");
      const preview = await hzToken.previewTax(user1.address, ammPool.address, amount);
      
      const expectedTax = (amount * BigInt(100)) / BigInt(10000); // 1% sell tax
      
      expect(preview.taxAmount).to.equal(expectedTax);
      expect(preview.transferAmount).to.equal(amount - expectedTax);
      expect(preview.taxType).to.equal("sell");
      expect(preview.baseTaxRate).to.equal(100);
    });

    it("Should preview exempt transfers correctly", async function () {
      await hzToken.setTaxExempt(user1.address, true);
      
      const amount = ethers.parseEther("1000");
      const preview = await hzToken.previewTax(user1.address, user2.address, amount);
      
      expect(preview.taxAmount).to.equal(0);
      expect(preview.transferAmount).to.equal(amount);
      expect(preview.taxType).to.equal("exempt");
      expect(preview.baseTaxRate).to.equal(0);
      expect(preview.dynamicMultiplier).to.equal(100);
    });
  });

  describe("Trading Statistics", function () {
    beforeEach(async function () {
      await hzToken.setTaxRecipient(taxRecipient.address);
      await hzToken.setTaxEnabled(true);
      await hzToken.setAMM(ammPool.address, true);
      
      // Transfer some tokens from user1 to AMM pool
      const userBalance = await hzToken.balanceOf(user1.address);
      const transferAmount = userBalance / 3n; // Transfer 1/3 of user's balance
      if (transferAmount > 0) {
        await hzToken.connect(user1).transfer(ammPool.address, transferAmount);
      }
    });

    it("Should track trading statistics", async function () {
      const transferAmount = ethers.parseEther("1000");
      
      const initialStats = await hzToken.getTradingStats();
      
      // Make a transfer to generate stats
      await hzToken.connect(user1).transfer(user2.address, transferAmount);
      
      const updatedStats = await hzToken.getTradingStats();
      
      expect(updatedStats.totalVolume24h).to.be.gt(initialStats.totalVolume24h);
      expect(updatedStats.recentTransactionCount).to.be.gt(initialStats.recentTransactionCount);
    });

    it("Should allow owner to manually update stats", async function () {
      const initialStats = await hzToken.getTradingStats();
      
      await expect(hzToken.updateStats())
        .to.emit(hzToken, "StatsUpdated");
      
      const updatedStats = await hzToken.getTradingStats();
      expect(updatedStats.lastStatsUpdate).to.be.gt(initialStats.lastStatsUpdate);
    });

    it("Should allow cleaning up old transactions", async function () {
      // Make some transfers to create transaction history
      const transferAmount = ethers.parseEther("100");
      for (let i = 0; i < 5; i++) {
        await hzToken.connect(user1).transfer(user2.address, transferAmount);
      }
      
      const initialStats = await hzToken.getTradingStats();
      expect(initialStats.recentTransactionCount).to.be.gt(0);
      
      // Fast forward time to make transactions old
      await time.increase(25 * 60 * 60); // 25 hours
      
      await expect(hzToken.cleanupOldTransactions())
        .to.emit(hzToken, "TransactionHistoryCleanup");
    });

    it("Should get recent transactions", async function () {
      const transferAmount = ethers.parseEther("100");
      
      // Make some transfers
      await hzToken.connect(user1).transfer(user2.address, transferAmount);
      await hzToken.connect(ammPool).transfer(user1.address, transferAmount); // Buy
      await hzToken.connect(user1).transfer(ammPool.address, transferAmount); // Sell
      
      const recentTx = await hzToken.getRecentTransactions(3);
      
      expect(recentTx.amounts.length).to.equal(3);
      expect(recentTx.timestamps.length).to.equal(3);
      expect(recentTx.isBuy.length).to.equal(3);
      expect(recentTx.isSell.length).to.equal(3);
      
      // Check that buy/sell flags are set correctly
      expect(recentTx.isBuy[1]).to.be.true; // Second transaction was a buy
      expect(recentTx.isSell[2]).to.be.true; // Third transaction was a sell
    });
  });

  describe("Access Control & Upgrade", function () {
    it("Should enforce onlyOwner modifier on management functions", async function () {
      const functions = [
        () => hzToken.connect(unauthorized).mint(user1.address, ethers.parseEther("100")),
        () => hzToken.connect(unauthorized).pause(),
        () => hzToken.connect(unauthorized).unpause(),
        () => hzToken.connect(unauthorized).addToBlacklist(user1.address),
        () => hzToken.connect(unauthorized).removeFromBlacklist(user1.address),
        () => hzToken.connect(unauthorized).setTaxConfig(100, 100, 100, 100, false, 200),
        () => hzToken.connect(unauthorized).setTaxRecipient(taxRecipient.address),
        () => hzToken.connect(unauthorized).setTaxEnabled(true),
        () => hzToken.connect(unauthorized).updateStats(),
      ];

      for (const func of functions) {
        await expect(func()).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
      }
    });

    it("Should authorize upgrade only for owner", async function () {
      await expect(
        hzToken.connect(unauthorized).upgradeToAndCall(await hzToken.getAddress(), "0x")
      ).to.be.revertedWithCustomError(hzToken, "OwnableUnauthorizedAccount");
    });

    it("Should return correct version", async function () {
      expect(await hzToken.version()).to.equal("2.1.0");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle zero amount transfers", async function () {
      const initialBalance1 = await hzToken.balanceOf(user1.address);
      const initialBalance2 = await hzToken.balanceOf(user2.address);
      
      await hzToken.connect(user1).transfer(user2.address, 0);
      
      expect(await hzToken.balanceOf(user1.address)).to.equal(initialBalance1);
      expect(await hzToken.balanceOf(user2.address)).to.equal(initialBalance2);
    });

    it("Should handle self transfers", async function () {
      const initialBalance = await hzToken.balanceOf(user1.address);
      const transferAmount = ethers.parseEther("100");
      
      await hzToken.connect(user1).transfer(user1.address, transferAmount);
      
      expect(await hzToken.balanceOf(user1.address)).to.equal(initialBalance);
    });

    it("Should handle maximum allowance correctly", async function () {
      const maxAllowance = ethers.MaxUint256;
      
      await hzToken.connect(user1).approve(user2.address, maxAllowance);
      expect(await hzToken.allowance(user1.address, user2.address)).to.equal(maxAllowance);
      
      // Transfer should not decrease allowance when it's max
      const transferAmount = ethers.parseEther("100");
      await hzToken.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
      expect(await hzToken.allowance(user1.address, user2.address)).to.equal(maxAllowance);
    });

    it("Should handle large numbers correctly", async function () {
      const currentSupply = await hzToken.totalSupply();
      
      // Since all tokens are already minted, total supply should equal max supply
      expect(currentSupply).to.equal(TOTAL_SUPPLY);
      
      // Large transfers should work if user has enough balance
      const userBalance = await hzToken.balanceOf(user1.address);
      if (userBalance > ethers.parseEther("1000")) {
        const largeTransfer = ethers.parseEther("1000");
        await expect(
          hzToken.connect(user1).transfer(user2.address, largeTransfer)
        ).to.not.be.reverted;
      }
    });
  });
});