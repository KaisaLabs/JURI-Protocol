import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("AgentCourt", function () {
  async function deployFixture() {
    const [owner, plaintiff, defendant, judge, stranger] = await ethers.getSigners();
    const AgentCourt = await ethers.getContractFactory("AgentCourt");
    const contract = await AgentCourt.deploy();
    await contract.waitForDeployment();
    return { contract, owner, plaintiff, defendant, judge, stranger };
  }

  describe("createCase", function () {
    it("should create a case and emit event", async function () {
      const { contract, plaintiff, defendant, judge } = await loadFixture(deployFixture);
      const disputeRef = ethers.keccak256(ethers.toUtf8Bytes("ETH above $3k?"));
      const stake = ethers.parseEther("0.01");

      const tx = await contract.connect(plaintiff)
        .createCase(disputeRef, defendant.address, judge.address, { value: stake });

      await expect(tx).to.emit(contract, "CaseCreated");

      const c = await contract.cases(1);
      expect(c.plaintiff).to.equal(plaintiff.address);
      expect(c.defendant).to.equal(defendant.address);
      expect(c.verdict).to.equal(0);
    });

    it("should reject stake below minimum", async function () {
      const { contract, plaintiff, defendant, judge } = await loadFixture(deployFixture);
      await expect(
        contract.connect(plaintiff).createCase(
          ethers.ZeroHash, defendant.address, judge.address,
          { value: ethers.parseEther("0.0001") }
        )
      ).to.be.revertedWith("Stake too low");
    });

    it("should reject zero address defendant", async function () {
      const { contract, plaintiff, judge } = await loadFixture(deployFixture);
      await expect(
        contract.connect(plaintiff).createCase(
          ethers.ZeroHash, ethers.ZeroAddress, judge.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Invalid address");
    });

    it("should reject self-suing", async function () {
      const { contract, plaintiff, judge } = await loadFixture(deployFixture);
      await expect(
        contract.connect(plaintiff).createCase(
          ethers.ZeroHash, plaintiff.address, judge.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Cannot sue yourself");
    });

    it("should increment caseCount", async function () {
      const { contract, plaintiff, defendant, judge } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("0.01");

      await contract.connect(plaintiff).createCase(
        ethers.ZeroHash, defendant.address, judge.address, { value: stake }
      );
      await contract.connect(plaintiff).createCase(
        ethers.ZeroHash, defendant.address, judge.address, { value: stake }
      );
      expect(await contract.caseCount()).to.equal(2);
    });
  });

  describe("joinCase", function () {
    async function caseFixture() {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.plaintiff).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.defendant.address, base.judge.address, { value: stake }
      );
      return { ...base, stake };
    }

    it("should allow defendant to join", async function () {
      const { contract, defendant, stake } = await loadFixture(caseFixture);
      await contract.connect(defendant).joinCase(1, { value: stake });
      const c = await contract.cases(1);
      expect(c.defendantStake).to.equal(stake);
    });

    it("should reject non-defendant", async function () {
      const { contract, plaintiff, stake } = await loadFixture(caseFixture);
      await expect(
        contract.connect(plaintiff).joinCase(1, { value: stake })
      ).to.be.revertedWith("Not the defendant");
    });

    it("should reject double join", async function () {
      const { contract, defendant, stake } = await loadFixture(caseFixture);
      await contract.connect(defendant).joinCase(1, { value: stake });
      await expect(
        contract.connect(defendant).joinCase(1, { value: stake })
      ).to.be.revertedWith("Already joined");
    });
  });

  describe("resolveCase", function () {
    async function joinedFixture() {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.plaintiff).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.defendant.address, base.judge.address, { value: stake }
      );
      await base.contract.connect(base.defendant).joinCase(1, { value: stake });
      return { ...base, stake };
    }

    it("should resolve as plaintiff wins", async function () {
      const { contract, judge } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("reasoning"));
      await contract.connect(judge).resolveCase(1, 1, ref);
      const c = await contract.cases(1);
      expect(c.verdict).to.equal(1);
      expect(c.reasoningRef).to.equal(ref);
    });

    it("should resolve as defendant wins", async function () {
      const { contract, judge } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("reasoning"));
      await contract.connect(judge).resolveCase(1, 2, ref);
      expect((await contract.cases(1)).verdict).to.equal(2);
    });

    it("should resolve as tied", async function () {
      const { contract, judge } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("reasoning"));
      await contract.connect(judge).resolveCase(1, 3, ref);
      expect((await contract.cases(1)).verdict).to.equal(3);
    });

    it("should reject non-judge", async function () {
      const { contract, plaintiff } = await loadFixture(joinedFixture);
      await expect(
        contract.connect(plaintiff).resolveCase(1, 1, ethers.ZeroHash)
      ).to.be.revertedWith("Only judge can resolve");
    });

    it("should reject double resolve", async function () {
      const { contract, judge } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("r"));
      await contract.connect(judge).resolveCase(1, 1, ref);
      await expect(
        contract.connect(judge).resolveCase(1, 1, ref)
      ).to.be.revertedWith("Already resolved");
    });

    it("should reject PENDING verdict", async function () {
      const { contract, judge } = await loadFixture(joinedFixture);
      await expect(
        contract.connect(judge).resolveCase(1, 0, ethers.keccak256(ethers.toUtf8Bytes("r")))
      ).to.be.revertedWith("Invalid verdict");
    });
  });

  describe("withdrawWinnings", function () {
    // Named fixtures — no anonymous functions!
    async function plaintiffWinsFixture() {
      return createResolvedFixture(1);
    }
    async function defendantWinsFixture() {
      return createResolvedFixture(2);
    }
    async function tiedFixture() {
      return createResolvedFixture(3);
    }

    async function createResolvedFixture(verdictCode: number) {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.plaintiff).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.defendant.address, base.judge.address, { value: stake }
      );
      await base.contract.connect(base.defendant).joinCase(1, { value: stake });
      await base.contract.connect(base.judge).resolveCase(
        1, verdictCode, ethers.keccak256(ethers.toUtf8Bytes("r"))
      );
      return { ...base, stake };
    }

    it("should pay winner (plaintiff wins)", async function () {
      const { contract, plaintiff } = await loadFixture(plaintiffWinsFixture);
      const balBefore = await ethers.provider.getBalance(plaintiff.address);
      const tx = await contract.connect(plaintiff).withdrawWinnings(1);
      await tx.wait();
      const balAfter = await ethers.provider.getBalance(plaintiff.address);
      expect(balAfter - balBefore).to.be.gt(ethers.parseEther("0.01"));
    });

    it("should pay winner (defendant wins)", async function () {
      const { contract, defendant } = await loadFixture(defendantWinsFixture);
      const tx = await contract.connect(defendant).withdrawWinnings(1);
      await expect(tx).to.emit(contract, "WinningsWithdrawn");
    });

    it("should refund both when tied", async function () {
      const base = await loadFixture(tiedFixture);
      await base.contract.connect(base.plaintiff).withdrawWinnings(1);
      await base.contract.connect(base.defendant).withdrawWinnings(1);
      const c = await base.contract.cases(1);
      expect(c.plaintiffWithdrawn).to.be.true;
      expect(c.defendantWithdrawn).to.be.true;
    });

    it("should reject loser withdrawing", async function () {
      const { contract, defendant } = await loadFixture(plaintiffWinsFixture);
      await expect(
        contract.connect(defendant).withdrawWinnings(1)
      ).to.be.revertedWith("Not the winner");
    });
  });

  describe("withdrawJudgeFee", function () {
    async function resolvedFixture() {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.plaintiff).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.defendant.address, base.judge.address, { value: stake }
      );
      await base.contract.connect(base.defendant).joinCase(1, { value: stake });
      await base.contract.connect(base.judge).resolveCase(
        1, 1, ethers.keccak256(ethers.toUtf8Bytes("r"))
      );
      return { ...base, stake };
    }

    it("should allow judge to withdraw fee", async function () {
      const base = await loadFixture(resolvedFixture);
      await expect(
        base.contract.connect(base.judge).withdrawJudgeFee(1)
      ).to.emit(base.contract, "FeeWithdrawn");
    });

    it("should reject non-judge", async function () {
      const base = await loadFixture(resolvedFixture);
      await expect(
        base.contract.connect(base.plaintiff).withdrawJudgeFee(1)
      ).to.be.revertedWith("Only judge");
    });
  });
});
