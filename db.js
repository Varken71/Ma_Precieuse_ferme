// Initialisation de la base de données IndexedDB
const dbName = "MyPreciousFarmDB";
let db;

// ⚠️ VERSION 6 : Ajout de la Comptabilité (Coûts et Investissements)
const request = indexedDB.open(dbName, 6); 

request.onerror = (event) => { console.error("Erreur DB :", event.target.error); };

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Base connectée (v6) !");
  
  if (typeof afficherPoulesDB === 'function') afficherPoulesDB();
  if (typeof chargerSelectPoules === 'function') chargerSelectPoules();
  if (typeof afficherPontesDB === 'function') afficherPontesDB();
  if (typeof afficherVentesDB === 'function') afficherVentesDB(); 
  if (typeof afficherConsoDB === 'function') afficherConsoDB(); 
  if (typeof afficherCoutsDB === 'function') afficherCoutsDB(); // <--
  if (typeof afficherInvestDB === 'function') afficherInvestDB(); // <--
  if (typeof calculerStockDB === 'function') calculerStockDB();
};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains('poules')) db.createObjectStore('poules', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('pontes')) db.createObjectStore('pontes', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('ventes')) db.createObjectStore('ventes', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('consommations')) db.createObjectStore('consommations', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('couts')) db.createObjectStore('couts', { keyPath: 'id', autoIncrement: true }); // <--
  if (!db.objectStoreNames.contains('investissements')) db.createObjectStore('investissements', { keyPath: 'id', autoIncrement: true }); // <--
};

