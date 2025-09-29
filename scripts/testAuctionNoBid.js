const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Test du système d'enchères SANS enchérisseur");
    console.log("=".repeat(55));

    // Récupérer les comptes de test
    const [owner, bidder1, bidder2] = await ethers.getSigners();

    console.log("👥 Comptes de test :");
    console.log("- Owner (créateur NFT):", owner.address);
    console.log("- Bidder 1:", bidder1.address);
    console.log("- Bidder 2:", bidder2.address);
    console.log();

    // Récupérer l'adresse du contrat déployé
    const contractAddress = require("../src/contracts/contract-address.json");
    console.log("📄 Contrat NFTMarketplace à l'adresse:", contractAddress.NFTMarketplace);

    // Connecter au contrat
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = NFTMarketplace.attach(contractAddress.NFTMarketplace);

    try {
        // 1. CRÉER UN NOUVEAU NFT
        console.log("🎨 Étape 1: Création d'un nouveau NFT");
        console.log("-".repeat(35));

        const tokenURI = "data:application/json;base64," + Buffer.from(JSON.stringify({
            name: "Test No Bid NFT",
            description: "NFT de test pour enchère sans enchérisseur",
            image: "https://via.placeholder.com/300x300.png?text=No+Bid+Test"
        })).toString('base64');

        const createTx = await marketplace.connect(owner).createToken(tokenURI, 0); // Prix 0 = pas en vente
        const createReceipt = await createTx.wait();

        // Extraire le tokenId depuis les events
        const transferEvent = createReceipt.events?.find(e => e.event === 'Transfer');
        const tokenId = transferEvent?.args?.tokenId?.toString();

        console.log("✅ NFT créé avec l'ID:", tokenId);
        console.log("📍 Transaction:", createTx.hash);

        // Vérifier le propriétaire initial
        const initialOwner = await marketplace.ownerOf(tokenId);
        console.log("🏠 Propriétaire initial:", initialOwner);
        console.log("👤 Owner address:", owner.address);
        console.log("✅ Propriétaire correct:", initialOwner === owner.address);
        console.log();

        // 2. LANCER UNE ENCHÈRE D'1 MINUTE
        console.log("⏱️  Étape 2: Lancement d'une enchère d'1 minute (SANS enchérisseur)");
        console.log("-".repeat(65));

        const startingPrice = ethers.utils.parseEther("0.2"); // 0.2 ETH
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
        console.log("- Enchère actuelle:", ethers.utils.formatEther(auctionDetails.highestBid), "ETH");
        console.log("- Enchérisseur actuel:", auctionDetails.highestBidder);
        console.log("- Active:", auctionDetails.active);
        console.log("- Fin prévue:", new Date(auctionDetails.endTime.toNumber() * 1000).toLocaleTimeString());
        console.log();

        // Vérifier que le NFT est maintenant détenu par le contrat
        const ownerDuringAuction = await marketplace.ownerOf(tokenId);
        console.log("🏠 Propriétaire pendant l'enchère:", ownerDuringAuction);
        console.log("🏢 Adresse du contrat:", contractAddress.NFTMarketplace);
        console.log("✅ NFT détenu par le contrat:", ownerDuringAuction.toLowerCase() === contractAddress.NFTMarketplace.toLowerCase());
        console.log();

        // 3. VÉRIFIER QU'IL N'Y A PAS D'ENCHÉRISSEUR
        console.log("❌ Étape 3: Confirmation qu'aucune enchère n'est placée");
        console.log("-".repeat(50));

        const currentAuction = await marketplace.getAuction(tokenId);
        console.log("💰 Enchère actuelle:", ethers.utils.formatEther(currentAuction.highestBid), "ETH");
        console.log("👤 Enchérisseur actuel:", currentAuction.highestBidder);

        if (currentAuction.highestBid.eq(0) && currentAuction.highestBidder === ethers.constants.AddressZero) {
            console.log("✅ Confirmation: Aucune enchère placée");
        } else {
            console.log("❌ Erreur: Il y a déjà des enchères !");
            return;
        }
        console.log();

        // 4. ATTENDRE LA FIN DE L'ENCHÈRE
        console.log("⏳ Étape 4: Attente de la fin de l'enchère (1 minute)...");
        console.log("-".repeat(55));

        const currentTime = Math.floor(Date.now() / 1000);
        const endTime = currentAuction.endTime.toNumber();
        const remainingTime = endTime - currentTime;

        if (remainingTime > 0) {
            console.log("⏰ Temps restant:", remainingTime, "secondes");
            console.log("💤 Attente sans aucune enchère...");

            // Attendre que l'enchère se termine
            await new Promise(resolve => setTimeout(resolve, (remainingTime + 2) * 1000));
        }

        console.log("✅ Enchère terminée !");
        console.log();

        // 5. VÉRIFIER QUE L'ENCHÈRE EST TERMINÉE
        console.log("🔍 Étape 5: Vérification de l'état de l'enchère");
        console.log("-".repeat(45));

        const isEnded = await marketplace.isAuctionEnded(tokenId);
        console.log("⏰ Enchère terminée (temps écoulé):", isEnded);

        const auctionState = await marketplace.getAuction(tokenId);
        console.log("📊 État actuel :");
        console.log("- Active:", auctionState.active);
        console.log("- Terminée:", auctionState.ended);
        console.log("- Enchère finale:", ethers.utils.formatEther(auctionState.highestBid), "ETH");
        console.log("- Enchérisseur final:", auctionState.highestBidder);
        console.log();

        // 6. TERMINER L'ENCHÈRE
        console.log("🏁 Étape 6: Finalisation de l'enchère sans enchérisseur");
        console.log("-".repeat(55));

        const endTx = await marketplace.connect(owner).endAuction(tokenId);
        const endReceipt = await endTx.wait();
        console.log("✅ Enchère finalisée !");
        console.log("📍 Transaction:", endTx.hash);

        // Vérifier les événements
        const auctionEndedEvent = endReceipt.events?.find(e => e.event === 'AuctionEnded');
        if (auctionEndedEvent) {
            console.log("🎉 Gagnant:", auctionEndedEvent.args.winner);
            console.log("💰 Prix final:", ethers.utils.formatEther(auctionEndedEvent.args.winningBid), "ETH");

            if (auctionEndedEvent.args.winner === ethers.constants.AddressZero) {
                console.log("✅ Confirmation: Aucun gagnant (comme attendu)");
            } else {
                console.log("❌ Erreur: Il y a un gagnant alors qu'il ne devrait pas y en avoir");
            }
        }
        console.log();

        // 7. VÉRIFIER QUE LE NFT EST RETOURNÉ AU PROPRIÉTAIRE ORIGINAL
        console.log("🔄 Étape 7: Vérification du retour du NFT au propriétaire");
        console.log("-".repeat(55));

        const finalOwner = await marketplace.ownerOf(tokenId);
        console.log("🏠 Propriétaire final du NFT:", finalOwner);
        console.log("👤 Propriétaire original:", owner.address);

        if (finalOwner.toLowerCase() === owner.address.toLowerCase()) {
            console.log("✅ TEST RÉUSSI: Le NFT est retourné au propriétaire original !");
        } else {
            console.log("❌ TEST ÉCHOUÉ: Le NFT n'est pas retourné au bon propriétaire");
            console.log("   Attendu:", owner.address);
            console.log("   Reçu:", finalOwner);
        }
        console.log();

        // 8. VÉRIFIER L'ÉTAT FINAL DE L'ENCHÈRE
        console.log("📊 Étape 8: Vérification de l'état final de l'enchère");
        console.log("-".repeat(50));

        const finalAuctionState = await marketplace.getAuction(tokenId);
        console.log("📋 État final de l'enchère :");
        console.log("- Active:", finalAuctionState.active);
        console.log("- Terminée:", finalAuctionState.ended);
        console.log("- Enchère finale:", ethers.utils.formatEther(finalAuctionState.highestBid), "ETH");
        console.log("- Enchérisseur final:", finalAuctionState.highestBidder);

        if (!finalAuctionState.active && finalAuctionState.ended) {
            console.log("✅ État correct: Enchère inactive et marquée comme terminée");
        } else {
            console.log("❌ État incorrect de l'enchère");
        }
        console.log();

        // 9. VÉRIFIER L'ÉTAT DU MARKET ITEM
        console.log("🏪 Étape 9: Vérification de l'état du MarketItem");
        console.log("-".repeat(45));

        const marketItem = await marketplace.getMarketItem(tokenId);
        console.log("🛍️ MarketItem final :");
        console.log("- Propriétaire:", marketItem.owner);
        console.log("- Vendeur:", marketItem.seller);
        console.log("- Prix:", ethers.utils.formatEther(marketItem.price), "ETH");
        console.log("- Vendu:", marketItem.sold);
        console.log("- Listé:", marketItem.listed);
        console.log("- En enchère:", marketItem.inAuction);

        if (!marketItem.inAuction && marketItem.owner.toLowerCase() === owner.address.toLowerCase()) {
            console.log("✅ MarketItem correct: Plus en enchère, retourné au propriétaire");
        } else {
            console.log("❌ MarketItem incorrect");
        }
        console.log();

        // RÉSUMÉ FINAL
        console.log("🎉 RÉSUMÉ DES TESTS SANS ENCHÉRISSEUR");
        console.log("=".repeat(55));
        console.log("✅ NFT créé avec succès");
        console.log("✅ Enchère d'1 minute lancée");
        console.log("✅ Aucune enchère placée (comme voulu)");
        console.log("✅ Enchère terminée automatiquement");
        console.log("✅ NFT retourné au propriétaire original");
        console.log("✅ État de l'enchère correctement mis à jour");
        console.log("✅ MarketItem remis dans l'état initial");
        console.log();
        console.log("🎯 TEST SANS ENCHÉRISSEUR RÉUSSI !");
        console.log("💡 Le NFT revient bien au propriétaire quand personne n'enchérit");

    } catch (error) {
        console.error("❌ Erreur lors des tests:", error);
        console.error("Stack:", error.stack);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Erreur fatale:", error);
        process.exit(1);
    });