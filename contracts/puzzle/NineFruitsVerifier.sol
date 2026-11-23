// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Research verifier only. Holds no funds and grants no ranks or medals.
/// @dev 36 cells, four bits each. 0=empty, 1..8=fruit, 9=fixed star.
contract NineFruitsVerifier {
    error InvalidBoard();
    error InitialMatch();
    error InvalidMoves();
    error IllegalMove(uint256 moveIndex);
    error AlreadyCleared();

    function validate(uint256 board) public pure returns (uint8 remaining) {
        if (board >> 144 != 0) revert InvalidBoard();
        for (uint256 i; i < 36; ++i) {
            uint256 value = _cell(board, i);
            if (value > 9) revert InvalidBoard();
            if (value != 0 && value != 9) {
                ++remaining;
                if (_matches(board, i) != 0) revert InitialMatch();
            }
        }
    }

    /// @param actions Two bytes per swap: zero-based from and to indices.
    /// @dev No gameplay move limit. The caller must fit a batch inside the gas budget.
    function replay(uint256 board, bytes calldata actions)
        external pure returns (uint256 finalBoard, uint256 moves, uint8 remaining)
    {
        if (actions.length % 2 != 0) revert InvalidMoves();
        remaining = validate(board);
        moves = actions.length / 2;
        for (uint256 i; i < moves; ++i) {
            if (remaining == 0) revert AlreadyCleared();
            uint256 a = uint8(actions[2 * i]);
            uint256 b = uint8(actions[2 * i + 1]);
            if (a >= 36 || b >= 36) revert IllegalMove(i);
            uint256 va = _cell(board, a);
            uint256 vb = _cell(board, b);
            bool adjacent = (a / 6 == b / 6 && (a + 1 == b || b + 1 == a))
                || a + 6 == b || b + 6 == a;
            if (!adjacent || va == 9 || vb == 9 || va == vb) revert IllegalMove(i);
            board = _set(_set(board, a, vb), b, va);
            // There were no matches before this swap. New matches touch a or b.
            // Collect both masks before clearing to preserve simultaneous matches.
            uint256 mask = _matches(board, a) | _matches(board, b);
            if (mask != 0) {
                for (uint256 k; k < 36; ++k) {
                    if (mask & (uint256(1) << k) != 0) {
                        board = _set(board, k, 0);
                        --remaining;
                    }
                }
            }
        }
        return (board, moves, remaining);
    }

    function _cell(uint256 board, uint256 i) private pure returns (uint256) {
        return (board >> (i * 4)) & 15;
    }
    function _set(uint256 board, uint256 i, uint256 value) private pure returns (uint256) {
        return (board & ~(uint256(15) << (i * 4))) | (value << (i * 4));
    }
    function _matches(uint256 board, uint256 i) private pure returns (uint256) {
        uint256 value = _cell(board, i);
        if (value == 0 || value == 9) return 0;
        return _axis(board, i, value, 1) | _axis(board, i, value, 6);
    }
    function _axis(uint256 board, uint256 i, uint256 value, uint256 step)
        private pure returns (uint256)
    {
        uint256 mask = uint256(1) << i;
        uint256 count = 1;
        uint256 j = i;
        while (j >= step) {
            uint256 next = j - step;
            if ((step == 1 && next / 6 != i / 6) || _cell(board, next) != value) break;
            mask |= uint256(1) << next;
            ++count;
            j = next;
        }
        j = i;
        while (j + step < 36) {
            uint256 next = j + step;
            if ((step == 1 && next / 6 != i / 6) || _cell(board, next) != value) break;
            mask |= uint256(1) << next;
            ++count;
            j = next;
        }
        return count >= 3 ? mask : 0;
    }
}
