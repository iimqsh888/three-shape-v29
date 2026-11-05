// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentRegistryV29 { function handleOf(address account) external view returns (string memory); }
interface ILPManagerV29 { function attempt() external; }

contract ThreeShapeTokenV29 is ERC20 {
    uint256 public constant PLAYER_CAP = 1_430_000_000_000 ether;
    uint256 public constant LP_CAP = 1_430_000_000_000 ether;
    address public immutable game;
    address public immutable liquidity;
    uint256 public playerMinted;
    uint256 public lpMinted;
    constructor(address game_, address liquidity_) ERC20("Three Shape","3SHAPE") {
        require(game_ != address(0) && liquidity_ != address(0),"zero");
        game=game_; liquidity=liquidity_;
    }
    function mintPlayer(address recipient,uint256 amount) external {
        require(msg.sender==game && playerMinted+amount<=PLAYER_CAP,"player mint denied");
        playerMinted+=amount; _mint(recipient,amount);
    }
    function mintLP(address recipient,uint256 amount) external {
        require(msg.sender==liquidity && lpMinted+amount<=LP_CAP,"LP mint denied");
        lpMinted+=amount; _mint(recipient,amount);
    }
}
contract ThreeShapeNFTV29 is ERC721 {
    address public immutable game;
    uint256 public nextId=1;
    mapping(uint256=>uint8) public kind;
    constructor(address game_) ERC721("Three Shape Fruits","3FRUIT") {
        require(game_!=address(0),"zero");game=game_;
    }
    function mintTo(address to,uint8 kind_) external returns(uint256 id) {
        require(msg.sender==game && kind_>=1 && kind_<=9,"mint denied");
        id=nextId++;kind[id]=kind_;_safeMint(to,id);
    }
    function tokenURI(uint256 id) public view override returns (string memory) {
        ownerOf(id);
        uint8 k=kind[id];
        string[9] memory symbols=["🍏","🍋","🍇","🍒","🍓","🍐","🥭","🍉","🌟"];
        string[9] memory names=["Green Apple","Lemon","Grapes","Cherries","Strawberry","Pear","Mango","Watermelon","Star"];
        string memory symbol=symbols[k-1];
        bytes memory json=abi.encodePacked('{"name":"Three Shape #',Strings.toString(id),'","description":"On-chain fruit or Star collectible","symbol":"',symbol,'","attributes":[{"trait_type":"kind","value":"',Strings.toString(k),'"},{"trait_type":"fruit","value":"',names[k-1],'"}]}');
        return string.concat("data:application/json;base64,",Base64.encode(json));
    }
    function burnMatch(address from,uint256 id) external {
        require(msg.sender==game && ownerOf(id)==from,"burn denied");
        _burn(id);delete kind[id];
    }
}
contract ThreeShapeReserveV29 {
    using SafeERC20 for IERC20;
    IERC20 public immutable usdt;
    address public immutable liquidity;
    constructor(address usdt_,address liquidity_) {
        require(usdt_!=address(0)&&liquidity_!=address(0),"zero");
        usdt=IERC20(usdt_);liquidity=liquidity_;
    }
    function provide(uint256 amount) external {
        require(msg.sender==liquidity,"not liquidity");
        usdt.safeTransfer(liquidity,amount);
    }
}
contract ThreeShapeGameV29 is ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant MAX_CLAIMS=55_000;
    uint256 public constant MAX_STARS=100_000;
    uint256 public constant LP_PER_STAR=14_300_000 ether;
    ThreeShapeTokenV29 public immutable token;
    ThreeShapeNFTV29 public immutable nft;
    IERC20 public immutable usdt;
    IAgentRegistryV29 public immutable registry;
    address public immutable reserve;
    address public immutable treasury;
    address public immutable liquidity;
    uint256 public totalClaims;
    uint256 public immutable usdtUnit;
    uint256 public starsSold;
    uint256 public nextFreeIndex;
    mapping(address=>bool) public freeClaimed;
    mapping(address=>uint8) public starsBought;
    enum State {Ready1,Choice1,Ready2,Choice2,Ready3,Choice3,Settled}
    mapping(address=>State) public state;
    event Matched(address indexed player,uint8 tier);
    event Claimed(address indexed player,uint8 tier,uint8 stage,uint256 amount);
    event StarsPurchased(address indexed player,uint256 count,uint256 paid);
    event LPAttemptFailed();
    constructor(address token_,address nft_,address usdt_,address registry_,address reserve_,address treasury_,address liquidity_) {
        require(token_!=address(0)&&nft_!=address(0)&&usdt_!=address(0)&&registry_!=address(0)&&reserve_!=address(0)&&treasury_!=address(0)&&liquidity_!=address(0),"zero");
        token=ThreeShapeTokenV29(token_);nft=ThreeShapeNFTV29(nft_);usdt=IERC20(usdt_);
        uint8 decimals=IERC20Metadata(usdt_).decimals();
        require(decimals>=6&&decimals<=18,"unsupported USDT decimals");
        usdtUnit=10**uint256(decimals);
        registry=IAgentRegistryV29(registry_);reserve=reserve_;treasury=treasury_;liquidity=liquidity_;
    }
    function ended() public view returns(bool){return totalClaims==MAX_CLAIMS;}
    function remainingShares() external view returns(uint256){return MAX_CLAIMS-totalClaims;}
    function stageOf(uint256 index) public pure returns(uint8) {
        require(index>0&&index<=MAX_CLAIMS,"index");
        uint256 sum;
        for(uint8 i=1;i<=10;i++){sum+=uint256(i)*1000;if(index<=sum)return i;}
        revert("stage");
    }
    function currentStage() public view returns(uint8){return ended()?10:stageOf(totalClaims+1);}
    function reward(uint8 tier,uint8 stage) public pure returns(uint256) {
        require(tier>=1&&tier<=3&&stage>=1&&stage<=10,"tier/stage");
        if(tier==1)return 1_000_000 ether;
        uint256[10] memory top=[uint256(100_000_000),80_000_000,60_000_000,50_000_000,40_000_000,30_000_000,20_000_000,10_000_000,10_000_000,10_000_000];
        return top[stage-1]*ether/(tier==2?10:1);
    }
    function currentReward(uint8 tier) external view returns(uint256){
        require(!ended(),"ended");return reward(tier,currentStage());
    }
    function claimFree() external nonReentrant {
        require(!ended()&&!freeClaimed[msg.sender],"ineligible/ended");
        require(bytes(registry.handleOf(msg.sender)).length>0,"not agent");
        freeClaimed[msg.sender]=true;
        for(uint256 i=0;i<3;i++){
            uint8 fruit=uint8((nextFreeIndex%16)/2+1);
            nextFreeIndex++;nft.mintTo(msg.sender,fruit);
        }
    }
    function _tier(State s) internal pure returns(uint8) {
        if(s==State.Ready1)return 1;
        if(s==State.Ready2)return 2;
        if(s==State.Ready3)return 3;
        return 0;
    }
    function _check(address player,uint256[] calldata ids,uint8 tier) internal view returns(bool) {
        if(ended()||tier==0||ids.length!=uint256(tier)*3)return false;
        uint256 stars;uint8 fruit;
        for(uint256 i=0;i<ids.length;i++){
            if(nft.ownerOf(ids[i])!=player)return false;
            for(uint256 j=0;j<i;j++)if(ids[i]==ids[j])return false;
            uint8 k=nft.kind(ids[i]);
            if(k==9)stars++;
            else if(k>=1&&k<=8){if(fruit==0)fruit=k;else if(fruit!=k)return false;}
            else return false;
        }
        return fruit!=0&&(tier==1?stars==0:(tier==2?stars>=1:stars>=3));
    }
    function canBurn(address player,uint256[] calldata ids) external view returns(bool){
        return _check(player,ids,_tier(state[player]));
    }
    function burnForTier(uint256[] calldata ids) external nonReentrant {
        uint8 tier=_tier(state[msg.sender]);
        require(_check(msg.sender,ids,tier),"invalid burn/shares exhausted");
        state[msg.sender]=tier==1?State.Choice1:(tier==2?State.Choice2:State.Choice3);
        for(uint256 i=0;i<ids.length;i++)nft.burnMatch(msg.sender,ids[i]);
        emit Matched(msg.sender,tier);
    }
    function continueChallenge() external {
        require(!ended(),"ended");
        State s=state[msg.sender];
        require(s==State.Choice1||s==State.Choice2,"cannot continue");
        state[msg.sender]=s==State.Choice1?State.Ready2:State.Ready3;
    }
    function claimReward(uint256 minAmount) external nonReentrant {
        require(!ended(),"shares exhausted");
        State s=state[msg.sender];
        require(s==State.Choice1||s==State.Choice2||s==State.Choice3,"no claim");
        uint8 tier=s==State.Choice1?1:(s==State.Choice2?2:3);
        uint8 stage=stageOf(totalClaims+1);
        uint256 amount=reward(tier,stage);
        require(amount>=minAmount,"reward changed");
        state[msg.sender]=State.Settled;
        totalClaims++;
        token.mintPlayer(msg.sender,amount);
        emit Claimed(msg.sender,tier,stage,amount);
    }
    function starPrice(uint256 sold) public view returns(uint256){
        require(sold<MAX_STARS,"sold out");
        return (10+2*(sold/10_000))*usdtUnit;
    }
    function quoteStars(uint256 quantity) public view returns(uint256 payment){
        require(quantity>0&&quantity<=6&&starsSold+quantity<=MAX_STARS,"quantity");
        for(uint256 i=0;i<quantity;i++)payment+=starPrice(starsSold+i);
    }
    function lpAllowance() external view returns(uint256){return starsSold*LP_PER_STAR;}
    function buyStars(uint256 quantity,uint256 maxPayment) external nonReentrant {
        require(quantity>0&&quantity<=6&&starsSold+quantity<=MAX_STARS,"sold out/quantity");
        require(uint256(starsBought[msg.sender])+quantity<=6,"wallet limit");
        uint256 payment=quoteStars(quantity);
        require(payment<=maxPayment,"slippage");
        starsBought[msg.sender]+=uint8(quantity);starsSold+=quantity;
        usdt.safeTransferFrom(msg.sender,reserve,payment*80/100);
        usdt.safeTransferFrom(msg.sender,treasury,payment-payment*80/100);
        for(uint256 i=0;i<quantity;i++)nft.mintTo(msg.sender,9);
        emit StarsPurchased(msg.sender,quantity,payment);
        try ILPManagerV29(liquidity).attempt() {} catch {emit LPAttemptFailed();}
    }
}

