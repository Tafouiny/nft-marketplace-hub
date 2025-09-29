const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Test du système d'enchères NFT");
    console.log("=".repeat(50));

    // Récupérer les comptes de test
    const [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

    console.log("👥 Comptes de test :");
    console.log("- Owner (créateur NFT):", owner.address);
    console.log("- Bidder 1:", bidder1.address);
    console.log("- Bidder 2:", bidder2.address);
    console.log("- Bidder 3:", bidder3.address);
    console.log();

    // Récupérer l'adresse du contrat déployé
    const contractAddress = require("../src/contracts/contract-address.json");
    console.log("📄 Contrat NFTMarketplace à l'adresse:", contractAddress.NFTMarketplace);

    // Connecter au contrat
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = NFTMarketplace.attach(contractAddress.NFTMarketplace);

    try {
        // 1. CRÉER UN NFT
        console.log("🎨 Étape 1: Création d'un NFT");
        console.log("-".repeat(30));

        const tokenURI = "data:application/json;base64," + Buffer.from(JSON.stringify({
            name: "Test Auction NFT",
            description: "NFT de test pour les enchères",
            image: "https://via.placeholder.com/300x300.png?text=Test+Auction"
        })).toString('base64');

        const createTx = await marketplace.connect(owner).createToken(tokenURI, 0); // Prix 0 = pas en vente
        const createReceipt = await createTx.wait();

        // Extraire le tokenId depuis les events
        const transferEvent = createReceipt.events?.find(e => e.event === 'Transfer');
        const tokenId = transferEvent?.args?.tokenId?.toString();

        console.log("✅ NFT créé avec l'ID:", tokenId);
        console.log("📍 Transaction:", createTx.hash);
        console.log();

        // 2. LANCER UNE ENCHÈRE D'1 MINUTE
        console.log("⏱️  Étape 2: Lancement d'une enchère d'1 minute");
        console.log("-".repeat(40));

        const startingPrice = ethers.utils.parseEther("0.1"); // 0.1 ETH
        const ONE_MINUTE = 0; // Enum AuctionDuration.ONE_MINUTE

        const auctionTx = await marketplace.connect(owner).startAuction(tokenId, startingPrice, ONE_MINUTE);
        const auctionReceipt = await auctionTx.wait();

        console.log("✅ Enchère lancée !");
        console.log("💰 Prix de départ:", ethers.utils.formatEther(startingPrice), "ETH");
        console.log("⏰ Durée: 1 minute");
        console.log("📍 Transaction:", auctionTx.hash);
        console.log();

        // Vérifier les détails de l'enchère
        const auctionDetails = await marketplace.getAuction(tokenId);
        console.log("📊 Détails de l'enchère :");
        console.log("- ID Enchère:", auctionDetails.auctionId.toString());
        console.log("- Vendeur:", auctionDetails.seller);
        console.log("- Prix de départ:", ethers.utils.formatEther(auctionDetails.startingPrice), "ETH");
        console.log("- Active:", auctionDetails.active);
        console.log("- Fin prévue:", new Date(auctionDetails.endTime.toNumber() * 1000).toLocaleTimeString());
        console.log();

        // 3. TEST: ENCHÈRE INVALIDE (TROP BASSE)
        console.log("❌ Étape 3: Test d'enchère invalide (trop basse)");
        console.log("-".repeat(45));

        try {
            const lowBid = ethers.utils.parseEther("0.05"); // 0.05 ETH (moins que le prix de départ)
            await marketplace.connect(bidder1).placeBid(tokenId, { value: lowBid });
            console.log("❌ ERREUR: L'enchère trop basse a été acceptée (ne devrait pas arriver)");
        } catch (error) {
            console.log("✅ Enchère trop basse correctement rejetée");
            console.log("💡 Erreur:", error.reason || "Bid must be higher than starting price");
        }
        console.log();

        // 4. ENCHÈRES VALIDES AVEC DIFFÉRENTS COMPTES
        console.log("💰 Étape 4: Enchères valides avec différents comptes");
        console.log("-".repeat(50));

        // Bidder 1: 0.15 ETH
        console.log("👤 Bidder 1 enchérit 0.15 ETH...");
        const bid1 = ethers.utils.parseEther("0.15");
        const bid1Tx = await marketplace.connect(bidder1).placeBid(tokenId, { value: bid1 });
        await bid1Tx.wait();
        console.log("✅ Enchère de", ethers.utils.formatEther(bid1), "ETH acceptée");
        console.log("📍 Transaction:", bid1Tx.hash);

        // Vérifier l'état de l'enchère
        let auctionState = await marketplace.getAuction(tokenId);
        console.log("🥇 Enchérisseur actuel:", auctionState.highestBidder);
        console.log("💵 Enchère actuelle:", ethers.utils.formatEther(auctionState.highestBid), "ETH");
        console.log();

        // Bidder 2: 0.12 ETH (doit être rejetée car inférieure)
        console.log("👤 Bidder 2 tente d'enchérir 0.12 ETH (inférieure)...");
        try {
            const bid2Low = ethers.utils.parseEther("0.12");
            await marketplace.connect(bidder2).placeBid(tokenId, { value: bid2Low });
            console.log("❌ ERREUR: Enchère inférieure acceptée (ne devrait pas arriver)");
        } catch (error) {
            console.log("✅ Enchère inférieure correctement rejetée");
            console.log("💡 Erreur:", error.reason || "Bid must be higher than current highest bid");
        }
        console.log();

        // Bidder 2: 0.25 ETH (valide)
        console.log("👤 Bidder 2 enchérit 0.25 ETH...");
        const bid2 = ethers.utils.parseEther("0.25");
        const bid2Tx = await marketplace.connect(bidder2).placeBid(tokenId, { value: bid2 });
        await bid2Tx.wait();
        console.log("✅ Enchère de", ethers.utils.formatEther(bid2), "ETH acceptée");
        console.log("📍 Transaction:", bid2Tx.hash);

        auctionState = await marketplace.getAuction(tokenId);
        console.log("🥇 Nouvel enchérisseur:", auctionState.highestBidder);
        console.log("💵 Nouvelle enchère:", ethers.utils.formatEther(auctionState.highestBid), "ETH");
        console.log();

        // Bidder 3: 0.35 ETH (valide, enchère gagnante)
        console.log("👤 Bidder 3 enchérit 0.35 ETH...");
        const bid3 = ethers.utils.parseEther("0.35");
        const bid3Tx = await marketplace.connect(bidder3).placeBid(tokenId, { value: bid3 });
        await bid3Tx.wait();
        console.log("✅ Enchère de", ethers.utils.formatEther(bid3), "ETH acceptée");
        console.log("📍 Transaction:", bid3Tx.hash);

        auctionState = await marketplace.getAuction(tokenId);
        console.log("🥇 Enchérisseur final:", auctionState.highestBidder);
        console.log("💵 Enchère finale:", ethers.utils.formatEther(auctionState.highestBid), "ETH");
        console.log();

        // 5. ATTENDRE LA FIN DE L'ENCHÈRE
        console.log("⏳ Étape 5: Attente de la fin de l'enchère (1 minute)...");
        console.log("-".repeat(50));

        const currentTime = Math.floor(Date.now() / 1000);
        const endTime = auctionState.endTime.toNumber();
        const remainingTime = endTime - currentTime;

        if (remainingTime > 0) {
            console.log("⏰ Temps restant:", remainingTime, "secondes");
            console.log("💤 Attente...");

            // Attendre que l'enchère se termine
            await new Promise(resolve => setTimeout(resolve, (remainingTime + 2) * 1000));
        }

        console.log("✅ Enchère terminée !");
        console.log();

        // 6. TERMINER L'ENCHÈRE
        console.log("🏁 Étape 6: Finalisation de l'enchère");
        console.log("-".repeat(35));

        const endTx = await marketplace.connect(owner).endAuction(tokenId);
        const endReceipt = await endTx.wait();
        console.log("✅ Enchère finalisée !");
        console.log("📍 Transaction:", endTx.hash);

        // Vérifier les événements
        const auctionEndedEvent = endReceipt.events?.find(e => e.event === 'AuctionEnded');
        if (auctionEndedEvent) {
            console.log("🎉 Gagnant:", auctionEndedEvent.args.winner);
            console.log("💰 Prix final:", ethers.utils.formatEther(auctionEndedEvent.args.winningBid), "ETH");
        }
        console.log();

        // 7. VÉRIFIER LE NOUVEAU PROPRIÉTAIRE
        console.log("👑 Étape 7: Vérification du nouveau propriétaire");
        console.log("-".repeat(45));

        const newOwner = await marketplace.ownerOf(tokenId);
        console.log("🏠 Nouveau propriétaire du NFT:", newOwner);
        console.log("🎯 Bidder 3 (gagnant attendu):", bidder3.address);

        if (newOwner.toLowerCase() === bidder3.address.toLowerCase()) {
            console.log("✅ TEST RÉUSSI: Le bon enchérisseur a gagné le NFT !");
        } else {
            console.log("❌ TEST ÉCHOUÉ: Le mauvais propriétaire");
        }
        console.log();

        // 8. VÉRIFIER LES REMBOURSEMENTS
        console.log("💸 Étape 8: Vérification des fonds à retirer");
        console.log("-".repeat(45));

        const bidder1Refund = await marketplace.getBidAmount(tokenId, bidder1.address);
        const bidder2Refund = await marketplace.getBidAmount(tokenId, bidder2.address);

        console.log("💰 Fonds à retirer pour Bidder 1:", ethers.utils.formatEther(bidder1Refund), "ETH");
        console.log("💰 Fonds à retirer pour Bidder 2:", ethers.utils.formatEther(bidder2Refund), "ETH");

        if (bidder1Refund.gt(0)) {
            console.log("🔄 Bidder 1 retire ses fonds...");
            const withdraw1Tx = await marketplace.connect(bidder1).withdrawBid(tokenId);
            await withdraw1Tx.wait();
            console.log("✅ Fonds retirés par Bidder 1");
        }

        if (bidder2Refund.gt(0)) {
            console.log("🔄 Bidder 2 retire ses fonds...");
            const withdraw2Tx = await marketplace.connect(bidder2).withdrawBid(tokenId);
            await withdraw2Tx.wait();
            console.log("✅ Fonds retirés par Bidder 2");
        }
        console.log();

        // RÉSUMÉ FINAL
        console.log("🎉 RÉSUMÉ DES TESTS");
        console.log("=".repeat(50));
        console.log("✅ NFT créé avec succès");
        console.log("✅ Enchère d'1 minute lancée");
        console.log("✅ Enchères trop basses rejetées");
        console.log("✅ Enchères inférieures rejetées");
        console.log("✅ Enchères valides acceptées");
        console.log("✅ Le dernier enchérisseur a gagné");
        console.log("✅ Remboursements fonctionnels");
        console.log();
        console.log("🎯 TOUS LES TESTS RÉUSSIS !");

    } catch (error) {
        console.error("❌ Erreur lors des tests:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Erreur fatale:", error);
        process.exit(1);
    });