// =====================================================================
// FONCTIONS : VRAI CHEPTEL (POULES)
// =====================================================================
function afficherPoulesDB() {
  const t = db.transaction(['poules'], 'readonly');
  t.objectStore('poules').getAll().onsuccess = (e) => {
    const poules = e.target.result;
    const tbody = document.getElementById('tableau-poules-body');
    if (!tbody) return;
    tbody.innerHTML = ''; 
    if (poules.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune poule.</td></tr>'; return;
    }
    poules.forEach(p => {
      let dateAff = p.dateArrivee ? new Date(p.dateArrivee).toLocaleDateString('fr-FR') : "-";
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      tr.innerHTML = `
        <td style="padding: 10px;"><b>${p.nom}</b><br><span style="font-size: 11px; color: var(--text2);">${p.fournisseur || p.parents ? 'De: '+(p.fournisseur || p.parents) : ''}</span></td>
        <td style="padding: 10px;">${p.race}<br><span style="font-size: 11px; color: var(--text2);">🥚 ${p.couleurOeuf}</span></td>
        <td style="padding: 10px; font-size: 13px;">${dateAff}</td>
        <td style="padding: 10px; font-weight: bold;">${p.prixAchat > 0 ? p.prixAchat + ' €' : '-'}</td>
        <td style="padding: 10px;"><span style="background: var(--accent2); color: var(--accent-dark); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">${p.statut}</span></td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerPouleDB(${p.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function ajouterPouleDB(poule) {
  const t = db.transaction(['poules'], 'readwrite');
  t.objectStore('poules').add(poule).onsuccess = () => { afficherPoulesDB(); chargerSelectPoules(); };
}

function supprimerPouleDB(id) {
  if (confirm("Supprimer cette poule ?")) {
    const t = db.transaction(['poules'], 'readwrite');
    t.objectStore('poules').delete(id).onsuccess = () => { afficherPoulesDB(); chargerSelectPoules(); };
  }
}

function chargerSelectPoules() {
  const t = db.transaction(['poules'], 'readonly');
  t.objectStore('poules').getAll().onsuccess = (e) => {
    const poules = e.target.result;
    const select = document.getElementById('ponte-poule');
    if (!select) return;
    const racesUniques = {};
    poules.forEach(p => {
      if (p.race && p.race !== 'Inconnue' && p.race.trim() !== '') {
        if (!racesUniques[p.race]) racesUniques[p.race] = p.couleurOeuf || 'Mixte';
      }
    });
    let html = `<option value="">-- Choisir --</option><option value="Global" data-couleur="Mixte" data-race="Troupeau">Lot Global (Troupeau)</option>`;
    if (Object.keys(racesUniques).length > 0) {
      html += `<optgroup label="Par Race (Lots)">`;
      for (const [nomRace, couleur] of Object.entries(racesUniques)) { html += `<option value="Lot ${nomRace}" data-couleur="${couleur}" data-race="${nomRace}">Lot : ${nomRace}</option>`; }
      html += `</optgroup>`;
    }
    if (poules.length > 0) {
      html += `<optgroup label="Poules individuelles">`;
      poules.forEach(p => { html += `<option value="${p.nom}" data-couleur="${p.couleurOeuf || 'Inconnue'}" data-race="${p.race || 'Inconnue'}">${p.nom} (${p.race})</option>`; });
      html += `</optgroup>`;
    }
    select.innerHTML = html;
  };
}

// =====================================================================
// FONCTIONS : PONTES
// =====================================================================
function ajouterPonteDB(ponte) {
  const t = db.transaction(['pontes'], 'readwrite');
  t.objectStore('pontes').add(ponte).onsuccess = () => { afficherPontesDB(); calculerStockDB(); };
}

function afficherPontesDB() {
  const t = db.transaction(['pontes'], 'readonly');
  t.objectStore('pontes').getAll().onsuccess = (e) => {
    const pontes = e.target.result;
    pontes.sort((a, b) => new Date(b.date) - new Date(a.date)); 
    const tbody = document.getElementById('tableau-pontes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (pontes.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune récolte.</td></tr>'; return; }
    pontes.forEach(p => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      tr.innerHTML = `
        <td style="padding: 10px;">${new Date(p.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${p.nomPoule}<br><span style="font-size:10px; color:var(--text2);">${p.race} | 🥚 ${p.couleur}</span></td>
        <td style="padding: 10px; font-weight: bold; color: var(--accent-dark); font-size:16px;">${p.quantite}</td>
        <td style="padding: 10px; font-size: 11px;">${p.commentaire}</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerPonteDB(${p.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function supprimerPonteDB(id) {
  if (confirm("Supprimer cette récolte ? Cela enlèvera ces œufs du stock.")) {
    const t = db.transaction(['pontes'], 'readwrite');
    t.objectStore('pontes').delete(id).onsuccess = () => { afficherPontesDB(); calculerStockDB(); };
  }
}

// =====================================================================
// FONCTIONS : VENTES & CONSOMMATION & LE SUPER STOCK
// =====================================================================
function ajouterVenteDB(vente) {
  const t = db.transaction(['ventes'], 'readwrite');
  t.objectStore('ventes').add(vente).onsuccess = () => { afficherVentesDB(); calculerStockDB(); };
}

function afficherVentesDB() {
  const t = db.transaction(['ventes'], 'readonly');
  t.objectStore('ventes').getAll().onsuccess = (e) => {
    const ventes = e.target.result;
    ventes.sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-ventes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (ventes.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune vente.</td></tr>'; return; }
    ventes.forEach(v => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      tr.innerHTML = `
        <td style="padding: 10px;">${new Date(v.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${v.client}</td>
        <td style="padding: 10px; font-size:11px; color:var(--text2);">${v.typeOeuf}</td>
        <td style="padding: 10px; font-weight: bold;">${v.quantite}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--green);">${v.total.toFixed(2)} €</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerVenteDB(${v.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function supprimerVenteDB(id) {
  if (confirm("Annuler cette vente ? Les œufs retourneront dans le stock.")) {
    const t = db.transaction(['ventes'], 'readwrite');
    t.objectStore('ventes').delete(id).onsuccess = () => { afficherVentesDB(); calculerStockDB(); };
  }
}

function ajouterConsoDB(conso) {
  const t = db.transaction(['consommations'], 'readwrite');
  t.objectStore('consommations').add(conso).onsuccess = () => { afficherConsoDB(); calculerStockDB(); };
}

function afficherConsoDB() {
  const t = db.transaction(['consommations'], 'readonly');
  t.objectStore('consommations').getAll().onsuccess = (e) => {
    const consos = e.target.result;
    consos.sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-conso-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (consos.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune consommation enregistrée.</td></tr>'; return; }
    consos.forEach(c => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      tr.innerHTML = `
        <td style="padding: 10px;">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold; font-size:11px; color:var(--text2);">${c.typeOeuf}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--accent-dark);">${c.quantite}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--green);">${c.economie.toFixed(2)} €</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerConsoDB(${c.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function supprimerConsoDB(id) {
  if (confirm("Annuler cette consommation ?")) {
    const t = db.transaction(['consommations'], 'readwrite');
    t.objectStore('consommations').delete(id).onsuccess = () => { afficherConsoDB(); calculerStockDB(); };
  }
}

function calculerStockDB() {
  const tPontes = db.transaction(['pontes'], 'readonly');
  tPontes.objectStore('pontes').getAll().onsuccess = (e1) => {
    const pontes = e1.target.result;
    const stocks = {}; 
    pontes.forEach(p => {
      const cle = p.race + " (🥚 " + p.couleur + ")";
      if (!stocks[cle]) stocks[cle] = 0;
      stocks[cle] += p.quantite;
    });

    const tVentes = db.transaction(['ventes'], 'readonly');
    tVentes.objectStore('ventes').getAll().onsuccess = (e2) => {
      const ventes = e2.target.result;
      ventes.forEach(v => { if (stocks[v.typeOeuf] !== undefined) stocks[v.typeOeuf] -= v.quantite; });

      const tConso = db.transaction(['consommations'], 'readonly');
      tConso.objectStore('consommations').getAll().onsuccess = (e3) => {
        const consos = e3.target.result;
        consos.forEach(c => { if (stocks[c.typeOeuf] !== undefined) stocks[c.typeOeuf] -= c.quantite; });

        const tbody = document.getElementById('tableau-stock-body');
        const selectVente = document.getElementById('vente-race');
        const selectConso = document.getElementById('conso-race');

        if (tbody) tbody.innerHTML = '';
        if (selectVente) selectVente.innerHTML = '<option value="">-- Choisir en stock --</option>';
        if (selectConso) selectConso.innerHTML = '<option value="">-- Choisir en stock --</option>';

        let totalGlobal = 0;
        for (const [cleStock, quantiteRestante] of Object.entries(stocks)) {
          if (quantiteRestante > 0) {
            totalGlobal += quantiteRestante;
            if (tbody) {
              const tr = document.createElement('tr');
              tr.style.borderBottom = "1px solid var(--border)";
              tr.innerHTML = `<td style="padding: 12px; font-weight: bold;">${cleStock}</td><td style="padding: 12px; text-align: center; font-size: 18px; font-weight: bold; color: var(--accent-dark);">${quantiteRestante}</td>`;
              tbody.appendChild(tr);
            }
            const htmlOption = `<option value="${cleStock}">${cleStock} (Reste: ${quantiteRestante})</option>`;
            if (selectVente) selectVente.innerHTML += htmlOption;
            if (selectConso) selectConso.innerHTML += htmlOption; 
          }
        }

        if (tbody && totalGlobal > 0) {
          const trTotal = document.createElement('tr');
          trTotal.style.backgroundColor = 'var(--bg2)';
          trTotal.innerHTML = `<td style="padding: 12px; font-weight: bold; text-align: right;">TOTAL EN STOCK :</td><td style="padding: 12px; text-align: center; font-size: 20px; font-weight: 900; color: var(--green);">${totalGlobal}</td>`;
          tbody.appendChild(trTotal);
        } else if (tbody) {
          tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: var(--muted);">Stock vide. Allez ramasser des œufs !</td></tr>';
        }
      };
    };
  };
}

// =====================================================================
// NOUVEAU : FONCTIONS COÛTS (ENTRETIEN)
// =====================================================================
function ajouterCoutDB(cout) {
  const t = db.transaction(['couts'], 'readwrite');
  t.objectStore('couts').add(cout).onsuccess = () => { afficherCoutsDB(); };
}

function afficherCoutsDB() {
  const t = db.transaction(['couts'], 'readonly');
  t.objectStore('couts').getAll().onsuccess = (e) => {
    const couts = e.target.result;
    couts.sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-couts-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (couts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune dépense enregistrée.</td></tr>';
      return;
    }
    couts.forEach(c => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      tr.innerHTML = `
        <td style="padding: 10px;">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${c.categorie}</td>
        <td style="padding: 10px; font-size:11px; color:var(--text2);">${c.description}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--red);">- ${c.montant.toFixed(2)} €</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerCoutDB(${c.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function supprimerCoutDB(id) {
  if (confirm("Supprimer cette dépense ?")) {
    const t = db.transaction(['couts'], 'readwrite');
    t.objectStore('couts').delete(id).onsuccess = () => { afficherCoutsDB(); };
  }
}

// =====================================================================
// NOUVEAU : FONCTIONS INVESTISSEMENTS (MATÉRIEL)
// =====================================================================
function ajouterInvestDB(invest) {
  const t = db.transaction(['investissements'], 'readwrite');
  t.objectStore('investissements').add(invest).onsuccess = () => { afficherInvestDB(); };
}

function afficherInvestDB() {
  const t = db.transaction(['investissements'], 'readonly');
  t.objectStore('investissements').getAll().onsuccess = (e) => {
    const invests = e.target.result;
    invests.sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-invest-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (invests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucun investissement matériel.</td></tr>';
      return;
    }
    invests.forEach(i => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      tr.innerHTML = `
        <td style="padding: 10px;">${new Date(i.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${i.objet}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--blue);">- ${i.montant.toFixed(2)} €</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerInvestDB(${i.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function supprimerInvestDB(id) {
  if (confirm("Supprimer cet investissement ?")) {
    const t = db.transaction(['investissements'], 'readwrite');
    t.objectStore('investissements').delete(id).onsuccess = () => { afficherInvestDB(); };
  }
}

// =====================================================================
// FONCTIONS : CALCUL DE LA RENTABILITÉ RÉELLE
// =====================================================================

function calculerRentabiliteReelleDB() {
  let totalVentes = 0;
  let totalEconomie = 0;
  let totalCouts = 0;
  let totalInvest = 0;

  // On ouvre une transaction de lecture sur les 4 tiroirs en même temps
  const t = db.transaction(['ventes', 'consommations', 'couts', 'poules'], 'readonly');
  
  // 1. On additionne l'argent qui rentre
  t.objectStore('ventes').getAll().onsuccess = (e) => {
    e.target.result.forEach(v => totalVentes += v.total);
  };
  t.objectStore('consommations').getAll().onsuccess = (e) => {
    e.target.result.forEach(c => totalEconomie += c.economie);
  };
  
  // 2. On additionne l'argent qui sort (en séparant l'entretien de l'investissement)
  t.objectStore('couts').getAll().onsuccess = (e) => {
    e.target.result.forEach(c => {
      if (c.categorie === 'Matériel') {
        totalInvest += c.montant; // Le matériel est un investissement
      } else {
        totalCouts += c.montant; // Le reste (grain, etc.) est de l'entretien
      }
    });
  };
  
  // Le prix d'achat des poules est aussi un investissement de départ !
  t.objectStore('poules').getAll().onsuccess = (e) => {
    e.target.result.forEach(p => {
      if (p.prixAchat) totalInvest += parseFloat(p.prixAchat) || 0;
    });
  };

  // 3. Quand la base a fini de tout lire, on fait les mathématiques et on met à jour l'écran
  t.oncomplete = () => {
    const benefice = totalVentes + totalEconomie - totalCouts;
    const soldeNet = benefice - totalInvest;

    const elVentes = document.getElementById('reel-ventes');
    const elEco = document.getElementById('reel-economie');
    const elCouts = document.getElementById('reel-couts');
    const elBenefice = document.getElementById('reel-benefice');
    const elInvest = document.getElementById('reel-invest');
    const elSolde = document.getElementById('reel-solde-net');
    const elMsg = document.getElementById('reel-msg-roi');

    if(elVentes) elVentes.innerText = totalVentes.toFixed(2);
    if(elEco) elEco.innerText = totalEconomie.toFixed(2);
    if(elCouts) elCouts.innerText = totalCouts.toFixed(2);
    if(elBenefice) elBenefice.innerText = benefice.toFixed(2);
    if(elInvest) elInvest.innerText = totalInvest.toFixed(2);

    if(elSolde) {
      elSolde.innerText = soldeNet.toFixed(2) + " €";
      if (soldeNet >= 0) {
        elSolde.style.color = "var(--green)";
        elMsg.innerText = "✅ Bravo ! Ton poulailler est 100% remboursé et crée de la richesse.";
        elMsg.style.color = "var(--green)";
      } else {
        elSolde.style.color = "#a35d5d";
        elMsg.innerText = "⏳ En cours d'amortissement... Les poules travaillent !";
        elMsg.style.color = "#a35d5d";
      }
    }
  };
}