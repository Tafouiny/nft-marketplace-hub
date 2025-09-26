import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Layout/Header/Header.jsx';

// Pages
import Welcome from './pages/Welcome/Welcome.jsx';
import Explore from './pages/Explore/Explore.jsx';
import SubmitNFT from './pages/SubmitNFT/SubmitNFT.jsx';
import NFTDetail from './pages/NFTDetail/NFTDetail.jsx';
import Portfolio from './pages/Portfolio/Portfolio.jsx';
import TestIPFS from './pages/TestIPFS/TestIPFS.jsx';
import DiagnosticTest from './pages/DiagnosticTest/DiagnosticTest.jsx';

// Context pour gérer l'état des NFTs et wallet
const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Composant Provider pour l'état global
const AppProvider = ({ children }) => {
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Vérifier si MetaMask est déjà connecté au chargement
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
        }
      } catch (error) {
        console.error('Erreur vérification connexion:', error);
      }
    }
  };

  // Connexion MetaMask réelle
  const handleConnect = async () => {
    console.log('🚀 handleConnect appelé');

    // Vérifier si MetaMask est installé
    if (typeof window.ethereum === 'undefined') {
      alert('❌ MetaMask n\'est pas installé !\n\nVeuillez installer MetaMask pour utiliser cette application.\n\n👉 Rendez-vous sur https://metamask.io/');
      return;
    }

    // Empêcher les connexions multiples simultanées
    if (isConnecting) {
      console.log('⏳ Connexion déjà en cours, veuillez patienter...');
      alert('⏳ Connexion en cours...\n\nVeuillez patienter ou vérifier votre portefeuille MetaMask.');
      return;
    }

    setIsConnecting(true);

    try {
      console.log('📱 Demande de connexion à MetaMask...');
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
        
        // Vérifier qu'on est sur le bon réseau (Hardhat = chainId 1337)
        const chainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        if (chainId !== '0x539') { // 1337 en hex
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x539' }],
            });
          } catch (switchError) {
            // Si le réseau n'existe pas, l'ajouter
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x539',
                  chainName: 'Hardhat Local',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['http://127.0.0.1:8545'],
                }]
              });
            }
          }
        }
        
        setWalletAddress(accounts[0]);
        setIsWalletConnected(true);
        console.log('✅ Wallet connecté avec succès !');
        console.log('📍 Adresse:', accounts[0]);
        console.log('🌐 Réseau:', chainId);
        console.log('🔥 État isWalletConnected:', true);

      } catch (error) {
        console.error('❌ Erreur de connexion:', error);

        // Gestion spécifique des erreurs courantes
        let userMessage = '';

        if (error.code === -32002) {
          userMessage = '⏳ Demande de connexion en attente\n\nVeuillez vérifier votre portefeuille MetaMask et approuver la demande de connexion.';
        } else if (error.code === 4001) {
          userMessage = '❌ Connexion refusée\n\nVous avez refusé la connexion. Cliquez sur "Connecter" pour réessayer.';
        } else if (error.message && error.message.includes('User rejected')) {
          userMessage = '❌ Connexion annulée\n\nVous avez annulé la connexion à MetaMask.';
        } else if (error.message && error.message.includes('Already processing')) {
          userMessage = '⏳ Traitement en cours\n\nVeuillez patienter, une demande est déjà en cours de traitement.';
        } else {
          userMessage = `❌ Erreur de connexion\n\n${error.message || 'Erreur inconnue'}\n\nVeuillez réessayer ou vérifier votre installation MetaMask.`;
        }

        alert(userMessage);
      } finally {
        setIsConnecting(false);
      }
  };

  const handleDisconnect = async () => {
    setWalletAddress('');
    setIsWalletConnected(false);
    
    // Optionnel : Demander à MetaMask de supprimer la permission
    try {
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      });
    } catch (error) {
      // Ne pas bloquer si cette méthode n'est pas supportée
      console.log('Révocation des permissions non supportée');
    }
    
    console.log('Wallet déconnecté');
  };

  // Écouter les changements de compte et réseau
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
        } else {
          handleDisconnect();
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        console.log('Changement de réseau:', chainId);
        // Recharger la page pour éviter les problèmes de cache
        window.location.reload();
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const value = {
    isWalletConnected,
    walletAddress,
    selectedNFT,
    setSelectedNFT,
    handleConnect,
    handleDisconnect,
    isConnecting
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Composant de protection des routes privées
const PrivateRoute = ({ children }) => {
  const { isWalletConnected } = useAppContext();
  return isWalletConnected ? children : <Navigate to="/" replace />;
};

// Composant principal de l'app
function App() {
  return (
    <Router>
      <AppProvider>
        <div className="app">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/submit" element={
                <PrivateRoute>
                  <SubmitNFT />
                </PrivateRoute>
              } />
              <Route path="/nft/:id" element={<NFTDetail />} />
              <Route path="/test-ipfs" element={<TestIPFS />} />
              <Route path="/diagnostic" element={<DiagnosticTest />} />
              <Route
                path="/portfolio"
                element={
                  <PrivateRoute>
                    <Portfolio />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </Router>
  );
}

export default App;