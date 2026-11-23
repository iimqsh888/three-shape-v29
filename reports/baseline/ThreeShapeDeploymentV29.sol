// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./ThreeShapeV29.sol";

/**
 * @notice One-shot deployment solves the constructor-address dependency cycle.
 * @dev Deploys five contracts sequentially from this factory using CREATE.
 *      For nonce 1..5, RLP([factory,nonce]) = 0xd6 0x94 <factory> <nonce>.
 *      LP execution remains deliberately disabled pending a safe mechanism.
 */
contract ThreeShapeDeploymentV29 {
    bool public deployed;
    event Deployed(address token,address nft,address reserve,address game,address liquidity);

    function predicted(uint8 nonce) public view returns(address) {
        require(nonce>=1&&nonce<=5,"nonce");
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xd6),bytes1(0x94),address(this),bytes1(nonce)
        )))));
    }
    function deploy(address usdt,address registry,address treasury,address router,address pair) external {
        require(!deployed,"already deployed");
        require(usdt!=address(0)&&registry!=address(0)&&treasury!=address(0)&&router!=address(0)&&pair!=address(0),"zero");
        deployed=true;
        address tokenAddress=predicted(1);
        address nftAddress=predicted(2);
        address reserveAddress=predicted(3);
        address gameAddress=predicted(4);
        address liquidityAddress=predicted(5);

        ThreeShapeTokenV29 token=new ThreeShapeTokenV29(gameAddress,liquidityAddress);
        ThreeShapeNFTV29 nft=new ThreeShapeNFTV29(gameAddress);
        ThreeShapeReserveV29 reserve=new ThreeShapeReserveV29(usdt,liquidityAddress);
        ThreeShapeGameV29 game=new ThreeShapeGameV29(
            tokenAddress,nftAddress,usdt,registry,reserveAddress,treasury,liquidityAddress
        );
        ThreeShapeLiquidityV29 liquidity=new ThreeShapeLiquidityV29(
            tokenAddress,usdt,gameAddress,reserveAddress,router,pair
        );
        require(address(token)==tokenAddress&&address(nft)==nftAddress&&address(reserve)==reserveAddress
            &&address(game)==gameAddress&&address(liquidity)==liquidityAddress,"address mismatch");
        emit Deployed(tokenAddress,nftAddress,reserveAddress,gameAddress,liquidityAddress);
    }
}
