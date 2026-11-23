// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import './NineFruitsVerifier.sol';

/// @notice Local research harness. NOT a season, payment or prize contract.
contract NineFruitsSessionHarness {
    NineFruitsVerifier public immutable verifier;
    struct Session { uint256 board; uint256 moves; bool active; }
    mapping(address => Session) public sessions;
    uint256 public constant BATCH_MOVES = 64;
    constructor(NineFruitsVerifier v) { verifier = v; }
    function start(uint256 board) external {
        require(!sessions[msg.sender].active, 'active');
        require(verifier.validate(board) > 0, 'empty');
        sessions[msg.sender] = Session(board, 0, true);
    }
    function submit(bytes calldata actions) external {
        Session storage s = sessions[msg.sender];
        require(s.active, 'inactive');
        require(actions.length > 0 && actions.length <= BATCH_MOVES * 2, 'batch');
        (uint256 board, uint256 moves, uint8 remaining) = verifier.replay(s.board, actions);
        s.board = board;
        s.moves += moves;
        if (remaining == 0) s.active = false;
    }
}
