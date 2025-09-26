import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Explore.css';
import NFTCard from '../../components/NFTCard/NFTCard';
import { Filter, Search, Grid, List } from 'lucide-react';
import { categories, priceFilters } from '../../data/mockData';
import { useAppContext } from '../../App';
import { fetchMarketplaceNFTs } from '../../utils/contract';
import { getSubmittedNFTs } from '../../utils/storage';

const Explore = () => {
  const navigate = useNavigate();
  const { setSelectedNFT } = useAppContext();

  const [nfts, setNfts] = useState([]);
  const [filteredNfts, setFilteredNfts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState(priceFilters[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyForSale, setShowOnlyForSale] = useState(false);
  const [gridView, setGridView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 6;

  // Charger les NFTs au montage du composant
  useEffect(() => {
    loadAllNFTs();
  }, []);

  // Filtrer les NFTs quand les critères changent
  useEffect(() => {
    filterNFTs();
  }, [selectedCategory, selectedPriceFilter, searchQuery, showOnlyForSale, nfts]);

  const loadAllNFTs = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Charger TOUS les NFTs de la blockchain (y compris ceux vendus)
      const { fetchAllNFTs } = await import('../../utils/contract');
      const marketplaceNFTs = await fetchAllNFTs().catch(err => {
        console.warn('Erreur chargement tous NFTs blockchain:', err);
        // Fallback: essayer avec fetchMarketplaceNFTs seulement
        return fetchMarketplaceNFTs().catch(() => []);
      });

      // 2. Charger les NFTs soumis localement
      const localNFTs = getSubmittedNFTs().map(nft => ({
        ...nft,
        source: 'local' // Marquer comme local pour différenciation
      }));

      // 3. Combiner tous les NFTs
      const allNFTs = [
        ...marketplaceNFTs.map(nft => ({ ...nft, source: 'blockchain' })),
        ...localNFTs
      ];

      console.log('NFTs chargés:', {
        blockchain: marketplaceNFTs.length,
        local: localNFTs.length,
        total: allNFTs.length
      });

      setNfts(allNFTs);
      setFilteredNfts(allNFTs);

    } catch (error) {
      console.error('Erreur chargement NFTs:', error);
      setError('Erreur lors du chargement des NFTs: ' + error.message);
      
      // En cas d'erreur, charger au moins les NFTs locaux
      const localNFTs = getSubmittedNFTs().map(nft => ({
        ...nft,
        source: 'local'
      }));
      setNfts(localNFTs);
      setFilteredNfts(localNFTs);
      
    } finally {
      setLoading(false);
    }
  };

  const filterNFTs = () => {
    let filtered = [...nfts];

    // Filtre par catégorie
    if (selectedCategory !== 'Tous') {
      filtered = filtered.filter(nft => nft.category === selectedCategory);
    }

    // Filtre par prix
    filtered = filtered.filter(nft => {
      const price = nft.price || 0;
      return price >= selectedPriceFilter.min && price <= selectedPriceFilter.max;
    });

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(query) ||
        (nft.description && nft.description.toLowerCase().includes(query))
      );
    }

    // Filtre "en vente uniquement"
    if (showOnlyForSale) {
      filtered = filtered.filter(nft => nft.forSale);
    }

    // Tri par date (plus récent au plus ancien)
    filtered.sort((a, b) => {
      // Utiliser tokenId comme proxy pour la date de création (plus grand = plus récent)
      const aId = parseInt(a.tokenId || a.id || 0);
      const bId = parseInt(b.tokenId || b.id || 0);
      return bId - aId; // Ordre décroissant (plus récent en premier)
    });

    setFilteredNfts(filtered);
    setCurrentPage(1);
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    if (nft.source === 'local') {
      navigate(`/nft/local-${nft.id}`);
    } else {
      navigate(`/nft/${nft.id}`);
    }
  };

  const handleSubmitClick = () => {
    navigate('/submit');
  };

  const handleRefresh = () => {
    loadAllNFTs();
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNfts = filteredNfts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNfts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const NoResults = () => (
    <div className="no-results">
      <Filter size={48} />
      <h3>Aucun NFT trouvé</h3>
      <p>Aucun NFT ne correspond à vos critères de recherche</p>
      <div className="no-results-actions">
        <button 
          className="btn btn-secondary"
          onClick={() => {
            setSelectedCategory('Tous');
            setSelectedPriceFilter(priceFilters[0]);
            setSearchQuery('');
            setShowOnlyForSale(false);
          }}
        >
          Réinitialiser les filtres
        </button>
        <button 
          className="btn btn-primary"
          onClick={handleSubmitClick}
        >
          Créer un NFT
        </button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">
        <Filter size={64} />
      </div>
      <h3>Aucun NFT disponible</h3>
      <p>Soyez le premier à créer et partager vos œuvres uniques</p>
      <button 
        className="btn btn-primary"
        onClick={handleSubmitClick}
      >
        Créer le premier NFT
      </button>
    </div>
  );

  return (
    <div className="explore">
      <div className="container">
        <div className="explore-header">
          <h1 className="explore-title">Explorer les NFTs</h1>
          <p className="explore-subtitle">
            Découvrez {filteredNfts.length} œuvre{filteredNfts.length > 1 ? 's' : ''} unique{filteredNfts.length > 1 ? 's' : ''} dans notre collection
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={handleRefresh}>Réessayer</button>
          </div>
        )}

        <div className="explore-filters">
          <div className="filters-row">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Rechercher des NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

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

          <div className="filters-row">
            <div className="filter-group">
              <label>Catégorie</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Prix</label>
              <select 
                value={priceFilters.indexOf(selectedPriceFilter)}
                onChange={(e) => setSelectedPriceFilter(priceFilters[e.target.value])}
              >
                {priceFilters.map((filter, index) => (
                  <option key={index} value={index}>{filter.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyForSale}
                  onChange={(e) => setShowOnlyForSale(e.target.checked)}
                />
                <span>En vente uniquement</span>
              </label>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleSubmitClick}
            >
              Soumettre un NFT
            </button>

            <button 
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* État de chargement */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement des NFTs...</p>
          </div>
        )}

        {/* Contenu des NFTs */}
        {!loading && (
          <div className={`nft-container ${gridView ? 'nft-grid' : 'nft-list'}`}>
            {nfts.length === 0 ? (
              <EmptyState />
            ) : filteredNfts.length === 0 ? (
              <NoResults />
            ) : (
              currentNfts.map(nft => (
                <div key={`${nft.source}-${nft.id}`} className="nft-wrapper">
                  <NFTCard 
                    nft={nft}
                    onClick={handleNFTClick}
                    badge={nft.source === 'local' ? { type: 'new', text: 'Local' } : null}
                  />
                  {/* Badge source */}
                  <div className="nft-source-badge">
                    {nft.source === 'blockchain' ? '⛓️ Blockchain' : '💾 Local'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Précédent
            </button>
            
            <div className="pagination-numbers">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  className={`pagination-number ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Suivant
            </button>
          </div>
        )}

        {/* Statistiques */}
        {!loading && nfts.length > 0 && (
          <div className="explore-stats">
            <div className="stats-summary">
              <span>Total: {nfts.length} NFTs</span>
              <span>Blockchain: {nfts.filter(n => n.source === 'blockchain').length}</span>
              <span>Local: {nfts.filter(n => n.source === 'local').length}</span>
              <span>En vente: {nfts.filter(n => n.forSale).length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;