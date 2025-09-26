const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'likes-data.json');

// Middleware
app.use(cors({
  origin: ['http://localhost:8080'],
  credentials: true
}));
app.use(express.json());

// Initialiser le fichier de données s'il n'existe pas
if (!fs.existsSync(DATA_FILE)) {
  const initialData = { likes: {}, userLikes: {}, views: {} };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  console.log('✅ Fichier likes-data.json créé');
}

// Fonction pour lire les données
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture données:', error);
    return { likes: {}, userLikes: {}, views: {} };
  }
};

// Fonction pour écrire les données
const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur écriture données:', error);
    return false;
  }
};

// === ROUTES LIKES ===

// GET /api/likes/:nftId - Récupérer les likes d'un NFT
app.get('/api/likes/:nftId', (req, res) => {
  const { nftId } = req.params;
  const data = readData();
  res.json({
    count: data.likes[nftId] || 0
  });
});

// POST /api/likes/toggle - Basculer un like
app.post('/api/likes/toggle', (req, res) => {
  const { nftId, walletAddress } = req.body;

  if (!nftId || !walletAddress) {
    return res.status(400).json({
      success: false,
      message: 'nftId et walletAddress requis'
    });
  }

  const data = readData();
  const walletKey = walletAddress.toLowerCase();

  // Vérifier si l'utilisateur a déjà liké
  if (!data.userLikes[walletKey]) {
    data.userLikes[walletKey] = [];
  }

  const currentlyLiked = data.userLikes[walletKey].includes(nftId);

  // Mettre à jour les likes globaux
  if (currentlyLiked) {
    data.likes[nftId] = Math.max((data.likes[nftId] || 1) - 1, 0);
    data.userLikes[walletKey] = data.userLikes[walletKey].filter(id => id !== nftId);
  } else {
    data.likes[nftId] = (data.likes[nftId] || 0) + 1;
    data.userLikes[walletKey].push(nftId);
  }

  console.log(`${currentlyLiked ? '👎' : '👍'} ${walletKey.slice(0,8)}... ${currentlyLiked ? 'retiré' : 'ajouté'} like NFT ${nftId} - Total: ${data.likes[nftId]}`);

  // Sauvegarder
  if (writeData(data)) {
    res.json({
      success: true,
      liked: !currentlyLiked,
      newCount: data.likes[nftId]
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde'
    });
  }
});

// GET /api/likes/user/:walletAddress - Récupérer les likes d'un utilisateur
app.get('/api/likes/user/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const data = readData();
  const walletKey = walletAddress.toLowerCase();

  res.json({
    likes: data.userLikes[walletKey] || []
  });
});

// === ROUTES VUES ===

// GET /api/views/:nftId - Récupérer le nombre de vues d'un NFT
app.get('/api/views/:nftId', (req, res) => {
  const { nftId } = req.params;
  const data = readData();
  res.json({
    count: data.views[nftId] || 0
  });
});

// Tracker des vues récentes pour éviter les doublons
const recentViews = new Map();

// POST /api/views/increment - Incrémenter les vues d'un NFT
app.post('/api/views/increment', (req, res) => {
  const { nftId } = req.body;
  const clientIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  if (!nftId) {
    return res.status(400).json({
      success: false,
      message: 'nftId requis'
    });
  }

  // Créer une clé unique pour cette vue
  const viewKey = `${clientIP}-${nftId}`;
  const now = Date.now();

  // Vérifier si cette vue a été enregistrée récemment (dans les 10 dernières secondes)
  if (recentViews.has(viewKey)) {
    const lastView = recentViews.get(viewKey);
    if (now - lastView < 10000) { // 10 secondes
      const data = readData();
      return res.json({
        success: true,
        newCount: data.views[nftId] || 0,
        alreadyCounted: true
      });
    }
  }

  // Enregistrer cette vue
  recentViews.set(viewKey, now);

  const data = readData();

  // Incrémenter les vues
  if (!data.views) {
    data.views = {};
  }
  data.views[nftId] = (data.views[nftId] || 0) + 1;

  console.log(`👁️ Vue NFT ${nftId} (IP: ${clientIP.slice(0,10)}...) - Total: ${data.views[nftId]}`);

  // Sauvegarder
  if (writeData(data)) {
    res.json({
      success: true,
      newCount: data.views[nftId]
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde'
    });
  }
});

// Nettoyage périodique des vues récentes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentViews.entries()) {
    if (now - timestamp > 60000) { // Plus de 1 minute
      recentViews.delete(key);
    }
  }
}, 60000); // Chaque minute

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur de likes et vues démarré sur http://localhost:${PORT}`);
  console.log(`📁 Données stockées dans: ${DATA_FILE}`);
  console.log('👍 Endpoints disponibles:');
  console.log('  - GET /api/likes/:nftId');
  console.log('  - POST /api/likes/toggle');
  console.log('  - GET /api/likes/user/:walletAddress');
  console.log('  - GET /api/views/:nftId');
  console.log('  - POST /api/views/increment');
});

module.exports = app;