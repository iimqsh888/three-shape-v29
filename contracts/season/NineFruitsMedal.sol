// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import {Base64} from '@openzeppelin/contracts/utils/Base64.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';

/// @notice Permanent, non-transferable achievements issued only by the season contract.
contract NineFruitsMedal is ERC721 {
    using Strings for uint256;
    address public immutable issuer;
    uint256 public nextId=1;
    struct Achievement {uint256 season;uint256 rank;uint64 completionBlock;uint8 moves;bytes32 puzzleId;}
    mapping(uint256=>Achievement) public achievements;
    mapping(address=>mapping(uint256=>uint256)) public medalOf;
    error Soulbound();
    constructor(address issuer_) ERC721('Nine Fruits Seasonal Medal','NFSM') {require(issuer_!=address(0),'zero issuer');issuer=issuer_;}
    function issue(address player,uint256 season,uint256 rank,uint8 moves,bytes32 puzzleId) external returns(uint256 id){
        require(msg.sender==issuer,'issuer only');require(season>0&&rank>0&&moves>0&&moves<=12,'invalid achievement');require(medalOf[player][season]==0,'already issued');
        id=nextId++;medalOf[player][season]=id;achievements[id]=Achievement(season,rank,uint64(block.number),moves,puzzleId);
        // Intentionally no receiver callback: recipient is the completing wallet; this NFT can never leave it.
        _mint(player,id);
    }
    function hasMedal(address player,uint256 season) external view returns(bool){return medalOf[player][season]!=0;}
    function approve(address,uint256) public pure override {revert Soulbound();}
    function setApprovalForAll(address,bool) public pure override {revert Soulbound();}
    function _update(address to,uint256 id,address auth) internal override returns(address){if(_ownerOf(id)!=address(0))revert Soulbound();return super._update(to,id,auth);}
    function tokenURI(uint256 id) public view override returns(string memory){
        ownerOf(id);Achievement memory a=achievements[id];
        bytes memory attributes=abi.encodePacked(_numberTrait('Season Number',a.season),',',_numberTrait('Completion Block',a.completionBlock),',',_numberTrait('Completion Moves',a.moves));
        attributes=abi.encodePacked(attributes,',',_numberTrait('Rank',a.rank),',{"trait_type":"Completion Status","value":"Completed"},{"trait_type":"Puzzle Identifier","value":"',Strings.toHexString(uint256(a.puzzleId),32),'"}');
        bytes memory json=abi.encodePacked('{"name":"Nine Fruits S',a.season.toString(),' Medal #',id.toString(),'","description":"Permanent non-transferable seasonal completion achievement","symbol":"',unicode"🏅",'","attributes":[',attributes,']}');
        return string.concat('data:application/json;base64,',Base64.encode(json));
    }
    function _numberTrait(string memory name,uint256 value) private pure returns(bytes memory){return abi.encodePacked('{"trait_type":"',name,'","value":',value.toString(),'}');}
}
