import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { useAppContext } from '../../../App';
import { Menu, X, Wallet, LogOut, Copy, Check } from 'lucide-react';

const WalletButton = () => {
  const { isWalletConnected, walletAddress, handleConnect, handleDisconnect } = useAppContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erreur copie:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isWalletConnected) {
    return (
      <button className="wallet-button" onClick={handleConnect}>
        <Wallet size={18} />
        <span>Connecter</span>
      </button>
    );
  }

  return (
    <div className="wallet-connected">
      <button 
        className="wallet-button wallet-button-connected"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Wallet size={18} />
        <span>{formatAddress(walletAddress)}</span>
      </button>
      
      {showDropdown && (
        <div className="wallet-dropdown">
          <div className="wallet-info">
            <div className="wallet-address-full">{walletAddress}</div>
            <div className="wallet-network">Hardhat Local</div>
          </div>
          <button className="wallet-dropdown-item" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copié!' : 'Copier l\'adresse'}</span>
          </button>
          <button 
            className="wallet-dropdown-item disconnect" 
            onClick={() => {
              handleDisconnect();
              setShowDropdown(false);
            }}
          >
            <LogOut size={16} />
            <span>Déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const { isWalletConnected } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="header">
        <nav className="header-nav container">
          <Link 
            to="/"
            className="header-logo gradient-text"
          >
            NFT Hub
          </Link>

          {/* Desktop Menu */}
          <div className="header-desktop-menu">
            {isWalletConnected && (
              <Link
                to="/portfolio"
                className="header-link"
              >
                Mon Portfolio
              </Link>
            )}
            <WalletButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="header-mobile-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-content">
          <button 
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
          
          <nav className="mobile-menu-nav">
            {isWalletConnected && (
              <Link
                to="/portfolio"
                className="mobile-menu-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Mon Portfolio
              </Link>
            )}
            <div className="mobile-menu-wallet">
              <WalletButton />
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Header;