// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Research-only, deterministic no-refill gravity verifier; no funds or ranks.
contract NineFruitsGravityVerifier {
    error InvalidBoard();
    error InitialMatch();
    error UnstableBoard();
    error InvalidMoves();
    error IllegalMove(uint256 index);
    error NoImmediateMatch(uint256 index);
    error AlreadyCleared();

    function validate(uint256 board) public pure returns (uint8 remaining) {
        if (board >> 144 != 0) revert InvalidBoard();
        for (uint256 i; i < 36; ++i) {
            uint256 v = _get(board,i);
            if (v > 9) revert InvalidBoard();
            if (v > 0 && v < 9) ++remaining;
        }
        if (_matches(board) != 0) revert InitialMatch();
        if (_gravity(board) != board) revert UnstableBoard();
    }

    function replay(uint256 board,bytes calldata path) external pure
        returns (uint256 finalBoard,uint256 moves,uint8 remaining,uint8 rounds)
    {
        if (path.length % 2 != 0) revert InvalidMoves();
        remaining = validate(board);
        moves = path.length / 2;
        for (uint256 k; k < moves; ++k) {
            if (remaining == 0) revert AlreadyCleared();
            uint256 a = uint8(path[2*k]);
            uint256 b = uint8(path[2*k+1]);
            if (a >= 36 || b >= 36) revert IllegalMove(k);
            uint256 va = _get(board,a);
            uint256 vb = _get(board,b);
            bool adjacent = (a/6 == b/6 && (a+1 == b || b+1 == a)) || a+6 == b || b+6 == a;
            if (!adjacent || va == 0 || vb == 0 || va == 9 || vb == 9 || va == vb) revert IllegalMove(k);
            board = _set(_set(board,a,vb),b,va);
            uint256 mask = _matches(board);
            if (mask == 0) revert NoImmediateMatch(k);
            while (mask != 0) {
                ++rounds;
                for (uint256 i; i < 36; ++i) {
                    if (mask & (uint256(1)<<i) != 0) {
                        board = _set(board,i,0);
                        --remaining;
                    }
                }
                board = _gravity(board);
                mask = _matches(board);
            }
        }
        return (board,moves,remaining,rounds);
    }

    function _get(uint256 board,uint256 i) private pure returns (uint256) { return (board>>(i*4))&15; }
    function _set(uint256 board,uint256 i,uint256 v) private pure returns (uint256) {
        return (board & ~(uint256(15)<<(i*4))) | (v<<(i*4));
    }
    function _matches(uint256 board) private pure returns (uint256 mask) {
        for (uint256 i; i < 36; ++i) {
            uint256 v = _get(board,i);
            if (v == 0 || v == 9) continue;
            if (i%6 <= 3 && _get(board,i+1) == v && _get(board,i+2) == v) mask |= uint256(7)<<i;
            if (i < 24 && _get(board,i+6) == v && _get(board,i+12) == v)
                mask |= (uint256(1)<<i) | (uint256(1)<<(i+6)) | (uint256(1)<<(i+12));
        }
    }
    function _gravity(uint256 board) private pure returns (uint256) {
        for (uint256 col; col < 6; ++col) {
            int256 write = 5;
            for (int256 row=5; row>=0; --row) {
                uint256 i = uint256(row)*6+col;
                uint256 v = _get(board,i);
                if (v == 9) { write = row-1; continue; }
                if (v != 0) {
                    // write is nonnegative whenever a fruit remains in this segment.
                    uint256 target = uint256(write)*6+col;
                    if (target != i) board = _set(_set(board,target,v),i,0);
                    --write;
                }
            }
        }
        return board;
    }
}
