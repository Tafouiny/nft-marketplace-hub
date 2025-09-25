import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import './Portfolio.css';
import NFTCard from '../../components/NFTCard/NFTCard';
import {
  Wallet,
  Package,
  DollarSign,
  TrendingUp,
  Grid,
  List,
  Filter,
  ShoppingBag,
  Brush,
  Tag,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Upload,
  Edit,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useAppContext } from '../../App';
import { fetchUserNFTs, fetchUserListedNFTs, withdrawNFT } from '../../utils/contract';
import { getSubmittedNFTs, removeSubmittedNFT, saveSubmittedNFT } from '../../utils/storage';

const Portfolio = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isWalletConnected, walletAddress, setSelectedNFT } = useAppContext();

  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return ['owned', 'created', 'onsale', 'submitted', 'create'].includes(tab) ? tab : 'owned';
  });

  // États pour la création de NFT
  const [isCreating, setIsCreating] = useState(false);
  const [nftForm, setNftForm] = useState({
    name: '',
    description: '',
    price: '',
    forSale: false,
    image: null,
    imagePreview: null
  });
  const [viewMode, setViewMode] = useState('grid');
  const [showValues, setShowValues] = useState(true);
  const [loading, setLoading] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    saleValue: 0,
    totalNFTs: 0,
    onSaleCount: 0,
    createdCount: 0,
    submittedCount: 0,
    ownedValue: 0,
    submittedValue: 0
  });
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [onSaleNFTs, setOnSaleNFTs] = useState([]);
  const [submittedNFTs, setSubmittedNFTs] = useState([]);
  const [error, setError] = useState('');

  // Charger les données à la connexion
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      loadPortfolioData();
    }
  }, [isWalletConnected, walletAddress]);

  const loadPortfolioData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Chargement des NFTs pour:', walletAddress);

      // 1. Charger les NFTs de localStorage
      const localNFTs = getSubmittedNFTs();
      setSubmittedNFTs(localNFTs);

      // 2. Charger les NFTs de la blockchain - RÉACTIVÉ
      const [ownedData, listedData] = await Promise.all([
        fetchUserNFTs(walletAddress).catch(err => {
          console.warn('Erreur blockchain NFTs possédés:', err);
          return [];
        }),
        fetchUserListedNFTs().catch(err => {
          console.warn('Erreur blockchain NFTs listés:', err);
          return [];
        })
      ]);

      console.log('NFTs possédés (blockchain):', ownedData);
      console.log('NFTs listés (blockchain):', listedData);
      console.log('NFTs soumis (localStorage):', localNFTs);

      setOwnedNFTs(ownedData);
      setOnSaleNFTs(listedData);

      // 3. Calculer les statistiques (éviter les doublons)
      // Filtrer les NFTs locaux actifs (non migrés)
      const activeLocalNFTs = localNFTs.filter(nft =>
        nft.blockchainStatus !== 'minted' && nft.status === 'submitted'
      );

      // Calcul amélioré des valeurs
      const ownedValue = ownedData.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);
      const listedValue = listedData.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);
      const submittedValue = activeLocalNFTs.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);

      // Valeur totale = tous les NFTs possédés (pas de double comptage entre owned et listed)
      const totalValue = ownedValue + submittedValue;

      // Valeur en vente = uniquement les NFTs listés
      const saleValue = listedValue + activeLocalNFTs
        .filter(nft => nft.forSale)
        .reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);

      setPortfolioStats({
        totalValue: totalValue.toFixed(6),
        saleValue: saleValue.toFixed(6),
        totalNFTs: ownedData.length + activeLocalNFTs.length,
        onSaleCount: listedData.length + activeLocalNFTs.filter(nft => nft.forSale).length,
        createdCount: ownedData.filter(nft => nft.seller === walletAddress).length + activeLocalNFTs.length,
        submittedCount: activeLocalNFTs.length,
        ownedValue: ownedValue.toFixed(6),
        submittedValue: submittedValue.toFixed(6)
      });

    } catch (error) {
      console.error('Erreur chargement portfolio:', error);
      setError('Erreur lors du chargement du portfolio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);

    console.log('=== DEBUG NAVIGATION PORTFOLIO ===');
    console.log('NFT cliqué:', nft);
    console.log('status:', nft.status);
    console.log('blockchainStatus:', nft.blockchainStatus);
    console.log('source:', nft.source);

    // Logique simplifiée : NFT local = status 'submitted' ET PAS encore sur blockchain
    if (nft.status === 'submitted' && nft.blockchainStatus !== 'minted') {
      // NFT vraiment local - pas encore migré
      console.log('Navigation locale vers:', `/nft/local-${nft.id}`);
      navigate(`/nft/local-${nft.id}`);
    } else {
      // NFT blockchain (ou migré) - utiliser tokenId si disponible
      const targetId = nft.tokenId || nft.id;
      console.log('Navigation blockchain vers:', `/nft/${targetId}`);
      navigate(`/nft/${targetId}`);
    }
  };

  const handleWithdrawNFT = async (tokenId) => {
    try {
      setLoading(true);
      await withdrawNFT(tokenId);

      // Recharger les données après retrait
      await loadPortfolioData();

      alert('NFT retiré de la vente avec succès !');
    } catch (error) {
      console.error('Erreur retrait NFT:', error);
      alert('Erreur lors du retrait: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmittedNFT = (nftId) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce NFT de votre collection locale ?')) {
      removeSubmittedNFT(nftId);
      loadPortfolioData(); // Recharger pour mettre à jour l'affichage
    }
  };

  // Fonctions pour la création de NFT
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNftForm(prev => ({ ...prev, image: file }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setNftForm(prev => ({ ...prev, imagePreview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNFT = async (e) => {
    e.preventDefault();

    if (!nftForm.name.trim()) {
      alert('❌ Le nom du NFT est requis');
      return;
    }

    setIsCreating(true);

    try {
      console.log('🎨 Création du NFT...', {
        name: nftForm.name,
        forSale: nftForm.forSale,
        forSaleType: typeof nftForm.forSale,
        price: nftForm.price
      });

      const nftData = {
        name: nftForm.name.trim(),
        description: nftForm.description.trim(),
        price: parseFloat(nftForm.price) || 0,
        forSale: Boolean(nftForm.forSale), // Assurer un boolean
        imageData: nftForm.imagePreview || '/placeholder-nft.jpg',
        owner: walletAddress,
        seller: walletAddress,
        status: 'submitted',
        blockchainStatus: 'pending',
        createdAt: new Date().toISOString(),
        source: 'local'
      };

      console.log('💾 Données NFT à sauvegarder:', nftData);
      console.log('🔍 Valeur forSale finale:', nftData.forSale, 'type:', typeof nftData.forSale);

      // Sauvegarder en local
      const savedNFT = saveSubmittedNFT(nftData);

      if (!savedNFT) {
        throw new Error('Échec de sauvegarde du NFT');
      }

      console.log('✅ NFT sauvegardé:', savedNFT);

      // Reset du formulaire
      setNftForm({
        name: '',
        description: '',
        price: '',
        forSale: false,
        image: null,
        imagePreview: null
      });

      // Recharger les données et changer d'onglet
      await loadPortfolioData();
      setActiveTab('submitted');

      alert('✅ NFT créé avec succès dans votre collection locale !');

    } catch (error) {
      console.error('❌ Erreur création NFT:', error);
      alert('Erreur lors de la création: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNftForm({
      name: '',
      description: '',
      price: '',
      forSale: false,
      image: null,
      imagePreview: null
    });
    setActiveTab('owned');
  };

  const getCurrentNFTs = () => {
    // Filtrer les NFTs locaux qui ont été migrés (éviter les doublons)
    const activeLocalNFTs = submittedNFTs.filter(nft =>
      nft.blockchainStatus !== 'minted' && nft.status === 'submitted'
    );

    switch(activeTab) {
      case 'owned':
        // Combiner NFTs blockchain + locaux non migrés
        return [...ownedNFTs, ...activeLocalNFTs];
      case 'created':
        // NFTs créés = blockchain créés + tous les soumis locaux non migrés
        const blockchainCreated = ownedNFTs.filter(nft => nft.seller === walletAddress);
        return [...blockchainCreated, ...activeLocalNFTs];
      case 'onsale':
        // NFTs en vente = blockchain listés + locaux marqués forSale non migrés
        const localForSale = activeLocalNFTs.filter(nft => nft.forSale);
        return [...onSaleNFTs, ...localForSale];
      case 'submitted':
        // Nouveaux onglet pour les NFTs locaux uniquement (non migrés)
        return activeLocalNFTs;
      default:
        return [...ownedNFTs, ...activeLocalNFTs];
    }
  };

  const EmptyState = ({ type }) => {
    const messages = {
      owned: {
        icon: <Package size={48} />,
        title: "Aucun NFT dans votre collection",
        description: "Commencez votre collection en explorant notre marketplace"
      },
      created: {
        icon: <Brush size={48} />,
        title: "Vous n'avez pas encore créé de NFT",
        description: "Soumettez votre première œuvre pour la voir apparaître ici"
      },
      onsale: {
        icon: <Tag size={48} />,
        title: "Aucun NFT en vente",
        description: "Mettez vos NFTs en vente pour les voir apparaître ici"
      },
      submitted: {
        icon: <Clock size={48} />,
        title: "Aucun NFT soumis",
        description: "Vos NFTs créés localement apparaîtront ici"
      }
    };

    const message = messages[type] || messages.owned;

    return (
      <div className="empty-state">
        <div className="empty-icon">{message.icon}</div>
        <h3>{message.title}</h3>
        <p>{message.description}</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate(type === 'created' || type === 'submitted' ? '/submit' : '/explore')}
        >
          {type === 'created' || type === 'submitted' ? 'Créer un NFT' : 'Explorer le marketplace'}
        </button>
      </div>
    );
  };

  if (!isWalletConnected) {
    return <Navigate to="/" replace />;
  }

  const currentNFTs = getCurrentNFTs();

  return (
    <div className="portfolio">
      <div className="container">
        {/* Header du Portfolio */}
        <div className="portfolio-header">
          <div className="header-content">
            <div className="header-info">
              <h1>🎨 Mon Portfolio NFT</h1>
              <p>Créez, gérez et vendez vos œuvres numériques</p>
            </div>
            <div className="header-actions">
              <div className="wallet-address">
                <Wallet size={20} />
                <span>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
              </div>
              <button
                className="btn btn-primary create-nft-btn"
                onClick={() => setActiveTab('create')}
              >
                <Brush size={18} />
                Créer un NFT
              </button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <DollarSign />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {showValues ? `${portfolioStats.totalValue} ETH` : '•••'}
                </div>
                <div className="stat-label">Valeur totale</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Package />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioStats.totalNFTs}</div>
                <div className="stat-label">NFTs possédés</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <ShoppingBag />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioStats.onSaleCount}</div>
                <div className="stat-label">En vente</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Brush />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioStats.createdCount}</div>
                <div className="stat-label">Créés</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Clock />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioStats.submittedCount}</div>
                <div className="stat-label">Soumis</div>
                <div className="stat-detail">
                  {showValues ? `${portfolioStats.submittedValue} ETH` : '••• ETH'}
                </div>
              </div>
            </div>

            <div className="stat-card sale-highlight">
              <div className="stat-icon">
                <TrendingUp />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {showValues ? `${portfolioStats.saleValue} ETH` : '•••••••'}
                </div>
                <div className="stat-label">Valeur en vente</div>
                <div className="stat-detail">
                  {portfolioStats.onSaleCount} NFT{portfolioStats.onSaleCount > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={loadPortfolioData}>Réessayer</button>
          </div>
        )}

        {/* Tabs et Contrôles */}
        <div className="portfolio-controls">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'owned' ? 'active' : ''}`}
              onClick={() => setActiveTab('owned')}
            >
              <Package size={18} />
              Tous ({portfolioStats.totalNFTs})
            </button>
            <button 
              className={`tab ${activeTab === 'created' ? 'active' : ''}`}
              onClick={() => setActiveTab('created')}
            >
              <Brush size={18} />
              Créés ({portfolioStats.createdCount + portfolioStats.submittedCount})
            </button>
            <button 
              className={`tab ${activeTab === 'onsale' ? 'active' : ''}`}
              onClick={() => setActiveTab('onsale')}
            >
              <Tag size={18} />
              En vente ({portfolioStats.onSaleCount})
            </button>
            <button
              className={`tab ${activeTab === 'submitted' ? 'active' : ''}`}
              onClick={() => setActiveTab('submitted')}
            >
              <Clock size={18} />
              Locaux ({portfolioStats.submittedCount})
            </button>
            <button
              className={`tab create-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <Brush size={18} />
              Créer un NFT
            </button>
          </div>

          <div className="view-controls">
            <button 
              className="toggle-values"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <Eye size={18} /> : <EyeOff size={18} />}
              {showValues ? 'Masquer' : 'Afficher'} les valeurs
            </button>
            
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={18} />
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <RefreshCw className="spinning" size={48} />
            <p>Chargement de votre portfolio...</p>
          </div>
        )}

        {/* Contenu conditionnel */}
        <div className="portfolio-content">
          {/* Formulaire de création de NFT */}
          {activeTab === 'create' && (
            <div className="create-nft-section">
              <div className="create-nft-header">
                <button
                  className="btn btn-secondary back-btn"
                  onClick={resetCreateForm}
                >
                  <ArrowLeft size={16} />
                  Retour
                </button>
                <h2>🎨 Créer un nouveau NFT</h2>
                <p>Donnez vie à votre œuvre numérique</p>
              </div>

              <div className="create-nft-form-container">
                <form onSubmit={handleCreateNFT} className="create-nft-form">
                  <div className="form-grid">
                    <div className="form-left">
                      <div className="form-group">
                        <label>Nom du NFT *</label>
                        <input
                          type="text"
                          value={nftForm.name}
                          onChange={(e) => setNftForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Mon Œuvre Unique"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={nftForm.description}
                          onChange={(e) => setNftForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Décrivez votre œuvre..."
                          rows={4}
                        />
                      </div>

                      <div className="form-group">
                        <label>Prix (ETH)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={nftForm.price}
                          onChange={(e) => setNftForm(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.000"
                        />
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={nftForm.forSale}
                            onChange={(e) => setNftForm(prev => ({ ...prev, forSale: e.target.checked }))}
                          />
                          <span>Mettre en vente immédiatement</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-right">
                      <div className="image-upload-section">
                        <h3>Image du NFT</h3>
                        <div className="image-upload">
                          {nftForm.imagePreview ? (
                            <div className="image-preview">
                              <img src={nftForm.imagePreview} alt="Preview" />
                              <button
                                type="button"
                                className="remove-image-btn"
                                onClick={() => setNftForm(prev => ({ ...prev, image: null, imagePreview: null }))}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="upload-placeholder">
                              <Upload size={48} />
                              <p>Cliquez pour ajouter une image</p>
                              <span>PNG, JPG, GIF jusqu'à 10MB</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="file-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetCreateForm}
                      disabled={isCreating}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isCreating || !nftForm.name.trim()}
                    >
                      <Save size={16} />
                      {isCreating ? 'Création...' : 'Créer le NFT'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Liste des NFTs */}
          {activeTab !== 'create' && !loading && currentNFTs.length > 0 && (
            <div className={`nfts-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
              {currentNFTs.map(nft => (
                <div key={`${nft.status || 'blockchain'}-${nft.id}`} className="portfolio-nft-wrapper">
                  <NFTCard 
                    nft={nft}
                    onClick={handleNFTClick}
                  />
                  
                  {/* Badge pour indiquer le statut */}
                  {nft.status === 'submitted' && (
                    <div className="nft-status-badge">
                      {nft.blockchainStatus === 'pending' && (
                        <span className="status-pending">
                          <Clock size={14} />
                          Local
                        </span>
                      )}
                      {nft.blockchainStatus === 'minted' && (
                        <span className="status-minted">
                          <CheckCircle size={14} />
                          Blockchain
                        </span>
                      )}
                      {nft.blockchainStatus === 'failed' && (
                        <span className="status-failed">
                          <AlertTriangle size={14} />
                          Erreur
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Actions pour NFTs possédés non en vente */}
                  {activeTab === 'owned' && !nft.forSale && nft.status !== 'submitted' && (
                    <button 
                      className="quick-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNFTClick(nft);
                      }}
                    >
                      <Tag size={16} />
                      Mettre en vente
                    </button>
                  )}
                  
                  {/* Actions pour NFTs en vente blockchain */}
                  {activeTab === 'onsale' && nft.status !== 'submitted' && (
                    <div className="sale-info">
                      <span className="sale-price">
                        Prix: {showValues ? `${nft.price} ETH` : '•••'}
                      </span>
                      <button 
                        className="cancel-sale-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWithdrawNFT(nft.tokenId);
                        }}
                        disabled={loading}
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                  
                  {/* Actions pour NFTs soumis localement */}
                  {nft.status === 'submitted' && (
                    <div className="local-nft-actions">
                      <button 
                        className="quick-action-btn edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNFTClick(nft);
                        }}
                      >
                        <Eye size={16} />
                        Voir
                      </button>
                      <button 
                        className="quick-action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubmittedNFT(nft.id);
                        }}
                      >
                        <X size={16} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* État vide pour les autres onglets */}
          {activeTab !== 'create' && !loading && currentNFTs.length === 0 && (
            <EmptyState type={activeTab} />
          )}
        </div>

        {/* Actions rapides */}
        <div className="portfolio-actions">
          <div className="action-card">
            <h3>Actions rapides</h3>
            <div className="actions-grid">
              <button 
                className="action-btn"
                onClick={() => navigate('/explore')}
              >
                <ShoppingBag />
                <span>Acheter des NFTs</span>
              </button>
              <button 
                className="action-btn"
                onClick={() => navigate('/submit')}
              >
                <Brush />
                <span>Créer un NFT</span>
              </button>
              <button 
                className="action-btn"
                onClick={() => {
                  const availableNFTs = [...ownedNFTs, ...submittedNFTs].filter(nft => !nft.forSale);
                  if (availableNFTs.length > 0) {
                    handleNFTClick(availableNFTs[0]);
                  }
                }}
                disabled={[...ownedNFTs, ...submittedNFTs].filter(nft => !nft.forSale).length === 0}
              >
                <Tag />
                <span>Vendre un NFT</span>
              </button>
              <button 
                className="action-btn"
                onClick={loadPortfolioData}
                disabled={loading}
              >
                <RefreshCw className={loading ? 'spinning' : ''} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
          
          {/* Informations sur le stockage local */}
          {submittedNFTs.length > 0 && (
            <div className="storage-info">
              <h4>Stockage local</h4>
              <p>
                Vous avez {submittedNFTs.length} NFT(s) sauvegardé(s) localement. 
                Ces NFTs sont visibles uniquement sur cet appareil.
              </p>
              <div className="storage-stats">
                <span>Mintés: {submittedNFTs.filter(nft => nft.blockchainStatus === 'minted').length}</span>
                <span>En attente: {submittedNFTs.filter(nft => nft.blockchainStatus === 'pending').length}</span>
                <span>Échec: {submittedNFTs.filter(nft => nft.blockchainStatus === 'failed').length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;