# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React/Vite)
- `npm run dev` - Start complete development environment (Frontend on 8080 + Likes API on 3000)
- `npm run dev:frontend` - Start only frontend server on http://localhost:8080
- `npm run dev:likes` - Start only likes API server on http://localhost:3000
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

### Blockchain (Hardhat)
- `npx hardhat compile` - Compile smart contracts
- `npx hardhat test` - Run contract tests
- `npx hardhat node` - Start local blockchain network (port 8545)
- `npx hardhat run scripts/deploy.js --network localhost` - Deploy contracts to local network
- `npx hardhat run scripts/createAndListTestNFTs.js --network localhost` - Create test NFTs with fixed images
- `npx hardhat run scripts/finalSystemTest.js --network localhost` - Run complete system test
- `npx hardhat run scripts/testPurchaseNFT.js --network localhost` - Test NFT purchasing
- `npx hardhat run scripts/checkWalletConnection.js --network localhost` - Check wallet setup
- `npx hardhat run scripts/resetMarketplace.js --network localhost` - Reset marketplace state
- `npx hardhat run scripts/clearLocalNFTS.js --network localhost` - Clear local NFTs

### Likes & Views System
- `node start-likes.js` - Start likes and views API server (port 3001)
- `node test-likes-system.js` - Test complete likes/views functionality

## Architecture Overview

### Project Structure
This is a full-stack NFT marketplace with React frontend and Ethereum smart contracts:

- **Frontend**: React 19 + Vite, React Router for navigation
- **Blockchain**: Hardhat development environment with Solidity contracts
- **Storage**: IPFS integration via Pinata for decentralized image storage
- **Likes & Views**: Express.js API server with JSON file persistence for NFT engagement tracking
- **Wallet Integration**: MetaMask via ethers.js (v5), with comprehensive error handling
- **State Management**: React Context API for global state
- **CORS Handling**: Vite proxy configuration for IPFS gateway access

### Key Components

#### Smart Contract Layer
- `contracts/NFTMarketplace.sol` - Main marketplace contract (ERC721 + marketplace functions)
- Contract deployed at address stored in `src/contracts/contract-address.json`
- Supports minting, listing, buying, and withdrawing NFTs

#### Frontend Architecture
- `src/App.jsx` - Main app with routing, wallet connection context, and private route protection
- **Global State**: AppContext provides wallet connection state, selected NFT, and connection handlers
- **Wallet Connection**: Direct MetaMask integration (not using wagmi/rainbowkit in current implementation)
- **Network**: Hardhat local network (chainId 0x539 / 1337) with automatic network switching

#### Core Pages
- `Welcome` - Landing page with wallet connection
- `Explore` - Browse marketplace NFTs (public access)
- `Portfolio` - User's owned NFTs (requires wallet connection)
- `SubmitNFT` - Create and mint new NFTs (requires wallet connection)
- `NFTDetail` - Individual NFT details page

#### Blockchain Integration
- `src/utils/contract.js` - Contract interaction utilities with ethers.js
- `src/services/ipfsService.js` - IPFS integration service with Pinata API
- `src/services/likesService.js` - Likes and views API client service
- `src/config/wagmi.js` - RainbowKit configuration (currently unused)
- Supports both read-only operations (via JsonRpcProvider) and wallet transactions
- IPFS metadata handling with proxy fallback for CORS issues

#### Likes & Views System
- `start-likes.js` - Express.js API server for likes and views (port 3001)
- `likes-data.json` - JSON file storing likes, views, and user preferences
- `src/components/NFTStats/NFTStats.jsx` - React component for displaying and managing likes/views
- Anti-spam protection: IP-based view deduplication (10-second cooldown)

### Development Workflow

1. **Smart Contract Development**:
   - Start local blockchain: `npx hardhat node`
   - Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
   - Contract address automatically saved to `src/contracts/contract-address.json`

2. **Frontend Development**:
   - Start likes/views server: `node start-likes.js` (runs on port 3001)
   - Start frontend: `npm run dev` (runs on auto-assigned port, usually 5173+)
   - Ensure MetaMask is connected to localhost:8545 (Hardhat network)
   - Application automatically handles network switching to chainId 1337

