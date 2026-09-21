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

// Variable globale pour transmettre les prévisions à la page Rentabilité
window.previsionsSimulateur = null; 

function calculerBilanSimulateur() {
  const lignes = tbodySim ? tbodySim.querySelectorAll('tr.sim-row') : [];
  
  let esperanceMax = 0;
  lignes.forEach(tr => {
    const vie = parseInt(tr.dataset.vie) || 0;
    const anneeAchat = parseInt(tr.dataset.annee) || 1;
    if ((anneeAchat + vie - 1) > esperanceMax) esperanceMax = (anneeAchat + vie - 1);
  });

  const updateSelect = (id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const oldVal = select.value;
    let html = '<option value="moyenne">Moyenne Lissée</option>';
    for (let i = 1; i <= esperanceMax; i++) { html += `<option value="${i}">Année ${i}</option>`; }
    select.innerHTML = html;
    if (select.querySelector(`option[value="${oldVal}"]`)) select.value = oldVal;
  };
  updateSelect('sim-bilan-annee');
  updateSelect('comp-bilan-annee');

  let projsParAn = {};
  for(let i = 1; i <= esperanceMax; i++) { projsParAn[i] = { poules: 0, oeufs: 0, p: 0, e: 0, a: 0, h: 0 }; }
  
  let lotsPourGraphe = [];
  let sommeOeufsTotale = 0, sommePoulesTotale = 0;
  let sommeP = 0, sommeE = 0, sommeA = 0, sommeH = 0;

  lignes.forEach(tr => {
    const qte = parseInt(tr.dataset.qty) || 0;
    const oeufsAn1 = parseInt(tr.dataset.oeufs) || 0;
    const pBase = parseInt(tr.dataset.printemps) || 0;
    const eBase = parseInt(tr.dataset.ete) || 0;
    const aBase = parseInt(tr.dataset.automne) || 0;
    const hBase = parseInt(tr.dataset.hiver) || 0;
    const vie = parseInt(tr.dataset.vie) || 0;
    const anneeAchat = parseInt(tr.dataset.annee) || 1;

    let oeufsSurSaVie = 0, pVie = 0, eVie = 0, aVie = 0, hVie = 0;
    
    for (let i = 1; i <= vie; i++) {
      let agePoule = i;
      let anneeCalendrier = anneeAchat + i - 1;
      let ratio = agePoule <= 2 ? 1 : 1 - ((agePoule - 2) * 0.15);
      if (ratio < 0) ratio = 0;
      
      let production = Math.round(oeufsAn1 * ratio);
      let prodP = Math.round(pBase * ratio);
      let prodE = Math.round(eBase * ratio);
      let prodA = Math.round(aBase * ratio);
      let prodH = Math.round(hBase * ratio);
      
      oeufsSurSaVie += production;
      pVie += prodP; eVie += prodE; aVie += prodA; hVie += prodH;

      if(projsParAn[anneeCalendrier]) {
        projsParAn[anneeCalendrier].poules += qte;
        projsParAn[anneeCalendrier].oeufs += production;
        projsParAn[anneeCalendrier].p += prodP;
        projsParAn[anneeCalendrier].e += prodE;
        projsParAn[anneeCalendrier].a += prodA;
        projsParAn[anneeCalendrier].h += prodH;
      }
    }
    sommeOeufsTotale += (vie > 0 ? oeufsSurSaVie / vie : 0);
    sommeP += (vie > 0 ? pVie / vie : 0);
    sommeE += (vie > 0 ? eVie / vie : 0);
    sommeA += (vie > 0 ? aVie / vie : 0);
    sommeH += (vie > 0 ? hVie / vie : 0);
    
    lotsPourGraphe.push({ oeufs: oeufsAn1, anneeAchat: anneeAchat, vie: vie, qte: qte });
  });

  for(let i = 1; i <= esperanceMax; i++) { sommePoulesTotale += projsParAn[i].poules; }
  const moyenneOeufs = esperanceMax > 0 ? sommeOeufsTotale : 0;
  const moyennePoules = esperanceMax > 0 ? (sommePoulesTotale / esperanceMax) : 0;

  window.previsionsSimulateur = { projs: projsParAn, moyenneOeufs, moyennePoules, esperanceMax };

  const choixAnnee = document.getElementById('sim-bilan-annee')?.value || "moyenne";
  
  let poulesActives = 0, productionOeufs = 0;
  let pTotal = 0, eTotal = 0, aTotal = 0, hTotal = 0;

  if (choixAnnee === "moyenne") {
    poulesActives = moyennePoules;
    productionOeufs = Math.round(moyenneOeufs);
    pTotal = Math.round(sommeP);
    eTotal = Math.round(sommeE);
    aTotal = Math.round(sommeA);
    hTotal = Math.round(sommeH);
  } else {
    poulesActives = projsParAn[choixAnnee]?.poules || 0;
    productionOeufs = projsParAn[choixAnnee]?.oeufs || 0;
    pTotal = projsParAn[choixAnnee]?.p || 0;
    eTotal = projsParAn[choixAnnee]?.e || 0;
    aTotal = projsParAn[choixAnnee]?.a || 0;
    hTotal = projsParAn[choixAnnee]?.h || 0;
  }

  // ---- LA NOUVELLE LOGIQUE DE COÛTS DE JORDAN ----
  const valNourriture = parseFloat(document.getElementById('sim-input-nourriture')?.value) || 45;
  const valLitiere = parseFloat(document.getElementById('sim-input-litiere')?.value) || 20;
  const valSoins = parseFloat(document.getElementById('sim-input-soins')?.value) || 15;

  let coutsParAn = {};
  let sommeCoutsNourriture = 0, sommeCoutsLitiere = 0, sommeCoutsSoins = 0;

  for(let i = 1; i <= esperanceMax; i++) {
    let n = projsParAn[i].poules;
    let cN = 0, cL = 0, cS = 0;
    if (n > 0) {
      cN = valNourriture * n;
      cL = valLitiere + (8 * n);
      if (i === 1) { 
        cS = (valSoins + 10) + (5 * n);
      } else {
        cS = valSoins + (3 * n);
      }
    }
    coutsParAn[i] = { cN, cL, cS, total: cN + cL + cS };
    sommeCoutsNourriture += cN;
    sommeCoutsLitiere += cL;
    sommeCoutsSoins += cS;
  }

  let coutNourriture = 0, coutLitiere = 0, coutSoins = 0, entretienTotal = 0;
  if (choixAnnee === "moyenne") {
    if (esperanceMax > 0) {
      coutNourriture = sommeCoutsNourriture / esperanceMax;
      coutLitiere = sommeCoutsLitiere / esperanceMax;
      coutSoins = sommeCoutsSoins / esperanceMax;
      entretienTotal = coutNourriture + coutLitiere + coutSoins;
    }
  } else {
    coutNourriture = coutsParAn[choixAnnee]?.cN || 0;
    coutLitiere = coutsParAn[choixAnnee]?.cL || 0;
    coutSoins = coutsParAn[choixAnnee]?.cS || 0;
    entretienTotal = coutsParAn[choixAnnee]?.total || 0;
  }
  // ------------------------------------------------

  if(document.getElementById('sim-total-qte')) document.getElementById('sim-total-qte').innerText = Math.round(poulesActives);
  if(document.getElementById('sim-total-oeufs')) document.getElementById('sim-total-oeufs').innerText = productionOeufs;

  const tdSaisons = document.getElementById('sim-total-saisons');
  if (tdSaisons) tdSaisons.innerHTML = `🌸 ${pTotal} <br> ☀️ ${eTotal} <br> 🍂 ${aTotal} <br> ❄️ ${hTotal}`;

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
  const besoinsAnnuels = (poulesActives > 0) ? (oeufsParSemaine * 52) : 0; 

  const prixCommerce = parseFloat(document.getElementById('sim-prix')?.value) || 0;
  const prixVenteSurplus = parseFloat(document.getElementById('sim-prix-vente')?.value) || 0;
  const investissement = parseFloat(document.getElementById('sim-investissement')?.value) || 0;

  let economieBrute = besoinsAnnuels * prixCommerce; 
  let surplus = productionOeufs > besoinsAnnuels ? productionOeufs - besoinsAnnuels : 0;
  let ventesSurplus = surplus * prixVenteSurplus;
  let beneficeNet = economieBrute + ventesSurplus - entretienTotal;
  let coutUnitaireOeuf = productionOeufs > 0 ? (entretienTotal / productionOeufs) : 0;

  let tauxROI = 0; let tempsROI = "Jamais (Déficit)";
  if (investissement > 0 && beneficeNet > 0) {
    tauxROI = (beneficeNet / investissement) * 100;
    let annees = investissement / beneficeNet;
    tempsROI = annees < 1 ? Math.ceil(annees * 12) + " mois" : annees.toFixed(1) + " ans";
  } else if (investissement === 0 && beneficeNet > 0) {
    tauxROI = 100; tempsROI = "Immédiat";
  } else if (beneficeNet <= 0) {
    tauxROI = 0; tempsROI = "À perte";
  }

  if(document.getElementById('res-besoins')) document.getElementById('res-besoins').innerText = besoinsAnnuels;
  if(document.getElementById('res-production')) document.getElementById('res-production').innerText = productionOeufs;
  if(document.getElementById('res-economie-brute')) document.getElementById('res-economie-brute').innerText = economieBrute.toFixed(2);
  if(document.getElementById('res-surplus')) document.getElementById('res-surplus').innerText = surplus;
  if(document.getElementById('res-ventes')) document.getElementById('res-ventes').innerText = ventesSurplus.toFixed(2);
  if(document.getElementById('res-cout-total')) document.getElementById('res-cout-total').innerText = entretienTotal.toFixed(2);
  if(document.getElementById('res-cout-oeuf')) document.getElementById('res-cout-oeuf').innerText = coutUnitaireOeuf.toFixed(2);
  if(document.getElementById('res-economie-nette')) document.getElementById('res-economie-nette').innerText = beneficeNet.toFixed(2);
  if(document.getElementById('res-taux-roi')) document.getElementById('res-taux-roi').innerText = tauxROI.toFixed(1);
  if(document.getElementById('res-temps-roi')) document.getElementById('res-temps-roi').innerText = tempsROI;

  if(document.getElementById('sim-cout-nourriture')) document.getElementById('sim-cout-nourriture').innerText = coutNourriture.toFixed(2);
  if(document.getElementById('sim-cout-litiere')) document.getElementById('sim-cout-litiere').innerText = coutLitiere.toFixed(2);
  if(document.getElementById('sim-cout-sante')) document.getElementById('sim-cout-sante').innerText = coutSoins.toFixed(2);
  if(document.getElementById('sim-cout-total2')) document.getElementById('sim-cout-total2').innerText = entretienTotal.toFixed(2);

  let coutParPoule = poulesActives > 0 ? (entretienTotal / poulesActives) : 0;
  if (document.getElementById('sim-cout-par-poule')) document.getElementById('sim-cout-par-poule').innerText = coutParPoule.toFixed(2);

  dessinerGraphiqueDeclin(lotsPourGraphe, esperanceMax);
  sauvegarderSimulateur();
}

