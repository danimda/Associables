const {
    expect
} = require("chai");
const {
    ethers
} = require("hardhat");

const woodURI = "QmTNHJfqrmMreXAjypxRdLEKubyF9YFQWR2arcYfUg1Yjq";
const stoneURI = "Qmar2QZ49GJiUA1Vqi7aGWovLajTsmcXSnsPcPyRmp8AwY";
const ironURI = "QmVdMjsgodDEKqpAbn7UeL3bUWzyDCHopUFLngVk7j1QPD";
const shortSwordURI = "QmRgZZoextpAgHKPGEuiQuRDK3YbZhVS7Cb2eCQ8zyoMHV";

const WOOD = 0;
const STONE = 1;
const IRON = 2;
const SHORTSWORD = 3;

const baseURI = "https://gateway.ipfs.io/ipfs/";

describe("Associables", function () {
    let nrgToken, associables;
    let owner;
    let [ownerWoodCount, ownerStoneCount, ownerIronCount, ownerShortSwordCount] = [0, 0, 0 ,0];

    const tokenSupply = ethers.utils.parseEther("1");

    before(async () => {
        [owner] = await hre.ethers.getSigners();
        const NRGToken = await hre.ethers.getContractFactory("NRGToken");
        nrgToken = await NRGToken.deploy(tokenSupply);

        const Associables = await hre.ethers.getContractFactory("Associables");
        associables = await Associables.deploy(nrgToken.address, 50);
    });

    it("Should have no associable types added", async function () {
        let numberOfAssociabled = await associables.associablesTypesCount();
        expect(numberOfAssociabled).to.be.equal(0);
    });

    describe("Add a new associable, wood", function () {
        before(async () => {
            await associables.addAssociable("wood", 1000000, baseURI + woodURI, [], [], 10000, 500);
        });

        it("Should have 1 associable type added", async function () {
            let numberOfAssociabled = await associables.associablesTypesCount();
            expect(numberOfAssociabled).to.be.equal(1);
        });
        it("Should be in use", async function () {
            let itemIndex = await associables.associablesIndex("wood");
            expect(itemIndex.index.toString()).to.be.equal("0");
            expect(itemIndex.inUse.toString()).to.be.equal("true");
        });

        describe("Add 3 new associables, stone, iron, short sword", function () {
            before(async () => {
                await associables.addAssociable("stone", 10000000, baseURI + stoneURI, [], [], 10000, 500);
                await associables.addAssociable("iron", 10000000, baseURI + ironURI, [], [], 10000, 500);
                await associables.addAssociable("short sword", 10000, baseURI + shortSwordURI, ["wood", "iron"], ["2", "2"], 0, 1000);
            });

            it("Should have 4 associable type added", async function () {
                let numberOfAssociabled = await associables.associablesTypesCount();
                expect(numberOfAssociabled).to.be.equal(4);
            });
            it("Should be in use", async function () {
                let itemIndex = await associables.associablesIndex("stone");
                expect(itemIndex.index.toString()).to.be.equal("1");
                expect(itemIndex.inUse.toString()).to.be.equal("true");

                itemIndex = await associables.associablesIndex("iron");
                expect(itemIndex.index.toString()).to.be.equal("2");
                expect(itemIndex.inUse.toString()).to.be.equal("true");

                itemIndex = await associables.associablesIndex("short sword");
                expect(itemIndex.index.toString()).to.be.equal("3");
                expect(itemIndex.inUse.toString()).to.be.equal("true");
            });
        });
        describe("Add an associable that already exists, short sword", function () {
            it("Should throw error", async function () {
                let errorMessage;
                try{
                    await associables.addAssociable("short sword", 10000, baseURI + shortSwordURI, ["wood", "iron"], ["2", "2"], 0, 1000);
                } catch (e){
                    errorMessage = e.message;
                }
                expect(errorMessage).to.contain("This item has already been included as an associable.");
                //expect( associables.addAssociable("short sword", 10000, baseURI + shortSwordURI, ["wood", "iron"], ["2", "2"], 0, 1000)).to.throw("This item has already been included as an associable.");
            });
        });
        describe("Craft some items", function () {
            before(async () => {
                await nrgToken.approve(associables.address, 63000);
                await associables.craft(owner.address, "wood");
                await associables.craft(owner.address, "wood");
                await associables.craft(owner.address, "wood");
                await associables.craft(owner.address, "iron");
                await associables.craft(owner.address, "iron");
                ownerWoodCount += 3;
                ownerIronCount += 2;
            });
            it("Should have 3 pieces of wood", async function () {
                let balance = await associables.balanceOf(owner.address, WOOD);
                expect(balance.toString()).to.equal(ownerWoodCount.toString());
            });
            it("Should have 2 pieces of iron", async function () {
                let balance = await associables.balanceOf(owner.address, IRON);
                expect(balance.toString()).to.equal(ownerIronCount.toString());
            });
            it("Should have 0 pieces of stone", async function () {
                let balance = await associables.balanceOf(owner.address, STONE);
                expect(balance.toString()).to.equal(ownerStoneCount.toString());
            });
            it("Should have 0 pieces of short sword", async function () {
                let balance = await associables.balanceOf(owner.address, SHORTSWORD);
                expect(balance.toString()).to.equal(ownerShortSwordCount.toString());
            });
            it("Should have nrgToken", async function () {
                let nrgTokenBalance = await nrgToken.balanceOf(associables.address);
                expect(nrgTokenBalance).to.equal("51250");
                expect(await associables.fees()).to.equal("1250");
            });
        });
        describe("Craft a short sword", function () {
            before(async () => {
                await nrgToken.approve(associables.address, 1000);
                await associables.craft(owner.address, "short sword");
                ownerShortSwordCount += 1;
                ownerWoodCount -= 2;
                ownerIronCount -= 2;
            });
            it("Should have 1 piece of wood", async function () {
                let balance = await associables.balanceOf(owner.address, WOOD);
                expect(balance.toString()).to.equal(ownerWoodCount.toString());
            });
            it("Should have 0 pieces of iron", async function () {
                let balance = await associables.balanceOf(owner.address, IRON);
                expect(balance.toString()).to.equal(ownerIronCount.toString());
            });
            it("Should have 1 short sword", async function () {
                let balance = await associables.balanceOf(owner.address, SHORTSWORD);
                expect(balance.toString()).to.equal(ownerShortSwordCount.toString());
            });
            it("Should have more nrgToken", async function () {
                let nrgTokenBalance = await nrgToken.balanceOf(associables.address);
                expect(nrgTokenBalance).to.equal("51750");
                expect(await associables.fees()).to.equal("1750");
            });
        });
        describe("Deconstruct a short sword", function () {
            before(async () => {
                await nrgToken.approve(associables.address, 1000);
                await associables.deconstruct(SHORTSWORD);
                ownerShortSwordCount -= 1;
                ownerWoodCount += 2;
                ownerIronCount += 2;
            });
            it("Should have 3 pieces of wood", async function () {
                let balance = await associables.balanceOf(owner.address, WOOD);
                expect(balance.toString()).to.equal(ownerWoodCount.toString());
            });
            it("Should have 2 pieces of iron", async function () {
                let balance = await associables.balanceOf(owner.address, IRON);
                expect(balance.toString()).to.equal(ownerIronCount.toString());
            });
            it("Should have 0 short sword", async function () {
                let balance = await associables.balanceOf(owner.address, SHORTSWORD);
                expect(balance.toString()).to.equal(ownerShortSwordCount.toString());
            });
            it("Should have 0 stone", async function () {
                let balance = await associables.balanceOf(owner.address, STONE);
                expect(balance.toString()).to.equal(ownerStoneCount.toString());
            });
            it("Should have updated nrgToken", async function () {
                let nrgTokenBalance = await nrgToken.balanceOf(associables.address);
                expect(nrgTokenBalance).to.equal("52250");
                expect(await associables.fees()).to.equal("2250");
            });
        });
        describe("Update wood max supply", function () {
            before(async () => {
                await associables.updateAssociableMaxSupply("wood", 5);
                await nrgToken.approve(associables.address, 31500);
            });
            it("Should let me craft 2 more wood", async function () {
                await associables.craft(owner.address, "wood");
                await associables.craft(owner.address, "wood");
                ownerWoodCount += 2;
                let balance = await associables.balanceOf(owner.address, WOOD);
                expect(balance.toString()).to.equal(ownerWoodCount.toString());
            });
            it("Should not let me craft more than max supply", async function () {
                let errorMessage;
                try{
                    await associables.craft(owner.address, "wood");
                } catch (e){
                    errorMessage = e.message;
                }
                expect(errorMessage).to.contain("The max supply for this associbale has already been reached. Cannot craft anymore.");
            });
        });
        describe("Add a new image url for associable for a provider", function () {
            before(async () => {
                await associables.addAssociableImageURI("wood", "A", "https://img1");
                await associables.addAssociableImageURI("wood", "B", "https://img2");
            });
            it("Should display the correct image url", async function () {
                let url = await associables.getAssociableImageURI("wood", "A");
                expect(url).to.equal("https://img1");
                url = await associables.getAssociableImageURI("wood", "B");
                expect(url).to.equal("https://img2");
            });
            it("Should not display the url on another associable", async function () {
                let url = await associables.getAssociableImageURI("stone", "A");
                console.log(url);
                expect(url).to.equal("");
            });
            it("Should not display a url on the associable for another provider", async function () {
                let url = await associables.getAssociableImageURI("stone", "C");
                console.log(url);
                expect(url).to.equal("");
            });
        });
    });
});