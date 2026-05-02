import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("AgentCourt", function () {
  async function deployFixture() {
    const [owner, forensic, analysis, verifier, stranger] = await ethers.getSigners();
    const AgentCourt = await ethers.getContractFactory("AgentCourt");
    const contract = await AgentCourt.deploy();
    await contract.waitForDeployment();
    return { contract, owner, forensic, analysis, verifier, stranger };
  }

  describe("createCase", function () {
    it("should create a case and emit event", async function () {
      const { contract, forensic, analysis, verifier } = await loadFixture(deployFixture);
      const disputeRef = ethers.keccak256(ethers.toUtf8Bytes("ETH above $3k?"));
      const stake = ethers.parseEther("0.01");

      const tx = await contract.connect(forensic)
        .createCase(disputeRef, analysis.address, verifier.address, { value: stake });

      await expect(tx).to.emit(contract, "CaseCreated");

      const c = await contract.cases(1);
      expect(c.forensic).to.equal(forensic.address);
      expect(c.analysis).to.equal(analysis.address);
      expect(c.verdict).to.equal(0);
    });

    it("should reject stake below minimum", async function () {
      const { contract, forensic, analysis, verifier } = await loadFixture(deployFixture);
      await expect(
        contract.connect(forensic).createCase(
          ethers.ZeroHash, analysis.address, verifier.address,
          { value: ethers.parseEther("0.0001") }
        )
      ).to.be.revertedWith("Stake too low");
    });

    it("should reject zero address analysis", async function () {
      const { contract, forensic, verifier } = await loadFixture(deployFixture);
      await expect(
        contract.connect(forensic).createCase(
          ethers.ZeroHash, ethers.ZeroAddress, verifier.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Invalid address");
    });

    it("should reject self-suing", async function () {
      const { contract, forensic, verifier } = await loadFixture(deployFixture);
      await expect(
        contract.connect(forensic).createCase(
          ethers.ZeroHash, forensic.address, verifier.address,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Cannot self-investigate");
    });

    it("should increment caseCount", async function () {
      const { contract, forensic, analysis, verifier } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("0.01");

      await contract.connect(forensic).createCase(
        ethers.ZeroHash, analysis.address, verifier.address, { value: stake }
      );
      await contract.connect(forensic).createCase(
        ethers.ZeroHash, analysis.address, verifier.address, { value: stake }
      );
      expect(await contract.caseCount()).to.equal(2);
    });
  });

  describe("joinCase", function () {
    async function caseFixture() {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.forensic).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.analysis.address, base.verifier.address, { value: stake }
      );
      return { ...base, stake };
    }

    it("should allow analysis to join", async function () {
      const { contract, analysis, stake } = await loadFixture(caseFixture);
      await contract.connect(analysis).joinCase(1, { value: stake });
      const c = await contract.cases(1);
      expect(c.analysisStake).to.equal(stake);
    });

    it("should reject non-analysis", async function () {
      const { contract, forensic, stake } = await loadFixture(caseFixture);
      await expect(
        contract.connect(forensic).joinCase(1, { value: stake })
      ).to.be.revertedWith("Not the analysis");
    });

    it("should reject double join", async function () {
      const { contract, analysis, stake } = await loadFixture(caseFixture);
      await contract.connect(analysis).joinCase(1, { value: stake });
      await expect(
        contract.connect(analysis).joinCase(1, { value: stake })
      ).to.be.revertedWith("Already joined");
    });
  });

  describe("resolveCase", function () {
    async function joinedFixture() {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.forensic).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.analysis.address, base.verifier.address, { value: stake }
      );
      await base.contract.connect(base.analysis).joinCase(1, { value: stake });
      return { ...base, stake };
    }

    it("should resolve as forensic wins", async function () {
      const { contract, verifier } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("reasoning"));
      await contract.connect(verifier).resolveCase(1, 1, ref);
      const c = await contract.cases(1);
      expect(c.verdict).to.equal(1);
      expect(c.reasoningRef).to.equal(ref);
    });

    it("should resolve as analysis wins", async function () {
      const { contract, verifier } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("reasoning"));
      await contract.connect(verifier).resolveCase(1, 2, ref);
      expect((await contract.cases(1)).verdict).to.equal(2);
    });

    it("should resolve as tied", async function () {
      const { contract, verifier } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("reasoning"));
      await contract.connect(verifier).resolveCase(1, 3, ref);
      expect((await contract.cases(1)).verdict).to.equal(3);
    });

    it("should reject non-verifier", async function () {
      const { contract, forensic } = await loadFixture(joinedFixture);
      await expect(
        contract.connect(forensic).resolveCase(1, 1, ethers.ZeroHash)
      ).to.be.revertedWith("Only verifier can resolve");
    });

    it("should reject double resolve", async function () {
      const { contract, verifier } = await loadFixture(joinedFixture);
      const ref = ethers.keccak256(ethers.toUtf8Bytes("r"));
      await contract.connect(verifier).resolveCase(1, 1, ref);
      await expect(
        contract.connect(verifier).resolveCase(1, 1, ref)
      ).to.be.revertedWith("Already resolved");
    });

    it("should reject PENDING verdict", async function () {
      const { contract, verifier } = await loadFixture(joinedFixture);
      await expect(
        contract.connect(verifier).resolveCase(1, 0, ethers.keccak256(ethers.toUtf8Bytes("r")))
      ).to.be.revertedWith("Invalid verdict");
    });
  });

  describe("withdrawWinnings", function () {
    // Named fixtures — no anonymous functions!
    async function forensicWinsFixture() {
      return createResolvedFixture(1);
    }
    async function analysisWinsFixture() {
      return createResolvedFixture(2);
    }
    async function tiedFixture() {
      return createResolvedFixture(3);
    }

    async function createResolvedFixture(verdictCode: number) {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.forensic).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.analysis.address, base.verifier.address, { value: stake }
      );
      await base.contract.connect(base.analysis).joinCase(1, { value: stake });
      await base.contract.connect(base.verifier).resolveCase(
        1, verdictCode, ethers.keccak256(ethers.toUtf8Bytes("r"))
      );
      return { ...base, stake };
    }

    it("should pay winner (forensic wins)", async function () {
      const { contract, forensic } = await loadFixture(forensicWinsFixture);
      const balBefore = await ethers.provider.getBalance(forensic.address);
      const tx = await contract.connect(forensic).withdrawWinnings(1);
      await tx.wait();
      const balAfter = await ethers.provider.getBalance(forensic.address);
      expect(balAfter - balBefore).to.be.gt(ethers.parseEther("0.01"));
    });

    it("should pay winner (analysis wins)", async function () {
      const { contract, analysis } = await loadFixture(analysisWinsFixture);
      const tx = await contract.connect(analysis).withdrawWinnings(1);
      await expect(tx).to.emit(contract, "WinningsWithdrawn");
    });

    it("should refund both when tied", async function () {
      const base = await loadFixture(tiedFixture);
      await base.contract.connect(base.forensic).withdrawWinnings(1);
      await base.contract.connect(base.analysis).withdrawWinnings(1);
      const c = await base.contract.cases(1);
      expect(c.forensicWithdrawn).to.be.true;
      expect(c.analysisWithdrawn).to.be.true;
    });

    it("should reject loser withdrawing", async function () {
      const { contract, analysis } = await loadFixture(forensicWinsFixture);
      await expect(
        contract.connect(analysis).withdrawWinnings(1)
      ).to.be.revertedWith("Not the winner");
    });
  });

  describe("withdrawJudgeFee", function () {
    async function resolvedFixture() {
      const base = await deployFixture();
      const stake = ethers.parseEther("0.01");
      await base.contract.connect(base.forensic).createCase(
        ethers.keccak256(ethers.toUtf8Bytes("Test")),
        base.analysis.address, base.verifier.address, { value: stake }
      );
      await base.contract.connect(base.analysis).joinCase(1, { value: stake });
      await base.contract.connect(base.verifier).resolveCase(
        1, 1, ethers.keccak256(ethers.toUtf8Bytes("r"))
      );
      return { ...base, stake };
    }

    it("should allow verifier to withdraw fee", async function () {
      const base = await loadFixture(resolvedFixture);
      await expect(
        base.contract.connect(base.verifier).withdrawJudgeFee(1)
      ).to.emit(base.contract, "FeeWithdrawn");
    });

    it("should reject non-verifier", async function () {
      const base = await loadFixture(resolvedFixture);
      await expect(
        base.contract.connect(base.forensic).withdrawJudgeFee(1)
      ).to.be.revertedWith("Only verifier");
    });
  });
});
