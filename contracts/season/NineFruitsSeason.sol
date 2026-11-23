// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Ownable2Step} from '@openzeppelin/contracts/access/Ownable2Step.sol';
import {NineFruitsGravityVerifier} from '../puzzle/NineFruitsGravityVerifier.sol';
import {NineFruitsMedal} from './NineFruitsMedal.sol';
import {NineFruitsTitle} from './NineFruitsTitle.sol';
interface INineFruitsCollection {function ownerOf(uint256 id) external view returns(address);function kind(uint256 id) external view returns(uint8);}
interface INineFruitsIdentity {function balanceOf(address player) external view returns(uint256);}

/// @notice Independent seasonal module. No authority to mint 3SHAPE or change the original game.
contract NineFruitsSeason is Ownable2Step,ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public constant DEAD=0x000000000000000000000000000000000000dEaD;
    address public constant BSC_AGENT_ID=0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    uint256 public constant ENTRY_FEE=10_000 ether;
    uint256 public constant MOVE_FEE=1 ether;
    uint256 public constant PUBLICATION_TARGET=8 hours;
    bytes32 public constant RULES_HASH=keccak256('nine-fruits:gravity-v1:6x6:fruit-only:immediate-match:no-refill:star-segments');
    IERC20 public immutable shape;
    INineFruitsCollection public immutable collection;
    INineFruitsIdentity public immutable identity;
    NineFruitsGravityVerifier public immutable verifier;
    NineFruitsMedal public immutable medal;
    uint256 public nextSeasonToSponsor=1;
    mapping(address=>bool) public rewardTokenAllowed;
    mapping(address=>bool) public publisher;
    struct Season {address sponsor;uint64 fundedAt;bool opened;string title;address rewardToken;uint256 rewardPerPerson;uint256 board;bytes32 puzzleId;bytes32 solutionCommitment;uint256 completions;uint256 bnbPool;uint256 tokenPool;uint256 bnbPaid;uint256 tokenPaid;}
    struct Challenge {uint256 nonce;bool active;}
    struct Completion {uint256 rank;uint64 completionBlock;uint8 moves;bool bnbClaimed;bool tokenClaimed;}
    mapping(uint256=>Season) private _seasons;
    mapping(uint256=>mapping(address=>Challenge)) public challenges;
    mapping(uint256=>mapping(address=>Completion)) public completions;
    event Sponsored(uint256 indexed season,address indexed sponsor,string title,uint256 bnb,address rewardToken,uint256 perPerson,uint256 tokenTotal);
    event Published(uint256 indexed season,bytes32 indexed puzzleId,uint256 board,bytes32 solutionCommitment,bool delayed);
    event Started(uint256 indexed season,address indexed player,uint256 nonce,bytes32 puzzleId);
    event Abandoned(uint256 indexed season,address indexed player,uint256 nonce);
    event Completed(uint256 indexed season,address indexed player,uint256 indexed rank,uint256 nonce,uint256 moves,uint256 fee);
    event BNBClaimed(uint256 indexed season,address indexed player,address recipient,uint256 amount);
    event TokenClaimed(uint256 indexed season,address indexed player,address recipient,address token,uint256 amount);
    event PublisherSet(address indexed account,bool allowed);
    event RewardTokenSet(address indexed token,bool allowed);
    constructor(address shape_,address collection_,address identity_,address admin) Ownable(admin){
        require(shape_.code.length>0&&collection_.code.length>0&&identity_.code.length>0,'dependency code');
        require(IERC20Metadata(shape_).decimals()==18,'3SHAPE decimals');
        require(block.chainid!=56||identity_==BSC_AGENT_ID,'wrong BSC identity');
        shape=IERC20(shape_);collection=INineFruitsCollection(collection_);identity=INineFruitsIdentity(identity_);
        verifier=new NineFruitsGravityVerifier();medal=new NineFruitsMedal(address(this));
    }
    function renounceOwnership() public view override onlyOwner {revert('renounce disabled');}
    function setPublisher(address account,bool allowed) external onlyOwner {require(account!=address(0),'zero publisher');publisher[account]=allowed;emit PublisherSet(account,allowed);}
    /// @dev Manual compatibility allowlist. Removal affects future sponsorships only, never accrued claims.
    function setRewardTokenAllowed(address token,bool allowed) external onlyOwner {
        require(token!=address(0),'zero token');if(allowed){require(token.code.length>0,'token code');require(IERC20Metadata(token).decimals()<=36,'token decimals');}
        rewardTokenAllowed[token]=allowed;emit RewardTokenSet(token,allowed);
    }
    function season(uint256 id) external view returns(Season memory){return _seasons[id];}
    function publicationDelayed(uint256 id) external view returns(bool){Season storage s=_seasons[id];return s.sponsor!=address(0)&&!s.opened&&block.timestamp>uint256(s.fundedAt)+PUBLICATION_TARGET;}
    function sponsor(uint256 id,string calldata title,address token,uint256 perPerson) external payable nonReentrant {
        require(id==nextSeasonToSponsor&&_seasons[id].sponsor==address(0),'not available');require(msg.value==id*1 ether,'BNB pool');require(NineFruitsTitle.valid(title),'title');
        uint256 total;
        if(token==address(0))require(perPerson==0,'no token');else {require(rewardTokenAllowed[token]&&perPerson>0,'token not allowed');total=perPerson*90;}
        Season storage s=_seasons[id];s.sponsor=msg.sender;s.fundedAt=uint64(block.timestamp);s.title=title;s.bnbPool=msg.value;s.rewardToken=token;s.rewardPerPerson=perPerson;s.tokenPool=total;
        if(total>0){IERC20 asset=IERC20(token);uint256 beforeBalance=asset.balanceOf(address(this));uint256 beforeSender=asset.balanceOf(msg.sender);asset.safeTransferFrom(msg.sender,address(this),total);require(asset.balanceOf(address(this))-beforeBalance==total&&beforeSender-asset.balanceOf(msg.sender)==total,'inexact deposit');}
        emit Sponsored(id,msg.sender,title,msg.value,token,perPerson,total);
    }
    /// @dev The commitment documents an offline-verified solution; it is NOT an on-chain solvability proof.
    function publish(uint256 id,uint256 board,bytes32 solutionCommitment) external {
        require(msg.sender==owner()||publisher[msg.sender],'publisher only');Season storage s=_seasons[id];
        require(id==nextSeasonToSponsor&&s.sponsor!=address(0)&&!s.opened,'not publishable');require(solutionCommitment!=bytes32(0),'solution commitment');
        require(verifier.validate(board)>0,'empty board');uint256[10] memory counts;
        for(uint256 i;i<36;++i)++counts[(board>>(i*4))&15];
        for(uint256 k=1;k<=8;++k)require(counts[k]>=3,'fruit distribution');require(counts[9]>0,'missing star');
        s.board=board;s.solutionCommitment=solutionCommitment;s.puzzleId=keccak256(abi.encode(block.chainid,address(this),id,board,RULES_HASH));s.opened=true;nextSeasonToSponsor=id+1;
        emit Published(id,s.puzzleId,board,solutionCommitment,block.timestamp>uint256(s.fundedAt)+PUBLICATION_TARGET);
    }
    function start(uint256 id,uint256[9] calldata nftIds) external nonReentrant returns(uint256 nonce){
        require(_seasons[id].opened,'not open');require(completions[id][msg.sender].rank==0,'already completed');Challenge storage c=challenges[id][msg.sender];require(!c.active,'active challenge');_eligible(id,msg.sender,nftIds);
        nonce=++c.nonce;c.active=true;_consume(msg.sender,ENTRY_FEE);emit Started(id,msg.sender,nonce,_seasons[id].puzzleId);
    }
    function abandon(uint256 id,uint256 nonce) external nonReentrant {Challenge storage c=challenges[id][msg.sender];require(c.active&&c.nonce==nonce,'challenge');c.active=false;emit Abandoned(id,msg.sender,nonce);}
    function settle(uint256 id,uint256 nonce,bytes calldata path,uint256[9] calldata nftIds) external nonReentrant {
        Season storage s=_seasons[id];Challenge storage c=challenges[id][msg.sender];require(s.opened&&c.active&&c.nonce==nonce,'challenge');require(completions[id][msg.sender].rank==0,'already completed');require(path.length>0&&path.length<=24,'path length');_eligible(id,msg.sender,nftIds);
        (,uint256 moves,uint8 remaining,)=verifier.replay(s.board,path);require(remaining==0,'incomplete');
        uint256 rank=++s.completions;uint256 fee=moves*MOVE_FEE;c.active=false;completions[id][msg.sender]=Completion(rank,uint64(block.number),uint8(moves),false,false);
        _consume(msg.sender,fee);medal.issue(msg.sender,id,rank,uint8(moves),s.puzzleId);emit Completed(id,msg.sender,rank,nonce,moves,fee);
    }
    function bnbEntitlement(uint256 id,address player) public view returns(uint256){
        uint256 rank=completions[id][player].rank;if(rank==0||rank>10)return 0;uint256 pool=_seasons[id].bnbPool;uint256 first=pool*30/100;if(rank==1)return first;uint256 rest=pool-first;uint256 each=rest/9;return rank==10?rest-each*8:each;
    }
    function tokenEntitlement(uint256 id,address player) public view returns(uint256){uint256 rank=completions[id][player].rank;return rank>=11&&rank<=100?_seasons[id].rewardPerPerson:0;}
    function claimBNB(uint256 id,address payable recipient) external nonReentrant {
        require(recipient!=address(0),'zero recipient');Completion storage c=completions[id][msg.sender];uint256 amount=bnbEntitlement(id,msg.sender);require(amount>0&&!c.bnbClaimed,'no BNB claim');c.bnbClaimed=true;Season storage s=_seasons[id];s.bnbPaid+=amount;require(s.bnbPaid<=s.bnbPool,'pool accounting');
        (bool ok,)=recipient.call{value:amount}('');require(ok,'BNB transfer');emit BNBClaimed(id,msg.sender,recipient,amount);
    }
    function claimToken(uint256 id,address recipient) external nonReentrant {
        require(recipient!=address(0)&&recipient!=address(this),'recipient');Completion storage c=completions[id][msg.sender];uint256 amount=tokenEntitlement(id,msg.sender);require(amount>0&&!c.tokenClaimed,'no token claim');c.tokenClaimed=true;Season storage s=_seasons[id];s.tokenPaid+=amount;require(s.tokenPaid<=s.tokenPool,'pool accounting');
        IERC20 asset=IERC20(s.rewardToken);uint256 beforePool=asset.balanceOf(address(this));uint256 beforeRecipient=asset.balanceOf(recipient);asset.safeTransfer(recipient,amount);
        require(beforePool-asset.balanceOf(address(this))==amount&&asset.balanceOf(recipient)-beforeRecipient==amount,'inexact payout');emit TokenClaimed(id,msg.sender,recipient,s.rewardToken,amount);
    }
    function _eligible(uint256 id,address player,uint256[9] calldata ids) private view {
        require(identity.balanceOf(player)>0,'no .ai');if(id>1)require(medal.hasMedal(player,id-1),'previous medal');uint256 mask;
        for(uint256 i;i<9;++i){require(collection.ownerOf(ids[i])==player,'NFT owner');uint256 kind=collection.kind(ids[i]);require(kind>=1&&kind<=9,'NFT kind');uint256 bit=uint256(1)<<kind;require(mask&bit==0,'duplicate kind');mask|=bit;}
        require(mask==1022,'nine kinds');
    }
    function _consume(address player,uint256 amount) private {uint256 beforeBalance=shape.balanceOf(DEAD);uint256 beforePlayer=shape.balanceOf(player);shape.safeTransferFrom(player,DEAD,amount);require(shape.balanceOf(DEAD)-beforeBalance==amount&&beforePlayer-shape.balanceOf(player)==amount,'inexact burn transfer');}
}
