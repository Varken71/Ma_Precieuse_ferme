// --- 1. GESTION DE LA NAVIGATION PRINCIPALE (CARTES) ---
const cartesMenu = document.querySelectorAll('.module-card');
const vues = document.querySelectorAll('.view');

// Quand on clique sur une carte de l'accueil
cartesMenu.forEach(carte => {
  carte.addEventListener('click', () => {
    // On cache toutes les vues
    vues.forEach(v => v.classList.remove('active'));
    
    // On récupère le nom de code et on affiche la bonne vue
    const cible = carte.getAttribute('data-cible');
    document.getElementById(cible).classList.add('active');
  });
});

// Fonction pour le bouton "Retour au menu principal"
function retourAccueil() {
  vues.forEach(v => v.classList.remove('active'));
  document.getElementById('home').classList.add('active');
}


// --- 2. GESTION DE L'AFFICHAGE DYNAMIQUE DES CARTES ---
const listeModules = [
  'poules', 'jardin', 'verger', 'elevage', 'rucher', 'viande', 
  'laiterie', 'pain', 'brasserie', 'champignons', 'plantes'
];

listeModules.forEach(nomDuModule => {
  const checkbox = document.getElementById('mod-' + nomDuModule);
  const carte = document.getElementById('card-' + nomDuModule); // On cible la grosse carte
  const cleMemoire = 'memoire-' + nomDuModule;

  if (!checkbox || !carte) return;

  // Au démarrage : on vérifie la mémoire
  if (localStorage.getItem(cleMemoire) === 'false') {
    // Si l'utilisateur avait décoché avant, on cache la carte
    checkbox.checked = false;
    carte.style.display = 'none';
  } else {
    // Par défaut (ou si coché), on l'affiche (en flex pour garder le design)
    checkbox.checked = true;
    carte.style.display = 'flex';
  }

  // À l'action : quand on coche/décoche
  checkbox.addEventListener('change', () => {
    localStorage.setItem(cleMemoire, checkbox.checked);
    
    if (checkbox.checked === true) {
      carte.style.display = 'flex';
    } else {
      carte.style.display = 'none';
    }
  });
});

// --- 3. GESTION DES SOUS-MENUS (ONGLETS À L'INTÉRIEUR DES MODULES) ---

// On récupère toutes les barres de navigation locales
const navigationsLocales = document.querySelectorAll('.local-nav');

navigationsLocales.forEach(nav => {
  const boutonsOnglets = nav.querySelectorAll('.tab-btn');
  
  boutonsOnglets.forEach(bouton => {
    bouton.addEventListener('click', () => {
      
      // 1. On identifie dans quel grand module on se trouve (ex: Poulailler)
      const moduleParent = bouton.closest('.view');
      
      // 2. On éteint tous les boutons de ce sous-menu précis
      boutonsOnglets.forEach(b => b.classList.remove('active'));
      // Et on allume celui qu'on vient de cliquer
      bouton.classList.add('active');
      
      // 3. On cache toutes les "sous-vues" de ce module
      const toutesLesSousVues = moduleParent.querySelectorAll('.sous-vue');
      toutesLesSousVues.forEach(sv => sv.classList.remove('active'));
      
      // 4. On affiche la sous-vue qui correspond au bouton cliqué
      const cible = bouton.getAttribute('data-cible');
      document.getElementById(cible).classList.add('active');
      
    });
  });
});

// --- 4. ACTIONS DES BOUTONS : MODULE POULAILLER ---

const btnAjouterPoule = document.getElementById('btn-ajouter-poule');

