// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Lotto — Privacy-preserving on-chain lottery using Zama FHEVM
/// @notice Implements encrypted ticket numbers, encrypted draw results, and frontend user decryption per Zama template patterns
contract Lotto is SepoliaConfig, ERC721, Ownable {
    // ============================
    // Types
    // ============================
    struct Ticket {
        euint8 number; // encrypted ticket number (1..99)
        uint256 round; // round id when minted
        ebool isWinner; // encrypted winner flag, computed at draw time
        bool resultReady; // true after draw computed for this ticket
    }

    struct RoundMeta {
        euint8 winning; // encrypted winning number
        bool drawn; // true after draw
        uint256[] tickets; // tokenIds belonging to this round
        bytes32 winningCommitment; // commitment to winning clear number for later public reveal
        bool winningRevealed; // true once publicly revealed
        uint8 publicWinning; // revealed clear winning number
    }

    // ============================
    // Storage
    // ============================
    uint256 public currentRound;
    uint256 private _nextTokenId;

    mapping(uint256 => Ticket) private _tickets; // tokenId => ticket
    mapping(uint256 => RoundMeta) private _rounds; // roundId => round metadata

    // ============================
    // Events
    // ============================
    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 indexed round);
    event RoundDrawn(uint256 indexed round);
    event WinningRevealed(uint256 indexed round, uint8 winningNumber);

    // ============================
    // Constructor
    // ============================
    constructor() ERC721("Lotto", "LOTTO") Ownable(msg.sender) {
        currentRound = 1;
        _nextTokenId = 1;
    }

    // ============================
    // External/Public Functions
    // ============================

    /// @notice Buy a lottery ticket by submitting an encrypted number (1..99)
    /// @param input the external encrypted number handle
    /// @param inputProof the input proof from the Relayer SDK
    function buyTicket(externalEuint8 input, bytes calldata inputProof) external returns (uint256 tokenId) {
        // Import encrypted number from external handle
        euint8 encryptedNumber = FHE.fromExternal(input, inputProof);

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        // Persist
        _tickets[tokenId].number = encryptedNumber;
        _tickets[tokenId].round = currentRound;
        _tickets[tokenId].resultReady = false;
        _rounds[currentRound].tickets.push(tokenId);

        // Grant ACL: allow this contract and the user to read the ticket number
        FHE.allowThis(encryptedNumber);
        FHE.allow(encryptedNumber, msg.sender);

        emit TicketPurchased(msg.sender, tokenId, currentRound);
    }

    /// @notice Draw winning number for current round and prepare encrypted results; then advance to next round
    function drawAndStartNextRound() external onlyOwner {
        uint256 round = currentRound;
        RoundMeta storage r = _rounds[round];
        require(!r.drawn, "Round already drawn");

        // Generate winning number in [1..99] using pseudo-randomness, then encrypt
        uint8 pseudo = uint8(uint256(keccak256(abi.encode(block.prevrandao, block.timestamp, address(this), round))) % 99) + 1;
        euint8 winning = FHE.asEuint8(FHE.asEuint32(pseudo));
        r.winning = winning;
        // Allow contract and owner to decrypt the winning number (owner may choose to publicly reveal later)
        FHE.allowThis(winning);
        FHE.allow(winning, owner());
        // Store commitment for optional public reveal without leaking until revealed
        r.winningCommitment = keccak256(abi.encode(round, pseudo));

        // Compute winners for all tickets in this round and persist encrypted result with ACL to owner and contract
        uint256[] storage tokenIds = r.tickets;
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            uint256 tokenId = tokenIds[i];
            Ticket storage t = _tickets[tokenId];
            if (t.round != round) continue; // safety

            ebool win = FHE.eq(t.number, winning);
            t.isWinner = win;
            t.resultReady = true;

            // Allow both this contract and the ticket owner to decrypt the result
            FHE.allowThis(win);
            FHE.allow(win, ownerOf(tokenId));
        }

        r.drawn = true;
        emit RoundDrawn(round);

        // Advance to next round
        unchecked {
            currentRound = round + 1;
        }
    }

    // ============================
    // Views (return encrypted handles exactly like Zama template)
    // ============================

    /// @notice Returns the encrypted ticket number handle
    function getTicketNumber(uint256 tokenId) external view returns (euint8) {
        require(_ownerOf(tokenId) != address(0), "Invalid tokenId");
        return _tickets[tokenId].number;
    }

    // ============================
    // Public reveal of winning number (optional)
    // ============================

    /// @notice Owner can publicly reveal the clear winning number of a drawn round
    /// @dev Verifies against the commitment stored at draw time
    function revealWinning(uint256 round, uint8 clearWinning) external onlyOwner {
        require(round > 0 && round < currentRound, "Invalid round");
        RoundMeta storage r = _rounds[round];
        require(r.drawn, "Round not drawn");
        require(!r.winningRevealed, "Already revealed");
        require(keccak256(abi.encode(round, clearWinning)) == r.winningCommitment, "Invalid winning number");
        r.winningRevealed = true;
        r.publicWinning = clearWinning;
        emit WinningRevealed(round, clearWinning);
    }

    /// @notice Returns whether the winning number has been publicly revealed for a round
    function isWinningRevealed(uint256 round) external view returns (bool) {
        require(round > 0 && round < currentRound, "Invalid round");
        return _rounds[round].winningRevealed;
    }

    /// @notice Returns the publicly revealed clear winning number for a round
    function getPublicWinning(uint256 round) external view returns (uint8) {
        require(round > 0 && round < currentRound, "Invalid round");
        require(_rounds[round].winningRevealed, "Not revealed");
        return _rounds[round].publicWinning;
    }

    /// @notice Returns the encrypted winner flag for a ticket (valid after round is drawn)
    function getTicketResult(uint256 tokenId) external view returns (ebool) {
        require(_ownerOf(tokenId) != address(0), "Invalid tokenId");
        require(_tickets[tokenId].resultReady, "Result not ready");
        return _tickets[tokenId].isWinner;
    }

    /// @notice Returns the encrypted winning number for a round (only after it has been drawn)
    function getWinningNumber(uint256 round) external view returns (euint8) {
        require(round > 0 && round < currentRound, "Invalid round");
        require(_rounds[round].drawn, "Round not drawn");
        return _rounds[round].winning;
    }

    /// @notice Returns if a round has been drawn
    function isRoundDrawn(uint256 round) external view returns (bool) {
        require(round > 0 && round <= currentRound, "Invalid round");
        return _rounds[round].drawn;
    }

    /// @notice Re-grant ACL to caller for their ticket handles (number and result)
    function allowMyHandles(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Invalid tokenId");
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        FHE.allow(_tickets[tokenId].number, msg.sender);
        if (_tickets[tokenId].resultReady) {
            FHE.allow(_tickets[tokenId].isWinner, msg.sender);
        }
    }
}


