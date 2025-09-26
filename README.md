# NFT Marketplace

A full-stack NFT marketplace built with React, Vite, and Ethereum smart contracts using Hardhat.

## Features

- **Browse NFTs**: Explore and discover unique digital assets
- **Mint NFTs**: Create your own NFTs with custom metadata
- **Buy/Sell**: Trade NFTs on the marketplace
- **Wallet Integration**: Connect with MetaMask
- **Local & Blockchain**: Support for both local NFTs and blockchain-deployed NFTs

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- Git

## Installation & Deployment

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nft-marketplace-hub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Smart Contracts

#### Start Local Blockchain
```bash
npx hardhat node
```
This will start a local blockchain network on `http://127.0.0.1:8545` (chain ID: 1337)

#### Deploy the NFT Marketplace Contract
In a new terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

The contract address will be automatically saved to `src/contracts/contract-address.json`

### 4. Create Sample NFTs (Optional)

Deploy some test NFTs to the marketplace:
```bash
npx hardhat run scripts/createTestNFTs.js --network localhost
```

This creates 3 sample NFTs:
- Test NFT 1 (0.5 ETH)
- Test NFT 2 (1.0 ETH)
- Test NFT 3 (2.5 ETH)

### 5. Launch the Frontend

```bash
npm run dev
```

The application will be available at **http://localhost:8080**

### 6. Configure MetaMask

1. Open MetaMask in your browser
2. Add the Hardhat network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`
3. Import a test account using one of the private keys from the Hardhat node output

## Available Scripts

### Blockchain Commands
- `npx hardhat compile` - Compile smart contracts
- `npx hardhat test` - Run contract tests
- `npx hardhat node` - Start local blockchain
- `npx hardhat run scripts/deploy.js --network localhost` - Deploy contracts
- `npx hardhat run scripts/createTestNFTs.js --network localhost` - Create sample NFTs
- `npx hardhat run scripts/resetMarketplace.js --network localhost` - Reset marketplace state

### Frontend Commands
- `npm run dev` - Start development server (port 8080)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Application Structure

### Pages

1. **Home Page (/)**:
   - Landing page with featured NFTs
   - Connect wallet button
   - Link to explore page

2. **Explore Page (/explore)**:
   - Browse all available NFTs
   - Filter and search functionality
   - Link to submit NFT page

3. **Submit NFT Page (/submit)** (Requires wallet connection):
   - Create and mint new NFTs
   - Upload images and set metadata

4. **Portfolio Page (/portfolio)** (Requires wallet connection):
   - View owned NFTs
   - Manage listed NFTs

5. **NFT Detail Page (/nft/:id)**:
   - Individual NFT details
   - Buy/sell functionality

## Smart Contract Functions

The NFT Marketplace contract supports:

- **Minting**: `createToken(tokenURI, price)` - Create new NFT with optional listing
- **Buying**: `createMarketSale(tokenId)` - Purchase NFT from marketplace
- **Listing**: `createMarketItem(tokenId, price)` - List NFT for sale
- **Withdrawing**: `withdrawListingItem(tokenId)` - Remove NFT from sale
- **Fetching**: Various view functions to get marketplace data

## Remaining Available NFTs

After deploying sample NFTs, you can check available NFTs by:

1. Visit the Explore page at `http://localhost:8080/explore`
2. The page shows the total count of available NFTs
3. Use the console to run:
   ```javascript
   // In browser console
   console.log('Available NFTs:', localStorage.getItem('nft_marketplace_submitted_nfts'))
   ```

## Usage Guide

### 1. Connect Wallet
- Click "Connecter" button in the header
- Approve MetaMask connection
- Ensure you're on the Hardhat Local network (chain ID 1337)

### 2. Explore NFTs
- Visit the Explore page to see all NFTs
- Use filters to narrow down results
- Click on NFTs to view details

### 3. Buy NFTs
- From the Explore page or NFT detail page
- Click "Acheter" button
- Confirm transaction in MetaMask

### 4. Create NFTs
- Go to Submit NFT page (requires wallet connection)
- Upload image and fill metadata
- Set price and listing preferences
- Submit to create your NFT

### 5. Manage Portfolio
- Visit Portfolio page to see your NFTs
- List NFTs for sale or withdraw from marketplace

## Troubleshooting

### Common Issues

1. **MetaMask Connection Issues**:
   - Ensure MetaMask is installed and unlocked
   - Check that you're on the Hardhat Local network
   - Try refreshing the page

2. **Smart Contract Not Found**:
   - Make sure the local blockchain is running
   - Ensure contracts are deployed: `npx hardhat run scripts/deploy.js --network localhost`

3. **No NFTs Visible**:
   - Deploy sample NFTs: `npx hardhat run scripts/createTestNFTs.js --network localhost`
   - Check browser console for errors

4. **Transaction Failures**:
   - Ensure sufficient ETH balance in your test account
   - Check that the contract address is correct in `src/contracts/contract-address.json`

### Reset Everything
```bash
# Stop the hardhat node (Ctrl+C)
# Restart hardhat node
npx hardhat node

# In new terminal, redeploy everything
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/createTestNFTs.js --network localhost

# Clear browser cache and restart frontend
npm run dev
```

## Development

This project uses:
- **Frontend**: React 19 + Vite, React Router
- **Blockchain**: Hardhat + Ethers.js v5
- **Smart Contracts**: Solidity with OpenZeppelin
- **Styling**: CSS with custom properties

For development, run the blockchain and frontend in separate terminals to enable hot reloading and live contract interaction.