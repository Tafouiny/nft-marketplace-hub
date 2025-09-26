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

    // Structure pour suivre l'historique des ventes
    struct SaleRecord {
        uint256 tokenId;
        uint256 price;
        address seller;
        address buyer;
        uint256 timestamp;
    }

    // Historique des ventes
    SaleRecord[] private salesHistory;

    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool listed;
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
            true
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

        // Enregistrer la vente dans l'historique
        salesHistory.push(SaleRecord({
            tokenId: tokenId,
            price: price,
            seller: seller,
            buyer: msg.sender,
            timestamp: block.timestamp
        }));

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

        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
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

    // Obtenir le NFT vendu le plus cher dans les dernières 24h
    function getMostExpensiveNFTLast24h() public view returns (SaleRecord memory) {
        uint256 cutoffTime = block.timestamp - 24 hours;
        uint256 maxPrice = 0;
        uint256 maxIndex = 0;
        bool found = false;

        for (uint256 i = 0; i < salesHistory.length; i++) {
            if (salesHistory[i].timestamp >= cutoffTime && salesHistory[i].price > maxPrice) {
                maxPrice = salesHistory[i].price;
                maxIndex = i;
                found = true;
            }
        }

        if (found) {
            return salesHistory[maxIndex];
        } else {
            // Retourner un enregistrement vide si aucune vente dans les 24h
            return SaleRecord(0, 0, address(0), address(0), 0);
        }
    }

    // Obtenir toutes les ventes récentes (par exemple les 10 dernières)
    function getRecentSales(uint256 limit) public view returns (SaleRecord[] memory) {
        uint256 salesCount = salesHistory.length;
        if (salesCount == 0) {
            return new SaleRecord[](0);
        }

        uint256 resultCount = limit > salesCount ? salesCount : limit;
        SaleRecord[] memory recentSales = new SaleRecord[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            recentSales[i] = salesHistory[salesCount - 1 - i];
        }

        return recentSales;
    }

    // Obtenir le nombre total de ventes
    function getTotalSalesCount() public view returns (uint256) {
        return salesHistory.length;
    }
}