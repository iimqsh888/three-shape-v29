// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ThreeShapeFruitMarketV29} from "../ThreeShapeFruitMarketV29.sol";
contract MarketActorV29 is IERC721Receiver {
    ThreeShapeFruitMarketV29 public market;
    bool public reject;
    bool public attack;
    bool public reentrySucceeded;
    uint256 public target;
    uint256 public price;
    constructor(ThreeShapeFruitMarketV29 m) { market=m; }
    function execute(address to, bytes calldata data) external {
        (bool ok, bytes memory reason)=to.call(data);
        if(!ok) assembly {revert(add(reason,32),mload(reason))}
    }
    function configure(bool r,bool a,uint256 id,uint256 p) external {reject=r;attack=a;target=id;price=p;}
    function onERC721Received(address,address,uint256,bytes calldata) external returns(bytes4){
        require(!reject,"reject NFT");
        if(attack){(bool ok,)=address(market).call(abi.encodeCall(market.buy,(target,price)));reentrySucceeded=ok;}
        return IERC721Receiver.onERC721Received.selector;
    }
}
