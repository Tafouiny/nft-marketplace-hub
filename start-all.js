const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 DÉMARRAGE DE TOUS LES SERVICES NFT MARKETPLACE');
console.log('==================================================\n');

// Fonction pour lancer un processus en arrière-plan
function startService(name, command, args = [], options = {}) {
  console.log(`🔄 Démarrage ${name}...`);

  const service = spawn(command, args, {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true,
    ...options
  });

  service.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  service.stderr.on('data', (data) => {
    console.error(`[${name} ERR] ${data.toString().trim()}`);
  });

  service.on('close', (code) => {
    console.log(`❌ ${name} fermé avec le code ${code}`);
  });

  service.on('error', (error) => {
    console.error(`❌ Erreur ${name}:`, error.message);
  });

  console.log(`✅ ${name} démarré (PID: ${service.pid})\n`);
  return service;
}

// Lancer les services
const services = [];

try {
  // 1. Serveur de likes et vues (port 3001) - ✅ Intégré
  const likesServer = startService(
    'Likes & Views API',
    'node',
    ['start-likes.js']
  );
  services.push({ name: 'Likes & Views API', process: likesServer });

  // Attendre un peu avant de démarrer le frontend
  setTimeout(() => {
    // 2. Serveur frontend React (port auto)
    const frontendServer = startService(
      'Frontend (Vite)',
      'npm',
      ['run', 'dev']
    );
    services.push({ name: 'Frontend (Vite)', process: frontendServer });

    console.log('📋 SERVICES DÉMARRÉS:');
    console.log('• Likes & Views API: http://localhost:3001');
    console.log('• Frontend React: Port auto-assigné (généralement 5173+)');
    console.log('\n💡 INSTRUCTIONS:');
    console.log('1. Démarrer Hardhat node: npx hardhat node');
    console.log('2. Déployer contracts: npx hardhat run scripts/deploy.js --network localhost');
    console.log('3. Créer NFTs test: npx hardhat run scripts/createAndListTestNFTs.js --network localhost');
    console.log('4. Aller sur le frontend et connecter MetaMask');
    console.log('\n🛑 Arrêter tous les services: Ctrl+C\n');

  }, 2000);

} catch (error) {
  console.error('❌ Erreur démarrage services:', error);
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt de tous les services...');

  services.forEach(({ name, process }) => {
    console.log(`🔄 Arrêt ${name}...`);
    process.kill('SIGTERM');
  });

  setTimeout(() => {
    console.log('✅ Tous les services arrêtés');
    process.exit(0);
  }, 2000);
});

// Garder le processus principal actif
process.stdin.resume();