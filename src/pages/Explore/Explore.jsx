import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Explore.css';
import NFTCard from '../../components/NFTCard/NFTCard';
import { Filter, Search, Grid, List } from 'lucide-react';
import { categories, priceFilters } from '../../data/mockData';
import { useAppContext } from '../../App';
import { fetchAllNFTsIncludingAuctions, placeBid } from '../../utils/contract';
import { getSubmittedNFTs } from '../../utils/storage';

const Explore = () => {
  const navigate = useNavigate();
  const { setSelectedNFT } = useAppContext();

  const [nfts, setNfts] = useState([]);
  const [filteredNfts, setFilteredNfts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState(priceFilters[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous'); // 'tous', 'en-vente', 'vendus'
  const [gridView, setGridView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedNFTForBid, setSelectedNFTForBid] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const itemsPerPage = 6;

  // Charger les NFTs au montage du composant
  useEffect(() => {
    loadAllNFTs();
  }, []);

  // Filtrer les NFTs quand les critères changent
  useEffect(() => {
    filterNFTs();
  }, [selectedCategory, selectedPriceFilter, searchQuery, statusFilter, nfts]);

  const loadAllNFTs = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Charger TOUS les NFTs de la blockchain (incluant les enchères)
      const marketplaceNFTs = await fetchAllNFTsIncludingAuctions().catch(err => {
        console.warn('Erreur chargement marketplace blockchain:', err);
        return [];
      });

      // 2. Charger les NFTs soumis localement
      const localNFTs = getSubmittedNFTs().map(nft => ({
        ...nft,
        source: 'local' // Marquer comme local pour différenciation
      }));

      // 3. Filtrer les NFTs locaux qui existent déjà sur la blockchain pour éviter doublons
      const blockchainTokenIds = new Set(marketplaceNFTs.map(nft => nft.tokenId || nft.id));
      const filteredLocalNFTs = localNFTs.filter(localNFT => {
        // Garder seulement les NFTs locaux qui ne sont PAS encore sur la blockchain
        return !localNFT.blockchainStatus || localNFT.blockchainStatus !== 'minted' || !blockchainTokenIds.has(localNFT.tokenId);
      });

      // 4. Combiner tous les NFTs sans doublons
      const allNFTs = [
        ...marketplaceNFTs.map(nft => ({ ...nft, source: 'blockchain' })),
        ...filteredLocalNFTs
      ];

      console.log('NFTs chargés:', {
        blockchain: marketplaceNFTs.length,
        local: localNFTs.length,
        localFiltered: filteredLocalNFTs.length,
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

    // Filtre par statut
    if (statusFilter === 'en-vente') {
      filtered = filtered.filter(nft => nft.forSale && !nft.sold);
    } else if (statusFilter === 'vendus') {
      filtered = filtered.filter(nft => nft.sold === true);
    } else if (statusFilter === 'encheres') {
      filtered = filtered.filter(nft => nft.inAuction === true);
    }
    // Si 'tous', on ne filtre pas par statut

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

  const handleBid = (nft) => {
    setSelectedNFTForBid(nft);
    setBidAmount('');
    setShowBidModal(true);
  };

  const handleSubmitBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    const minimumBid = selectedNFTForBid.highestBid && parseFloat(selectedNFTForBid.highestBid) > 0
      ? parseFloat(selectedNFTForBid.highestBid)
      : parseFloat(selectedNFTForBid.startingPrice || selectedNFTForBid.price || 0);

    if (parseFloat(bidAmount) <= minimumBid) {
      alert(`Votre enchère doit être supérieure à ${minimumBid} ETH`);
      return;
    }

    setBidding(true);
    try {
      await placeBid(selectedNFTForBid.tokenId || selectedNFTForBid.id, bidAmount);
      alert(`Enchère de ${bidAmount} ETH placée avec succès !`);
      setShowBidModal(false);
      loadAllNFTs(); // Recharger les NFTs pour voir les nouvelles enchères
    } catch (error) {
      console.error('Erreur lors de l\'enchère:', error);
      alert('Erreur lors de l\'enchère: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setBidding(false);
    }
  };

  const handleCloseBidModal = () => {
    setShowBidModal(false);
    setSelectedNFTForBid(null);
    setBidAmount('');
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
              <label>Statut</label>
              <div className="status-filters">
                <button
                  className={`status-btn ${statusFilter === 'tous' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('tous')}
                >
                  Tous
                </button>
                <button
                  className={`status-btn ${statusFilter === 'en-vente' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('en-vente')}
                >
                  En vente
                </button>
                <button
                  className={`status-btn ${statusFilter === 'vendus' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('vendus')}
                >
                  Vendus
                </button>
                <button
                  className={`status-btn ${statusFilter === 'encheres' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('encheres')}
                >
                  Enchères
                </button>
              </div>
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
                    onBid={handleBid}
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

        {/* Modal d'enchère */}
        {showBidModal && selectedNFTForBid && (
          <div className="modal-overlay" onClick={handleCloseBidModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Placer une enchère</h2>
              <div className="bid-nft-info">
                <img
                  src={selectedNFTForBid.image || selectedNFTForBid.imageDataUrl || '/placeholder-nft.jpg'}
                  alt={selectedNFTForBid.name}
                  className="bid-nft-image"
                />
                <div className="bid-nft-details">
                  <h3>{selectedNFTForBid.name}</h3>
                  <p>Token ID: #{selectedNFTForBid.tokenId || selectedNFTForBid.id}</p>
                  <p>
                    Enchère minimum: {' '}
                    {selectedNFTForBid.highestBid && parseFloat(selectedNFTForBid.highestBid) > 0
                      ? `${selectedNFTForBid.highestBid} ETH`
                      : `${selectedNFTForBid.startingPrice || selectedNFTForBid.price} ETH`}
                  </p>
                </div>
              </div>

              <div className="bid-form">
                <label htmlFor="bidAmount">Votre enchère (ETH):</label>
                <input
                  id="bidAmount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.000"
                  disabled={bidding}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCloseBidModal}
                  disabled={bidding}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitBid}
                  disabled={bidding || !bidAmount}
                >
                  {bidding ? 'Enchère en cours...' : `Enchérir ${bidAmount || '0'} ETH`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;