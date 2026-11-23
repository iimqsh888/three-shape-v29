// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
interface IClosedSaleTestV29 {function starSalesClosed() external view returns(bool);}
contract MockWBNB is ERC20 {
    constructor() ERC20("Test Wrapped BNB","WBNB") {}
    receive() external payable {deposit();}
    function deposit() public payable {_mint(msg.sender,msg.value);}
    function withdraw(uint256 amount) external {_burn(msg.sender,amount);(bool ok,)=payable(msg.sender).call{value:amount}("");require(ok,"withdraw failed");}
}
contract MockRegistry {
    mapping(address=>uint256) public balanceOf;
    function setBalance(address holder,uint256 amount) external {balanceOf[holder]=amount;}
}
contract MockPair {
    address public token0;
    address public token1;
    uint112 private r0;
    uint112 private r1;
    uint256 public totalSupply;
    constructor(address a,address b){token0=a;token1=b;}
    function getReserves() external view returns(uint112,uint112,uint32){return(r0,r1,0);}
    // Test-only reproduction of a permissionless V2 pair balance synchronization.
    function sync() external {
        r0=uint112(IERC20(token0).balanceOf(address(this)));
        r1=uint112(IERC20(token1).balanceOf(address(this)));
    }
    function add(address a,address b,uint256 x,uint256 y) external {
        require(a==token0&&b==token1,"order");
        r0+=uint112(x);r1+=uint112(y);totalSupply+=1;
    }
}
contract MockFactory {
    address public immutable pair;
    constructor(address p){pair=p;}
    function getPair(address,address) external view returns(address){return pair;}
}
contract MockRouter {
    address public immutable factory;
    address public immutable WETH;
    MockPair public immutable pair;
    address public inspectedGame;
    bool public closedDuringAdd;
    function setGameToInspect(address value) external {inspectedGame=value;}
    constructor(address f,address p,address w){factory=f;pair=MockPair(p);WETH=w;}
    function addLiquidityETH(address a,uint256 x,uint256 minX,uint256 minY,address to,uint256)
      external payable returns(uint256,uint256,uint256){
        require(to==0x000000000000000000000000000000000000dEaD,"not burned");
        if(inspectedGame!=address(0))closedDuringAdd=IClosedSaleTestV29(inspectedGame).starSalesClosed();
        require(x>=minX&&msg.value>=minY,"minimum");
        IERC20(a).transferFrom(msg.sender,address(pair),x);
        MockWBNB(payable(WETH)).deposit{value:msg.value}();
        IERC20(WETH).transfer(address(pair),msg.value);
        if(pair.token0()==a)pair.add(a,WETH,x,msg.value);
        else pair.add(WETH,a,msg.value,x);
        return(x,msg.value,1);
    }
}
contract RejectBNB {
    receive() external payable {revert("BNB refused");}
}
