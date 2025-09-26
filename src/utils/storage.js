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

// === SYSTÈME DE LIKES ET VUES PERSISTANT ===
const LIKES_STORAGE_KEY = 'nft_marketplace_likes';
const VIEWS_STORAGE_KEY = 'nft_marketplace_views';
const VIEW_TIMER_STORAGE_KEY = 'nft_marketplace_view_timers';

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

// Récupérer les timers de vues stockés
const getViewTimersData = () => {
  try {
    const stored = localStorage.getItem(VIEW_TIMER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erreur récupération timers vues:', error);
    return {};
  }
};

// Incrémenter les vues d'un NFT avec timer de 10 secondes par utilisateur
export const incrementNFTViews = (nft, walletAddress = 'anonymous') => {
  try {
    const nftId = getNFTUniqueId(nft);
    const viewsData = getViewsData();
    const timersData = getViewTimersData();
    const userKey = `${nftId}-${walletAddress}`;
    const now = Date.now();

    // Vérifier si l'utilisateur a vu ce NFT récemment (moins de 10 secondes)
    if (timersData[userKey] && (now - timersData[userKey]) < 10000) {
      console.log(`Timer de vue actif pour ${userKey}, vue ignorée`);
      return viewsData[nftId] || 0;
    }

    // Incrémenter les vues
    viewsData[nftId] = (viewsData[nftId] || 0) + 1;

    // Enregistrer le timestamp de cette vue
    timersData[userKey] = now;

    // Nettoyer les anciens timers (plus de 1 heure)
    const oneHourAgo = now - (60 * 60 * 1000);
    Object.keys(timersData).forEach(key => {
      if (timersData[key] < oneHourAgo) {
        delete timersData[key];
      }
    });

    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(viewsData));
    localStorage.setItem(VIEW_TIMER_STORAGE_KEY, JSON.stringify(timersData));

    console.log(`Vue incrémentée pour ${nftId} par ${walletAddress}: ${viewsData[nftId]}`);
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

// Obtenir le NFT le plus liké parmi tous les NFTs
export const getMostLikedNFT = () => {
  try {
    const likesData = getLikesData();
    const submittedNFTs = getSubmittedNFTs();

    let maxLikes = 0;
    let mostLikedNFTId = null;

    // Trouver le NFT avec le plus de likes
    Object.keys(likesData).forEach(nftId => {
      if (likesData[nftId].count > maxLikes) {
        maxLikes = likesData[nftId].count;
        mostLikedNFTId = nftId;
      }
    });

    if (!mostLikedNFTId || maxLikes === 0) {
      return null;
    }

    // Récupérer les données du NFT
    if (mostLikedNFTId.startsWith('local-')) {
      const localId = mostLikedNFTId.replace('local-', '');
      const nft = submittedNFTs.find(nft => nft.id.toString() === localId);
      if (nft) {
        return {
          ...nft,
          likesCount: maxLikes,
          source: 'local'
        };
      }
    } else if (mostLikedNFTId.startsWith('blockchain-')) {
      // Pour les NFTs blockchain, on retourne juste l'ID et le count
      // Le composant devra faire appel à getNFTDetails pour récupérer les détails complets
      const tokenId = mostLikedNFTId.replace('blockchain-', '');
      return {
        tokenId: parseInt(tokenId),
        likesCount: maxLikes,
        source: 'blockchain'
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur récupération NFT le plus liké:', error);
    return null;
  }
};

// Obtenir tous les NFTs triés par nombre de likes
export const getNFTsByLikes = (limit = 10) => {
  try {
    const likesData = getLikesData();
    const submittedNFTs = getSubmittedNFTs();

    // Créer une liste des NFTs avec leurs likes
    const nftsWithLikes = [];

    Object.keys(likesData).forEach(nftId => {
      const likesCount = likesData[nftId].count;

      if (nftId.startsWith('local-')) {
        const localId = nftId.replace('local-', '');
        const nft = submittedNFTs.find(nft => nft.id.toString() === localId);
        if (nft) {
          nftsWithLikes.push({
            ...nft,
            likesCount,
            source: 'local'
          });
        }
      } else if (nftId.startsWith('blockchain-')) {
        const tokenId = nftId.replace('blockchain-', '');
        nftsWithLikes.push({
          tokenId: parseInt(tokenId),
          likesCount,
          source: 'blockchain'
        });
      }
    });

    // Trier par nombre de likes décroissant
    nftsWithLikes.sort((a, b) => b.likesCount - a.likesCount);

    // Limiter le nombre de résultats
    return nftsWithLikes.slice(0, limit);
  } catch (error) {
    console.error('Erreur récupération NFTs par likes:', error);
    return [];
  }
};