interface IPairV29 {
    function token0() external view returns(address);
    function token1() external view returns(address);
    function getReserves() external view returns(uint112,uint112,uint32);
    function totalSupply() external view returns(uint256);
}
interface IFactoryV29 {function getPair(address,address) external view returns(address);}
interface IRouterV29 {
    function factory() external view returns(address);
    function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)
        external returns(uint256,uint256,uint256);
}
interface IGameLPV29 {function lpAllowance() external view returns(uint256);}
contract ThreeShapeLiquidityV29 is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public constant BURN=0x000000000000000000000000000000000000dEaD;
    ThreeShapeTokenV29 public immutable token;
    IERC20 public immutable usdt;
    IGameLPV29 public immutable game;
    ThreeShapeReserveV29 public immutable reserve;
    IRouterV29 public immutable router;
    IPairV29 public immutable pair;
    bool public initialized;
    event Added(uint256 tokens,uint256 usdtAmount,uint256 lp);
    constructor(address token_,address usdt_,address game_,address reserve_,address router_,address pair_) {
        require(token_!=address(0)&&usdt_!=address(0)&&game_!=address(0)&&reserve_!=address(0)&&router_!=address(0)&&pair_!=address(0),"zero");
        token=ThreeShapeTokenV29(token_);usdt=IERC20(usdt_);game=IGameLPV29(game_);
        reserve=ThreeShapeReserveV29(reserve_);router=IRouterV29(router_);pair=IPairV29(pair_);
        require(IFactoryV29(router.factory()).getPair(token_,usdt_)==pair_,"invalid pair");
        require((pair.token0()==token_&&pair.token1()==usdt_)||(pair.token0()==usdt_&&pair.token1()==token_),"assets");
    }
    // Disabled until a manipulation-resistant LP mechanism is implemented and fork-tested.
    // Do not use pool spot reserves as a trusted minting price.
    function attempt() external pure { revert("LP_DISABLED_PENDING_SECURITY_REVIEW"); }
}
