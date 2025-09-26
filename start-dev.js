const { spawn } = require('child_process');
const { killPortsIfNeeded } = require('./kill-ports');

console.log('🚀 Démarrage de l\'environnement de développement NFT Marketplace Hub');
console.log('===================================================================');

async function startDevelopment() {
  try {
    // 1. Libérer les ports si nécessaire
    await killPortsIfNeeded();

    console.log('\n📡 Démarrage des serveurs...');

    // 2. Démarrer le serveur de likes sur le port 3000
    const likesServer = spawn('node', ['start-likes.js'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    likesServer.stdout.on('data', (data) => {
      console.log(`[LIKES] ${data.toString().trim()}`);
    });

    likesServer.stderr.on('data', (data) => {
      console.error(`[LIKES ERROR] ${data.toString().trim()}`);
    });

    // 3. Attendre un peu que le serveur de likes démarre
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Démarrer Vite sur le port 8080
    const viteServer = spawn('npx', ['vite', '--port', '8080'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    viteServer.stdout.on('data', (data) => {
      console.log(`[VITE] ${data.toString().trim()}`);
    });

    viteServer.stderr.on('data', (data) => {
      console.error(`[VITE ERROR] ${data.toString().trim()}`);
    });

    // 5. Gestion de la fermeture propre
    const cleanup = () => {
      console.log('\n🛑 Arrêt des serveurs...');

      if (likesServer) {
        likesServer.kill('SIGTERM');
        console.log('✅ Serveur de likes arrêté');
      }

      if (viteServer) {
        viteServer.kill('SIGTERM');
        console.log('✅ Serveur Vite arrêté');
      }

      process.exit(0);
    };

    // Écouter les signaux de fermeture
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Afficher les informations finales
    console.log('\n🎉 Environnement de développement démarré!');
    console.log('📱 Frontend: http://localhost:8080');
    console.log('🔌 API Likes: http://localhost:3000');
    console.log('\n💡 Utilisez Ctrl+C pour arrêter tous les serveurs');

  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error.message);
    process.exit(1);
  }
}

startDevelopment();