if (btnAjouterPoule) {
  btnAjouterPoule.addEventListener('click', () => {
    
    const inputId = document.getElementById('poule-id');
    const inputNom = document.getElementById('poule-nom');
    const inputRace = document.getElementById('poule-race');
    const selectCouleur = document.getElementById('poule-couleur');
    const inputDate = document.getElementById('poule-date');
    const inputFournisseur = document.getElementById('poule-fournisseur');
    const inputParents = document.getElementById('poule-parents');
    const inputPrix = document.getElementById('poule-prix');
    const selectStatut = document.getElementById('poule-statut');

    if (inputNom.value.trim() === '') {
      alert('Erreur : Le nom de la poule est obligatoire !');
      return; 
    }

    // On fabrique l'objet avec ou sans ID
    const pouleData = {
      nom: inputNom.value.trim(),
      race: inputRace.value.trim() || 'Inconnue',
      couleurOeuf: selectCouleur.value,
      dateArrivee: inputDate.value,
      fournisseur: inputFournisseur.value.trim(),
      parents: inputParents.value.trim(),
      prixAchat: parseFloat(inputPrix.value) || 0,
      statut: selectStatut.value,
      cumulPonte: 0, 
      cumulVendu: 0
    };

    // Si on a un ID caché, c'est une modification, on l'ajoute à l'objet
    if (inputId.value !== "") {
      pouleData.id = parseInt(inputId.value);
    }

    // --- On gère l'enregistrement dans IndexedDB directement ici ---
    const transaction = db.transaction(['poules'], 'readwrite');
    const store = transaction.objectStore('poules');
    
    let requete;
    if (pouleData.id) {
      requete = store.put(pouleData); // 'put' met à jour ou crée si ça n'existe pas
    } else {
      requete = store.add(pouleData); // 'add' crée toujours une nouvelle entrée
    }

    requete.onsuccess = () => {
      afficherPoulesDB(); // On rafraîchit le tableau
      
      // On nettoie le formulaire
      inputId.value = '';
      inputNom.value = '';
      inputRace.value = '';
      inputDate.value = '';
      inputFournisseur.value = '';
      inputParents.value = '';
      inputPrix.value = '';
      
      // On remet le bouton par défaut
      btnAjouterPoule.innerText = "Enregistrer la poule";
    };
  });
}

// --- 5. SIMULATEUR COMPLET DU POULAILLER ---

const btnAddRace = document.getElementById('btn-add-sim-race');
const btnClearSim = document.getElementById('btn-clear-sim');
const tbodySim = document.getElementById('sim-table-body');
const trEmpty = document.getElementById('sim-empty-row');
const canvasDeclin = document.getElementById('canvas-declin');