function dessinerGraphiqueDeclin(lots, anneesTotal) {
  if (!canvasDeclin) return;
  const ctx = canvasDeclin.getContext('2d');
  ctx.clearRect(0, 0, canvasDeclin.width, canvasDeclin.height);
  if (lots.length === 0 || anneesTotal === 0) return;

  const padding = 40;
  const largeurGraphe = canvasDeclin.width - padding * 2;
  const hauteurGraphe = canvasDeclin.height - padding * 2;

  let donnees = []; let maxVal = 0;

  for (let y = 1; y <= anneesTotal; y++) {
    let totalOeufsAnnee = 0;
    lots.forEach(lot => {
      if (y >= lot.anneeAchat && y < (lot.anneeAchat + lot.vie)) {
        let agePoule = y - lot.anneeAchat + 1;
        let ratio = agePoule <= 2 ? 1 : 1 - ((agePoule - 2) * 0.15);
        if (ratio < 0) ratio = 0;
        totalOeufsAnnee += Math.round(lot.oeufs * ratio);
      }
    });
    donnees.push(totalOeufsAnnee);
    if (totalOeufsAnnee > maxVal) maxVal = totalOeufsAnnee;
  }

  maxVal = maxVal * 1.1 || 100;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvasDeclin.height - padding);
  ctx.lineTo(canvasDeclin.width - padding, canvasDeclin.height - padding);
  ctx.strokeStyle = '#e0cc9d';
  ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath();
  donnees.forEach((valeur, index) => {
    const x = padding + (index * (largeurGraphe / (anneesTotal - 1 || 1)));
    const y = (canvasDeclin.height - padding) - ((valeur / maxVal) * hauteurGraphe);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#e8a33d'; ctx.lineWidth = 4; ctx.stroke();

  donnees.forEach((valeur, index) => {
    const x = padding + (index * (largeurGraphe / (anneesTotal - 1 || 1)));
    const y = (canvasDeclin.height - padding) - ((valeur / maxVal) * hauteurGraphe);
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#c9863f'; ctx.fill();
    ctx.fillStyle = '#4a3728'; ctx.font = 'bold 12px Nunito, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(valeur, x, y - 15);
    ctx.fillText('An ' + (index + 1), x, canvasDeclin.height - padding + 20);
  });
}

// --- Écouteurs d'événements ---

if (btnAddRace) {
  btnAddRace.addEventListener('click', () => {
    const select = document.getElementById('sim-race-select');
    const option = select.options[select.selectedIndex];
    const qty = parseInt(document.getElementById('sim-race-qty').value) || 1;
    
    const ponte = parseInt(option.getAttribute('data-ponte'));
    const pBase = parseInt(option.getAttribute('data-printemps'));
    const eBase = parseInt(option.getAttribute('data-ete'));
    const aBase = parseInt(option.getAttribute('data-automne'));
    const hBase = parseInt(option.getAttribute('data-hiver'));
    const vie = parseInt(option.getAttribute('data-vie'));
    const couleurText = option.getAttribute('data-couleur');
    const codeCouleur = option.getAttribute('data-codecouleur');
    const poids = option.getAttribute('data-poids');
    
    const nomRace = option.text.split(' (')[0];
    const totalOeufsRace = qty * ponte;

    if(trEmpty) trEmpty.style.display = 'none';

    const tr = document.createElement('tr');
    tr.className = 'sim-row';
    tr.dataset.qty = qty;
    tr.dataset.oeufs = totalOeufsRace;
    tr.dataset.printemps = qty * pBase;
    tr.dataset.ete = qty * eBase;
    tr.dataset.automne = qty * aBase;
    tr.dataset.hiver = qty * hBase;
    tr.dataset.vie = vie;
    tr.dataset.poids = poids;

    const anneeAchat = parseInt(document.getElementById('sim-race-annee').value) || 0;
    tr.dataset.annee = anneeAchat; 

    tr.innerHTML = `
      <td style="padding: 10px;">An ${anneeAchat}</td>
      <td style="padding: 10px;"><b>${qty}</b></td>
      <td style="padding: 10px;"><b>${nomRace}</b></td>
      <td style="padding: 10px; font-weight:bold; color:var(--accent-dark);">${totalOeufsRace}</td>
      <td style="padding: 10px; font-size:11px; color:var(--text2); line-height: 1.4;">
        🌸 ${qty * pBase} <br> ☀️ ${qty * eBase} <br> 🍂 ${qty * aBase} <br> ❄️ ${qty * hBase}
      </td>
      <td style="padding: 10px;">
        <span style="display:inline-block; width:12px; height:12px; background:${codeCouleur}; border-radius:50%; border:1px solid #ccc; vertical-align:middle; margin-right:5px;"></span>
        <span style="font-size:12px;">${couleurText}</span>
      </td>
      <td style="padding: 10px; font-size:12px; font-weight:bold;">${poids} g</td>
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

const champsFinances = ['sim-personnes', 'sim-profil', 'sim-custom-conso', 'sim-prix', 'sim-prix-vente', 'sim-input-nourriture', 'sim-input-litiere', 'sim-input-soins', 'sim-investissement'];
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
    const com = document.getElementById('vente-commentaire').value.trim();

    if (client === "") { alert("Le nom du client est obligatoire."); return; }
    if (typeOeuf === "") { alert("Veuillez choisir quel type d'œuf vous vendez depuis le stock."); return; }
    if (qte <= 0) { alert("La quantité doit être supérieure à 0."); return; }

    const nouvelleVente = {
      date: date,
      client: client,
      typeOeuf: typeOeuf,
      quantite: qte,
      total: total,
      commentaire: com 
    };

    if (typeof ajouterVenteDB === 'function') {
      ajouterVenteDB(nouvelleVente);
      document.getElementById('vente-client').value = '';
      document.getElementById('vente-qte').value = 6;
      document.getElementById('vente-commentaire').value = '';
      calculerTotalVente();
    }
  });
}

// =====================================================================
// 9. ACTIONS : CONSOMMATION PERSONNELLE
// =====================================================================

const inputConsoDate = document.getElementById('conso-date');
if(inputConsoDate) inputConsoDate.valueAsDate = new Date();

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

const btnAjouterConso = document.getElementById('btn-ajouter-conso');
if (btnAjouterConso) {
  btnAjouterConso.addEventListener('click', () => {
    
    const date = document.getElementById('conso-date').value;
    const typeOeuf = document.getElementById('conso-race').value;
    const qte = parseInt(document.getElementById('conso-qte').value) || 0;
    const economie = parseFloat(document.getElementById('conso-total').value) || 0;
    const com = document.getElementById('conso-commentaire').value.trim();

    if (typeOeuf === "") { alert("Veuillez choisir quel type d'œuf vous consommez depuis le stock."); return; }
    if (qte <= 0) { alert("La quantité doit être supérieure à 0."); return; }

    const nouvelleConso = {
      date: date,
      typeOeuf: typeOeuf,
      quantite: qte,
      economie: economie,
      commentaire: com 
    };

    if (typeof ajouterConsoDB === 'function') {
      ajouterConsoDB(nouvelleConso);
      document.getElementById('conso-qte').value = 2;
      document.getElementById('conso-commentaire').value = '';
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
      document.getElementById('cout-desc').value = ''; 
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
    const categorie = document.getElementById('invest-categorie').value; 
    const objet = document.getElementById('invest-objet').value.trim();
    const montant = parseFloat(document.getElementById('invest-montant').value) || 0;

    if (objet === "") { alert("Veuillez renseigner le matériel."); return; }
    if (montant <= 0) { alert("Le montant doit être supérieur à 0."); return; }

    if (typeof ajouterInvestDB === 'function') {
      ajouterInvestDB({ date: date, categorie: categorie, objet: objet, montant: montant });
      document.getElementById('invest-objet').value = '';
    }
  });
}

// =====================================================================
// 12. ACTIONS : RAFRAÎCHISSEMENT DE LA RENTABILITÉ RÉELLE
// =====================================================================

const btnOngletRenta = document.querySelector('[data-cible="poules-renta"]');

if (btnOngletRenta) {
  btnOngletRenta.addEventListener('click', () => {
    if (typeof calculerRentabiliteReelleDB === 'function') {
      calculerRentabiliteReelleDB();
    }
  });
}

window.addEventListener('load', () => {
  if (typeof calculerRentabiliteReelleDB === 'function') {
    setTimeout(calculerRentabiliteReelleDB, 1000); 
  }
});

const selectSimBilan = document.getElementById('sim-bilan-annee');
if (selectSimBilan) selectSimBilan.addEventListener('change', calculerBilanSimulateur);

const selectCompBilan = document.getElementById('comp-bilan-annee');
if (selectCompBilan) selectCompBilan.addEventListener('change', () => {
  if (typeof calculerRentabiliteReelleDB === 'function') calculerRentabiliteReelleDB();
});

const filterReelDebut = document.getElementById('comp-reel-debut');
const filterReelFin = document.getElementById('comp-reel-fin');
const filterReelMode = document.getElementById('comp-reel-mode');
if (filterReelDebut) filterReelDebut.addEventListener('change', calculerRentabiliteReelleDB);
if (filterReelFin) filterReelFin.addEventListener('change', calculerRentabiliteReelleDB);
if (filterReelMode) filterReelMode.addEventListener('change', calculerRentabiliteReelleDB);

// =====================================================================
// MÉMOIRE DU SIMULATEUR (SAUVEGARDE LOCALE)
// =====================================================================
function sauvegarderSimulateur() {
  const tbodySim = document.getElementById('sim-table-body');
  const state = {
    personnes: document.getElementById('sim-personnes')?.value,
    profil: document.getElementById('sim-profil')?.value,
    customConso: document.getElementById('sim-custom-conso')?.value,
    prix: document.getElementById('sim-prix')?.value,
    prixVente: document.getElementById('sim-prix-vente')?.value,
    nourriture: document.getElementById('sim-input-nourriture')?.value,
    litiere: document.getElementById('sim-input-litiere')?.value,
    soins: document.getElementById('sim-input-soins')?.value,
    investissement: document.getElementById('sim-investissement')?.value,
    lignes: []
  };

  if (tbodySim) {
    const rows = tbodySim.querySelectorAll('tr.sim-row');
    rows.forEach(tr => {
      state.lignes.push({
        qty: tr.dataset.qty,
        oeufs: tr.dataset.oeufs,
        printemps: tr.dataset.printemps,
        ete: tr.dataset.ete,
        automne: tr.dataset.automne,
        hiver: tr.dataset.hiver,
        vie: tr.dataset.vie,
        annee: tr.dataset.annee,
        poids: tr.dataset.poids,
        html: tr.innerHTML
      });
    });
  }
  localStorage.setItem('simState', JSON.stringify(state));
}

function chargerSimulateur() {
  const saved = localStorage.getItem('simState');
  if (saved) {
    const state = JSON.parse(saved);
    if (state.personnes) document.getElementById('sim-personnes').value = state.personnes;
    if (state.profil) document.getElementById('sim-profil').value = state.profil;
    if (state.customConso) document.getElementById('sim-custom-conso').value = state.customConso;
    if (state.prix) document.getElementById('sim-prix').value = state.prix;
    if (state.prixVente) document.getElementById('sim-prix-vente').value = state.prixVente;
    if (state.nourriture) document.getElementById('sim-input-nourriture').value = state.nourriture;
    if (state.litiere) document.getElementById('sim-input-litiere').value = state.litiere;
    if (state.soins) document.getElementById('sim-input-soins').value = state.soins;
    if (state.investissement) document.getElementById('sim-investissement').value = state.investissement;

    if (state.lignes && state.lignes.length > 0) {
      const tbody = document.getElementById('sim-table-body');
      const trEmpty = document.getElementById('sim-empty-row');
      if (trEmpty) trEmpty.style.display = 'none';
      
      tbody.querySelectorAll('tr.sim-row').forEach(tr => tr.remove());

      state.lignes.forEach(l => {
        const tr = document.createElement('tr');
        tr.className = 'sim-row';
        tr.dataset.qty = l.qty;
        tr.dataset.oeufs = l.oeufs;
        tr.dataset.printemps = l.printemps;
        tr.dataset.ete = l.ete;
        tr.dataset.automne = l.automne;
        tr.dataset.hiver = l.hiver;
        tr.dataset.vie = l.vie;
        tr.dataset.annee = l.annee;
        tr.dataset.poids = l.poids;
        tr.innerHTML = l.html;
        tbody.appendChild(tr);
      });
    }
  }
  calculerBilanSimulateur(); 
}

window.addEventListener('load', chargerSimulateur);

// =====================================================================
// ÉCOUTEURS DES FILTRES (Mise à jour en temps réel)
// =====================================================================
const configsFiltres = [
  { prefix: 'ponte', btnRef: afficherPontesDB },
  { prefix: 'vente', btnRef: afficherVentesDB },
  { prefix: 'cout', btnRef: afficherCoutsDB },
  { prefix: 'conso', btnRef: afficherConsoDB },
  { prefix: 'invest', btnRef: afficherInvestDB }
];

configsFiltres.forEach(c => {
  const inputs = document.querySelectorAll(`[id^="filt-${c.prefix}-"]`);
  inputs.forEach(input => {
    if (input.id.includes('reset')) {
      input.addEventListener('click', () => {
        inputs.forEach(i => { if (i.type !== 'button') i.value = ''; });
        c.btnRef(); // Actualise le tableau
      });
    } else {
      input.addEventListener('input', c.btnRef);
    }
  });
});

// =====================================================================
// SAUVEGARDE & EXPORT CSV / JSON
// =====================================================================
function genererCSV(data, filename) {
  if (data.length === 0) { alert("Aucune donnée à exporter !"); return; }
  const headers = Object.keys(data[0]).join(';');
  const rows = data.map(obj => Object.values(obj).map(val => `"${(val||'').toString().replace(/"/g, '""')}"`).join(';'));
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename + "_" + new Date().toISOString().split('T')[0] + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exporterTableCSV(storeName) {
  if (!db) return;
  db.transaction([storeName], 'readonly').objectStore(storeName).getAll().onsuccess = (e) => {
    genererCSV(e.target.result, `Export_${storeName}`);
  };
}

// Boutons CSV
document.getElementById('btn-export-csv-pontes')?.addEventListener('click', () => exporterTableCSV('pontes'));
document.getElementById('btn-export-csv-ventes')?.addEventListener('click', () => exporterTableCSV('ventes'));
document.getElementById('btn-export-csv-couts')?.addEventListener('click', () => exporterTableCSV('couts'));
document.getElementById('btn-export-csv-conso')?.addEventListener('click', () => exporterTableCSV('consommations'));
document.getElementById('btn-export-csv-invest')?.addEventListener('click', () => exporterTableCSV('investissements'));

// Sauvegarde JSON (Backup complet)
document.getElementById('btn-export-json')?.addEventListener('click', () => {
  if (!db) return;
  const storeNames = ['poules', 'pontes', 'ventes', 'consommations', 'couts', 'investissements'];
  const backupData = {};
  let storesCompleted = 0;

  const t = db.transaction(storeNames, 'readonly');
  storeNames.forEach(store => {
    t.objectStore(store).getAll().onsuccess = (e) => {
      backupData[store] = e.target.result;
      storesCompleted++;
      if (storesCompleted === storeNames.length) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", "Sauvegarde_Ferme_" + new Date().toISOString().split('T')[0] + ".json");
        link.click();
      }
    };
  });
});

// Import JSON
document.getElementById('input-import-json')?.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm("Attention, cela va écraser vos données actuelles. Continuer ?")) {
        const storeNames = Object.keys(data);
        const t = db.transaction(storeNames, 'readwrite');
        storeNames.forEach(store => {
          const os = t.objectStore(store);
          os.clear().onsuccess = () => {
            data[store].forEach(item => os.add(item));
          };
        });
        t.oncomplete = () => {
          alert("Importation réussie ! L'application va se recharger.");
          location.reload();
        };
      }
    } catch (err) {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
});

