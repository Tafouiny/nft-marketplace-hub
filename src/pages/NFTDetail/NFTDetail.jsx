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
  CheckCircle,
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
  Hash,
  Gavel
} from 'lucide-react';
import { useAppContext } from '../../App';
import { getNFTDetails, withdrawNFT, listNFTForSale, buyNFT, getNFTHistory, startAuction, endAuction, placeBid, getRealTokenOwner } from '../../utils/contract';
import { getSubmittedNFTs, updateSubmittedNFT } from '../../utils/storage';
import { getNFTStats, incrementNFTViews, toggleNFTLike } from '../../services/statsService';
import { getNFTImageUrl } from '../../utils/ipfsHelpers';
import { ethers } from 'ethers';
import contractAddresses from '../../contracts/contract-address.json';

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
  const [stats, setStats] = useState({ views: 0, likes: 0, likedBy: [] });
  const [isLiked, setIsLiked] = useState(false);

  // États pour les enchères
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [auctionStartingPrice, setAuctionStartingPrice] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('0'); // 0 = 1 minute par défaut

  // États pour enchérir
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');

  // État pour la vraie propriété blockchain
  const [realTokenOwner, setRealTokenOwner] = useState(null);

  // Charger le NFT et son historique
  useEffect(() => {
    loadNFTDetails();
    loadNFTHistory();
    loadNFTStats();
    loadRealTokenOwner();
  }, [id, selectedNFT]);

  // Charger la vraie propriété blockchain
  const loadRealTokenOwner = async () => {
    if (!id.startsWith('local-')) {
      try {
        const tokenId = parseInt(id);
        const owner = await getRealTokenOwner(tokenId);
        setRealTokenOwner(owner);
        console.log('Vrai propriétaire du token', tokenId, ':', owner);
        console.log('Wallet utilisateur:', walletAddress);
      } catch (error) {
        console.error('Erreur chargement propriétaire réel:', error);
      }
    }
  };

  // Charger les stats du NFT
  const loadNFTStats = async () => {
    if (!id) return;

    const nftStats = await getNFTStats(id);
    setStats(nftStats);

    // Vérifier si l'utilisateur actuel a liké
    if (walletAddress && nftStats.likedBy) {
      setIsLiked(nftStats.likedBy.includes(walletAddress));
    }

    // Incrémenter les vues
    await incrementNFTViews(id, walletAddress);
  };

  // Gérer les likes
  const handleLike = async () => {
    if (!isWalletConnected || !walletAddress) {
      alert('Connectez votre wallet pour liker ce NFT');
      return;
    }

    const result = await toggleNFTLike(id, walletAddress);

    if (result.success) {
      setStats(prev => ({ ...prev, likes: result.likes }));
      setIsLiked(result.isLiked);
    }
  };

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
    // Pour NFTs blockchain: vérifier la vraie propriété selon la blockchain
    (walletAddress && realTokenOwner && walletAddress.toLowerCase() === realTokenOwner.toLowerCase())
  );

  // Debug: afficher les informations de propriété
  console.log('=== DEBUG PROPRIÉTÉ NFT ===');
  console.log('NFT ID:', id);
  console.log('Wallet utilisateur:', walletAddress);
  console.log('Vrai propriétaire blockchain:', realTokenOwner);
  console.log('NFT owner (marketplace):', nft?.owner);
  console.log('NFT seller:', nft?.seller);
  console.log('NFT forSale:', nft?.forSale);
  console.log('isOwner calculé:', isOwner);
  console.log('=========================');

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
    // 1. Vérifications préliminaires MetaMask
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask n\'est pas installé');
    }

    // Vérifier que MetaMask est connecté
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length === 0) {
      throw new Error('MetaMask n\'est pas connecté');
    }

    // Vérifier le réseau (chainId 1337 pour Hardhat)
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== '0x539') {
      throw new Error(`Mauvais réseau. Connectez-vous au réseau Hardhat (chainId: 1337)`);
    }

    console.log('✅ Vérifications MetaMask OK');

    // Créer un provider et signer d'abord
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Importer l'adresse et ABI du contrat
    const contractAddresses = await import('../../contracts/contract-address.json');
    const { abi } = await import('../../../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json');

    // Créer le contrat avec le signer
    const contract = new ethers.Contract(contractAddresses.NFTMarketplace, abi, signer);

    // Tests de diagnostic
    console.log('Test: Récupération prix listing...');
    let listingPrice;
    try {
      listingPrice = await contract.getListingPrice();
      console.log('Prix listing:', ethers.utils.formatEther(listingPrice), 'ETH');
    } catch (priceError) {
      console.error('Erreur getListingPrice:', priceError);
      throw new Error('Impossible de récupérer le prix de listing. Vérifiez que Hardhat node est en marche et que MetaMask est sur le bon réseau.');
    }

    const balance = await signer.getBalance();
    console.log('Solde:', ethers.utils.formatEther(balance), 'ETH');

    // Vérifier si le NFT a déjà une URI IPFS (cas moderne)
    let tokenURI;

    if (nft.ipfsTokenURI && nft.ipfsTokenURI.startsWith('ipfs://')) {
      console.log('✅ NFT a déjà une URI IPFS:', nft.ipfsTokenURI);
      tokenURI = nft.ipfsTokenURI;
    } else {
      console.log('⚠️ Pas d\'URI IPFS, fallback vers base64');

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

      tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
    }

    const price = salePrice ? ethers.utils.parseEther(salePrice) : 0;

    console.log('TokenURI final length:', tokenURI.length);

    // Vérifier la taille du TokenURI pour éviter les erreurs de gas
    if (tokenURI.length > 20000) {
      console.warn('TokenURI très long:', tokenURI.length, 'caractères');
      const confirm = window.confirm(`Attention: TokenURI très long (${tokenURI.length} caractères).\nCela va coûter beaucoup de gas.\nContinuer quand même ?`);
      if (!confirm) return;
    }

    // Configuration de transaction plus sûre
    let txOptions = {
      value: listingPrice
    };

    // Estimation du gas d'abord
    try {
      const estimatedGas = await contract.estimateGas.createToken(tokenURI, price, {
        value: listingPrice
      });

      // Ajouter une marge de 20% au gas estimé
      const gasLimit = estimatedGas.mul(120).div(100);

      // Plafonner à 5M de gas pour éviter les erreurs MetaMask
      const maxGas = ethers.BigNumber.from(5000000);
      txOptions.gasLimit = gasLimit.gt(maxGas) ? maxGas : gasLimit;

      console.log('Gas estimé:', estimatedGas.toString());
      console.log('Gas limit utilisé:', txOptions.gasLimit.toString());

    } catch (gasError) {
      console.warn('Estimation gas échouée, utilisation valeur par défaut:', gasError);
      txOptions.gasLimit = 3000000; // Valeur par défaut plus conservative
    }

    const transaction = await contract.createToken(tokenURI, price, txOptions);

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

    let errorMessage = 'Erreur inconnue';

    if (error.code === -32603) {
      errorMessage = '❌ Erreur de réseau blockchain\n\nVérifiez que:\n• Hardhat node est en marche\n• MetaMask est connecté au bon réseau\n• Vous avez assez d\'ETH pour le gas';
    } else if (error.code === 4001) {
      errorMessage = '❌ Transaction annulée par l\'utilisateur';
    } else if (error.message?.includes('insufficient funds')) {
      errorMessage = '❌ Fonds insuffisants\n\nVous n\'avez pas assez d\'ETH pour payer les frais de transaction.';
    } else if (error.message?.includes('gas')) {
      errorMessage = '❌ Erreur de gas\n\nLe NFT est peut-être trop volumineux. Essayez avec l\'image placeholder.';
    } else if (error.message?.includes('reverted')) {
      errorMessage = '❌ Transaction rejetée par le contrat\n\nVérifiez que le prix et les paramètres sont valides.';
    } else {
      errorMessage = `❌ Erreur: ${error.message || error.toString()}`;
    }

    alert(errorMessage);
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

  // Gérer l'ouverture du modal d'enchères
  const handleStartAuction = () => {
    if (!isWalletConnected) {
      alert('Connectez votre wallet pour lancer une enchère');
      return;
    }
    setShowAuctionModal(true);
  };

  // Confirmer et lancer l'enchère
  const handleConfirmAuction = async () => {
    if (!auctionStartingPrice || parseFloat(auctionStartingPrice) <= 0) {
      alert('Veuillez entrer un prix de départ valide');
      return;
    }

    // Vérifier si le NFT est en vente - si oui, il faut d'abord le retirer
    if (nft.forSale && !nft.sold) {
      const needWithdraw = window.confirm(
        `Ce NFT est actuellement en vente. Il faut d'abord le retirer de la vente avant de le mettre aux enchères.\n\nVoulez-vous le retirer automatiquement ?`
      );

      if (!needWithdraw) return;

      try {
        console.log('Retrait du NFT de la vente avant enchère...');
        await withdrawNFT(nft.tokenId);
        alert('NFT retiré de la vente avec succès !');

        // Attendre un peu et recharger les détails
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadNFTDetails();
        await loadRealTokenOwner();

      } catch (error) {
        console.error('Erreur retrait vente:', error);
        alert('Erreur lors du retrait de la vente. Veuillez réessayer.');
        return;
      }
    }

    const confirmMessage = `Lancer une enchère pour "${nft.name}" ?\n\nPrix de départ: ${auctionStartingPrice} ETH\nDurée: ${getDurationText(auctionDuration)}\n\nCette action nécessite des frais de gas.`;
    if (!window.confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      console.log('Lancement de l\'enchère:', {
        tokenId: nft.tokenId,
        startingPrice: auctionStartingPrice,
        duration: auctionDuration,
        realOwner: realTokenOwner,
        userWallet: walletAddress
      });

      // Appeler la fonction startAuction du contrat
      const result = await startAuction(nft.tokenId, auctionStartingPrice, parseInt(auctionDuration));

      alert(`🎯 Enchère lancée avec succès !\n\nPrix de départ: ${auctionStartingPrice} ETH\nDurée: ${getDurationText(auctionDuration)}\n\nTransaction: ${result.transactionHash}`);

      setShowAuctionModal(false);
      setAuctionStartingPrice('');
      setAuctionDuration('0');

      // Recharger les détails du NFT
      loadNFTDetails();
      loadRealTokenOwner();

    } catch (error) {
      console.error('Erreur lancement enchère:', error);
      alert('Erreur lors du lancement de l\'enchère: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Obtenir le texte de la durée
  const getDurationText = (duration) => {
    switch (duration) {
      case '0': return '1 minute';
      case '1': return '5 minutes';
      case '2': return '10 minutes';
      case '3': return '30 minutes';
      default: return '1 minute';
    }
  };

  // Gérer l'enchère d'un visiteur
  const handlePlaceBid = () => {
    if (!isWalletConnected) {
      alert('Connectez votre wallet pour enchérir');
      return;
    }
    setBidAmount('');
    setShowBidModal(true);
  };

  // Confirmer l'enchère
  const handleConfirmBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    const minimumBid = nft.highestBid && parseFloat(nft.highestBid) > 0
      ? parseFloat(nft.highestBid)
      : parseFloat(nft.startingPrice || nft.price || 0);

    if (parseFloat(bidAmount) <= minimumBid) {
      alert(`Votre enchère doit être supérieure à ${minimumBid} ETH`);
      return;
    }

    const confirmMessage = `Placer une enchère de ${bidAmount} ETH pour "${nft.name}" ?\n\nEnchère minimale: ${minimumBid} ETH\n\nCette action nécessite des frais de gas.`;
    if (!window.confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      console.log('Placement de l\'enchère:', {
        tokenId: nft.tokenId,
        bidAmount: bidAmount
      });

      // Appeler la fonction placeBid du contrat
      await placeBid(nft.tokenId, bidAmount);

      alert(`🎯 Enchère de ${bidAmount} ETH placée avec succès !`);

      setShowBidModal(false);
      setBidAmount('');

      // Recharger les détails du NFT
      loadNFTDetails();

    } catch (error) {
      console.error('Erreur placement enchère:', error);
      alert('Erreur lors du placement de l\'enchère: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Finaliser une enchère (pour le propriétaire)
  const handleEndAuction = async () => {
    if (!window.confirm(`Finaliser l'enchère pour "${nft.name}" ?`)) return;

    setIsProcessing(true);
    try {
      console.log('Finalisation de l\'enchère:', { tokenId: nft.tokenId });

      // Appeler la fonction endAuction du contrat
      await endAuction(nft.tokenId);

      alert(`🎯 Enchère finalisée avec succès !`);

      // Recharger les détails du NFT
      loadNFTDetails();

    } catch (error) {
      console.error('Erreur finalisation enchère:', error);
      alert('Erreur lors de la finalisation de l\'enchère: ' + (error.message || 'Erreur inconnue'));
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
                src={getNFTImageUrl(nft) || 'https://via.placeholder.com/400x400/e5e7eb/9ca3af?text=No+Image'}
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

              {/* Statistiques du NFT */}
              <div className="nft-stats">
                <div className="stats-row">
                  <button className="stat-item like-button" onClick={handleLike}>
                    <Heart
                      size={20}
                      fill={isLiked ? '#EF4444' : 'none'}
                      color={isLiked ? '#EF4444' : '#64748b'}
                    />
                    <span>{stats.likes} J'aime</span>
                  </button>
                  <div className="stat-item">
                    <Eye size={20} color="#64748b" />
                    <span>{stats.views} Vues</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Prix et actions */}
            <div className="price-section">
              {/* Afficher le prix seulement si le NFT est en vente */}
              {nft.forSale && !nft.sold && (
                <div className="price-info">
                  <span className="price-label">Prix</span>
                  <div className="price-value">
                    <DollarSign size={24} />
                    <span className="price-amount">{nft.price || 0}</span>
                    <span className="price-currency">ETH</span>
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
                        {nft.inAuction ? (
                          // NFT en enchères - proposer de retirer
                          (() => {
                            const isExpired = nft.endTime && Math.floor(Date.now() / 1000) > nft.endTime;
                            return (
                              <div className="auction-owner-actions">
                                {isExpired ? (
                                  <button
                                    className="btn btn-primary btn-large"
                                    onClick={handleEndAuction}
                                    disabled={isProcessing}
                                  >
                                    <Gavel size={20} />
                                    Finaliser l'enchère
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-secondary btn-large"
                                    onClick={() => alert('Fonctionnalité "Annuler enchère" à implémenter')}
                                    disabled={isProcessing}
                                  >
                                    <Gavel size={20} />
                                    Retirer des enchères
                                  </button>
                                )}
                              </div>
                            );
                          })()
                        ) : nft.forSale && !nft.sold ? (
                          <button
                            className="btn btn-secondary btn-large"
                            onClick={handleWithdrawFromSale}
                            disabled={isProcessing}
                          >
                            Retirer de la vente
                          </button>
                        ) : (
                          <div className="owner-sell-actions">
                            <button
                              className="btn btn-primary btn-large"
                              onClick={handleListForSale}
                              disabled={isProcessing}
                            >
                              <Tag size={20} />
                              Mettre en vente
                            </button>
                            <button
                              className="btn btn-secondary btn-large"
                              onClick={handleStartAuction}
                              disabled={isProcessing}
                            >
                              <Gavel size={20} />
                              Vendre aux enchères
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // VISITEUR
                      <div className="buyer-actions">
                        {nft.inAuction ? (
                          // NFT en enchères - proposer d'enchérir
                          (() => {
                            const isExpired = nft.endTime && Math.floor(Date.now() / 1000) > nft.endTime;
                            if (isExpired) {
                              return (
                                <div className="auction-expired">
                                  <AlertCircle size={20} />
                                  <span>Cette enchère est expirée</span>
                                </div>
                              );
                            } else {
                              return (
                                <button
                                  className="btn btn-primary btn-large"
                                  onClick={handlePlaceBid}
                                  disabled={isProcessing}
                                >
                                  <Gavel size={20} />
                                  {isProcessing ? 'Enchère en cours...' : 'Enchérir'}
                                </button>
                              );
                            }
                          })()
                        ) : nft.forSale ? (
                          <button
                            className="btn btn-primary btn-large"
                            onClick={handleBuyNFT}
                            disabled={isProcessing}
                          >
                            <ShoppingCart size={20} />
                            {isProcessing ? 'Achat en cours...' : 'Acheter maintenant'}
                          </button>
                        ) : (
                          <div className="not-for-sale">
                            <AlertCircle size={20} />
                            <span>Ce NFT n'est pas en vente</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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

        {/* Modal d'enchères */}
        {showAuctionModal && (
          <div className="modal-overlay" onClick={() => setShowAuctionModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>
                <Gavel size={24} />
                Lancer une enchère
              </h2>
              <div className="modal-content">
                <div className="auction-form">
                  <div className="form-group">
                    <label>Prix de départ (ETH)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Ex: 1.0"
                      value={auctionStartingPrice}
                      onChange={(e) => setAuctionStartingPrice(e.target.value)}
                    />
                    <small>Le prix minimum pour commencer les enchères</small>
                  </div>

                  <div className="form-group">
                    <label>Durée de l'enchère</label>
                    <select
                      value={auctionDuration}
                      onChange={(e) => setAuctionDuration(e.target.value)}
                      className="duration-select"
                    >
                      <option value="0">1 minute</option>
                      <option value="1">5 minutes</option>
                      <option value="2">10 minutes</option>
                      <option value="3">30 minutes</option>
                    </select>
                    <small>Durée pendant laquelle les utilisateurs peuvent enchérir</small>
                  </div>

                  <div className="auction-summary">
                    <div className="summary-item">
                      <Clock size={16} />
                      <span>Durée: {getDurationText(auctionDuration)}</span>
                    </div>
                    <div className="summary-item">
                      <DollarSign size={16} />
                      <span>Prix de départ: {auctionStartingPrice || '0'} ETH</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAuctionModal(false)}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmAuction}
                  disabled={!auctionStartingPrice || parseFloat(auctionStartingPrice) <= 0 || isProcessing}
                >
                  {isProcessing ? 'Lancement...' : 'Lancer l\'enchère'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'enchère pour visiteurs */}
        {showBidModal && (
          <div className="modal-overlay" onClick={() => setShowBidModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>
                <Gavel size={24} />
                Placer une enchère
              </h2>

              <div className="bid-nft-info">
                <img
                  src={getNFTImageUrl(nft) || '/placeholder-nft.jpg'}
                  alt={nft.name}
                  className="bid-nft-image"
                />
                <div className="bid-nft-details">
                  <h3>{nft.name}</h3>
                  <p>Token ID: #{nft.tokenId || nft.id}</p>
                  <p>
                    Enchère minimum: {' '}
                    {nft.highestBid && parseFloat(nft.highestBid) > 0
                      ? `${nft.highestBid} ETH`
                      : `${nft.startingPrice || nft.price} ETH`}
                  </p>
                </div>
              </div>

              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="bidAmount">Votre enchère (ETH)</label>
                  <input
                    id="bidAmount"
                    type="number"
                    step="0.001"
                    min="0"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="0.000"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBidModal(false)}
                  disabled={isProcessing}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmBid}
                  disabled={!bidAmount || parseFloat(bidAmount) <= 0 || isProcessing}
                >
                  {isProcessing ? 'Enchère en cours...' : `Enchérir ${bidAmount || '0'} ETH`}
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