function calculerBilanSimulateur() {
  // --- 1. Lecture du Cheptel ---
  let nbPoules = 0;
  let productionOeufs = 0;
  let esperanceMax = 0;
  
  const lignes = tbodySim ? tbodySim.querySelectorAll('tr.sim-row') : [];
  lignes.forEach(tr => {
    nbPoules += parseInt(tr.dataset.qty) || 0;
    productionOeufs += parseInt(tr.dataset.oeufs) || 0;
    const vie = parseInt(tr.dataset.vie) || 0;
    if (vie > esperanceMax) esperanceMax = vie;
  });

  if(document.getElementById('sim-total-qte')) document.getElementById('sim-total-qte').innerText = nbPoules;
  if(document.getElementById('sim-total-oeufs')) document.getElementById('sim-total-oeufs').innerText = productionOeufs;

  // --- 2. Calcul par Saison (40%, 30%, 20%, 10%) ---
  const pTotal = Math.round(productionOeufs * 0.40);
  const eTotal = Math.round(productionOeufs * 0.30);
  const aTotal = Math.round(productionOeufs * 0.20);
  const hTotal = Math.round(productionOeufs * 0.10);
  
  // Mise à jour des grandes cases de la Boîte 4
  if(document.getElementById('sim-saison-printemps')) document.getElementById('sim-saison-printemps').innerText = pTotal;
  if(document.getElementById('sim-saison-ete')) document.getElementById('sim-saison-ete').innerText = eTotal;
  if(document.getElementById('sim-saison-automne')) document.getElementById('sim-saison-automne').innerText = aTotal;
  if(document.getElementById('sim-saison-hiver')) document.getElementById('sim-saison-hiver').innerText = hTotal;
  
  // Mise à jour du pied de tableau de la Boîte 3 (C'est ici que ça bloquait !)
  const tdSaisons = document.getElementById('sim-total-saisons');
  if (tdSaisons) {
    tdSaisons.innerHTML = `🌸 ${pTotal} <br> ☀️ ${eTotal} <br> 🍂 ${aTotal} <br> ❄️ ${hTotal}`;
  }

  // --- 3. Lecture des Besoins du Foyer ---
  const profilElem = document.getElementById('sim-profil');
  const profil = profilElem ? profilElem.value : '4';
  const nbPersonnes = parseInt(document.getElementById('sim-personnes')?.value) || 1;
  let oeufsParSemaine = 0;
  
  const customConsoDiv = document.getElementById('sim-custom-conso-div');
  if (profil === 'custom') {
    if(customConsoDiv) customConsoDiv.style.display = 'block';
    oeufsParSemaine = parseInt(document.getElementById('sim-custom-conso')?.value) || 0;
  } else {
    if(customConsoDiv) customConsoDiv.style.display = 'none';
    oeufsParSemaine = parseInt(profil) * nbPersonnes;
  }
  const besoinsAnnuels = oeufsParSemaine * 52;

 // --- 4. Calcul Financier & ROI ---
  const prixCommerce = parseFloat(document.getElementById('sim-prix')?.value) || 0;
  const prixVenteSurplus = parseFloat(document.getElementById('sim-prix-vente')?.value) || 0;
  const coutEntretienBase = parseFloat(document.getElementById('sim-cout')?.value) || 87;
  const investissement = parseFloat(document.getElementById('sim-investissement')?.value) || 0;

  // Calcul exact : Besoins Foyer x Prix commerce
  let economieBrute = besoinsAnnuels * prixCommerce; 
  let surplus = productionOeufs > besoinsAnnuels ? productionOeufs - besoinsAnnuels : 0;
  let ventesSurplus = surplus * prixVenteSurplus;
  let totalEntretien = nbPoules * coutEntretienBase;
  
  let beneficeNet = economieBrute + ventesSurplus - totalEntretien;

  // Calcul du ROI (Taux et Temps)
  let tauxROI = 0;
  let tempsROI = "Jamais (Déficit)";

  if (investissement > 0 && beneficeNet > 0) {
    tauxROI = (beneficeNet / investissement) * 100;
    let annees = investissement / beneficeNet;
    
    if (annees < 1) {
      // Si c'est moins d'un an, on affiche en mois
      let mois = Math.ceil(annees * 12);
      tempsROI = mois + " mois";
    } else {
      // Sinon on affiche en années (avec 1 chiffre après la virgule)
      tempsROI = annees.toFixed(1) + " ans";
    }
  } else if (investissement === 0 && beneficeNet > 0) {
    tauxROI = 100;
    tempsROI = "Immédiat";
  } else if (beneficeNet <= 0) {
    tauxROI = 0;
    tempsROI = "À perte";
  }

  // Mise à jour de l'affichage classique
  if(document.getElementById('res-besoins')) document.getElementById('res-besoins').innerText = besoinsAnnuels;
  if(document.getElementById('res-production')) document.getElementById('res-production').innerText = productionOeufs;
  if(document.getElementById('res-economie-brute')) document.getElementById('res-economie-brute').innerText = economieBrute.toFixed(2);
  if(document.getElementById('res-surplus')) document.getElementById('res-surplus').innerText = surplus;
  if(document.getElementById('res-ventes')) document.getElementById('res-ventes').innerText = ventesSurplus.toFixed(2);
  if(document.getElementById('res-cout-total')) document.getElementById('res-cout-total').innerText = totalEntretien.toFixed(2);
  if(document.getElementById('res-economie-nette')) document.getElementById('res-economie-nette').innerText = beneficeNet.toFixed(2);

  // Mise à jour de l'affichage ROI
  if(document.getElementById('res-taux-roi')) document.getElementById('res-taux-roi').innerText = tauxROI.toFixed(1);
  if(document.getElementById('res-temps-roi')) document.getElementById('res-temps-roi').innerText = tempsROI;

  // --- 5. Tableau Vert (Coûts d'entretien) ---
  const santeUnitaire = 15; 
  const delta = coutEntretienBase - 87; 
  let nourritureUnitaire = Math.max(0, 48 + delta * (4 / 9));
  let litiereUnitaire = Math.max(0, 24 + delta * (5 / 9));

  if(document.getElementById('sim-cout-nourriture')) document.getElementById('sim-cout-nourriture').innerText = (nourritureUnitaire * nbPoules).toFixed(2);
  if(document.getElementById('sim-cout-litiere')) document.getElementById('sim-cout-litiere').innerText = (litiereUnitaire * nbPoules).toFixed(2);
  if(document.getElementById('sim-cout-sante')) document.getElementById('sim-cout-sante').innerText = (santeUnitaire * nbPoules).toFixed(2);
  if(document.getElementById('sim-cout-total2')) document.getElementById('sim-cout-total2').innerText = totalEntretien.toFixed(2);

  // --- 6. Graphique ---
  dessinerGraphiqueDeclin(productionOeufs, esperanceMax);
}