3. **Testing Flow**:
   - Connect wallet on Welcome page (with comprehensive error handling)
   - Browse NFTs on Explore page (works without wallet, shows likes/views)
   - Create NFTs on Submit page (requires wallet, uses IPFS for images)
   - View owned NFTs in Portfolio (requires wallet)
   - Like/unlike NFTs and view engagement stats in real-time
   - Use test scripts to create sample NFTs with fixed images
   - Run `node test-likes-system.js` to verify likes/views functionality

### Important Notes

- **Wallet Connection**: Direct MetaMask integration with comprehensive error handling (connection states, error codes)
- **Network Configuration**: Hardhat local network (chainId 1337) with automatic switching
- **Storage Strategy**: IPFS via Pinata for images and metadata (with fallback to base64 for testing)
- **CORS Solutions**: Vite proxy configuration bypasses IPFS gateway CORS restrictions
- **Contract Interaction**: Mixed approach - read operations use JsonRpcProvider, write operations require wallet
- **Route Protection**: Private routes (`/portfolio`, `/submit`) require wallet connection
- **Error Handling**: Robust error management for MetaMask, IPFS, contract interactions, and likes/views API
- **Testing**: Automated scripts for NFT creation, marketplace testing, likes/views system, and complete system validation
- **Engagement Tracking**: Real-time likes and views with user-specific state persistence and anti-spam protection

### Contract Functions Used
- `fetchMarketItems()` - Get all marketplace NFTs
- `fetchMyNFTs()` - Get user's owned NFTs
- `fetchItemsListed()` - Get user's listed NFTs
- `createToken(tokenURI, price)` - Mint and list new NFT (supports both IPFS and base64 metadata)
- `createMarketSale(tokenId)` - Purchase NFT
- `withdrawListingItem(tokenId)` - Remove NFT from sale
- `getListingPrice()` - Get marketplace listing fee
- `tokenURI(tokenId)` - Get token metadata URI (IPFS or base64)
- `ownerOf(tokenId)` - Get NFT owner address

### IPFS Integration
- **Service**: Pinata (pinata.cloud) for IPFS pinning and gateway access
- **Configuration**: API keys stored in `.env` file (VITE_PINATA_API_KEY, VITE_PINATA_SECRET_KEY)
- **Upload Functions**:
  - `uploadImageToIPFS(file)` - Upload image file to IPFS
  - `uploadMetadataToIPFS(metadata)` - Upload JSON metadata to IPFS
  - `uploadCompleteNFT(nftData)` - Complete NFT upload (image + metadata)
- **Proxy Setup**: Vite proxy routes `/ipfs-proxy/*` to `https://gateway.pinata.cloud/ipfs/*` for CORS bypass
- **Error Handling**: Timeout management, fallback mechanisms, and user-friendly error messages

### Environment Setup
**Required .env variables:**
```
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
```

**MetaMask Network Configuration:**
- Network Name: Hardhat Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 1337 (0x539)
- Currency Symbol: ETH

**Test Account (for development):**
- Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

### Likes & Views API Reference

**Server Configuration:**
- Port: 3001
- Base URL: http://localhost:3001/api
- Data Storage: likes-data.json (JSON file persistence)
- CORS: Enabled for development origins

**API Endpoints:**

**Likes Management:**
- `GET /api/likes/:nftId` - Get likes count for specific NFT
- `POST /api/likes/toggle` - Toggle like for NFT (requires `nftId` and `walletAddress`)
- `GET /api/likes/user/:walletAddress` - Get all NFTs liked by specific user

**Views Tracking:**
- `GET /api/views/:nftId` - Get views count for specific NFT
- `POST /api/views/increment` - Increment views for NFT (requires `nftId`)

**Data Structure (likes-data.json):**
```json
{
  "likes": { "nftId": count },
  "userLikes": { "walletAddress": ["nftId1", "nftId2"] },
  "views": { "nftId": count }
}
```

**Frontend Integration:**
- `NFTStats` component automatically handles likes/views display and interaction
- Views auto-increment when visiting NFT detail pages
- Likes require wallet connection and persist per user
- Real-time updates via API calls