import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';
import NFTCard from '../../components/NFTCard/NFTCard';
import { Search, ArrowRight, Users, Package, TrendingUp } from 'lucide-react';
import { useAppContext } from '../../App';
import { fetchMarketplaceNFTs, fetchAllNFTsIncludingAuctions } from '../../utils/contract';
import { getSubmittedNFTs } from '../../utils/storage';
import { getCachedMarketplaceStats } from '../../services/marketplaceStatsService';
import { getRecommendations } from '../../services/statsService';

const Welcome = () => {
  const navigate = useNavigate();
  const { setSelectedNFT } = useAppContext();
  
  const [featuredNFTs, setFeaturedNFTs] = useState([]);
  const [marketStats, setMarketStats] = useState({
    totalNFTs: 0,
    totalUsers: 0,
    totalVolume: 0,
    blockchainNFTs: 0,
    localNFTs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWelcomeData();
  }, []);

  const loadWelcomeData = async () => {
    setLoading(true);

    try {
      // 1. Obtenir les recommandations du serveur
      const recommendations = await getRecommendations();
      console.log('Recommandations reçues:', recommendations);

      // 2. Charger TOUS les NFTs de la blockchain pour chercher les recommandés
      const allBlockchainNFTs = await fetchAllNFTsIncludingAuctions().catch(err => {
        console.warn('Erreur chargement blockchain complète:', err);
        return [];
      });

      // 3. Charger les NFTs locaux comme fallback
      const localNFTs = getSubmittedNFTs();

      // 4. Combiner toutes les sources
      const allNFTs = [
        ...allBlockchainNFTs.map(nft => ({
          ...nft,
          source: 'blockchain',
          image: nft.image || nft.imageUrl || '/placeholder-nft.jpg'
        })),
        ...localNFTs.map(nft => ({
          ...nft,
          source: 'local',
          image: nft.image || nft.imageDataUrl || nft.imagePreview,
          id: nft.id || `local-${Date.now()}`
        }))
      ];

      // 5. Sélectionner les NFTs recommandés
      let featured = [];

      // Chercher les NFTs recommandés dans toutes les sources
      for (const recommendation of recommendations) {
        const foundNFT = allNFTs.find(nft =>
          nft.id === recommendation.nftId ||
          nft.id === parseInt(recommendation.nftId) ||
          (nft.source === 'local' && nft.id.includes(recommendation.nftId))
        );

        if (foundNFT) {
          featured.push({
            ...foundNFT,
            recommendationReason: recommendation.reason,
            recommendationData: recommendation
          });
        }
      }

      // 6. Si moins de 2 NFTs recommandés, compléter avec des NFTs aléatoires
      if (featured.length < 2) {
        console.log('Pas assez de recommandations, ajout de NFTs aléatoires');

        // Filtrer les NFTs déjà sélectionnés
        const availableNFTs = allNFTs.filter(nft =>
          !featured.some(f => f.id === nft.id) &&
          (nft.forSale || nft.source === 'local')
        );

        // Mélanger et prendre les premiers
        const shuffled = availableNFTs.sort(() => Math.random() - 0.5);
        const needed = 2 - featured.length;
        const randomNFTs = shuffled.slice(0, needed).map(nft => ({
          ...nft,
          recommendationReason: 'random',
          recommendationData: { reason: 'random', priority: 99 }
        }));

        featured = [...featured, ...randomNFTs];
      }

      // 7. Limiter à 2 NFTs maximum
      featured = featured.slice(0, 2);

      setFeaturedNFTs(featured);

      // 8. Calculer les statistiques
      const totalVolume = allBlockchainNFTs.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);
      const uniqueOwners = new Set([
        ...allBlockchainNFTs.map(nft => nft.owner),
        ...localNFTs.map(nft => nft.owner || 'local-user')
      ]).size;

      // 7. Récupérer les stats depuis le serveur (avec données blockchain en temps réel)
      console.log('📊 Récupération des stats depuis le serveur...');
      const serverStats = await getCachedMarketplaceStats();

      setMarketStats({
        totalNFTs: serverStats.totalNFTs,
        totalUsers: serverStats.totalUsers,
        totalVolume: serverStats.totalVolume,
        blockchainNFTs: serverStats.blockchainNFTs,
        localNFTs: serverStats.localNFTs,
        nftsForSale: serverStats.nftsForSale, // Nouvelle stat !
        source: serverStats.source
      });

      console.log('Données chargées:', {
        recommendations: recommendations.length,
        blockchain: allBlockchainNFTs.length,
        local: localNFTs.length,
        total: allNFTs.length,
        featured: featured.length
      });

    } catch (error) {
      console.error('Erreur chargement données welcome:', error);
      
      // En cas d'erreur, utiliser uniquement les données locales
      const localNFTs = getSubmittedNFTs();
      const fallbackNFTs = localNFTs.map(nft => ({
        ...nft,
        source: 'local',
        image: nft.image || nft.imageDataUrl || nft.imagePreview,
        recommendationReason: 'fallback'
      }));

      setFeaturedNFTs(fallbackNFTs.slice(0, 2)); // Limité à 2 NFTs

      // Essayer de récupérer les stats du serveur même en cas d'erreur de NFTs
      try {
        const serverStats = await getCachedMarketplaceStats();
        setMarketStats(serverStats);
      } catch (statsError) {
        console.warn('Impossible de récupérer les stats serveur:', statsError);
        setMarketStats({
          totalNFTs: fallbackNFTs.length,
          totalUsers: 1,
          totalVolume: '0 ETH',
          blockchainNFTs: 0,
          localNFTs: fallbackNFTs.length,
          nftsForSale: 0,
          source: 'fallback'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    if (nft.source === 'local') {
      navigate(`/nft/local-${nft.id}`);
    } else {
      navigate(`/nft/${nft.id}`);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="welcome">
      {/* Hero Section */}
      <section className="welcome-hero">
        <div className="container">
          <h1 className="welcome-title gradient-accent">
            Découvrez, Collectionnez et Échangez des NFTs Uniques
          </h1>
          <p className="welcome-subtitle">
            La marketplace dédiée aux œuvres d'art numériques et aux objets de collection rares
          </p>

          {/* Stats */}
          {!loading && (
            <div className="welcome-stats">
              <div className="stat-card">
                <Package className="stat-icon" />
                <div className="stat-content">
                  <div className="stat-number">{formatNumber(marketStats.totalNFTs)}</div>
                  <div className="stat-label">NFTs Créés</div>
                </div>
              </div>
              <div className="stat-card">
                <Users className="stat-icon" />
                <div className="stat-content">
                  <div className="stat-number">{formatNumber(marketStats.totalUsers)}</div>
                  <div className="stat-label">Créateurs</div>
                </div>
              </div>
              <div className="stat-card">
                <TrendingUp className="stat-icon" />
                <div className="stat-content">
                  <div className="stat-number">{marketStats.totalVolume}</div>
                  <div className="stat-label">Volume (ETH)</div>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="welcome-stats-loading">
              <div className="loading-placeholder">Chargement des statistiques...</div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="welcome-cta">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/explore')}
            >
              <Search size={20} />
              Explorer la collection
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/submit')}
            >
              Soumettre un NFT
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Featured NFTs Section */}
      <section className="welcome-featured">
        <div className="container">
          <h2 className="section-title">NFTs Recommandés</h2>
          <p className="section-subtitle">
            NFT le plus vendu des dernières 24h et le plus aimé de la communauté
          </p>
          
          {loading && (
            <div className="featured-loading">
              <div className="loading-grid">
                {[1, 2].map(i => (
                  <div key={i} className="loading-card">
                    <div className="loading-image"></div>
                    <div className="loading-text"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && featuredNFTs.length > 0 && (
            <div className="featured-grid">
              {featuredNFTs.map((nft, index) => (
                <div key={`${nft.source}-${nft.id}-${index}`} className="featured-item">
                  <NFTCard
                    nft={{
                      ...nft,
                      image: nft.image || nft.imageDataUrl || nft.imagePreview || '/placeholder-nft.jpg'
                    }}
                    badge={
                      nft.recommendationReason === 'highest_sale_24h'
                        ? { type: 'trending', text: `💰 Vendu ${nft.recommendationData?.price || 0} ETH` }
                        : nft.recommendationReason === 'most_liked' || nft.recommendationReason === 'second_most_liked'
                          ? { type: 'new', text: `❤️ ${nft.recommendationData?.likes || 0} likes` }
                          : nft.recommendationReason === 'random'
                            ? { type: 'trending', text: '🎲 Découverte' }
                            : nft.source === 'local'
                              ? { type: 'new', text: 'Local' }
                              : nft.forSale
                                ? { type: 'trending', text: 'En vente' }
                                : null
                    }
                    onClick={handleNFTClick}
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && featuredNFTs.length === 0 && (
            <div className="no-featured">
              <Package size={48} />
              <h3>Aucun NFT disponible</h3>
              <p>Soyez le premier à créer et partager vos œuvres</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/submit')}
              >
                Créer le premier NFT
              </button>
            </div>
          )}
          
          <div className="featured-footer">
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/explore')}
            >
              Voir tous les NFTs
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="welcome-how">
        <div className="container">
          <h2 className="section-title">Comment ça marche ?</h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-number">1</div>
              <h3>Connectez votre wallet</h3>
              <p>Connectez votre wallet MetaMask pour commencer à interagir avec la blockchain</p>
            </div>
            <div className="how-card">
              <div className="how-number">2</div>
              <h3>Créez vos NFTs</h3>
              <p>Uploadez vos œuvres et créez vos NFTs uniques sauvegardés localement</p>
            </div>
            <div className="how-card">
              <div className="how-number">3</div>
              <h3>Partagez et échangez</h3>
              <p>Explorez la collection et découvrez les créations de la communauté</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Summary */}
      {!loading && marketStats.totalNFTs > 0 && (
        <section className="welcome-summary">
          <div className="container">
            <div className="summary-content">
              <h3>État de la plateforme</h3>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-number">{marketStats.blockchainNFTs}</span>
                  <span className="summary-label">NFTs sur blockchain</span>
                </div>
                <div className="summary-item">
                  <span className="summary-number">{marketStats.localNFTs}</span>
                  <span className="summary-label">NFTs locaux</span>
                </div>
                <div className="summary-item">
                  <span className="summary-number">{marketStats.nftsForSale || 0}</span>
                  <span className="summary-label">En vente</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Welcome;