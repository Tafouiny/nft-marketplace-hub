import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import './NFTDetail.css';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  ExternalLink, 
  Clock,
  TrendingUp,
  User,
  Calendar,
  Tag,
  Eye,
  AlertCircle,
  ShoppingCart,
  DollarSign,
  History,
  ArrowUpRight,
  Zap,
  ShoppingBag,
  Hash
} from 'lucide-react';
import { useAppContext } from '../../App';
import { getNFTDetails, withdrawNFT, listNFTForSale, buyNFT, getNFTHistory } from '../../utils/contract';
import { getSubmittedNFTs, updateSubmittedNFT } from '../../utils/storage';
import { ethers } from 'ethers';
import contractAddresses from '../../contracts/contract-address.json';
import NFTStats from '../../components/NFTStats/NFTStats';

const NFTDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedNFT, isWalletConnected, walletAddress } = useAppContext();
  
  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Charger le NFT et son historique
  useEffect(() => {
    loadNFTDetails();
    loadNFTHistory();
  }, [id, selectedNFT]);

  const loadNFTDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Vérifier si c'est un NFT local
      if (id.startsWith('local-')) {
        const localId = parseInt(id.replace('local-', ''));
        const localNFTs = getSubmittedNFTs();
        const localNFT = localNFTs.find(nft => nft.id === localId);
        
        if (localNFT) {
          setNft({
            ...localNFT,
            isLocal: true,
            source: 'local'
          });
        } else {
          setError('NFT local non trouvé');
        }
        setLoading(false);
        return;
      }
      
      // NFT blockchain
      const nftId = parseInt(id);
      if (selectedNFT?.id === nftId) {
        setNft(selectedNFT); // Utiliser directement selectedNFT tel qu'il est
        setLoading(false);
        return;
      }
      
      // Charger depuis le contrat - RÉACTIVÉ
      try {
        const nftDetails = await getNFTDetails(nftId);
        setNft(nftDetails); // Utiliser directement les données retournées par getNFTDetails
      } catch (contractError) {
        setError(`NFT #${nftId} non trouvé.`);
      }
      
    } catch (error) {
      console.error('Erreur chargement NFT:', error);
      setError('Erreur lors du chargement du NFT');
    } finally {
      setLoading(false);
    }
  };

  // Charger l'historique du NFT
  const loadNFTHistory = async () => {
    if (!id || id.startsWith('local-')) {
      // Pas d'historique pour les NFTs locaux
      setHistory([]);
      return;
    }

    setLoadingHistory(true);
    try {
      const nftId = parseInt(id);
      const historyData = await getNFTHistory(nftId);
      setHistory(historyData);
      console.log('Historique chargé:', historyData);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fonction helper pour formater les adresses
  const formatAddress = (address) => {
    if (!address) return null;

    // Adresse nulle (création de NFT)
    if (address === '0x0000000000000000000000000000000000000000') {
      return {
        display: 'Blockchain',
        type: 'blockchain',
        full: address
      };
    }

    // Adresse du contrat (transfert vers le marketplace)
    if (address.toLowerCase() === contractAddresses.NFTMarketplace?.toLowerCase()) {
      return {
        display: 'Marketplace',
        type: 'marketplace',
        full: address
      };
    }

    // Adresse utilisateur standard
    return {
      display: `${address.slice(0,6)}...${address.slice(-4)}`,
      type: 'user',
      full: address
    };
  };

  // Calculer si l'utilisateur est propriétaire
  const isOwner = isWalletConnected && (
    id.startsWith('local-') || // Tout NFT local appartient à l'utilisateur connecté
    (walletAddress && nft?.owner && walletAddress.toLowerCase() === nft.owner.toLowerCase()) ||
    (walletAddress && nft?.creator && walletAddress.toLowerCase() === nft.creator.toLowerCase()) ||
    (walletAddress && nft?.seller && walletAddress.toLowerCase() === nft.seller.toLowerCase()) // Ajout: si vous êtes le vendeur
  );

  // Migrer vers la blockchain - RÉACTIVÉ
const handleMigrateToBlockchain = async () => {

  let salePrice = null;

  const wantToSell = window.confirm(`Voulez-vous mettre "${nft.name}" en vente lors de la création sur la blockchain ?`);

  if (wantToSell) {
    salePrice = prompt('Prix de vente en ETH (ex: 2.5) :');
    if (!salePrice || parseFloat(salePrice) <= 0) {
      alert('Prix invalide');
      return;
    }
  }

  if (!window.confirm(`Créer "${nft.name}" sur la blockchain ?${salePrice ? ` Prix: ${salePrice} ETH` : ''}`)) return;

  setIsProcessing(true);
  try {
    const { getContract } = await import('../../utils/contract');
    const { contract } = await getContract();

    // Tests de diagnostic
    console.log('Test: Récupération prix listing...');
    const listingPrice = await contract.getListingPrice();
    console.log('Prix listing:', listingPrice.toString());

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    console.log('Solde:', ethers.utils.formatEther(balance), 'ETH');

    let imageToUse = nft.image;

    // Vérifier la taille de l'image base64
    const imageSize = nft.image ? nft.image.length : 0;
    console.log('Taille image base64:', imageSize, 'caractères');

    // Si l'image est trop grosse, proposer une alternative
    if (imageSize > 15000) {
      const useSmaller = window.confirm(
        `⚠️ Image très lourde (${Math.round(imageSize/1000)}k caractères en base64)\n\n` +
        `Cela va coûter beaucoup de gas et peut échouer.\n\n` +
        `Voulez-vous utiliser une image placeholder temporaire ?\n\n` +
        `✅ OUI = Image placeholder (migration rapide)\n` +
        `❌ NON = Garder votre image (gas élevé)`
      );

      if (useSmaller) {
        // Image placeholder petite (SVG simple)
        imageToUse = `data:image/svg+xml;base64,${btoa(`
          <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#667eea"/>
            <text x="50" y="40" text-anchor="middle" fill="white" font-size="10">NFT</text>
            <text x="50" y="60" text-anchor="middle" fill="white" font-size="8">${nft.name}</text>
          </svg>
        `)}`;
        console.log('✅ Utilisation image placeholder');
      }
    }

    const metadata = {
      name: nft.name,
      description: nft.description,
      category: nft.category,
      image: imageToUse
    };

    const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
    const price = salePrice ? ethers.utils.parseEther(salePrice) : 0;

    console.log('TokenURI final length:', tokenURI.length);

    // Vérifier la taille du TokenURI pour éviter les erreurs de gas
    if (tokenURI.length > 20000) {
      console.warn('TokenURI très long:', tokenURI.length, 'caractères');
      const confirm = window.confirm(`Attention: TokenURI très long (${tokenURI.length} caractères).\nCela va coûter beaucoup de gas.\nContinuer quand même ?`);
      if (!confirm) return;
    }

    const transaction = await contract.createToken(tokenURI, price, {
      value: listingPrice,
      gasLimit: 8000000 // Augmenté pour les gros TokenURI
    });

    const receipt = await transaction.wait();
    console.log('Migration réussie, hash:', transaction.hash);

    // Extraire le token ID depuis les logs
    const transferLog = receipt.logs.find(log =>
      log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    );

    let tokenId = 'inconnu';
    if (transferLog) {
      tokenId = ethers.BigNumber.from(transferLog.topics[3]).toString();
      console.log('Token ID extrait:', tokenId);
    }

    // SUPPRIMER le NFT local après migration réussie
    const { removeSubmittedNFT } = await import('../../utils/storage');
    removeSubmittedNFT(nft.id);
    console.log('✅ NFT local supprimé après migration');

    // Rediriger vers le NFT blockchain
    alert(`🎉 NFT migré vers la blockchain avec succès !\n\nToken ID: ${tokenId}\nRedirection vers la version blockchain...`);

    // Rediriger vers la version blockchain
    setTimeout(() => {
      navigate(`/nft/${tokenId}`);
    }, 1000);

  } catch (error) {
    console.error('Erreur migration:', error);
    alert('Erreur: ' + error.message);
  } finally {
    setIsProcessing(false);
  }
};

  // Mettre en vente
  const handleListForSale = () => {
    if (!isWalletConnected) {
      alert('Connectez votre wallet pour lister ce NFT');
      return;
    }
    setShowListingModal(true);
  };

  const confirmListing = async () => {

    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      alert('Entrez un prix valide');
      return;
    }

    setIsProcessing(true);
    try {
      await listNFTForSale(nft.tokenId, listingPrice);

      setNft(prev => ({
        ...prev,
        forSale: true,
        price: parseFloat(listingPrice)
      }));

      setShowListingModal(false);
      setListingPrice('');
      alert('NFT mis en vente avec succès !');

    } catch (error) {
      console.error('Erreur mise en vente:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Retirer de la vente - RÉACTIVÉ
  const handleWithdrawFromSale = async () => {

    if (!window.confirm(`Retirer "${nft.name}" de la vente ?`)) return;

    setIsProcessing(true);
    try {
      await withdrawNFT(nft.tokenId);

      setNft(prev => ({
        ...prev,
        forSale: false,
        owner: walletAddress
      }));

      alert('NFT retiré de la vente avec succès !');

    } catch (error) {
      console.error('Erreur retrait:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Acheter un NFT - RÉACTIVÉ
  const handleBuyNFT = async () => {

    if (!isWalletConnected) {
      alert('Connectez votre wallet pour acheter ce NFT');
      return;
    }

    const confirmMessage = `Acheter "${nft.name}" pour ${nft.price} ETH ?\n\nCette action est irréversible.`;
    if (!window.confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      console.log('Début de l\'achat du NFT:', nft.tokenId);

      const result = await buyNFT(nft.tokenId, nft.price);

      console.log('Achat réussi:', result);

      // Mettre à jour l'état du NFT
      setNft(prev => ({
        ...prev,
        owner: walletAddress,
        forSale: false,
        sold: true
      }));

      alert(`🎉 Félicitations ! Vous avez acheté "${nft.name}" avec succès !\n\nTransaction: ${result.transactionRecord.transactionHash}`);

      // Rediriger vers le portfolio après un délai
      setTimeout(() => {
        navigate('/portfolio');
      }, 2000);

    } catch (error) {
      console.error('Erreur achat NFT:', error);

      // Messages d'erreur plus spécifiques
      let errorMessage = 'Erreur lors de l\'achat du NFT';

      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Solde ETH insuffisant pour effectuer cet achat';
      } else if (error.message.includes('Solde insuffisant')) {
        errorMessage = error.message;
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction annulée par l\'utilisateur';
      } else if (error.message.includes('already sold')) {
        errorMessage = 'Ce NFT a déjà été vendu';
      } else if (error.message.includes('not listed')) {
        errorMessage = 'Ce NFT n\'est plus en vente';
      }

      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className="nft-detail">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  if (error || !nft) {
    return (
      <div className="nft-detail">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={64} />
            <h2>NFT non trouvé</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/explore')}>
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-detail">
      <div className="container">
        {/* Header */}
        <div className="detail-header">
          <button className="back-button" onClick={() => navigate('/explore')}>
            <ArrowLeft size={20} />
            Retour
          </button>
        </div>

        {/* Contenu principal */}
        <div className="detail-content">
          {/* Image */}
          <div className="detail-image-section">
            <div className="image-container">
              <img
                src={nft.image || 'https://via.placeholder.com/400x400/e5e7eb/9ca3af?text=No+Image'}
                alt={nft.name}
                className="nft-image"
              />
              {nft.forSale && !isOwner && (
                <div className="sale-badge">
                  <ShoppingCart size={16} />
                  En vente
                </div>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="detail-info-section">
            <div className="info-header">
              <div className="category-tag">{nft.category}</div>
              <h1 className="nft-title">{nft.name}</h1>

              <div className="token-id-display">
                <span className="token-id-label">Token ID:</span>
                <span className="token-id-value">#{nft.tokenId || nft.id || 'N/A'}</span>
              </div>

              <div className="ownership-info">
                <div className="owner-item">
                  <span className="label">Propriétaire</span>
                  <div className="address-link">
                    <User size={16} />
                    <span>{nft.owner || 'Vous'}</span>
                    {isOwner && <span className="you-badge">Vous</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Prix et actions */}
            <div className="price-section">
              {nft.forSale ? (
                <div className="price-info">
                  <span className="price-label">Prix</span>
                  <div className="price-value">
                    <DollarSign size={24} />
                    <span className="price-amount">{nft.price || 0}</span>
                    <span className="price-currency">ETH</span>
                  </div>
                </div>
              ) : (
                <div className="price-info">
                  <span className="price-label">Statut</span>
                  <div className="price-value not-for-sale">
                    <AlertCircle size={24} />
                    <span className="status-text">Pas en vente</span>
                  </div>
                </div>
              )}

              {/* Actions selon le type de NFT et propriétaire */}
              <div className="action-buttons">
                {/* Logique simplifiée: si l'URL contient 'local-', c'est un NFT local */}
                {id.startsWith('local-') ? (
                  // NFT LOCAL
                  <div className="local-actions">
                    <p className="local-info">
                      <AlertCircle size={16} />
                      Ce NFT est sauvegardé localement.
                    </p>
                    
                    {isOwner && (
                      <button 
                        className="btn btn-primary btn-large"
                        onClick={handleMigrateToBlockchain}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Migration...' : 'Migrer vers la blockchain'}
                      </button>
                    )}
                  </div>
                ) : (
                  // NFT BLOCKCHAIN
                  <div className="blockchain-actions">
                    {isOwner ? (
                      // PROPRIÉTAIRE
                      <div className="owner-actions">
                        {!nft.forSale ? (
                          <button 
                            className="btn btn-primary btn-large"
                            onClick={handleListForSale}
                            disabled={isProcessing}
                          >
                            <Tag size={20} />
                            Mettre en vente
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-large"
                            onClick={handleWithdrawFromSale}
                            disabled={isProcessing}
                          >
                            Retirer de la vente
                          </button>
                        )}
                      </div>
                    ) : (
                      // VISITEUR
                      <div className="buyer-actions">
                        {nft.forSale ? (
                          <button
                            className="btn btn-primary btn-large"
                            onClick={handleBuyNFT}
                            disabled={isProcessing}
                          >
                            <ShoppingCart size={20} />
                            {isProcessing ? 'Achat en cours...' : 'Acheter maintenant'}
                          </button>
                        ) : (
                          <div className="not-for-sale-message">
                            <AlertCircle size={18} />
                            <span>Ce NFT n'est pas disponible à la vente</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats de likes et vues */}
            <div className="nft-detail-stats">
              <NFTStats
                nftId={nft.tokenId || nft.id}
                showLikes={true}
                showViews={true}
                incrementViewOnMount={true}
              />
            </div>

            {/* Description */}
            <div className="nft-description">
              <h3>Description</h3>
              <p>{nft.description}</p>
            </div>

            {/* Historique des propriétaires - Seulement pour les NFTs blockchain */}
            {!id.startsWith('local-') && (
              <div className="nft-history">
                <h3>
                  <History size={20} />
                  Historique des propriétaires
                </h3>

                {loadingHistory ? (
                  <div className="history-loading">
                    <Clock className="spinning" size={24} />
                    <span>Chargement de l'historique...</span>
                  </div>
                ) : history.length > 0 ? (
                  <div className="history-timeline">
                    {history.map((event, index) => (
                      <div key={`${event.transactionHash}-${index}`} className="history-event">
                        <div className="event-icon">
                          {event.type === 'mint' && <Zap size={16} />}
                          {event.type === 'sale' && <ShoppingBag size={16} />}
                          {event.type === 'transfer' && <ArrowUpRight size={16} />}
                          {event.type === 'listed' && <Tag size={16} />}
                        </div>

                        <div className="event-content">
                          <div className="event-header">
                            <span className="event-type">
                              {event.type === 'mint' && '🎨 Création'}
                              {event.type === 'sale' && '💰 Vente'}
                              {event.type === 'transfer' && '📤 Transfert'}
                              {event.type === 'listed' && '🏷️ Mise en vente'}
                            </span>
                            <span className="event-date">{event.date} à {event.time}</span>
                          </div>

                          <div className="event-details">
                            <div className="addresses">
                              {(() => {
                                const fromAddr = formatAddress(event.from);
                                const toAddr = formatAddress(event.to);

                                return (
                                  <>
                                    {fromAddr && fromAddr.type !== 'blockchain' && (
                                      <span className={`address-info ${fromAddr.type}`}>
                                        <User size={14} />
                                        <span className={`address ${fromAddr.type}`}>
                                          {fromAddr.display}
                                        </span>
                                      </span>
                                    )}

                                    {toAddr && (
                                      <>
                                        <ArrowUpRight size={14} />
                                        <span className={`address-info ${toAddr.type}`}>
                                          {toAddr.type === 'blockchain' && <Zap size={14} />}
                                          {toAddr.type === 'marketplace' && <ShoppingBag size={14} />}
                                          {toAddr.type === 'user' && <User size={14} />}
                                          <span className={`address ${toAddr.type}`}>
                                            {toAddr.display}
                                          </span>
                                        </span>
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {event.price && (
                              <div className="event-price">
                                <DollarSign size={14} />
                                <span>{event.price} ETH</span>
                              </div>
                            )}
                          </div>

                          <div className="event-transaction" title={`Transaction: ${event.transactionHash}`}>
                            <Hash size={12} />
                            <span className="transaction-text">Transaction</span>
                            <span className="transaction-hash">
                              {event.transactionHash.slice(0,10)}...{event.transactionHash.slice(-8)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty">
                    <History size={48} />
                    <p>Aucun historique disponible pour ce NFT</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de listing */}
        {showListingModal && (
          <div className="modal-overlay" onClick={() => setShowListingModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Mettre en vente</h2>
              <div className="modal-content">
                <label>Prix (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Ex: 2.5"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowListingModal(false)}
                >
                  Annuler
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={confirmListing}
                  disabled={!listingPrice || parseFloat(listingPrice) <= 0}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTDetail;