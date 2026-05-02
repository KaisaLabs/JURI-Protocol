// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentCourt
 * @notice Decentralized arbitration for DeFi exploit investigations on 0G Chain.
 *         Agents stake tokens, present arguments off-chain (via AXL + 0G Storage),
 *         and a Judge Agent resolves the case on-chain.
 *
 *         Built for ETHGlobal Open Agents 2026.
 *         Tracks: 0G Autonomous Agents | Gensyn AXL | KeeperHub
 */
contract AgentCourt is Ownable, ReentrancyGuard {
    // ===================== Enums & Structs =====================

    enum Verdict {
        PENDING,        // 0
        PLAINTIFF_WINS, // 1
        DEFENDANT_WINS, // 2
        TIED           // 3
    }

    struct Case {
        uint256 id;
        address forensic;            // Agent A wallet
        address analysis;            // Agent B wallet
        address verifier;                // Agent C wallet
        bytes32 disputeRef;           // 0G Storage KV key — dispute question
        uint256 stakeAmount;          // Stake per side
        uint256 forensicStake;       // Actual forensic deposit
        uint256 analysisStake;       // Actual analysis deposit
        uint256 verifierFee;             // Fee paid to verifier (deducted from total stakes)
        Verdict verdict;              // Final verdict
        bytes32 reasoningRef;         // 0G Storage Log key — verifier reasoning
        uint256 createdAt;
        uint256 resolvedAt;
        bool forensicWithdrawn;
        bool analysisWithdrawn;
        bool verifierWithdrawn;
    }

    // ===================== Events =====================

    event CaseCreated(uint256 indexed caseId, address forensic, bytes32 disputeRef, uint256 stakeAmount);
    event DefendantJoined(uint256 indexed caseId, address analysis);
    event CaseResolved(uint256 indexed caseId, Verdict verdict, bytes32 reasoningRef);
    event WinningsWithdrawn(uint256 indexed caseId, address winner);
    event FeeWithdrawn(uint256 indexed caseId, address verifier, uint256 amount);

    // ===================== Storage =====================

    uint256 public caseCount;
    mapping(uint256 => Case) public cases;

    uint256 public constant MIN_STAKE = 0.001 ether;

    constructor() Ownable(msg.sender) {}

    // ===================== Case Lifecycle =====================

    /**
     * @notice Create a new dispute case as the forensic.
     * @param _disputeRef 0G Storage KV reference to the dispute question
     * @param _analysis  Address of the analysis agent
     * @param _verifier      Address of the verifier agent
     */
    function createCase(
        bytes32 _disputeRef,
        address _analysis,
        address _verifier
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= MIN_STAKE, "Stake too low");
        require(_analysis != address(0) && _verifier != address(0), "Invalid address");
        require(_analysis != msg.sender, "Cannot self-investigate");
        require(_verifier != msg.sender && _verifier != _analysis, "Invalid verifier");

        caseCount++;
        uint256 caseId = caseCount;

        cases[caseId] = Case({
            id: caseId,
            forensic: msg.sender,
            analysis: _analysis,
            verifier: _verifier,
            disputeRef: _disputeRef,
            stakeAmount: msg.value,
            forensicStake: msg.value,
            analysisStake: 0,
            verifierFee: 0,
            verdict: Verdict.PENDING,
            reasoningRef: bytes32(0),
            createdAt: block.timestamp,
            resolvedAt: 0,
            forensicWithdrawn: false,
            analysisWithdrawn: false,
            verifierWithdrawn: false
        });

        emit CaseCreated(caseId, msg.sender, _disputeRef, msg.value);
        return caseId;
    }

    /**
     * @notice Join an existing case as the analysis.
     * @param _caseId The case to join
     */
    function joinCase(uint256 _caseId) external payable nonReentrant {
        Case storage c = cases[_caseId];
        require(c.id != 0, "Case not found");
        require(c.verdict == Verdict.PENDING, "Case already resolved");
        require(msg.sender == c.analysis, "Not the analysis");
        require(c.analysisStake == 0, "Already joined");
        require(msg.value >= c.stakeAmount, "Stake must match forensic");

        c.analysisStake = msg.value;

        emit DefendantJoined(_caseId, msg.sender);
    }

    /**
     * @notice Resolve a case. Only the designated verifier can call this.
     * @param _caseId      The case to resolve
     * @param _verdict     Final verdict
     * @param _reasoningRef 0G Storage Log reference to the verifier's full reasoning
     */
    function resolveCase(
        uint256 _caseId,
        Verdict _verdict,
        bytes32 _reasoningRef
    ) external nonReentrant {
        Case storage c = cases[_caseId];
        require(c.id != 0, "Case not found");
        require(c.verdict == Verdict.PENDING, "Already resolved");
        require(msg.sender == c.verifier, "Only verifier can resolve");
        require(c.analysisStake > 0, "Defendant has not staked");
        require(_verdict != Verdict.PENDING, "Invalid verdict");
        require(_reasoningRef != bytes32(0), "Reasoning required");

        c.verdict = _verdict;
        c.reasoningRef = _reasoningRef;
        c.resolvedAt = block.timestamp;

        // Judge earns 10% of total stakes as fee
        c.verifierFee = ((c.forensicStake + c.analysisStake) * 10) / 100;

        emit CaseResolved(_caseId, _verdict, _reasoningRef);
    }

    // ===================== Withdrawals =====================

    /**
     * @notice Withdraw winnings after a case is resolved.
     */
    function withdrawWinnings(uint256 _caseId) external nonReentrant {
        Case storage c = cases[_caseId];
        require(c.id != 0, "Case not found");
        require(c.verdict != Verdict.PENDING, "Case not resolved");

        uint256 totalPot = c.forensicStake + c.analysisStake;
        uint256 payoutPool = totalPot - c.verifierFee;
        uint256 amount;

        if (c.verdict == Verdict.PLAINTIFF_WINS) {
            require(msg.sender == c.forensic, "Not the winner");
            require(!c.forensicWithdrawn, "Already withdrawn");
            c.forensicWithdrawn = true;
            amount = payoutPool;
        } else if (c.verdict == Verdict.DEFENDANT_WINS) {
            require(msg.sender == c.analysis, "Not the winner");
            require(!c.analysisWithdrawn, "Already withdrawn");
            c.analysisWithdrawn = true;
            amount = payoutPool;
        } else {
            // TIED — each side gets their stake back
            if (msg.sender == c.forensic && !c.forensicWithdrawn) {
                c.forensicWithdrawn = true;
                amount = c.forensicStake;
            } else if (msg.sender == c.analysis && !c.analysisWithdrawn) {
                c.analysisWithdrawn = true;
                amount = c.analysisStake;
            } else {
                revert("Not eligible or already withdrawn");
            }
        }

        require(amount > 0, "Nothing to withdraw");
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit WinningsWithdrawn(_caseId, msg.sender);
    }

    /**
     * @notice Judge withdraws their fee after case resolution.
     */
    function withdrawJudgeFee(uint256 _caseId) external nonReentrant {
        Case storage c = cases[_caseId];
        require(c.id != 0, "Case not found");
        require(c.verdict != Verdict.PENDING, "Case not resolved");
        require(msg.sender == c.verifier, "Only verifier");
        require(!c.verifierWithdrawn, "Already withdrawn");
        require(c.verifierFee > 0, "No fee");

        c.verifierWithdrawn = true;
        (bool success, ) = payable(msg.sender).call{value: c.verifierFee}("");
        require(success, "Transfer failed");

        emit FeeWithdrawn(_caseId, msg.sender, c.verifierFee);
    }

    // ===================== View =====================

    function getCase(uint256 _caseId) external view returns (Case memory) {
        require(cases[_caseId].id != 0, "Case not found");
        return cases[_caseId];
    }

    function getCaseCount() external view returns (uint256) {
        return caseCount;
    }

    // ===================== Fallback =====================
    receive() external payable {}
    fallback() external payable {}
}
