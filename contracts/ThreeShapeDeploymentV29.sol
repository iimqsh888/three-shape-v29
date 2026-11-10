// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./ThreeShapeV29.sol";

/// @dev Immutable STOP-prefixed creation-code data, not an administrator.
contract ThreeShapeCodeV29 {
    constructor(bytes memory code) {
        bytes memory data=abi.encodePacked(bytes1(0),code);
        assembly { return(add(data,32),mload(data)) }
    }
}
contract ThreeShapeCodebookV29 {
    address public immutable token;
    address public immutable nft;
    address public immutable reserve;
    address public immutable game;
    address public immutable liquidity;
    constructor() {
        token=address(new ThreeShapeCodeV29(type(ThreeShapeTokenV29).creationCode));
        nft=address(new ThreeShapeCodeV29(type(ThreeShapeNFTV29).creationCode));
        reserve=address(new ThreeShapeCodeV29(type(ThreeShapeReserveV29).creationCode));
        game=address(new ThreeShapeCodeV29(type(ThreeShapeGameV29).creationCode));
        liquidity=address(new ThreeShapeCodeV29(type(ThreeShapeLiquidityV29).creationCode));
    }
}
/// @notice One-shot deployment with immutable dependencies and no post-deployment admin.
contract ThreeShapeDeploymentV29 {
    bool public deployed;
    address public immutable deployer;
    ThreeShapeCodebookV29 public immutable codebook;
    event Deployed(address token,address nft,address reserve,address game,address liquidity);
    constructor() {deployer=msg.sender;codebook=new ThreeShapeCodebookV29();}
    function predicted(uint8 nonce) public view returns(address) {
        require(nonce>=1&&nonce<=5,"nonce");
        // Factory nonce 1 is the codebook. Business contracts use nonces 2..6.
        nonce+=1;
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xd6),bytes1(0x94),address(this),bytes1(nonce)
        )))));
    }
    function _create(address store,bytes memory args,address expected) private {
        uint256 size=store.code.length;require(size>1,"empty code");
        bytes memory code=new bytes(size-1);
        assembly { extcodecopy(store,add(code,32),1,sub(size,1)) }
        bytes memory initCode=abi.encodePacked(code,args);address created;
        assembly { created:=create(0,add(initCode,32),mload(initCode)) }
        require(created==expected,"address mismatch");
    }
    function deploy(address registry,address treasury,address router,address pair) external {
        require(msg.sender==deployer,"deployer only");
        require(!deployed,"already deployed");
        require(registry!=address(0)&&treasury!=address(0)&&router!=address(0)&&pair!=address(0),"zero");
        deployed=true;
        _create(codebook.token(),abi.encode(predicted(4),predicted(5)),predicted(1));
        _create(codebook.nft(),abi.encode(predicted(4)),predicted(2));
        _create(codebook.reserve(),abi.encode(predicted(5)),predicted(3));
        _create(codebook.game(),abi.encode(predicted(1),predicted(2),registry,predicted(3),treasury,predicted(5)),predicted(4));
        _create(codebook.liquidity(),abi.encode(predicted(1),predicted(4),predicted(3),router,pair),predicted(5));
        emit Deployed(predicted(1),predicted(2),predicted(3),predicted(4),predicted(5));
    }
}
