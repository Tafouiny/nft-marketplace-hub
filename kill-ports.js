const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Ports à vérifier et libérer
const PORTS_TO_KILL = [8080, 3000];

async function getProcessOnPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr ":${port}"`);
    const lines = stdout.trim().split('\n');
    const pids = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[2] === 'LISTENING') {
        const pid = parts[4];
        if (pid && pid !== '0' && !pids.includes(pid)) {
          pids.push(pid);
        }
      }
    }

    return pids;
  } catch (error) {
    return []; // Port libre
  }
}

async function killProcess(pid) {
  try {
    await execAsync(`taskkill /F /PID ${pid}`);
    console.log(`✅ Processus ${pid} terminé`);
    return true;
  } catch (error) {
    console.log(`⚠️  Impossible de terminer le processus ${pid}`);
    return false;
  }
}

async function killPortsIfNeeded() {
  console.log('🔍 Vérification des ports...');

  for (const port of PORTS_TO_KILL) {
    console.log(`Vérification du port ${port}...`);
    const pids = await getProcessOnPort(port);

    if (pids.length > 0) {
      console.log(`🚫 Port ${port} occupé par les processus: ${pids.join(', ')}`);

      for (const pid of pids) {
        await killProcess(pid);
      }

      // Attendre un peu que les processus se ferment
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`✅ Port ${port} libre`);
    }
  }

  console.log('🎯 Ports libérés avec succès!');
}

// Exporter pour utilisation dans d'autres scripts
module.exports = { killPortsIfNeeded, getProcessOnPort, killProcess };

// Si appelé directement
if (require.main === module) {
  killPortsIfNeeded().catch(console.error);
}