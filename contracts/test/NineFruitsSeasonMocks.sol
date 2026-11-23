// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {NineFruitsSeason} from '../season/NineFruitsSeason.sol';
contract SeasonTestToken is ERC20 {
    uint8 private immutable _decimals;
    bool public fail;
    bool public taxed;
    bool public senderTax;
    address public hook;
    bytes public hookData;
    bool public hookAttempted;
    bool public hookSucceeded;
    bytes4 public hookError;
    constructor(uint8 decimals_) ERC20('Season Test','TEST'){_decimals=decimals_;}
    function decimals() public view override returns(uint8){return _decimals;}
    function mint(address to,uint256 value) external {_mint(to,value);}
    function setFail(bool value) external {fail=value;}
    function setTaxed(bool value) external {taxed=value;}
    function setSenderTax(bool value) external {senderTax=value;}
    function setHook(address target,bytes calldata data) external {hook=target;hookData=data;}
    function _update(address from,address to,uint256 amount) internal override {
        if(from!=address(0)&&to!=address(0)){
            require(!fail,'token paused');
            if(hook!=address(0)){hookAttempted=true;(bool ok,bytes memory result)=hook.call(hookData);hookSucceeded=ok;hookError=result.length>=4?bytes4(result):bytes4(0);}
            if(senderTax)super._update(from,address(0),amount/10);
            if(taxed){uint256 fee=amount/10;super._update(from,address(0),fee);super._update(from,to,amount-fee);return;}
        }super._update(from,to,amount);
    }
}
contract SeasonTestIdentity {
    mapping(address=>uint256) public balanceOf;
    function set(address player,uint256 value) external {balanceOf[player]=value;}
}
contract SeasonTestCollection {
    mapping(uint256=>address) private owners;
    mapping(uint256=>uint8) public kind;
    uint256 public next=1;
    function issueNine(address player) external returns(uint256 startId){startId=next;for(uint8 k=1;k<=9;++k){owners[next]=player;kind[next++]=k;}}
    function ownerOf(uint256 id) external view returns(address){require(owners[id]!=address(0),'missing NFT');return owners[id];}
    function transfer(uint256 id,address to) external {require(owners[id]==msg.sender,'owner');owners[id]=to;}
}
contract SeasonRejectBNB {receive() external payable {revert('refused');}}
contract SeasonReenterBNB {
    NineFruitsSeason public immutable game;
    uint256 public seasonId;
    bool public attempted;
    bool public succeeded;
    bytes4 public failure;
    constructor(NineFruitsSeason game_){game=game_;}
    function setSeason(uint256 id) external {seasonId=id;}
    receive() external payable {attempted=true;(bool ok,bytes memory result)=address(game).call(abi.encodeCall(game.claimBNB,(seasonId,payable(address(this)))));succeeded=ok;failure=result.length>=4?bytes4(result):bytes4(0);}
}
contract SeasonTestSetup {
    function provision(SeasonTestIdentity identity,SeasonTestCollection collection,SeasonTestToken shape,address player) external returns(uint256 firstId){
        identity.set(player,1);firstId=collection.issueNine(player);shape.mint(player,100_100 ether);
    }
}
