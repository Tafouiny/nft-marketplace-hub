// src/utils/storage.js
export const NFT_STORAGE_KEY = 'nft_marketplace_submitted_nfts';

// Sauvegarder un NFT nouvellement créé
export const saveSubmittedNFT = (nftData) => {
  try {
    const existingNFTs = getSubmittedNFTs();
    const newNFT = {
      ...nftData,
      id: Date.now(), // ID unique basé sur timestamp
      submittedAt: new Date().toISOString(),
      status: 'submitted' // Pour différencier des NFTs du contrat
    };
    
    const updatedNFTs = [...existingNFTs, newNFT];
    localStorage.setItem(NFT_STORAGE_KEY, JSON.stringify(updatedNFTs));
    
    return newNFT;
  } catch (error) {
    console.error('Erreur sauvegarde NFT:', error);
    return null;
  }
};

// Récupérer tous les NFTs soumis
export const getSubmittedNFTs = () => {
  try {
    const stored = localStorage.getItem(NFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erreur récupération NFTs:', error);
    return [];
  }
};

// Mettre à jour un NFT (par exemple quand il est minté sur la blockchain)
export const updateSubmittedNFT = (nftId, updates) => {
  try {
    const existingNFTs = getSubmittedNFTs();
    const updatedNFTs = existingNFTs.map(nft => 
      nft.id === nftId ? { ...nft, ...updates } : nft
    );
    
    localStorage.setItem(NFT_STORAGE_KEY, JSON.stringify(updatedNFTs));
    return true;
  } catch (error) {
    console.error('Erreur mise à jour NFT:', error);
    return false;
  }
};

// Supprimer un NFT
export const removeSubmittedNFT = (nftId) => {
  try {
    const existingNFTs = getSubmittedNFTs();
    const filteredNFTs = existingNFTs.filter(nft => nft.id !== nftId);
    
    localStorage.setItem(NFT_STORAGE_KEY, JSON.stringify(filteredNFTs));
    return true;
  } catch (error) {
    console.error('Erreur suppression NFT:', error);
    return false;
  }
};

// Vider tous les NFTs soumis (utile pour debug)
export const clearSubmittedNFTs = () => {
  try {
    localStorage.removeItem(NFT_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur nettoyage NFTs:', error);
    return false;
  }
};

// === SYSTÈME DE LIKES PERSISTANT ===
const LIKES_STORAGE_KEY = 'nft_marketplace_likes';
const VIEWS_STORAGE_KEY = 'nft_marketplace_views';

// Obtenir l'ID unique d'un NFT (blockchain ou local)
const getNFTUniqueId = (nft) => {
  if (nft.tokenId) return `blockchain-${nft.tokenId}`;
  if (nft.id) return `local-${nft.id}`;
  return `temp-${nft.name}-${nft.description?.substring(0, 20)}`;
};

// Récupérer les likes stockés
export const getLikesData = () => {
  try {
    const stored = localStorage.getItem(LIKES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erreur récupération likes:', error);
    return {};
  }
};

// Récupérer les vues stockées
export const getViewsData = () => {
  try {
    const stored = localStorage.getItem(VIEWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erreur récupération vues:', error);
    return {};
  }
};

// Liker/déliker un NFT
export const toggleNFTLike = (nft, walletAddress = 'anonymous') => {
  try {
    const nftId = getNFTUniqueId(nft);
    const likesData = getLikesData();

    if (!likesData[nftId]) {
      likesData[nftId] = {
        count: 0,
        users: []
      };
    }

    const hasLiked = likesData[nftId].users.includes(walletAddress);

    if (hasLiked) {
      // Retirer le like
      likesData[nftId].count = Math.max(0, likesData[nftId].count - 1);
      likesData[nftId].users = likesData[nftId].users.filter(user => user !== walletAddress);
    } else {
      // Ajouter le like
      likesData[nftId].count += 1;
      likesData[nftId].users.push(walletAddress);
    }

    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likesData));

    return {
      isLiked: !hasLiked,
      totalLikes: likesData[nftId].count
    };
  } catch (error) {
    console.error('Erreur toggle like:', error);
    return { isLiked: false, totalLikes: 0 };
  }
};

// Vérifier si un utilisateur a liké un NFT
export const hasUserLikedNFT = (nft, walletAddress = 'anonymous') => {
  try {
    const nftId = getNFTUniqueId(nft);
    const likesData = getLikesData();

    if (!likesData[nftId]) return false;
    return likesData[nftId].users.includes(walletAddress);
  } catch (error) {
    console.error('Erreur vérification like:', error);
    return false;
  }
};

// Obtenir le nombre total de likes d'un NFT
export const getNFTLikesCount = (nft) => {
  try {
    const nftId = getNFTUniqueId(nft);
    const likesData = getLikesData();

    return likesData[nftId]?.count || 0;
  } catch (error) {
    console.error('Erreur comptage likes:', error);
    return 0;
  }
};

// Incrémenter les vues d'un NFT
export const incrementNFTViews = (nft) => {
  try {
    const nftId = getNFTUniqueId(nft);
    const viewsData = getViewsData();

    viewsData[nftId] = (viewsData[nftId] || 0) + 1;
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(viewsData));

    return viewsData[nftId];
  } catch (error) {
    console.error('Erreur incrémentation vues:', error);
    return 0;
  }
};

// Obtenir le nombre de vues d'un NFT
export const getNFTViewsCount = (nft) => {
  try {
    const nftId = getNFTUniqueId(nft);
    const viewsData = getViewsData();

    return viewsData[nftId] || 0;
  } catch (error) {
    console.error('Erreur récupération vues:', error);
    return 0;
  }
};