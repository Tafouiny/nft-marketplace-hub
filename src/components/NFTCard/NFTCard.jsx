import React, { useState } from 'react';
import './NFTCard.css';
import { TrendingUp, Clock } from 'lucide-react';
import { getNFTImageUrl } from '../../utils/ipfsHelpers';
import NFTStats from '../NFTStats/NFTStats';

const NFTCard = ({ nft, badge, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

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
          {/* Les stats sont maintenant gérées en bas de la carte */}
        </div>
      </div>
      
      <div className="nft-card-info">
        <div className="nft-card-header">
          <h3 className="nft-card-name">{nft.name}</h3>
          {nft.forSale && <span className="nft-card-sale-badge">En vente</span>}
        </div>
        
        <div className="nft-card-token">
          <span className="token-label">Token ID:</span>
          <span className="token-value">#{nft.tokenId || nft.id || 'N/A'}</span>
        </div>
        
        <div className="nft-card-footer">
          {nft.forSale ? (
            <div className="nft-card-price">
              <span className="nft-card-price-label">Prix actuel</span>
              <span className="nft-card-price-value">{nft.price} ETH</span>
            </div>
          ) : (
            <div className="nft-card-status">
              <span className="nft-card-status-label">Statut</span>
              <span className="nft-card-status-value">Pas en vente</span>
            </div>
          )}
          {nft.category && (
            <span className="nft-card-category">{nft.category}</span>
          )}
        </div>

        {/* Stats de likes et vues */}
        <NFTStats
          nftId={nft.tokenId || nft.id}
          showLikes={true}
          showViews={true}
          incrementViewOnMount={false}
        />
      </div>
    </div>
  );
};

export default NFTCard;