// ZONE DE DANGER : RESET
document.getElementById('btn-reset-db')?.addEventListener('click', () => {
  if (confirm("🚨 ATTENTION ! Tu es sur le point de SUPPRIMER DÉFINITIVEMENT toutes les données de ton navigateur. Es-tu absolument sûr de vouloir tout effacer ?")) {
    if (confirm("Es-tu vraiment sûr ? Cette action est IRRÉVERSIBLE !")) {
      indexedDB.deleteDatabase("MyPreciousFarmDB");
      localStorage.clear();
      alert("Base de données effacée. L'application va se réinitialiser.");
      location.reload();
    }
  }
});

// =====================================================================
// GESTION DES PARAMÈTRES D'AFFICHAGE (PERFORMANCES MOBILE)
// =====================================================================
const configGraphs = [
  { idCfg: 'cfg-graph-prod', idCard: 'card-graph-prod' },
  { idCfg: 'cfg-graph-depenses', idCard: 'card-graph-depenses' },
  { idCfg: 'cfg-graph-txponte', idCard: 'card-graph-txponte' },
  { idCfg: 'cfg-graph-perf', idCard: 'card-graph-perf' }, // NOUVEAU
  { idCfg: 'cfg-graph-age', idCard: 'card-graph-age' },             // NOUVEAU
  { idCfg: 'cfg-graph-cout-oeuf', idCard: 'card-graph-cout-oeuf' },  // NOUVEAU
  { idCfg: 'cfg-graph-bilan-mois', idCard: 'card-graph-bilan-mois' }, // NOUVEAU
  { idCfg: 'cfg-graph-bilan-an', idCard: 'card-graph-bilan-an' },      // NOUVEAU
  { idCfg: 'cfg-graph-stock', idCard: 'card-graph-stock' },       // NOUVEAU
  { idCfg: 'cfg-graph-heatmap', idCard: 'card-graph-heatmap' },    // NOUVEAU
  { idCfg: 'cfg-graph-cheptel-age', idCard: 'card-graph-cheptel-age' },   // NOUVEAU
  { idCfg: 'cfg-graph-cheptel-race', idCard: 'card-graph-cheptel-race' }, // NOUVEAU
  { idCfg: 'cfg-graph-pontes-90j', idCard: 'card-graph-pontes-90j' }      // NOUVEAU
];

function initialiserParametresAffichage() {
  configGraphs.forEach(graph => {
    const checkbox = document.getElementById(graph.idCfg);
    const card = document.getElementById(graph.idCard);
    
    if (!checkbox || !card) return;

    // 1. Charger l'état depuis la mémoire
    const etatSauvegarde = localStorage.getItem(graph.idCfg);
    if (etatSauvegarde !== null) {
      checkbox.checked = (etatSauvegarde === 'true');
    }

    // 2. Appliquer l'affichage initial au chargement de la page
    card.style.display = checkbox.checked ? 'block' : 'none';

    // 3. Sauvegarder et masquer/afficher en direct quand on clique
    checkbox.addEventListener('change', () => {
      localStorage.setItem(graph.idCfg, checkbox.checked);
      card.style.display = checkbox.checked ? 'block' : 'none';
      
      // Si on rallume un graphique, on relance les calculs pour le dessiner
      if (checkbox.checked && typeof actualiserDashboardPoules === 'function') {
        actualiserDashboardPoules();
      }
    });
  });
}

window.addEventListener('load', initialiserParametresAffichage);