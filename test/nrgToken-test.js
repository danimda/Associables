const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Energy Token", function () {
  let nrgToken;
  let owner;

  const tokenSupply = ethers.utils.parseEther("1");

  before(async () => {
    [owner] = await hre.ethers.getSigners();
    const NRGToken = await hre.ethers.getContractFactory("NRGToken");
    nrgToken = await NRGToken.deploy(tokenSupply);
  });

  it("Should have minted all tokens to the owner address", async function () {
    let balance = await nrgToken.balanceOf(owner.address);
    expect(balance).to.be.equal(tokenSupply);
  });
  
  it("Should return 0 decimals", async function () {
    let decimals = await nrgToken.decimals();
    expect(decimals).to.be.equal(0);
  });

});
