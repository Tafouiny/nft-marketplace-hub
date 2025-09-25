import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import NFTCard from '../../components/NFTCard/NFTCard';
import { Search, Filter, Grid, List, ShoppingBag, TrendingUp, Star, Activity } from 'lucide-react';
import { useAppContext } from '../../App';
import { fetchMarketplaceNFTs, buyNFT } from '../../utils/contract';
import { getSubmittedNFTs } from '../../utils/storage';

const Home = () => {
  const navigate = useNavigate();
  const { isWalletConnected, walletAddress, setSelectedNFT } = useAppContext();

  const [nfts, setNfts] = useState([]);
  const [filteredNfts, setFilteredNfts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gridView, setGridView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Statistiques du marché
  const [marketStats, setMarketStats] = useState({
    totalNFTs: 0,
    totalValue: 0,
    floorPrice: 0,
    avgPrice: 0
  });

  // Charger tous les NFTs au montage
  useEffect(() => {
    loadMarketplaceNFTs();
  }, []);

  // Filtrer quand les critères changent
  useEffect(() => {
    filterAndSortNFTs();
  }, [searchQuery, priceFilter, sortBy, nfts]);

  const loadMarketplaceNFTs = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Chargement des NFTs du marketplace...');

      // 1. Charger NFTs blockchain en vente (marketplace)
      const blockchainNFTs = await fetchMarketplaceNFTs().catch(err => {
        console.warn('Erreur blockchain NFTs:', err);
        return [];
      });

      // 2. Charger TOUS les NFTs locaux, pas seulement ceux "en vente"
      const allLocalNFTs = getSubmittedNFTs();

      // 3. Filtrer les NFTs locaux qui sont marqués comme "en vente"
      const localNFTsForSale = allLocalNFTs
        .filter(nft => {
          const isForSale = nft.forSale === true || nft.forSale === 'true';
          const isActive = nft.status === 'submitted' && nft.blockchainStatus !== 'minted';
          console.log(`🔍 NFT local "${nft.name}":`, {
            forSale: nft.forSale,
            forSaleType: typeof nft.forSale,
            status: nft.status,
            blockchainStatus: nft.blockchainStatus,
            isForSale,
            isActive,
            shouldShow: isForSale && isActive
          });
          return isForSale && isActive;
        })
        .map(nft => ({ ...nft, source: 'local' }));

      // 4. Combiner tous les NFTs disponibles à l'achat
      const allMarketNFTs = [
        ...blockchainNFTs.map(nft => ({ ...nft, source: 'blockchain' })),
        ...localNFTsForSale
      ];

      console.log('📊 NFTs marketplace chargés:', {
        blockchain: blockchainNFTs.length,
        localTotal: allLocalNFTs.length,
        localForSale: localNFTsForSale.length,
        total: allMarketNFTs.length
      });

      // Debug: afficher les détails des NFTs locaux
      if (allLocalNFTs.length > 0) {
        console.log('🔍 Détails NFTs locaux:');
        allLocalNFTs.forEach(nft => {
          console.log(`- ${nft.name}: forSale=${nft.forSale}, status=${nft.status}, price=${nft.price}`);
        });
      }

      setNfts(allMarketNFTs);

      // 5. Calculer les statistiques du marché (simplifiées)
      const stats = {
        totalNFTs: allMarketNFTs.length,
        totalValue: allMarketNFTs.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0),
        floorPrice: 0,
        avgPrice: 0
      };

      setMarketStats(stats);

    } catch (error) {
      console.error('❌ Erreur chargement marketplace:', error);
      setError('Erreur lors du chargement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortNFTs = () => {
    let filtered = [...nfts];

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(nft =>
        nft.name.toLowerCase().includes(query) ||
        (nft.description && nft.description.toLowerCase().includes(query))
      );
    }

    // Filtre par prix
    if (priceFilter !== 'all') {
      switch (priceFilter) {
        case 'low':
          filtered = filtered.filter(nft => parseFloat(nft.price) < 1);
          break;
        case 'medium':
          filtered = filtered.filter(nft => parseFloat(nft.price) >= 1 && parseFloat(nft.price) < 10);
          break;
        case 'high':
          filtered = filtered.filter(nft => parseFloat(nft.price) >= 10);
          break;
      }
    }

    // Tri
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => (b.tokenId || b.id) - (a.tokenId || a.id));
        break;
      case 'oldest':
        filtered.sort((a, b) => (a.tokenId || a.id) - (b.tokenId || b.id));
        break;
    }

    setFilteredNfts(filtered);
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    if (nft.source === 'local') {
      navigate(`/nft/local-${nft.id}`);
    } else {
      navigate(`/nft/${nft.tokenId || nft.id}`);
    }
  };

  const handleBuyNFT = async (nft, event) => {
    event.stopPropagation();

    if (!isWalletConnected) {
      alert('🔒 Connectez votre wallet pour acheter ce NFT');
      return;
    }

    if (nft.source === 'local') {
      alert('🚧 Les NFTs locaux ne peuvent pas être achetés pour le moment');
      return;
    }

    try {
      setLoading(true);
      await buyNFT(nft.tokenId, nft.price);
      alert('🎉 NFT acheté avec succès !');

      // Recharger la liste
      loadMarketplaceNFTs();
    } catch (error) {
      console.error('❌ Erreur achat:', error);
      alert('Erreur lors de l\'achat: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="container">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              🎨 <span className="gradient-text">NFT Marketplace</span>
            </h1>
            <p className="hero-subtitle">
              Découvrez, collectionnez et échangez des œuvres numériques uniques
            </p>


            {!isWalletConnected && (
              <div className="hero-cta">
                <p>💡 Connectez votre wallet pour acheter des NFTs</p>
              </div>
            )}
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={loadMarketplaceNFTs}>Réessayer</button>
          </div>
        )}

        {/* Filtres et Contrôles */}
        <div className="marketplace-controls">
          <div className="controls-left">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Rechercher des NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tous les prix</option>
              <option value="low">&lt; 1 ETH</option>
              <option value="medium">1-10 ETH</option>
              <option value="high">&gt; 10 ETH</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="price-low">Prix croissant</option>
              <option value="price-high">Prix décroissant</option>
            </select>
          </div>

          <div className="controls-right">
            <button
              className="refresh-btn"
              onClick={loadMarketplaceNFTs}
              disabled={loading}
            >
              <Activity size={18} />
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>

            <div className="view-toggle">
              <button
                className={`view-btn ${gridView ? 'active' : ''}`}
                onClick={() => setGridView(true)}
              >
                <Grid size={20} />
              </button>
              <button
                className={`view-btn ${!gridView ? 'active' : ''}`}
                onClick={() => setGridView(false)}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="section-header">
          <h2>🏪 NFTs disponibles à l'achat</h2>
          <p>
            {filteredNfts.length} NFT{filteredNfts.length > 1 ? 's' : ''}
            {searchQuery && ` correspondant à "${searchQuery}"`}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement du marketplace...</p>
          </div>
        )}

        {/* NFTs Grid */}
        {!loading && (
          <div className="nfts-section">
            {filteredNfts.length > 0 ? (
              <div className={`nfts-container ${gridView ? 'grid-view' : 'list-view'}`}>
                {filteredNfts.map((nft, index) => (
                  <div key={`${nft.source}-${nft.tokenId || nft.id}-${index}`} className="marketplace-nft">
                    <NFTCard
                      nft={nft}
                      onClick={handleNFTClick}
                      showBuyButton={false}
                    />

                    {/* Overlay avec informations et bouton d'achat */}
                    <div className="nft-overlay">
                      <div className="nft-info">
                        <h3 className="nft-name">{nft.name}</h3>
                        <div className="nft-price">
                          💰 {nft.price} ETH
                        </div>
                      </div>

                      <div className="nft-actions">
                        <button
                          className="btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNFTClick(nft);
                          }}
                        >
                          👁️ Voir
                        </button>
                        <button
                          className="btn-primary buy-btn"
                          onClick={(e) => handleBuyNFT(nft, e)}
                          disabled={!isWalletConnected || loading}
                        >
                          <ShoppingBag size={16} />
                          Acheter
                        </button>
                      </div>

                      {/* Badge source */}
                      <div className="source-badge">
                        {nft.source === 'blockchain' ? '⛓️' : '💾'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-marketplace">
                <div className="empty-icon">
                  <ShoppingBag size={64} />
                </div>
                <h3>Aucun NFT disponible</h3>
                <p>
                  {searchQuery
                    ? 'Aucun NFT ne correspond à votre recherche'
                    : 'Aucun NFT n\'est actuellement en vente sur le marketplace'
                  }
                </p>
                {searchQuery && (
                  <button
                    className="btn-secondary"
                    onClick={() => setSearchQuery('')}
                  >
                    Voir tous les NFTs
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Call to Action pour les utilisateurs connectés */}
        {isWalletConnected && (
          <div className="cta-section">
            <div className="cta-card">
              <h3>🎨 Vous êtes artiste ?</h3>
              <p>Créez et vendez vos propres NFTs depuis votre portfolio</p>
              <button
                className="btn-primary"
                onClick={() => navigate('/portfolio')}
              >
                Accéder à mon Portfolio
              </button>

              {/* Bouton de debug temporaire */}
              <button
                className="btn-secondary"
                onClick={() => {
                  const testNFT = {
                    id: `debug-${Date.now()}`,
                    name: `NFT Test ${new Date().toLocaleTimeString()}`,
                    description: 'NFT créé pour debug avec forSale: true',
                    price: 0.1,
                    forSale: true, // FORCE TRUE pour debug
                    imageData: 'https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=TEST+FOR+SALE',
                    owner: walletAddress,
                    seller: walletAddress,
                    status: 'submitted',
                    blockchainStatus: 'pending',
                    createdAt: new Date().toISOString(),
                    source: 'local'
                  };

                  console.log('🐛 Création NFT test avec données:', testNFT);

                  // Sauvegarde directe dans localStorage
                  const existing = JSON.parse(localStorage.getItem('nft_marketplace_submitted_nfts') || '[]');
                  existing.push(testNFT);
                  localStorage.setItem('nft_marketplace_submitted_nfts', JSON.stringify(existing));

                  console.log('💾 NFT sauvegardé dans localStorage');
                  console.log('📦 Contenu localStorage complet:', existing);

                  // Recharger immédiatement
                  console.log('🔄 Rechargement du marketplace...');
                  loadMarketplaceNFTs();

                  alert('NFT de test créé avec forSale: true !');
                }}
                style={{ marginTop: '10px' }}
              >
                🐛 Créer NFT test (debug)
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  localStorage.removeItem('nft_marketplace_submitted_nfts');
                  loadMarketplaceNFTs();
                  alert('NFTs locaux supprimés !');
                }}
                style={{ marginTop: '5px', marginLeft: '10px' }}
              >
                🗑️ Vider NFTs locaux
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;