// Fonction pour dessiner le graphique
function dessinerGraphiqueDeclin(productionInitiale, annees) {
  if (!canvasDeclin) return;
  const ctx = canvasDeclin.getContext('2d');
  
  // On efface l'ancien dessin
  ctx.clearRect(0, 0, canvasDeclin.width, canvasDeclin.height);
  
  if (productionInitiale === 0 || annees === 0) return;

  const padding = 40;
  const largeurGraphe = canvasDeclin.width - padding * 2;
  const hauteurGraphe = canvasDeclin.height - padding * 2;

  // Calcul du déclin (100% ans 1 et 2, puis -15% par an)
  let donnees = [];
  for (let i = 1; i <= annees; i++) {
    let ratio = i <= 2 ? 1 : 1 - ((i - 2) * 0.15);
    if (ratio < 0) ratio = 0;
    donnees.push(Math.round(productionInitiale * ratio));
  }

  const maxVal = productionInitiale * 1.1; // Pour ne pas coller au plafond

  // Dessin des axes
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvasDeclin.height - padding);
  ctx.lineTo(canvasDeclin.width - padding, canvasDeclin.height - padding);
  ctx.strokeStyle = '#e0cc9d';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dessin de la ligne
  ctx.beginPath();
  donnees.forEach((valeur, index) => {
    const x = padding + (index * (largeurGraphe / (annees - 1 || 1)));
    const y = (canvasDeclin.height - padding) - ((valeur / maxVal) * hauteurGraphe);
    
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#e8a33d';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Dessin des points et du texte
  donnees.forEach((valeur, index) => {
    const x = padding + (index * (largeurGraphe / (annees - 1 || 1)));
    const y = (canvasDeclin.height - padding) - ((valeur / maxVal) * hauteurGraphe);
    
    // Le point
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#c9863f';
    ctx.fill();

    // Le texte de la valeur (nb œufs) au-dessus
    ctx.fillStyle = '#4a3728';
    ctx.font = 'bold 12px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(valeur, x, y - 15);

    // L'année en bas
    ctx.fillText('An ' + (index + 1), x, canvasDeclin.height - padding + 20);
  });
}

// --- Écouteurs d'événements ---

if (btnAddRace) {
  btnAddRace.addEventListener('click', () => {
    const select = document.getElementById('sim-race-select');
    const option = select.options[select.selectedIndex];
    const qty = parseInt(document.getElementById('sim-race-qty').value) || 1;
    
    // Extraction des attributs HTML
    const ponte = parseInt(option.getAttribute('data-ponte'));
    const vie = parseInt(option.getAttribute('data-vie'));
    const couleurText = option.getAttribute('data-couleur');
    const codeCouleur = option.getAttribute('data-codecouleur');
    
    const nomRace = option.text.split(' (')[0];
    const totalOeufsRace = qty * ponte;

    if(trEmpty) trEmpty.style.display = 'none';

    // Création de la ligne avec bouton supprimer
    const tr = document.createElement('tr');
    tr.className = 'sim-row';
    tr.dataset.qty = qty;
    tr.dataset.oeufs = totalOeufsRace;
    tr.dataset.vie = vie;
    
    // Calcul des saisons pour cette ligne
    const p = Math.round(totalOeufsRace * 0.40);
    const e = Math.round(totalOeufsRace * 0.30);
    const a = Math.round(totalOeufsRace * 0.20);
    const h = Math.round(totalOeufsRace * 0.10);

    tr.innerHTML = `
      <td style="padding: 10px;"><b>${qty}</b></td>
      <td style="padding: 10px;"><b>${nomRace}</b></td>
      <td style="padding: 10px; font-weight:bold; color:var(--accent-dark);">${totalOeufsRace}</td>
      <td style="padding: 10px; font-size:11px; color:var(--text2); line-height: 1.4;">
        🌸 ${p} <br> ☀️ ${e} <br> 🍂 ${a} <br> ❄️ ${h}
      </td>
      <td style="padding: 10px;">
        <span style="display:inline-block; width:12px; height:12px; background:${codeCouleur}; border-radius:50%; border:1px solid #ccc; vertical-align:middle; margin-right:5px;"></span>
        <span style="font-size:12px;">${couleurText}</span>
      </td>
      <td style="padding: 10px; font-size:12px;">${vie} ans</td>
      <td style="padding: 10px; text-align:right;">
        <button class="btn-danger btn-sm" onclick="this.closest('tr').remove(); calculerBilanSimulateur();">X</button>
      </td>
    `;
    tbodySim.appendChild(tr);
    calculerBilanSimulateur();
  });
}

if (btnClearSim) {
  btnClearSim.addEventListener('click', () => {
    const lignes = tbodySim.querySelectorAll('tr.sim-row');
    lignes.forEach(l => l.remove());
    if(trEmpty) trEmpty.style.display = 'table-row';
    calculerBilanSimulateur();
  });
}

// Mise à jour en direct lors de la saisie
const champsFinances = ['sim-personnes', 'sim-profil', 'sim-custom-conso', 'sim-prix', 'sim-prix-vente', 'sim-cout', 'sim-investissement'];
champsFinances.forEach(id => {
  const champ = document.getElementById(id);
  if (champ) {
    champ.addEventListener('input', calculerBilanSimulateur);
    champ.addEventListener('change', calculerBilanSimulateur);
  }
});

// =====================================================================
// 7. ACTIONS DES BOUTONS : PONTES ET STOCK
// =====================================================================

const inputPonteDate = document.getElementById('ponte-date');
if(inputPonteDate) {
  inputPonteDate.valueAsDate = new Date();
}

// 🌟 L'automate écoute le menu déroulant pour remplir la couleur !
const selectPoule = document.getElementById('ponte-poule');
const inputCouleur = document.getElementById('ponte-couleur');

if (selectPoule && inputCouleur) {
  selectPoule.addEventListener('change', () => {
    const optionChoisie = selectPoule.options[selectPoule.selectedIndex];
    
    if (optionChoisie && optionChoisie.value !== "") {
      // On va chercher la donnée cachée dans l'option (ex: Chocolat)
      inputCouleur.value = optionChoisie.getAttribute('data-couleur');
    } else {
      inputCouleur.value = "";
    }
  });
}

// Quand on clique sur Enregistrer la ponte
const btnAjouterPonte = document.getElementById('btn-ajouter-ponte');

if (btnAjouterPonte) {
  btnAjouterPonte.addEventListener('click', () => {
    
    const date = document.getElementById('ponte-date').value;
    const optionChoisie = selectPoule.options[selectPoule.selectedIndex];
    
    if (!optionChoisie || optionChoisie.value === "") {
      alert("Veuillez choisir une poule ou le lot global.");
      return;
    }

    const nomPoule = optionChoisie.value;
    const race = optionChoisie.getAttribute('data-race');
    const couleur = optionChoisie.getAttribute('data-couleur');
    const qte = parseInt(document.getElementById('ponte-qte').value) || 0;
    const com = document.getElementById('ponte-commentaire').value.trim();

    if (qte <= 0) {
      alert("La quantité récoltée doit être d'au moins 1 œuf.");
      return;
    }

    const nouvellePonte = {
      date: date,
      nomPoule: nomPoule,
      race: race,
      couleur: couleur,
      quantite: qte,
      commentaire: com
    };

    if (typeof ajouterPonteDB === 'function') {
      ajouterPonteDB(nouvellePonte);
      
      // On vide juste la quantité et le com
      document.getElementById('ponte-qte').value = 1;
      document.getElementById('ponte-commentaire').value = '';
    }
  });
}

// =====================================================================
// 8. ACTIONS : VENTES
// =====================================================================

const inputVenteDate = document.getElementById('vente-date');
if(inputVenteDate) inputVenteDate.valueAsDate = new Date();

// Calcul automatique du prix total
const inputVenteQte = document.getElementById('vente-qte');
const inputVentePrix = document.getElementById('vente-prix');
const inputVenteTotal = document.getElementById('vente-total');

function calculerTotalVente() {
  if (inputVenteQte && inputVentePrix && inputVenteTotal) {
    const qte = parseInt(inputVenteQte.value) || 0;
    const prix = parseFloat(inputVentePrix.value) || 0;
    inputVenteTotal.value = (qte * prix).toFixed(2);
  }
}

if (inputVenteQte) inputVenteQte.addEventListener('input', calculerTotalVente);
if (inputVentePrix) inputVentePrix.addEventListener('input', calculerTotalVente);

// Enregistrer la vente
const btnAjouterVente = document.getElementById('btn-ajouter-vente');
if (btnAjouterVente) {
  btnAjouterVente.addEventListener('click', () => {
    
    const date = document.getElementById('vente-date').value;
    const client = document.getElementById('vente-client').value.trim();
    const typeOeuf = document.getElementById('vente-race').value;
    const qte = parseInt(document.getElementById('vente-qte').value) || 0;
    const total = parseFloat(document.getElementById('vente-total').value) || 0;

    if (client === "") { alert("Le nom du client est obligatoire."); return; }
    if (typeOeuf === "") { alert("Veuillez choisir quel type d'œuf vous vendez depuis le stock."); return; }
    if (qte <= 0) { alert("La quantité doit être supérieure à 0."); return; }

    const nouvelleVente = {
      date: date,
      client: client,
      typeOeuf: typeOeuf,
      quantite: qte,
      total: total
    };

    if (typeof ajouterVenteDB === 'function') {
      ajouterVenteDB(nouvelleVente);
      
      // On vide le client et on remet à 6 œufs par défaut
      document.getElementById('vente-client').value = '';
      document.getElementById('vente-qte').value = 6;
      calculerTotalVente();
    }
  });
}

// =====================================================================
// 9. ACTIONS : CONSOMMATION PERSONNELLE
// =====================================================================

const inputConsoDate = document.getElementById('conso-date');
if(inputConsoDate) inputConsoDate.valueAsDate = new Date();

// Calcul automatique de l'économie réalisée
const inputConsoQte = document.getElementById('conso-qte');
const inputConsoPrix = document.getElementById('conso-prix');
const inputConsoTotal = document.getElementById('conso-total');

function calculerTotalConso() {
  if (inputConsoQte && inputConsoPrix && inputConsoTotal) {
    const qte = parseInt(inputConsoQte.value) || 0;
    const prix = parseFloat(inputConsoPrix.value) || 0;
    inputConsoTotal.value = (qte * prix).toFixed(2);
  }
}

if (inputConsoQte) inputConsoQte.addEventListener('input', calculerTotalConso);
if (inputConsoPrix) inputConsoPrix.addEventListener('input', calculerTotalConso);

// Enregistrer la consommation
const btnAjouterConso = document.getElementById('btn-ajouter-conso');
if (btnAjouterConso) {
  btnAjouterConso.addEventListener('click', () => {
    
    const date = document.getElementById('conso-date').value;
    const typeOeuf = document.getElementById('conso-race').value;
    const qte = parseInt(document.getElementById('conso-qte').value) || 0;
    const economie = parseFloat(document.getElementById('conso-total').value) || 0;

    if (typeOeuf === "") { alert("Veuillez choisir quel type d'œuf vous consommez depuis le stock."); return; }
    if (qte <= 0) { alert("La quantité doit être supérieure à 0."); return; }

    const nouvelleConso = {
      date: date,
      typeOeuf: typeOeuf,
      quantite: qte,
      economie: economie
    };

    if (typeof ajouterConsoDB === 'function') {
      ajouterConsoDB(nouvelleConso);
      
      // On remet à 2 œufs par défaut (pour la prochaine omelette !)
      document.getElementById('conso-qte').value = 2;
      calculerTotalConso();
    }
  });
}

// =====================================================================
// 10. ACTIONS : COÛTS D'ENTRETIEN
// =====================================================================
const inputCoutDate = document.getElementById('cout-date');
if(inputCoutDate) inputCoutDate.valueAsDate = new Date();

const btnAjouterCout = document.getElementById('btn-ajouter-cout');
if (btnAjouterCout) {
  btnAjouterCout.addEventListener('click', () => {
    const date = document.getElementById('cout-date').value;
    const categorie = document.getElementById('cout-categorie').value;
    const montant = parseFloat(document.getElementById('cout-montant').value) || 0;
    const desc = document.getElementById('cout-desc').value.trim();

    if (montant <= 0) { alert("Le montant doit être supérieur à 0."); return; }

    if (typeof ajouterCoutDB === 'function') {
      ajouterCoutDB({ date: date, categorie: categorie, montant: montant, description: desc });
      document.getElementById('cout-desc').value = ''; // On vide juste la description
    }
  });
}

// =====================================================================
// 11. ACTIONS : INVESTISSEMENTS MATÉRIELS
// =====================================================================
const inputInvestDate = document.getElementById('invest-date');
if(inputInvestDate) inputInvestDate.valueAsDate = new Date();

const btnAjouterInvest = document.getElementById('btn-ajouter-invest');
if (btnAjouterInvest) {
  btnAjouterInvest.addEventListener('click', () => {
    const date = document.getElementById('invest-date').value;
    const objet = document.getElementById('invest-objet').value.trim();
    const montant = parseFloat(document.getElementById('invest-montant').value) || 0;

    if (objet === "") { alert("Veuillez renseigner le matériel."); return; }
    if (montant <= 0) { alert("Le montant doit être supérieur à 0."); return; }

    if (typeof ajouterInvestDB === 'function') {
      ajouterInvestDB({ date: date, objet: objet, montant: montant });
      document.getElementById('invest-objet').value = '';
    }
  });
}

// =====================================================================
// 12. ACTIONS : RAFRAÎCHISSEMENT DE LA RENTABILITÉ RÉELLE
// =====================================================================

// On repère le bouton de l'onglet Rentabilité
const btnOngletRenta = document.querySelector('[data-cible="poules-renta"]');

if (btnOngletRenta) {
  btnOngletRenta.addEventListener('click', () => {
    // À chaque fois qu'on clique dessus, on demande à la base de données de recalculer
    if (typeof calculerRentabiliteReelleDB === 'function') {
      calculerRentabiliteReelleDB();
    }
  });
}

// On force aussi le calcul une fois au démarrage de l'appli au cas où
window.addEventListener('load', () => {
  if (typeof calculerRentabiliteReelleDB === 'function') {
    // On met un petit délai de 1 seconde pour être sûr que la base est bien connectée
    setTimeout(calculerRentabiliteReelleDB, 1000); 
  }
});