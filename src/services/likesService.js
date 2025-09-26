const API_BASE_URL = 'http://localhost:3000/api';

// Service pour gérer les likes et vues des NFTs
class LikesService {
  // === LIKES ===

  // Récupérer le nombre de likes d'un NFT
  async getLikes(nftId) {
    try {
      const response = await fetch(`${API_BASE_URL}/likes/${nftId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération likes:', error);
      return { count: 0 };
    }
  }

  // Basculer un like (aimer/ne plus aimer)
  async toggleLike(nftId, walletAddress) {
    try {
      const response = await fetch(`${API_BASE_URL}/likes/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nftId, walletAddress })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erreur toggle like:', error);
      return { success: false, message: error.message };
    }
  }

  // Récupérer les likes d'un utilisateur
  async getUserLikes(walletAddress) {
    try {
      const response = await fetch(`${API_BASE_URL}/likes/user/${walletAddress}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération likes utilisateur:', error);
      return { likes: [] };
    }
  }

  // === VUES ===

  // Récupérer le nombre de vues d'un NFT
  async getViews(nftId) {
    try {
      const response = await fetch(`${API_BASE_URL}/views/${nftId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération vues:', error);
      return { count: 0 };
    }
  }

  // Incrémenter les vues d'un NFT
  async incrementViews(nftId) {
    try {
      const response = await fetch(`${API_BASE_URL}/views/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nftId })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erreur incrémentation vues:', error);
      return { success: false, newCount: 0 };
    }
  }

  // === MÉTHODES COMBINÉES ===

  // Récupérer les stats complètes d'un NFT (likes + vues)
  async getNFTStats(nftId) {
    try {
      const [likesData, viewsData] = await Promise.all([
        this.getLikes(nftId),
        this.getViews(nftId)
      ]);

      return {
        likes: likesData.count || 0,
        views: viewsData.count || 0
      };
    } catch (error) {
      console.error('Erreur récupération stats NFT:', error);
      return { likes: 0, views: 0 };
    }
  }

  // Vérifier si un utilisateur a liké un NFT
  async hasUserLiked(nftId, walletAddress) {
    try {
      const userData = await this.getUserLikes(walletAddress);
      return userData.likes.includes(nftId);
    } catch (error) {
      console.error('Erreur vérification like utilisateur:', error);
      return false;
    }
  }
}

// Export de l'instance singleton
const likesService = new LikesService();
export default likesService;