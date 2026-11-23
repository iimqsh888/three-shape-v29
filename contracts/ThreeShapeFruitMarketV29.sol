// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IThreeShapeFruitNFT is IERC721 {
    function kind(uint256 tokenId) external view returns (uint8);
}

/// @notice Independent, immutable, fee-free market. No owner, rescue or upgrade functions.
contract ThreeShapeFruitMarketV29 is IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IThreeShapeFruitNFT public immutable nft;
    IERC20 public immutable paymentToken;
    mapping(address => bool) public activated;
    mapping(address => uint256) public lockedStar;
    enum Status { None, Active, Cancelled, Sold }
    struct Listing { address seller; uint256 tokenId; uint256 price; Status status; address buyer; }
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public tokenListing;
    uint256 public nextListingId = 1;
    address private receivingFrom;
    uint256 private receivingToken;
    bool private receiving;
    event Activated(address indexed wallet, uint256 indexed starTokenId);
    event Listed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price);
    event Cancelled(uint256 indexed listingId);
    event Purchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 tokenId, uint256 price);

    constructor(address nft_, address paymentToken_) {
        require(nft_.code.length > 0 && paymentToken_.code.length > 0, "invalid dependency");
        nft = IThreeShapeFruitNFT(nft_);
        paymentToken = IERC20(paymentToken_);
    }
    modifier activeWallet() { require(activated[msg.sender], "market inactive"); _; }

    function activate(uint256 starTokenId) external nonReentrant {
        require(!activated[msg.sender], "already activated");
        require(nft.kind(starTokenId) == 9, "not Star");
        require(nft.ownerOf(starTokenId) == msg.sender, "not holder");
        activated[msg.sender] = true;
        lockedStar[msg.sender] = starTokenId;
        _receive(starTokenId);
        emit Activated(msg.sender, starTokenId);
    }
    function list(uint256 tokenId, uint256 price) external nonReentrant activeWallet returns (uint256 id) {
        require(price > 0, "zero price");
        uint8 k = nft.kind(tokenId);
        require(k >= 1 && k <= 8, "not fruit");
        require(nft.ownerOf(tokenId) == msg.sender, "not holder");
        require(tokenListing[tokenId] == 0, "already listed");
        id = nextListingId++;
        listings[id] = Listing(msg.sender, tokenId, price, Status.Active, address(0));
        tokenListing[tokenId] = id;
        _receive(tokenId);
        emit Listed(id, msg.sender, tokenId, price);
    }
    function cancel(uint256 id) external nonReentrant {
        Listing storage order = listings[id];
        require(order.status == Status.Active, "not active");
        require(order.seller == msg.sender, "not seller");
        order.status = Status.Cancelled;
        delete tokenListing[order.tokenId];
        nft.safeTransferFrom(address(this), msg.sender, order.tokenId);
        emit Cancelled(id);
    }
    function buy(uint256 id, uint256 expectedPrice) external nonReentrant activeWallet {
        Listing storage order = listings[id];
        require(order.status == Status.Active, "not active");
        require(order.seller != msg.sender, "self purchase");
        require(order.price == expectedPrice, "price mismatch");
        order.status = Status.Sold;
        order.buyer = msg.sender;
        delete tokenListing[order.tokenId];
        paymentToken.safeTransferFrom(msg.sender, order.seller, order.price);
        nft.safeTransferFrom(address(this), msg.sender, order.tokenId);
        emit Purchased(id, msg.sender, order.seller, order.tokenId, order.price);
    }
    function _receive(uint256 tokenId) private {
        receiving = true;
        receivingFrom = msg.sender;
        receivingToken = tokenId;
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        require(!receiving && nft.ownerOf(tokenId) == address(this), "receipt missing");
        delete receivingFrom;
        delete receivingToken;
    }
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata) external returns (bytes4) {
        require(msg.sender == address(nft) && receiving && operator == address(this)
            && from == receivingFrom && tokenId == receivingToken, "unexpected NFT");
        receiving = false;
        return IERC721Receiver.onERC721Received.selector;
    }
    /// @notice Bounded history pages, including terminal states. No historical log scan required.
    function getListings(uint256 start, uint256 limit) external view returns (Listing[] memory page, uint256 next) {
        require(start > 0 && start <= nextListingId && limit > 0 && limit <= 100, "invalid page");
        uint256 count = nextListingId - start;
        if (count > limit) count = limit;
        page = new Listing[](count);
        for (uint256 i; i < count; ++i) page[i] = listings[start + i];
        next = start + count;
    }
}
