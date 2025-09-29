import React, { useState, useEffect } from 'react';
import './NFTCard.css';
import { TrendingUp, Clock, Heart, Eye, Gavel } from 'lucide-react';
import { getNFTImageUrl } from '../../utils/ipfsHelpers';
import { getNFTStats, toggleNFTLike } from '../../services/statsService';
import { useAppContext } from '../../App';

const NFTCard = ({ nft, badge, onClick, onBid }) => {
  const { walletAddress, isWalletConnected } = useAppContext();
  const [isHovered, setIsHovered] = useState(false);
  const [stats, setStats] = useState({ views: 0, likes: 0, likedBy: [] });
  const [isLiked, setIsLiked] = useState(false);

  // Charger les stats du NFT
  useEffect(() => {
    const loadStats = async () => {
      if (nft?.id || nft?.tokenId) {
        const nftId = nft.id || nft.tokenId;
        const nftStats = await getNFTStats(nftId);
        setStats(nftStats);

        // Vérifier si l'utilisateur actuel a liké
        if (walletAddress && nftStats.likedBy) {
          setIsLiked(nftStats.likedBy.includes(walletAddress));
        }
      }
    };

    loadStats();
  }, [nft, walletAddress]);

  const handleLike = async (e) => {
    e.stopPropagation();

    if (!isWalletConnected || !walletAddress) {
      alert('Connectez votre wallet pour liker ce NFT');
      return;
    }

    const nftId = nft.id || nft.tokenId;
    const result = await toggleNFTLike(nftId, walletAddress);

    if (result.success) {
      setStats(prev => ({ ...prev, likes: result.likes }));
      setIsLiked(result.isLiked);
    }
  };

  const handleBid = (e) => {
    e.stopPropagation();
    if (onBid) {
      onBid(nft);
    }
  };

  const renderBadge = () => {
    if (!badge) return null;
    
    let icon;
    let className = 'nft-card-badge';
    
    switch(badge.type) {
      case 'trending':
        icon = <TrendingUp size={14} />;
        className += ' badge-trending';
        break;
      case 'new':
        icon = <Clock size={14} />;
        className += ' badge-new';
        break;
      default:
        icon = null;
    }
    
    return (
      <div className={className}>
        {icon}
        <span>{badge.text}</span>
      </div>
    );
  };

  return (
    <div 
      className={`nft-card ${isHovered ? 'nft-card-hover' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick && onClick(nft)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="nft-card-image-container">
        <img
          src={getNFTImageUrl(nft) || 'https://via.placeholder.com/400x400/e5e7eb/9ca3af?text=No+Image'}
          alt={nft.name}
          className="nft-card-image"
        />
        {renderBadge()}
        
        <div className="nft-card-overlay">
          <button className="nft-card-action" onClick={handleLike}>
            <Heart size={20} fill={isLiked ? '#EF4444' : 'none'} color={isLiked ? '#EF4444' : '#fff'} />
            <span>{stats.likes}</span>
          </button>
          <button className="nft-card-action">
            <Eye size={20} />
            <span>{stats.views}</span>
          </button>
        </div>
      </div>
      
      <div className="nft-card-info">
        <div className="nft-card-header">
          <h3 className="nft-card-name">{nft.name}</h3>
          {nft.inAuction ? (
            <span className="nft-card-auction-badge">En enchère</span>
          ) : nft.forSale && !nft.sold ? (
            <span className="nft-card-sale-badge">En vente</span>
          ) : (
            <span className="nft-card-not-sale-badge">Pas en vente</span>
          )}
        </div>

        <div className="nft-card-token">
          <span className="token-label">Token ID:</span>
          <span className="token-value">#{nft.tokenId || nft.id || 'N/A'}</span>
        </div>

        <div className="nft-card-footer">
          {/* Afficher les informations d'enchère */}
          {nft.inAuction && (
            <div className="nft-card-auction-info">
              <div className="nft-card-price">
                <span className="nft-card-price-label">Enchère actuelle</span>
                <span className="nft-card-price-value">
                  {nft.highestBid && parseFloat(nft.highestBid) > 0
                    ? `${nft.highestBid} ETH`
                    : `${nft.startingPrice || nft.price} ETH (Mise de départ)`}
                </span>
              </div>
              {nft.endTime && (
                <div className="nft-card-time-remaining">
                  <Clock size={14} />
                  {(() => {
                    const currentTime = Math.floor(Date.now() / 1000);
                    const timeRemaining = nft.endTime - currentTime;

                    if (timeRemaining <= 0) {
                      return <span className="expired">Enchère expirée</span>;
                    }

                    const minutes = Math.floor(timeRemaining / 60);
                    const seconds = timeRemaining % 60;

                    if (minutes > 0) {
                      return <span>Se termine dans {minutes}min {seconds}s</span>;
                    } else {
                      return <span>Se termine dans {seconds}s</span>;
                    }
                  })()}
                </div>
              )}
              {/* Bouton Enchérir pour les non-propriétaires (seulement si enchère active) */}
              {walletAddress &&
               walletAddress.toLowerCase() !== (nft.seller || nft.owner || '').toLowerCase() &&
               nft.endTime &&
               Math.floor(Date.now() / 1000) < nft.endTime && (
                <button
                  className="nft-card-bid-btn"
                  onClick={handleBid}
                >
                  <Gavel size={16} />
                  Enchérir
                </button>
              )}
            </div>
          )}

          {/* Afficher le prix seulement si en vente ET pas vendu ET pas en enchère */}
          {nft.forSale && !nft.sold && !nft.inAuction && (
            <div className="nft-card-price">
              <span className="nft-card-price-label">Prix actuel</span>
              <span className="nft-card-price-value">{nft.price} ETH</span>
            </div>
          )}

          {nft.category && (
            <span className="nft-card-category">{nft.category}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFTCard;