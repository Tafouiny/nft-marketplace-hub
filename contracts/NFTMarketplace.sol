// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTMarketplace is ERC721URIStorage, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    uint256 listingPrice = 0.025 ether;
    address payable owner;

    mapping(uint256 => MarketItem) private idToMarketItem;

    mapping(uint256 => address) private tokenCreators;

    // Enchères
    mapping(uint256 => Auction) private tokenToAuction;
    mapping(uint256 => mapping(address => uint256)) private auctionBids;
    Counters.Counter private _auctionIds;

    enum AuctionDuration {
        ONE_MINUTE,    // 60 secondes
        FIVE_MINUTES,  // 300 secondes
        TEN_MINUTES,   // 600 secondes
        THIRTY_MINUTES // 1800 secondes
    }

    struct Auction {
        uint256 auctionId;
        uint256 tokenId;
        address payable seller;
        uint256 startingPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 startTime;
        uint256 endTime;
        AuctionDuration duration;
        bool active;
        bool ended;
    }

    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool listed;
        bool inAuction;
    }

    event MarketItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    event MarketItemSold(
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );

    event AuctionStarted(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address seller,
        uint256 startingPrice,
        uint256 endTime,
        AuctionDuration duration
    );

    event BidPlaced(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address winner,
        uint256 winningBid
    );

    event BidWithdrawn(
        uint256 indexed auctionId,
        address bidder,
        uint256 amount
    );

    constructor() ERC721("NFT Marketplace", "NFTM") {
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only marketplace owner can call this");
        _;
    }

    function updateListingPrice(uint _listingPrice) public onlyOwner {
        listingPrice = _listingPrice;
    }

    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    function createToken(string memory tokenURI, uint256 price) public payable returns (uint) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        tokenCreators[newTokenId] = msg.sender;

        
        if (price > 0) {
            createMarketItem(newTokenId, price);
        } else {
            // Si pas de prix, créer comme item possédé
            idToMarketItem[newTokenId] = MarketItem(
                newTokenId,
                payable(address(0)),
                payable(msg.sender),
                0,
                false,
                false,
                false
            );
        }
        
        return newTokenId;
    }

    function getTokenCreator(uint256 tokenId) public view returns (address) {
    return tokenCreators[tokenId];
        }

    function createMarketItem(uint256 tokenId, uint256 price) public payable nonReentrant {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingPrice, "Price must be equal to listing price");
        require(ownerOf(tokenId) == msg.sender, "Only token owner can list");

        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            true,
            false
        );

        _transfer(msg.sender, address(this), tokenId);
        
        emit MarketItemCreated(
            tokenId,
            msg.sender,
            address(this),
            price,
            false
        );
    }

    function createMarketSale(uint256 tokenId) public payable nonReentrant {
        uint price = idToMarketItem[tokenId].price;
        address seller = idToMarketItem[tokenId].seller;
        
        require(msg.value == price, "Please submit the asking price");
        require(idToMarketItem[tokenId].listed, "Item not listed for sale");
        require(!idToMarketItem[tokenId].sold, "Item already sold");

        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].sold = true;
        idToMarketItem[tokenId].listed = false;
        _itemsSold.increment();

        _transfer(address(this), msg.sender, tokenId);
        payable(owner).transfer(listingPrice);
        payable(seller).transfer(msg.value);

        emit MarketItemSold(tokenId, seller, msg.sender, price);
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint itemCount = _tokenIds.current();
        uint unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint i = 0; i < itemCount; i++) {
            if (idToMarketItem[i + 1].listed && !idToMarketItem[i + 1].sold) {
                uint currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchAllMarketItems() public view returns (MarketItem[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint currentIndex = 0;

        // Compter tous les items créés (pas seulement en vente)
        MarketItem[] memory items = new MarketItem[](totalItemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            uint currentId = i + 1;
            MarketItem storage currentItem = idToMarketItem[currentId];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }

    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                uint currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        // Premier passage : compter seulement les items encore listés
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender &&
                idToMarketItem[i + 1].listed &&
                !idToMarketItem[i + 1].sold) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        // Deuxième passage : récupérer seulement les items encore listés
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender &&
                idToMarketItem[i + 1].listed &&
                !idToMarketItem[i + 1].sold) {
                uint currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function getMarketItem(uint256 tokenId) public view returns (MarketItem memory) {
        return idToMarketItem[tokenId];
    }

    function withdrawListingItem(uint256 tokenId) public nonReentrant {
        require(idToMarketItem[tokenId].seller == msg.sender, "Only seller can withdraw");
        require(idToMarketItem[tokenId].listed, "Item not listed");
        require(!idToMarketItem[tokenId].sold, "Item already sold");

        idToMarketItem[tokenId].listed = false;
        idToMarketItem[tokenId].owner = payable(msg.sender);
        idToMarketItem[tokenId].seller = payable(address(0));

        _transfer(address(this), msg.sender, tokenId);
    }

    // ============ FONCTIONS D'ENCHÈRES ============

    function getDurationInSeconds(AuctionDuration duration) private pure returns (uint256) {
        if (duration == AuctionDuration.ONE_MINUTE) return 60;
        if (duration == AuctionDuration.FIVE_MINUTES) return 300;
        if (duration == AuctionDuration.TEN_MINUTES) return 600;
        if (duration == AuctionDuration.THIRTY_MINUTES) return 1800;
        return 300; // default 5 minutes
    }

    function startAuction(uint256 tokenId, uint256 startingPrice, AuctionDuration duration) public nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Only token owner can start auction");
        require(!idToMarketItem[tokenId].listed, "Item is listed for sale");
        require(!idToMarketItem[tokenId].inAuction, "Item already in auction");
        require(startingPrice > 0, "Starting price must be greater than 0");

        _auctionIds.increment();
        uint256 auctionId = _auctionIds.current();

        uint256 durationSeconds = getDurationInSeconds(duration);
        uint256 endTime = block.timestamp + durationSeconds;

        tokenToAuction[tokenId] = Auction({
            auctionId: auctionId,
            tokenId: tokenId,
            seller: payable(msg.sender),
            startingPrice: startingPrice,
            highestBid: 0,
            highestBidder: payable(address(0)),
            startTime: block.timestamp,
            endTime: endTime,
            duration: duration,
            active: true,
            ended: false
        });

        // Mettre à jour le MarketItem
        idToMarketItem[tokenId].inAuction = true;
        idToMarketItem[tokenId].seller = payable(msg.sender);

        // Transférer le NFT au contrat
        _transfer(msg.sender, address(this), tokenId);

        emit AuctionStarted(auctionId, tokenId, msg.sender, startingPrice, endTime, duration);
    }

    function placeBid(uint256 tokenId) public payable nonReentrant {
        Auction storage auction = tokenToAuction[tokenId];

        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(msg.value > auction.startingPrice, "Bid must be higher than starting price");
        require(msg.value > auction.highestBid, "Bid must be higher than current highest bid");

        // Rembourser l'enchérisseur précédent
        if (auction.highestBidder != address(0)) {
            auctionBids[tokenId][auction.highestBidder] += auction.highestBid;
        }

        // Mettre à jour l'enchère la plus haute
        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit BidPlaced(auction.auctionId, tokenId, msg.sender, msg.value);
    }

    function endAuction(uint256 tokenId) public nonReentrant {
        Auction storage auction = tokenToAuction[tokenId];

        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime || msg.sender == auction.seller, "Auction not yet ended");

        auction.active = false;
        auction.ended = true;

        // Mettre à jour le MarketItem
        idToMarketItem[tokenId].inAuction = false;

        if (auction.highestBidder != address(0)) {
            // Il y a un gagnant
            idToMarketItem[tokenId].owner = auction.highestBidder;
            idToMarketItem[tokenId].sold = true;
            _itemsSold.increment();

            // Transférer le NFT au gagnant
            _transfer(address(this), auction.highestBidder, tokenId);

            // Payer le vendeur (moins les frais)
            payable(owner).transfer(listingPrice);
            auction.seller.transfer(auction.highestBid - listingPrice);

            emit AuctionEnded(auction.auctionId, tokenId, auction.highestBidder, auction.highestBid);
        } else {
            // Pas d'enchérisseur, retourner le NFT au vendeur
            idToMarketItem[tokenId].owner = auction.seller;
            idToMarketItem[tokenId].seller = payable(address(0));

            _transfer(address(this), auction.seller, tokenId);

            emit AuctionEnded(auction.auctionId, tokenId, address(0), 0);
        }
    }

    function withdrawBid(uint256 tokenId) public nonReentrant {
        require(auctionBids[tokenId][msg.sender] > 0, "No bid to withdraw");

        uint256 amount = auctionBids[tokenId][msg.sender];
        auctionBids[tokenId][msg.sender] = 0;

        payable(msg.sender).transfer(amount);

        emit BidWithdrawn(tokenToAuction[tokenId].auctionId, msg.sender, amount);
    }

    function getAuction(uint256 tokenId) public view returns (Auction memory) {
        return tokenToAuction[tokenId];
    }

    function fetchActiveAuctions() public view returns (Auction[] memory) {
        uint256 totalAuctions = _auctionIds.current();
        uint256 activeCount = 0;

        // Compter les enchères actives
        for (uint256 i = 1; i <= totalAuctions; i++) {
            for (uint256 tokenId = 1; tokenId <= _tokenIds.current(); tokenId++) {
                if (tokenToAuction[tokenId].auctionId == i && tokenToAuction[tokenId].active) {
                    activeCount++;
                    break;
                }
            }
        }

        Auction[] memory activeAuctions = new Auction[](activeCount);
        uint256 currentIndex = 0;

        // Récupérer les enchères actives
        for (uint256 i = 1; i <= totalAuctions; i++) {
            for (uint256 tokenId = 1; tokenId <= _tokenIds.current(); tokenId++) {
                if (tokenToAuction[tokenId].auctionId == i && tokenToAuction[tokenId].active) {
                    activeAuctions[currentIndex] = tokenToAuction[tokenId];
                    currentIndex++;
                    break;
                }
            }
        }

        return activeAuctions;
    }

    function isAuctionEnded(uint256 tokenId) public view returns (bool) {
        Auction storage auction = tokenToAuction[tokenId];
        return auction.active && block.timestamp >= auction.endTime;
    }

    function getBidAmount(uint256 tokenId, address bidder) public view returns (uint256) {
        return auctionBids[tokenId][bidder];
    }
}