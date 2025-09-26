import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';
import NFTCard from '../../components/NFTCard/NFTCard';
import { Search, ArrowRight, Users, Package, TrendingUp } from 'lucide-react';
import { useAppContext } from '../../App';
import { fetchMarketplaceNFTs } from '../../utils/contract';
import { getSubmittedNFTs } from '../../utils/storage';

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

  // Fonction pour sélectionner les NFTs en vedette selon les règles spécifiées
  const selectFeaturedNFTs = (allNFTs) => {
    const featured = [];

    // 1. NFT le plus cher vendu dans les derniers 24h
    // Chercher les NFTs vendus (non en vente mais avec un prix)
    const soldNFTs = allNFTs.filter(nft =>
      (!nft.forSale && nft.price > 0) || // NFTs vendus normaux
      (nft.sold === true && nft.price > 0) // NFTs explicitement marqués comme vendus
    );

    console.log(`🔍 NFTs vendus trouvés: ${soldNFTs.length}`);
    soldNFTs.forEach(nft => {
      console.log(`  - NFT #${nft.tokenId || nft.id}: ${nft.name} (${nft.price} ETH)`);
    });

    const highestPriceSold = soldNFTs.reduce((highest, current) => {
      return (current.price > (highest?.price || 0)) ? current : highest;
    }, null);

    if (highestPriceSold) {
      console.log(`✅ NFT le plus cher vendu: #${highestPriceSold.tokenId} à ${highestPriceSold.price} ETH`);
      featured.push({
        ...highestPriceSold,
        featuredType: 'highest-sold',
        badge: { type: 'trending', text: 'Plus cher vendu' }
      });
    } else {
      console.log('⚠️ Aucun NFT vendu trouvé');
    }

    // 2. Un NFT disponible à l'achat
    const availableNFTs = allNFTs.filter(nft => nft.forSale);
    if (availableNFTs.length > 0) {
      // Prendre le premier NFT disponible
      const availableNFT = availableNFTs[0];
      featured.push({
        ...availableNFT,
        featuredType: 'available',
        badge: { type: 'new', text: 'Disponible' }
      });
    }

    // 3. Si on n'a pas assez de NFTs qualifiés, ajouter des NFTs aléatoires
    if (featured.length < 2) {
      const remainingNFTs = allNFTs.filter(nft =>
        !featured.some(featured => featured.id === nft.id || featured.tokenId === nft.tokenId)
      );

      const randomNFTs = remainingNFTs
        .sort(() => Math.random() - 0.5) // Mélanger
        .slice(0, 2 - featured.length);

      randomNFTs.forEach(nft => {
        featured.push({
          ...nft,
          featuredType: 'random',
          badge: { type: 'new', text: 'Nouveau' }
        });
      });
    }

    return featured;
  };

  const loadWelcomeData = async () => {
    setLoading(true);
    
    try {
      // 1. Charger TOUS les NFTs de la blockchain (pas seulement ceux en vente)
      const { fetchAllNFTs } = await import('../../utils/contract');
      const blockchainNFTs = await fetchAllNFTs().catch(err => {
        console.warn('Erreur chargement tous les NFTs:', err);
        // Fallback: essayer avec les NFTs du marketplace seulement
        return fetchMarketplaceNFTs().catch(() => []);
      });

      // 2. Charger les NFTs locaux
      const localNFTs = getSubmittedNFTs();

      // 3. IMPORTANT: Filtrer les doublons
      // On garde uniquement les NFTs locaux qui n'ont pas de correspondance blockchain
      const localOnlyNFTs = localNFTs.filter(localNFT => {
        // Si le NFT local a un transactionHash ou tokenId, vérifier s'il existe dans blockchain
        if (localNFT.transactionHash || localNFT.tokenId) {
          return !blockchainNFTs.some(blockchainNFT => 
            blockchainNFT.id === localNFT.tokenId ||
            blockchainNFT.transactionHash === localNFT.transactionHash
          );
        }
        // Si c'est un NFT purement local (sans blockchain), on le garde
        return true;
      });

      // 4. Combiner les NFTs sans doublons
      const allNFTs = [
        ...blockchainNFTs.map(nft => ({ 
          ...nft, 
          source: 'blockchain',
          // S'assurer que l'image blockchain est utilisée
          image: nft.image || nft.imageUrl || '/placeholder-nft.jpg'
        })),
        ...localOnlyNFTs.map(nft => ({ 
          ...nft, 
          source: 'local',
          // Utiliser l'image locale (base64)
          image: nft.image || nft.imageDataUrl || nft.imagePreview
        }))
      ];

      // Vérifier qu'il n'y a pas de doublons par nom et description
      const uniqueNFTs = allNFTs.reduce((acc, current) => {
        const isDuplicate = acc.some(item => 
          item.name === current.name && 
          item.description === current.description &&
          item.source !== current.source // Garder seulement si sources différentes
        );
        
        if (!isDuplicate) {
          acc.push(current);
        } else if (current.source === 'blockchain') {
          // Si doublon, préférer la version blockchain
          const index = acc.findIndex(item => 
            item.name === current.name && 
            item.description === current.description
          );
          if (index !== -1 && acc[index].source === 'local') {
            acc[index] = current; // Remplacer le local par le blockchain
          }
        }
        
        return acc;
      }, []);

      // 5. SIMULATION TEMPORAIRE: Marquer le NFT avec le plus haut tokenId comme "vendu"
      // (pour démonstration jusqu'à ce qu'un NFT soit réellement acheté)
      const simulatedNFTs = uniqueNFTs.map(nft => {
        // Si c'est le NFT avec le tokenId le plus élevé et qu'il a un prix, on le marque comme vendu
        const highestId = Math.max(...uniqueNFTs.map(n => parseInt(n.tokenId || n.id || 0)));
        if (parseInt(nft.tokenId || nft.id || 0) === highestId && nft.price > 0) {
          return {
            ...nft,
            forSale: false, // Marquer comme vendu (non en vente)
            sold: true,     // Explicitement vendu
            // Garder le prix pour qu'il soit considéré comme "le plus cher vendu"
          };
        }
        return nft;
      });

      // 6. Sélectionner les NFTs en vedette selon les nouvelles règles
      const featured = selectFeaturedNFTs(simulatedNFTs);

      setFeaturedNFTs(featured);

      // 6. Calculer les statistiques
      const totalVolume = blockchainNFTs.reduce((sum, nft) => sum + (nft.price || 0), 0);
      const uniqueOwners = new Set([
        ...blockchainNFTs.map(nft => nft.owner),
        ...localOnlyNFTs.map(nft => nft.owner || 'local-user')
      ]).size;

      setMarketStats({
        totalNFTs: uniqueNFTs.length,
        totalUsers: uniqueOwners,
        totalVolume: totalVolume.toFixed(1),
        blockchainNFTs: blockchainNFTs.length,
        localNFTs: localOnlyNFTs.length
      });

      console.log('NFTs chargés:', {
        blockchain: blockchainNFTs.length,
        local: localOnlyNFTs.length,
        total: uniqueNFTs.length,
        featured: featured.length
      });

    } catch (error) {
      console.error('Erreur chargement données welcome:', error);
      
      // En cas d'erreur, utiliser uniquement les données locales
      const localNFTs = getSubmittedNFTs();
      const uniqueLocalNFTs = localNFTs.map(nft => ({ 
        ...nft, 
        source: 'local',
        image: nft.image || nft.imageDataUrl || nft.imagePreview
      }));
      
      setFeaturedNFTs(uniqueLocalNFTs.slice(0, 4));
      setMarketStats({
        totalNFTs: uniqueLocalNFTs.length,
        totalUsers: 1,
        totalVolume: 0,
        blockchainNFTs: 0,
        localNFTs: uniqueLocalNFTs.length
      });
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
          <h2 className="section-title">NFTs en Vedette</h2>
          <p className="section-subtitle">
            Découvrez les dernières créations de notre communauté
          </p>
          
          {loading && (
            <div className="featured-loading">
              <div className="loading-grid">
                {[1, 2, 3, 4].map(i => (
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
                      // S'assurer que l'image est correctement passée
                      image: nft.image || nft.imageDataUrl || nft.imagePreview || '/placeholder-nft.jpg'
                    }} 
                    badge={
                      nft.source === 'local' 
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
                  <span className="summary-number">{featuredNFTs.filter(n => n.forSale).length}</span>
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