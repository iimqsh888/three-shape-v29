// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Test-only dependency: demonstrates qualification reuse IF Agent IDs are transferable.
contract TransferableRegistrySecurityV29 is ERC721 {
    constructor() ERC721("Test-only Agent ID", "TESTID") {}
    function issue(address to,uint256 id) external { _mint(to,id); }
}

interface IGameSecurityV29 {
    function claimFree() external;
    function buyStars(uint256 quantity,uint256 maxPayment) external;
}

/// @dev Never included in the production deployment factory or website assets.
contract ReceiverSecurityV29 is IERC721Receiver {
    address public immutable game;
    IERC20 public immutable usdt;
    bool public reject;
    uint256 public callbacks;
    uint256 public guarded;
    uint256 public bypassed;

    constructor(address game_,address usdt_) { game=game_;usdt=IERC20(usdt_); }
    function setReject(bool value) external { reject=value; }
    function free() external { IGameSecurityV29(game).claimFree(); }
    function purchase(uint256 quantity,uint256 payment) external {
        usdt.approve(game,payment);
        IGameSecurityV29(game).buyStars(quantity,payment);
    }
    function onERC721Received(address,address,uint256,bytes calldata) external returns(bytes4) {
        require(!reject,"receiver rejected");
        callbacks++;
        bytes[] memory calls=new bytes[](5);
        calls[0]=abi.encodeWithSignature("claimFree()");
        calls[1]=abi.encodeWithSignature("burnForTier(uint256[])",new uint256[](0));
        calls[2]=abi.encodeWithSignature("continueChallenge()");
        calls[3]=abi.encodeWithSignature("claimReward(uint256)",0);
        calls[4]=abi.encodeWithSignature("buyStars(uint256,uint256)",1,type(uint256).max);
        for(uint256 i;i<calls.length;i++) {
            (bool success,bytes memory result)=game.call(calls[i]);
            if(success)bypassed++;
            else if(result.length>=4 && bytes4(result)==bytes4(keccak256("ReentrancyGuardReentrantCall()")))guarded++;
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
