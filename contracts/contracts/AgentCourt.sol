// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentCourt
 * @notice Decentralized arbitration for AI agent disputes on 0G Chain.
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
        address plaintiff;            // Agent A wallet
        address defendant;            // Agent B wallet
        address judge;                // Agent C wallet
        bytes32 disputeRef;           // 0G Storage KV key — dispute question
        uint256 stakeAmount;          // Stake per side
        uint256 plaintiffStake;       // Actual plaintiff deposit
        uint256 defendantStake;       // Actual defendant deposit
        uint256 judgeFee;             // Fee paid to judge (deducted from total stakes)
        Verdict verdict;              // Final verdict
        bytes32 reasoningRef;         // 0G Storage Log key — judge reasoning
        uint256 createdAt;
        uint256 resolvedAt;
        bool plaintiffWithdrawn;
        bool defendantWithdrawn;
        bool judgeWithdrawn;
    }

    // ===================== Events =====================

    event CaseCreated(uint256 indexed caseId, address plaintiff, bytes32 disputeRef, uint256 stakeAmount);
    event DefendantJoined(uint256 indexed caseId, address defendant);
    event CaseResolved(uint256 indexed caseId, Verdict verdict, bytes32 reasoningRef);
    event WinningsWithdrawn(uint256 indexed caseId, address winner);
    event FeeWithdrawn(uint256 indexed caseId, address judge, uint256 amount);

    // ===================== Storage =====================

    uint256 public caseCount;
    mapping(uint256 => Case) public cases;

    uint256 public constant MIN_STAKE = 0.001 ether;

    constructor() Ownable(msg.sender) {}

    // ===================== Case Lifecycle =====================

    /**
     * @notice Create a new dispute case as the plaintiff.
     * @param _disputeRef 0G Storage KV reference to the dispute question
     * @param _defendant  Address of the defendant agent
     * @param _judge      Address of the judge agent
     */
    function createCase(
        bytes32 _disputeRef,
        address _defendant,
        address _judge
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= MIN_STAKE, "Stake too low");
        require(_defendant != address(0) && _judge != address(0), "Invalid address");
        require(_defendant != msg.sender, "Cannot sue yourself");
        require(_judge != msg.sender && _judge != _defendant, "Invalid judge");

        caseCount++;
        uint256 caseId = caseCount;

        cases[caseId] = Case({
            id: caseId,
            plaintiff: msg.sender,
            defendant: _defendant,
            judge: _judge,
            disputeRef: _disputeRef,
            stakeAmount: msg.value,
            plaintiffStake: msg.value,
            defendantStake: 0,
            judgeFee: 0,
            verdict: Verdict.PENDING,
            reasoningRef: bytes32(0),
            createdAt: block.timestamp,
            resolvedAt: 0,
            plaintiffWithdrawn: false,
            defendantWithdrawn: false,
            judgeWithdrawn: false
        });

        emit CaseCreated(caseId, msg.sender, _disputeRef, msg.value);
        return caseId;
    }

    /**
     * @notice Join an existing case as the defendant.
     * @param _caseId The case to join
     */
    function joinCase(uint256 _caseId) external payable nonReentrant {
        Case storage c = cases[_caseId];
        require(c.id != 0, "Case not found");
        require(c.verdict == Verdict.PENDING, "Case already resolved");
        require(msg.sender == c.defendant, "Not the defendant");
        require(c.defendantStake == 0, "Already joined");
        require(msg.value >= c.stakeAmount, "Stake must match plaintiff");

        c.defendantStake = msg.value;

        emit DefendantJoined(_caseId, msg.sender);
    }

    /**
     * @notice Resolve a case. Only the designated judge can call this.
     * @param _caseId      The case to resolve
     * @param _verdict     Final verdict
     * @param _reasoningRef 0G Storage Log reference to the judge's full reasoning
     */
    function resolveCase(
        uint256 _caseId,
        Verdict _verdict,
        bytes32 _reasoningRef
    ) external nonReentrant {
        Case storage c = cases[_caseId];
        require(c.id != 0, "Case not found");
        require(c.verdict == Verdict.PENDING, "Already resolved");
        require(msg.sender == c.judge, "Only judge can resolve");
        require(c.defendantStake > 0, "Defendant has not staked");
        require(_verdict != Verdict.PENDING, "Invalid verdict");
        require(_reasoningRef != bytes32(0), "Reasoning required");

        c.verdict = _verdict;
        c.reasoningRef = _reasoningRef;
        c.resolvedAt = block.timestamp;

        // Judge earns 10% of total stakes as fee
        c.judgeFee = ((c.plaintiffStake + c.defendantStake) * 10) / 100;

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

        uint256 totalPot = c.plaintiffStake + c.defendantStake;
        uint256 payoutPool = totalPot - c.judgeFee;
        uint256 amount;

        if (c.verdict == Verdict.PLAINTIFF_WINS) {
            require(msg.sender == c.plaintiff, "Not the winner");
            require(!c.plaintiffWithdrawn, "Already withdrawn");
            c.plaintiffWithdrawn = true;
            amount = payoutPool;
        } else if (c.verdict == Verdict.DEFENDANT_WINS) {
            require(msg.sender == c.defendant, "Not the winner");
            require(!c.defendantWithdrawn, "Already withdrawn");
            c.defendantWithdrawn = true;
            amount = payoutPool;
        } else {
            // TIED — each side gets their stake back
            if (msg.sender == c.plaintiff && !c.plaintiffWithdrawn) {
                c.plaintiffWithdrawn = true;
                amount = c.plaintiffStake;
            } else if (msg.sender == c.defendant && !c.defendantWithdrawn) {
                c.defendantWithdrawn = true;
                amount = c.defendantStake;
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
        require(msg.sender == c.judge, "Only judge");
        require(!c.judgeWithdrawn, "Already withdrawn");
        require(c.judgeFee > 0, "No fee");

        c.judgeWithdrawn = true;
        (bool success, ) = payable(msg.sender).call{value: c.judgeFee}("");
        require(success, "Transfer failed");

        emit FeeWithdrawn(_caseId, msg.sender, c.judgeFee);
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
