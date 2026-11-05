// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT","USDT") {}
    function decimals() public pure override returns(uint8){return 6;}
    function faucet(address to,uint256 amount) external {_mint(to,amount);}
}
contract MockRegistry {
    function handleOf(address) external pure returns(string memory){return "test-agent";}
}
contract MockPair {
    address public token0;
    address public token1;
    uint112 private r0;
    uint112 private r1;
    uint256 public totalSupply;
    constructor(address a,address b){token0=a;token1=b;}
    function getReserves() external view returns(uint112,uint112,uint32){return(r0,r1,0);}
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
    MockPair public immutable pair;
    constructor(address f,address p){factory=f;pair=MockPair(p);}
    function addLiquidity(address a,address b,uint256 x,uint256 y,uint256,uint256,address to,uint256)
      external returns(uint256,uint256,uint256){
        require(to==0x000000000000000000000000000000000000dEaD,"not burned");
        IERC20(a).transferFrom(msg.sender,address(pair),x);
        IERC20(b).transferFrom(msg.sender,address(pair),y);
        if(pair.token0()==a)pair.add(a,b,x,y);
        else pair.add(b,a,y,x);
        return(x,y,1);
    }
}
