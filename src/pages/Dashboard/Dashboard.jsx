import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import './Dashboard.css';
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
  BarChart3,
  Zap,
  Star,
  Activity
} from 'lucide-react';
import { useAppContext } from '../../App';
import { fetchUserNFTs, fetchUserListedNFTs, fetchMarketplaceNFTs } from '../../utils/contract';
import { getSubmittedNFTs } from '../../utils/storage';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isWalletConnected, walletAddress, setSelectedNFT } = useAppContext();

  const [viewMode, setViewMode] = useState('grid');
  const [showValues, setShowValues] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const [dashboardStats, setDashboardStats] = useState({
    totalValue: 0,
    myNFTsCount: 0,
    marketplaceNFTsCount: 0,
    onSaleCount: 0,
    createdCount: 0,
    submittedCount: 0,
    totalMarketValue: 0,
    floorPrice: 0,
    avgPrice: 0
  });

  const [allNFTsData, setAllNFTsData] = useState({
    myNFTs: [],
    marketplaceNFTs: [],
    onSaleNFTs: [],
    submittedNFTs: []
  });

  const [error, setError] = useState('');

  // Charger toutes les données
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      loadAllData();
    }
  }, [isWalletConnected, walletAddress]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🚀 Chargement dashboard pour:', walletAddress);

      // 1. Charger NFTs locaux
      const localNFTs = getSubmittedNFTs();
      const activeLocalNFTs = localNFTs.filter(nft =>
        nft.blockchainStatus !== 'minted' && nft.status === 'submitted'
      );

      // 2. Charger données blockchain
      const [myNFTs, listedNFTs, marketplaceNFTs] = await Promise.all([
        fetchUserNFTs(walletAddress).catch(err => {
          console.warn('Erreur NFTs possédés:', err);
          return [];
        }),
        fetchUserListedNFTs().catch(err => {
          console.warn('Erreur NFTs listés:', err);
          return [];
        }),
        fetchMarketplaceNFTs().catch(err => {
          console.warn('Erreur marketplace:', err);
          return [];
        })
      ]);

      console.log('📊 Données chargées:', {
        myNFTs: myNFTs.length,
        listed: listedNFTs.length,
        marketplace: marketplaceNFTs.length,
        local: activeLocalNFTs.length
      });

      // 3. Stocker toutes les données
      setAllNFTsData({
        myNFTs,
        marketplaceNFTs,
        onSaleNFTs: listedNFTs,
        submittedNFTs: activeLocalNFTs
      });

      // 4. Calculer statistiques complètes
      const myValue = myNFTs.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);
      const localValue = activeLocalNFTs.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);
      const totalMarketValue = marketplaceNFTs.reduce((sum, nft) => sum + (parseFloat(nft.price) || 0), 0);

      const allPrices = marketplaceNFTs
        .map(nft => parseFloat(nft.price) || 0)
        .filter(price => price > 0);

      const floorPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

      setDashboardStats({
        totalValue: (myValue + localValue),
        myNFTsCount: myNFTs.length + activeLocalNFTs.length,
        marketplaceNFTsCount: marketplaceNFTs.length,
        onSaleCount: listedNFTs.length + activeLocalNFTs.filter(nft => nft.forSale).length,
        createdCount: myNFTs.filter(nft => nft.seller === walletAddress).length + activeLocalNFTs.length,
        submittedCount: activeLocalNFTs.length,
        totalMarketValue,
        floorPrice,
        avgPrice
      });

    } catch (error) {
      console.error('❌ Erreur chargement dashboard:', error);
      setError('Erreur lors du chargement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    if (nft.status === 'submitted' && nft.blockchainStatus !== 'minted') {
      navigate(`/nft/local-${nft.id}`);
    } else {
      navigate(`/nft/${nft.tokenId || nft.id}`);
    }
  };

  const getCurrentNFTs = () => {
    switch(activeSection) {
      case 'my-nfts':
        return [...allNFTsData.myNFTs, ...allNFTsData.submittedNFTs];
      case 'marketplace':
        return allNFTsData.marketplaceNFTs;
      case 'on-sale':
        return [...allNFTsData.onSaleNFTs, ...allNFTsData.submittedNFTs.filter(nft => nft.forSale)];
      case 'submitted':
        return allNFTsData.submittedNFTs;
      default:
        // Overview: tous les NFTs mélangés
        return [
          ...allNFTsData.myNFTs.slice(0, 6),
          ...allNFTsData.marketplaceNFTs.slice(0, 6),
          ...allNFTsData.submittedNFTs.slice(0, 3)
        ];
    }
  };

  if (!isWalletConnected) {
    return <Navigate to="/" replace />;
  }

  const currentNFTs = getCurrentNFTs();

  return (
    <div className="dashboard">
      <div className="container">
        {/* Header Principal */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1>🎯 Dashboard NFT</h1>
              <p>Vue d'ensemble complète de votre écosystème NFT</p>
            </div>
            <div className="header-address">
              <Wallet size={20} />
              <span>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
              <button
                className="refresh-btn"
                onClick={loadAllData}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="error-banner">
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={loadAllData}>Réessayer</button>
          </div>
        )}

        {/* Stats Cards Principales */}
        <div className="main-stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">
              <DollarSign />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {showValues ? `${dashboardStats.totalValue.toFixed(4)} ETH` : '•••••'}
              </div>
              <div className="stat-label">Ma Valeur Totale</div>
              <div className="stat-change positive">
                <TrendingUp size={14} />
                +5.2%
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Package />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardStats.myNFTsCount}</div>
              <div className="stat-label">Mes NFTs</div>
              <div className="stat-detail">
                {dashboardStats.submittedCount} locaux
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Activity />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardStats.marketplaceNFTsCount}</div>
              <div className="stat-label">Marketplace</div>
              <div className="stat-detail">
                {showValues ? `${dashboardStats.totalMarketValue.toFixed(2)} ETH` : '•••'}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Tag />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardStats.onSaleCount}</div>
              <div className="stat-label">En Vente</div>
              <div className="stat-detail">
                Floor: {showValues ? `${dashboardStats.floorPrice.toFixed(3)} ETH` : '•••'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Marché */}
        <div className="market-stats">
          <div className="market-stat">
            <BarChart3 size={20} />
            <div>
              <div className="market-value">
                Prix Moyen: {showValues ? `${dashboardStats.avgPrice.toFixed(4)} ETH` : '•••'}
              </div>
              <div className="market-label">Marketplace</div>
            </div>
          </div>
          <div className="market-stat">
            <Star size={20} />
            <div>
              <div className="market-value">
                Floor: {showValues ? `${dashboardStats.floorPrice.toFixed(4)} ETH` : '•••'}
              </div>
              <div className="market-label">Prix minimum</div>
            </div>
          </div>
          <div className="market-stat">
            <Zap size={20} />
            <div>
              <div className="market-value">{dashboardStats.createdCount}</div>
              <div className="market-label">Créés par moi</div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="dashboard-nav">
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <Activity size={18} />
              Vue d'ensemble
            </button>
            <button
              className={`nav-tab ${activeSection === 'my-nfts' ? 'active' : ''}`}
              onClick={() => setActiveSection('my-nfts')}
            >
              <Package size={18} />
              Mes NFTs ({dashboardStats.myNFTsCount})
            </button>
            <button
              className={`nav-tab ${activeSection === 'marketplace' ? 'active' : ''}`}
              onClick={() => setActiveSection('marketplace')}
            >
              <ShoppingBag size={18} />
              Marketplace ({dashboardStats.marketplaceNFTsCount})
            </button>
            <button
              className={`nav-tab ${activeSection === 'on-sale' ? 'active' : ''}`}
              onClick={() => setActiveSection('on-sale')}
            >
              <Tag size={18} />
              En Vente ({dashboardStats.onSaleCount})
            </button>
            <button
              className={`nav-tab ${activeSection === 'submitted' ? 'active' : ''}`}
              onClick={() => setActiveSection('submitted')}
            >
              <Clock size={18} />
              Locaux ({dashboardStats.submittedCount})
            </button>
          </div>

          <div className="nav-controls">
            <button
              className="toggle-values"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <Eye size={18} /> : <EyeOff size={18} />}
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

        {/* Section Titre */}
        <div className="section-header">
          <h2>
            {activeSection === 'overview' && '🎯 Vue d\'ensemble'}
            {activeSection === 'my-nfts' && '💼 Mes NFTs'}
            {activeSection === 'marketplace' && '🏪 Marketplace'}
            {activeSection === 'on-sale' && '🏷️ En Vente'}
            {activeSection === 'submitted' && '📝 NFTs Locaux'}
          </h2>
          {activeSection === 'overview' && (
            <p>Les derniers NFTs de toutes vos collections</p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <RefreshCw className="spinning" size={48} />
            <p>Chargement des données...</p>
          </div>
        )}

        {/* NFTs Grid */}
        <div className="dashboard-content">
          {!loading && currentNFTs.length > 0 ? (
            <>
              <div className={`nfts-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
                {currentNFTs.map((nft, index) => (
                  <div key={`${nft.source || 'blockchain'}-${nft.id}-${index}`} className="dashboard-nft-wrapper">
                    <NFTCard
                      nft={nft}
                      onClick={handleNFTClick}
                    />

                    {/* Badges sources */}
                    <div className="nft-badges">
                      {nft.status === 'submitted' && (
                        <span className="badge local">💾 Local</span>
                      )}
                      {nft.source === 'blockchain' && (
                        <span className="badge blockchain">⛓️ Blockchain</span>
                      )}
                      {nft.forSale && (
                        <span className="badge sale">🏷️ En vente</span>
                      )}
                    </div>

                    {/* Prix affiché */}
                    {nft.price > 0 && (
                      <div className="nft-price">
                        {showValues ? `${nft.price} ETH` : '••• ETH'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Voir plus */}
              {activeSection === 'overview' && (
                <div className="dashboard-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/portfolio')}
                  >
                    Voir tout mon portfolio
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/explore')}
                  >
                    Explorer le marketplace
                  </button>
                </div>
              )}
            </>
          ) : !loading ? (
            <div className="empty-dashboard">
              <Package size={64} />
              <h3>Aucun NFT dans cette section</h3>
              <p>
                {activeSection === 'my-nfts' && 'Vous n\'avez pas encore de NFTs'}
                {activeSection === 'marketplace' && 'Aucun NFT sur le marketplace'}
                {activeSection === 'on-sale' && 'Aucun NFT en vente'}
                {activeSection === 'submitted' && 'Aucun NFT local'}
                {activeSection === 'overview' && 'Connectez votre wallet pour voir vos NFTs'}
              </p>
              <div className="empty-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/submit')}
                >
                  <Brush size={16} />
                  Créer un NFT
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/explore')}
                >
                  <ShoppingBag size={16} />
                  Explorer
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions rapides */}
        <div className="quick-actions">
          <h3>⚡ Actions rapides</h3>
          <div className="actions-grid">
            <button
              className="action-card"
              onClick={() => navigate('/submit')}
            >
              <Brush size={24} />
              <span>Créer un NFT</span>
            </button>
            <button
              className="action-card"
              onClick={() => navigate('/explore')}
            >
              <ShoppingBag size={24} />
              <span>Explorer</span>
            </button>
            <button
              className="action-card"
              onClick={() => navigate('/portfolio')}
            >
              <Package size={24} />
              <span>Portfolio</span>
            </button>
            <button
              className="action-card"
              onClick={loadAllData}
              disabled={loading}
            >
              <RefreshCw size={24} className={loading ? 'spinning' : ''} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;