# 🎨 NFT Marketplace Hub

Un marketplace NFT décentralisé moderne construit avec React et Ethereum, permettant de créer, acheter et vendre des NFTs avec stockage IPFS.

## 📊 Statistiques en Temps Réel

<!-- MARKETPLACE_STATS_START -->
- **NFTs en Vente**: 0
- **Dernière Mise à Jour**: 29/09/2025 13:49:56
<!-- MARKETPLACE_STATS_END -->

## 🚀 Fonctionnalités

- ✅ **Création de NFTs** avec stockage IPFS via Pinata
- ✅ **Marketplace décentralisé** avec contrats intelligents
- ✅ **Support des catégories** (Art, Photography, Music, etc.)
- ✅ **Système de likes et vues** en temps réel
- ✅ **Portfolio personnel** avec gestion des NFTs
- ✅ **Intégration MetaMask** pour les transactions
- ✅ **Interface responsive** et moderne
- ✅ **Statistiques temps réel** de la plateforme

## 🛠️ Stack Technique

### Frontend
- **React 19** + **Vite** - Interface utilisateur moderne
- **React Router** - Navigation SPA
- **Lucide React** - Icônes élégantes
- **CSS Variables** - Theming cohérent

### Blockchain
- **Ethereum** - Blockchain principale
- **Hardhat** - Environnement de développement
- **Solidity** - Contrats intelligents
- **ethers.js v5** - Interaction blockchain

### Stockage
- **IPFS** - Stockage décentralisé des images
- **Pinata** - Gateway IPFS fiable
- **Local Storage** - Cache local des NFTs

### Backend
- **Node.js** + **Express** - API de statistiques
- **fs-extra** - Gestion des fichiers
- **CORS** - Sécurité API

## 📦 Installation

### Prérequis
- Node.js 16+
- MetaMask installé
- Git

### Configuration

1. **Cloner le projet**


2. **Installer les dépendances**
```bash
npm install
cd server && npm install && cd ..
```

3. **Démarrer Hardhat**
```bash
npx hardhat node
```

4. **Déployer les contrats**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

5. **Lancer l'application**
```bash
npm run dev
```

## 🎯 Utilisation

### Démarrage Rapide

1. **Connecter MetaMask** sur le réseau Hardhat (localhost:8545)
2. **Explorer** les NFTs existants sur la page d'accueil
3. **Créer** votre premier NFT via la page Submit
4. **Gérer** votre collection dans Portfolio

### Commandes Utiles

```bash
# Développement
npm run dev                    # Démarrer frontend + backend
npm run build                  # Build de production

# Blockchain
npx hardhat compile           # Compiler les contrats
npx hardhat test             # Tests unitaires
npx hardhat node            # Blockchain locale

# Déploiement
npx hardhat run scripts/deploy.js --network localhost
```

## 🏗️ Architecture

```
nft-marketplace-hub/
├── src/                     # Frontend React
│   ├── components/         # Composants réutilisables
│   ├── pages/             # Pages principales
│   ├── services/          # Services API
│   ├── utils/             # Utilitaires
│   └── contracts/         # Adresses des contrats
├── contracts/             # Contrats Solidity
├── scripts/              # Scripts de déploiement
├── server/               # Backend Express
└── artifacts/            # Artifacts compilés
```

## 🔧 Fonctionnalités Avancées

### Gestion des Catégories
Les NFTs sont organisés par catégories avec extraction automatique des métadonnées IPFS.

### Système de Stats
- **Vues** : Comptage automatique avec timer anti-spam
- **Likes** : Système décentralisé par wallet
- **Recommandations** : Algorithme basé sur l'engagement

### Intégration IPFS
- **Upload automatique** vers Pinata
- **Métadonnées structurées** avec attributs
- **Fallback** vers plusieurs gateways

## 🚦 Scripts de Maintenance

```bash
# Nettoyer les données locales
npx hardhat run scripts/clearLocalNFTS.js --network localhost

# Reset du marketplace
npx hardhat run scripts/resetMarketplace.js --network localhost

# Mise à jour des stats README
npm run update-readme-stats
```

## 📈 API Endpoints

- `GET /api/marketplace-stats` - Statistiques complètes
- `GET /api/nft/:id/stats` - Stats d'un NFT
- `POST /api/nft/:id/view` - Enregistrer une vue
- `POST /api/nft/:id/like` - Gérer les likes

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation dans `/docs`
- Vérifier les logs dans la console du navigateur

---

**Construit par [Tafouiny et tine29i]**

*Dernière mise à jour automatique : 29/09/2025 13:49:56*