// Script de debug pour NFTs
console.log('=== DEBUG NFTs LOCALSTORAGE ===');

const NFT_STORAGE_KEY = 'nft_marketplace_submitted_nfts';

// Vérifier le contenu du localStorage
const stored = localStorage.getItem(NFT_STORAGE_KEY);
if (stored) {
  const nfts = JSON.parse(stored);
  console.log('🔍 NFTs trouvés dans localStorage:', nfts.length);
  nfts.forEach((nft, index) => {
    console.log(`${index + 1}. ${nft.name}:`, {
      forSale: nft.forSale,
      price: nft.price,
      status: nft.status,
      blockchainStatus: nft.blockchainStatus
    });
  });
} else {
  console.log('❌ Aucun NFT trouvé dans localStorage');
}

// Créer un NFT de test
const testNFT = {
  id: `test-${Date.now()}`,
  name: 'NFT Test Debug',
  description: 'NFT créé pour debug',
  price: 0.1,
  forSale: true,
  imageData: '/placeholder-nft.jpg',
  owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  seller: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  status: 'submitted',
  blockchainStatus: 'pending',
  createdAt: new Date().toISOString(),
  source: 'local'
};

// Sauvegarder le NFT de test
const existing = stored ? JSON.parse(stored) : [];
existing.push(testNFT);
localStorage.setItem(NFT_STORAGE_KEY, JSON.stringify(existing));

console.log('✅ NFT de test ajouté');
console.log('🔄 Actualisez la page pour voir les changements');