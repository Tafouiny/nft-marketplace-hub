import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App.jsx';
import likesService from '../../services/likesService.js';
import './NFTStats.css';

const NFTStats = ({ nftId, showLikes = true, showViews = true, incrementViewOnMount = false }) => {
  const { walletAddress } = useAppContext();
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les stats initiales
  useEffect(() => {
    const loadStats = async () => {
      if (!nftId) return;

      try {
        // Récupérer les stats
        const stats = await likesService.getNFTStats(nftId);
        setLikes(stats.likes);
        setViews(stats.views);

        // Vérifier si l'utilisateur a liké ce NFT
        if (walletAddress) {
          const userLiked = await likesService.hasUserLiked(nftId, walletAddress);
          setIsLiked(userLiked);
        }

        // Incrémenter les vues si demandé (pour les pages de détail)
        if (incrementViewOnMount) {
          const viewResult = await likesService.incrementViews(nftId);
          if (viewResult.success && !viewResult.alreadyCounted) {
            setViews(viewResult.newCount);
          }
        }
      } catch (error) {
        console.error('Erreur chargement stats NFT:', error);
      }
    };

    loadStats();
  }, [nftId, walletAddress, incrementViewOnMount]);

  // Gérer le click sur le bouton like
  const handleLikeClick = async (e) => {
    // Empêcher la propagation de l'événement vers les éléments parents
    e.stopPropagation();
    e.preventDefault();

    if (!walletAddress) {
      alert('Vous devez connecter votre wallet pour aimer un NFT');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await likesService.toggleLike(nftId, walletAddress);

      if (result.success) {
        setIsLiked(result.liked);
        setLikes(result.newCount);
      } else {
        console.error('Erreur toggle like:', result.message);
        alert('Erreur lors du like/unlike');
      }
    } catch (error) {
      console.error('Erreur like:', error);
      alert('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  // Empêcher la propagation des événements sur tout le composant stats
  const handleStatsClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className="nft-stats" onClick={handleStatsClick}>
      {showLikes && (
        <div className="stat-item">
          <button
            className={`like-btn ${isLiked ? 'liked' : ''} ${isLoading ? 'loading' : ''}`}
            onClick={handleLikeClick}
            disabled={isLoading}
            title={isLiked ? 'Ne plus aimer' : 'Aimer ce NFT'}
          >
            <span className="heart-icon">{isLiked ? '❤️' : '🤍'}</span>
            <span className="count">{likes}</span>
          </button>
        </div>
      )}

      {showViews && (
        <div className="stat-item">
          <div className="view-count" title={`${views} vue${views > 1 ? 's' : ''}`}>
            <span className="eye-icon">👁️</span>
            <span className="count">{views}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTStats;