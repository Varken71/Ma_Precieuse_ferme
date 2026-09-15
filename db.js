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
  if (typeof afficherClientsDB === 'function') afficherClientsDB();
  if (typeof afficherConsoDB === 'function') afficherConsoDB(); 
  if (typeof afficherCoutsDB === 'function') afficherCoutsDB(); 
  if (typeof afficherInvestDB === 'function') afficherInvestDB(); 
  if (typeof calculerStockDB === 'function') calculerStockDB();
  if (typeof actualiserDashboardPoules === 'function') actualiserDashboardPoules();
};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains('poules')) db.createObjectStore('poules', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('pontes')) db.createObjectStore('pontes', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('ventes')) db.createObjectStore('ventes', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('consommations')) db.createObjectStore('consommations', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('couts')) db.createObjectStore('couts', { keyPath: 'id', autoIncrement: true }); 
  if (!db.objectStoreNames.contains('investissements')) db.createObjectStore('investissements', { keyPath: 'id', autoIncrement: true }); 
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
// LE CERVEAU DE FILTRAGE (ETAPE 2 INTÉGRÉE)
// =====================================================================
function appliquerFiltres(donnees, type) {
  const dDebut = document.getElementById(`filt-${type}-debut`)?.value;
  const dFin = document.getElementById(`filt-${type}-fin`)?.value;
  
  return donnees.filter(item => {
    // Filtre Date
    if (dDebut && new Date(item.date) < new Date(dDebut)) return false;
    if (dFin && new Date(item.date) > new Date(dFin)) return false;
    
    // Filtres texte spécifiques selon le type
    if (type === 'ponte') {
      const fRace = document.getElementById('filt-ponte-race')?.value.toLowerCase();
      if (fRace && !(item.race.toLowerCase().includes(fRace) || item.nomPoule.toLowerCase().includes(fRace))) return false;
    }
    else if (type === 'vente') {
      const fClient = document.getElementById('filt-vente-client')?.value.toLowerCase();
      const fRace = document.getElementById('filt-vente-race')?.value.toLowerCase();
      if (fClient && !item.client.toLowerCase().includes(fClient)) return false;
      if (fRace && !item.typeOeuf.toLowerCase().includes(fRace)) return false;
    }
    else if (type === 'cout') {
      const fCat = document.getElementById('filt-cout-cat')?.value;
      if (fCat && item.categorie !== fCat) return false;
    }
    else if (type === 'conso') {
      const fRace = document.getElementById('filt-conso-race')?.value.toLowerCase();
      if (fRace && !item.typeOeuf.toLowerCase().includes(fRace)) return false;
    }
    else if (type === 'invest') {
      const fCat = document.getElementById('filt-invest-cat')?.value;
      if (fCat && item.categorie !== fCat) return false;
    }
    return true;
  });
}


// =====================================================================
// FONCTIONS : PONTES
// =====================================================================
function ajouterPonteDB(ponte) {
  const t = db.transaction(['pontes'], 'readwrite');
  t.objectStore('pontes').add(ponte).onsuccess = () => { afficherPontesDB(); calculerStockDB(); actualiserDashboardPoules(); };
}

function afficherPontesDB() {
  db.transaction(['pontes'], 'readonly').objectStore('pontes').getAll().onsuccess = (e) => {
    let pontes = appliquerFiltres(e.target.result, 'ponte').sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-pontes-body');
    if (!tbody) return; tbody.innerHTML = '';
    if (pontes.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune récolte trouvée.</td></tr>'; return; }
    pontes.forEach(p => {
      tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(p.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${p.nomPoule}<br><span style="font-size:10px; color:var(--text2);">${p.race} | 🥚 ${p.couleur}</span></td>
        <td style="padding: 10px; font-weight: bold; color: var(--accent-dark); font-size:16px;">${p.quantite}</td>
        <td style="padding: 10px; font-size: 11px;">${p.commentaire || '-'}</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerPonteDB(${p.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      </tr>`;
    });
  };
}

function supprimerPonteDB(id) {
  if (confirm("Supprimer cette récolte ? Cela enlèvera ces œufs du stock.")) {
    const t = db.transaction(['pontes'], 'readwrite');
    t.objectStore('pontes').delete(id).onsuccess = () => { afficherPontesDB(); calculerStockDB(); actualiserDashboardPoules(); };
  }
}

// =====================================================================
// FONCTIONS : VENTES & CONSOMMATION & STOCK
// =====================================================================
function ajouterVenteDB(vente) {
  const t = db.transaction(['ventes'], 'readwrite');
  t.objectStore('ventes').add(vente).onsuccess = () => { 
    afficherVentesDB(); 
    afficherClientsDB(); 
    calculerStockDB(); 
    actualiserDashboardPoules(); 
  };
}

function afficherVentesDB() {
  db.transaction(['ventes'], 'readonly').objectStore('ventes').getAll().onsuccess = (e) => {
    let ventes = appliquerFiltres(e.target.result, 'vente').sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-ventes-body');
    if (!tbody) return; tbody.innerHTML = '';
    if (ventes.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune vente trouvée.</td></tr>'; return; }
    ventes.forEach(v => {
      tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(v.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${v.client}</td>
        <td style="padding: 10px; font-size:11px; color:var(--text2);">${v.typeOeuf}</td>
        <td style="padding: 10px; font-weight: bold;">${v.quantite}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--green);">${v.total.toFixed(2)} €</td>
        <td style="padding: 10px; font-size: 11px;">${v.commentaire || '-'}</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerVenteDB(${v.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      </tr>`;
    });
  };
}

function supprimerVenteDB(id) {
  if (confirm("Annuler cette vente ? Les œufs retourneront dans le stock.")) {
    const t = db.transaction(['ventes'], 'readwrite');
    t.objectStore('ventes').delete(id).onsuccess = () => { 
      afficherVentesDB(); 
      afficherClientsDB(); 
      calculerStockDB(); 
      actualiserDashboardPoules(); 
    };
  }
}

function afficherClientsDB() {
  const t = db.transaction(['ventes'], 'readonly');
  t.objectStore('ventes').getAll().onsuccess = (e) => {
    const ventes = e.target.result;
    const tbody = document.getElementById('tableau-clients-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (ventes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucun client pour le moment. Fais ta première vente !</td></tr>';
      return;
    }

    const clientsStats = {};
    let caTotalGlobal = 0;

    ventes.forEach(v => {
      const nom = v.client.trim().charAt(0).toUpperCase() + v.client.trim().slice(1).toLowerCase();
      if (!clientsStats[nom]) {
        clientsStats[nom] = { nom: nom, oeufs: 0, nbVentes: 0, ca: 0, derniereVente: "1970-01-01" };
      }
      clientsStats[nom].oeufs += v.quantite;
      clientsStats[nom].nbVentes += 1;
      clientsStats[nom].ca += v.total;
      caTotalGlobal += v.total;

      if (new Date(v.date) > new Date(clientsStats[nom].derniereVente)) {
        clientsStats[nom].derniereVente = v.date;
      }
    });

    const clientsArr = Object.values(clientsStats).sort((a, b) => b.ca - a.ca);

    clientsArr.forEach((c, index) => {
      const partCa = caTotalGlobal > 0 ? ((c.ca / caTotalGlobal) * 100).toFixed(1) : 0;
      const prixMoyen = c.oeufs > 0 ? (c.ca / c.oeufs).toFixed(2) : 0;
      const tr = document.createElement('tr');
      tr.style.borderBottom = "1px solid var(--border)";
      
      let rangStyle = "font-weight: bold; font-size: 14px;";
      if (index === 0) rangStyle += " color: #eab308; font-size: 18px;"; 
      else if (index === 1) rangStyle += " color: #94a3b8; font-size: 16px;"; 
      else if (index === 2) rangStyle += " color: #b45309; font-size: 15px;"; 
      
      tr.innerHTML = `
        <td style="padding: 10px; text-align: center; ${rangStyle}">#${index + 1}</td>
        <td style="padding: 10px; font-weight: 800; color: var(--accent-dark);">${c.nom}</td>
        <td style="padding: 10px;">${c.oeufs}</td>
        <td style="padding: 10px;">${c.nbVentes}</td>
        <td style="padding: 10px; font-weight: 900; color: var(--green);">${c.ca.toFixed(2)} €</td>
        <td style="padding: 10px; font-size: 12px;">${prixMoyen} €</td>
        <td style="padding: 10px; font-size: 12px; color: var(--text2);">${new Date(c.derniereVente).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; font-size: 12px; width: 35px;">${partCa}%</span>
            <div style="flex: 1; height: 8px; background: #edf2f7; border-radius: 4px; overflow: hidden; min-width: 50px;">
              <div style="height: 100%; width: ${partCa}%; background: var(--accent);"></div>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function ajouterConsoDB(conso) {
  const t = db.transaction(['consommations'], 'readwrite');
  t.objectStore('consommations').add(conso).onsuccess = () => { afficherConsoDB(); calculerStockDB(); actualiserDashboardPoules(); };
}

function afficherConsoDB() {
  db.transaction(['consommations'], 'readonly').objectStore('consommations').getAll().onsuccess = (e) => {
    let consos = appliquerFiltres(e.target.result, 'conso').sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-conso-body');
    if (!tbody) return; tbody.innerHTML = '';
    if (consos.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucune consommation trouvée.</td></tr>'; return; }
    consos.forEach(c => {
      tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold; font-size:11px; color:var(--text2);">${c.typeOeuf}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--accent-dark);">${c.quantite}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--green);">${c.economie.toFixed(2)} €</td>
        <td style="padding: 10px; font-size: 11px;">${c.commentaire || '-'}</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerConsoDB(${c.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      </tr>`;
    });
  };
}

function supprimerConsoDB(id) {
  if (confirm("Annuler cette consommation ?")) {
    const t = db.transaction(['consommations'], 'readwrite');
    t.objectStore('consommations').delete(id).onsuccess = () => { afficherConsoDB(); calculerStockDB(); actualiserDashboardPoules(); };
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
          
          const dashStock = document.getElementById('dash-stock');
          if (dashStock) dashStock.innerText = totalGlobal;
        } else if (tbody) {
          tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: var(--muted);">Stock vide. Allez ramasser des œufs !</td></tr>';
          const dashStock = document.getElementById('dash-stock');
          if (dashStock) dashStock.innerText = "0";
        }
      };
    };
  };
}

// =====================================================================
// FONCTIONS : COÛTS (ENTRETIEN)
// =====================================================================
function ajouterCoutDB(cout) {
  const t = db.transaction(['couts'], 'readwrite');
  t.objectStore('couts').add(cout).onsuccess = () => { afficherCoutsDB(); actualiserDashboardPoules(); };
}

function afficherCoutsDB() {
  db.transaction(['couts'], 'readonly').objectStore('couts').getAll().onsuccess = (e) => {
    let couts = appliquerFiltres(e.target.result, 'cout').sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-couts-body');
    if (!tbody) return; tbody.innerHTML = '';
    if (couts.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucun coût trouvé.</td></tr>'; return; }
    couts.forEach(c => {
      tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold;">${c.categorie}</td>
        <td style="padding: 10px; font-size:11px; color:var(--text2);">${c.description}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--red);">- ${c.montant.toFixed(2)} €</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerCoutDB(${c.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      </tr>`;
    });
  };
}

function supprimerCoutDB(id) {
  if (confirm("Supprimer cette dépense ?")) {
    const t = db.transaction(['couts'], 'readwrite');
    t.objectStore('couts').delete(id).onsuccess = () => { afficherCoutsDB(); actualiserDashboardPoules(); };
  }
}

// =====================================================================
// FONCTIONS : INVESTISSEMENTS (MATÉRIEL)
// =====================================================================
function ajouterInvestDB(invest) {
  const t = db.transaction(['investissements'], 'readwrite');
  t.objectStore('investissements').add(invest).onsuccess = () => { afficherInvestDB(); actualiserDashboardPoules(); };
}

function afficherInvestDB() {
  db.transaction(['investissements'], 'readonly').objectStore('investissements').getAll().onsuccess = (e) => {
    let invests = appliquerFiltres(e.target.result, 'invest').sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('tableau-invest-body');
    if (!tbody) return; tbody.innerHTML = '';
    if (invests.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--muted); font-style: italic;">Aucun investissement trouvé.</td></tr>'; return; }
    invests.forEach(i => {
      tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">${new Date(i.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 10px; font-weight: bold; font-size: 11px;">${i.categorie || '-'}</td>
        <td style="padding: 10px; font-weight: bold;">${i.objet}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--blue);">- ${i.montant.toFixed(2)} €</td>
        <td style="padding: 10px; text-align: right;"><button class="btn-outline btn-sm" onclick="supprimerInvestDB(${i.id})" style="padding: 4px 8px; font-size: 12px; color: var(--red); border-color: var(--red2);">🗑️</button></td>
      </tr>`;
    });
  };
}

function supprimerInvestDB(id) {
  if (confirm("Supprimer cet investissement ?")) {
    const t = db.transaction(['investissements'], 'readwrite');
    t.objectStore('investissements').delete(id).onsuccess = () => { afficherInvestDB(); actualiserDashboardPoules(); };
  }
}

// =====================================================================
// FONCTIONS : CALCUL DE LA RENTABILITÉ RÉELLE & COMPARATIF
// =====================================================================
function calculerRentabiliteReelleDB() {
  let ventes = [], consos = [], couts = [], poules = [], pontes = [];

  const t = db.transaction(['ventes', 'consommations', 'couts', 'poules', 'pontes'], 'readonly');
  
  t.objectStore('ventes').getAll().onsuccess = e => ventes = e.target.result;
  t.objectStore('consommations').getAll().onsuccess = e => consos = e.target.result;
  t.objectStore('couts').getAll().onsuccess = e => couts = e.target.result;
  t.objectStore('poules').getAll().onsuccess = e => poules = e.target.result;
  t.objectStore('pontes').getAll().onsuccess = e => pontes = e.target.result;

  t.oncomplete = () => {
    
    // --- PARTIE 1 : CALCUL DES TOTAUX GLOBAUX ---
    let totalVentes = 0, totalEconomie = 0, totalCouts = 0, totalInvest = 0;
    let totalOeufsProduits = 0;

    ventes.forEach(v => totalVentes += v.total);
    consos.forEach(c => totalEconomie += c.economie);
    couts.forEach(c => {
      if (c.categorie === 'Matériel') totalInvest += c.montant;
      else totalCouts += c.montant;
    });
    poules.forEach(p => { if (p.prixAchat) totalInvest += parseFloat(p.prixAchat) || 0; });
    pontes.forEach(p => totalOeufsProduits += p.quantite);

    const benefice = totalVentes + totalEconomie - totalCouts;
    const soldeNet = benefice - totalInvest;

    if(document.getElementById('reel-ventes')) document.getElementById('reel-ventes').innerText = totalVentes.toFixed(2);
    if(document.getElementById('reel-economie')) document.getElementById('reel-economie').innerText = totalEconomie.toFixed(2);
    if(document.getElementById('reel-couts')) document.getElementById('reel-couts').innerText = totalCouts.toFixed(2);
    if(document.getElementById('reel-benefice')) document.getElementById('reel-benefice').innerText = benefice.toFixed(2);
    if(document.getElementById('reel-invest')) document.getElementById('reel-invest').innerText = totalInvest.toFixed(2);

    const elSolde = document.getElementById('reel-solde-net');
    const elMsg = document.getElementById('reel-msg-roi');
    if(elSolde) {
      elSolde.innerText = soldeNet.toFixed(2) + " €";
      if (soldeNet >= 0) {
        elSolde.style.color = "var(--green)";
        elMsg.innerText = "✅ Bravo ! Ton poulailler est 100% remboursé.";
        elMsg.style.color = "var(--green)";
      } else {
        elSolde.style.color = "#a35d5d";
        elMsg.innerText = "⏳ En cours d'amortissement...";
        elMsg.style.color = "#a35d5d";
      }
    }

    // --- PARTIE 2 : CALCUL FILTRÉ POUR LE TABLEAU COMPARATIF ---
    
    const choixAnneePrv = document.getElementById('comp-bilan-annee')?.value || "moyenne";
    let simProd = 0, simPoules = 0;
    
    if (window.previsionsSimulateur) {
      if (choixAnneePrv === "moyenne") {
        simProd = Math.round(window.previsionsSimulateur.moyenneOeufs);
        simPoules = window.previsionsSimulateur.moyennePoules;
      } else {
        simProd = window.previsionsSimulateur.projs[choixAnneePrv]?.oeufs || 0;
        simPoules = window.previsionsSimulateur.projs[choixAnneePrv]?.poules || 0;
      }
    }
    const valNourriture = parseFloat(document.getElementById('sim-input-nourriture')?.value) || 45;
    const valLitiere = parseFloat(document.getElementById('sim-input-litiere')?.value) || 20;
    const valSoins = parseFloat(document.getElementById('sim-input-soins')?.value) || 15;
    
    let simCouts = 0;
    if (window.previsionsSimulateur) {
      if (choixAnneePrv === "moyenne") {
        let sumTotal = 0;
        for(let i=1; i<=window.previsionsSimulateur.esperanceMax; i++) {
           let n = window.previsionsSimulateur.projs[i].poules;
           if (n > 0) {
             sumTotal += (valNourriture * n) + (valLitiere + 8 * n) + (i === 1 ? (valSoins + 10) + 5 * n : valSoins + 3 * n);
           }
        }
        simCouts = window.previsionsSimulateur.esperanceMax > 0 ? sumTotal / window.previsionsSimulateur.esperanceMax : 0;
      } else {
        let n = simPoules;
        if (n > 0) {
           let cN = valNourriture * n;
           let cL = valLitiere + (8 * n);
           let cS = (choixAnneePrv === "1") ? (valSoins + 10) + (5 * n) : valSoins + (3 * n);
           simCouts = cN + cL + cS;
        }
      }
    }
    
    const simCoutOeuf = simProd > 0 ? (simCouts / simProd) : 0;
    
    const profilElem = document.getElementById('sim-profil');
    const nbPersonnes = parseInt(document.getElementById('sim-personnes')?.value) || 1;
    let oeufsParSemaine = (profilElem?.value === 'custom') ? (parseInt(document.getElementById('sim-custom-conso')?.value) || 0) : (parseInt(profilElem?.value || '4') * nbPersonnes);
    const simConso = (simPoules > 0) ? (oeufsParSemaine * 52) : 0;
    
    const prixCommerce = parseFloat(document.getElementById('sim-prix')?.value) || 0;
    const prixVenteSurplus = parseFloat(document.getElementById('sim-prix-vente')?.value) || 0;
    const simInvest = parseFloat(document.getElementById('sim-investissement')?.value) || 0;
    const simEco = simConso * prixCommerce;
    const simSurplus = simProd > simConso ? simProd - simConso : 0;
    const simVentes = simSurplus * prixVenteSurplus;
    const simBenef = simEco + simVentes - simCouts;
    const simRoi = (simInvest > 0 && simBenef > 0) ? (simBenef / simInvest) * 100 : (simBenef > 0 ? 100 : 0);

    const dateDebut = document.getElementById('comp-reel-debut')?.value;
    const dateFin = document.getElementById('comp-reel-fin')?.value;
    const modeReel = document.getElementById('comp-reel-mode')?.value || "total";
    
    let reelProd = 0, reelConso = 0, reelEco = 0, reelVentes = 0, reelCouts = 0;
    
    const isDansPeriode = (dStr) => {
      if (!dateDebut && !dateFin) return true;
      const d = new Date(dStr).getTime();
      if (dateDebut && d < new Date(dateDebut).getTime()) return false;
      if (dateFin && d > new Date(dateFin).getTime()) return false;
      return true;
    };

    pontes.forEach(i => { if (isDansPeriode(i.date)) reelProd += i.quantite; });
    ventes.forEach(i => { if (isDansPeriode(i.date)) reelVentes += i.total; });
    couts.forEach(i => { if (isDansPeriode(i.date) && i.categorie !== 'Matériel') reelCouts += i.montant; });
    consos.forEach(i => { if (isDansPeriode(i.date)) { reelConso += i.quantite; reelEco += i.economie; } });
      
    let diviseur = 1;
    if (modeReel === "moyenne" && dateDebut && dateFin) {
      const jours = (new Date(dateFin) - new Date(dateDebut)) / (1000 * 60 * 60 * 24);
      if (jours > 0) diviseur = jours / 365.25; 
    }
    
    reelProd /= diviseur; reelConso /= diviseur; reelEco /= diviseur; reelVentes /= diviseur; reelCouts /= diviseur;
    
    const coutOeufReel = reelProd > 0 ? (reelCouts / reelProd) : 0;
    const benefReel = reelEco + reelVentes - reelCouts;
    const roiReel = (totalInvest > 0 && benefReel > 0) ? (benefReel / totalInvest) * 100 : (benefReel > 0 ? 100 : 0);

    function setLigneComp(idPrv, idReel, idDelta, valPrv, valReel, format, inverseCouleur = false) {
      const elPrv = document.getElementById(idPrv); const elReel = document.getElementById(idReel); const elDelta = document.getElementById(idDelta);
      if(!elPrv) return;
      const fmt = (v) => format === '€' ? v.toFixed(2) + " €" : (format === '%' ? v.toFixed(1) + " %" : Math.round(v));
      elPrv.innerText = fmt(valPrv); elReel.innerText = fmt(valReel);
      const delta = valReel - valPrv;
      elDelta.innerText = (delta > 0 ? "+" : "") + fmt(delta);
      if (delta === 0) elDelta.style.color = "var(--text2)";
      else if (inverseCouleur) elDelta.style.color = delta > 0 ? "var(--red)" : "var(--green)"; 
      else elDelta.style.color = delta > 0 ? "var(--green)" : "var(--red)"; 
    }

    setLigneComp('comp-prevu-prod', 'comp-reel-prod', 'comp-delta-prod', simProd, reelProd, 'nb');
    setLigneComp('comp-prevu-conso', 'comp-reel-conso', 'comp-delta-conso', simConso, reelConso, 'nb');
    setLigneComp('comp-prevu-eco', 'comp-reel-eco', 'comp-delta-eco', simEco, reelEco, '€');
    setLigneComp('comp-prevu-ventes', 'comp-reel-ventes', 'comp-delta-ventes', simVentes, reelVentes, '€');
    setLigneComp('comp-prevu-couts', 'comp-reel-couts', 'comp-delta-couts', simCouts, reelCouts, '€', true); 
    setLigneComp('comp-prevu-cout-oeuf', 'comp-reel-cout-oeuf', 'comp-delta-cout-oeuf', simCoutOeuf, coutOeufReel, '€', true); 
    setLigneComp('comp-prevu-benefice', 'comp-reel-benefice', 'comp-delta-benefice', simBenef, benefReel, '€');
    setLigneComp('comp-prevu-roi', 'comp-reel-roi', 'comp-delta-roi', simRoi, roiReel, '%');
  };
}

// =====================================================================
// FONCTIONS : DASHBOARD ET GRAPHIQUES (CHART.JS)
// =====================================================================
let chartProd = null; // Mémoire pour le graphique de production
let chartDep = null;  // Mémoire pour le graphique des dépenses

function actualiserDashboardPoules() {
  // On lit absolument toute la base d'un coup
  const t = db.transaction(['poules', 'pontes', 'ventes', 'consommations', 'couts', 'investissements'], 'readonly');
  
  let poules=[], pontes=[], ventes=[], consos=[], couts=[], invests=[];
  t.objectStore('poules').getAll().onsuccess = e => poules = e.target.result;
  t.objectStore('pontes').getAll().onsuccess = e => pontes = e.target.result;
  t.objectStore('ventes').getAll().onsuccess = e => ventes = e.target.result;
  t.objectStore('consommations').getAll().onsuccess = e => consos = e.target.result;
  t.objectStore('couts').getAll().onsuccess = e => couts = e.target.result;
  t.objectStore('investissements').getAll().onsuccess = e => invests = e.target.result;

  t.oncomplete = () => {
    // --- 1. MAJ des 3 chiffres clés (Haut de page) ---
    let nbPoules = 0;
    poules.forEach(p => { if (p.statut !== 'Décédée') nbPoules++; });
    
    let totalValeur = 0;
    ventes.forEach(v => totalValeur += v.total);
    consos.forEach(c => totalValeur += c.economie);

    if(document.getElementById('dash-poules')) document.getElementById('dash-poules').innerText = nbPoules;
    if(document.getElementById('dash-valeur')) document.getElementById('dash-valeur').innerText = totalValeur.toFixed(2);


    // --- 2. GRAPHIQUE DES DÉPENSES (Camembert) ---
    const depenses = { Nourriture: 0, Litière: 0, Santé: 0, Autre: 0, Matériel: 0 };
    
    couts.forEach(c => {
      if (depenses[c.categorie] !== undefined) depenses[c.categorie] += c.montant;
      else depenses.Autre += c.montant;
    });
    invests.forEach(i => depenses.Matériel += i.montant);

    const ctxDep = document.getElementById('chart-depenses');
    if (ctxDep) {
      if (chartDep) chartDep.destroy(); // On efface l'ancien graphique s'il existe
      chartDep = new Chart(ctxDep, {
        type: 'doughnut',
        data: {
          labels: Object.keys(depenses),
          datasets: [{
            data: Object.values(depenses),
            backgroundColor: ['#e8a33d', '#e0cc9d', '#e53e3e', '#b8a482', '#4c8c4a'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }

    // --- 3. GRAPHIQUE PRODUCTION (6 Derniers Mois) ---
    const moisNoms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    let statsMois = {};
    
    // On génère la liste des 6 derniers mois (pour l'axe horizontal)
    for(let i = 5; i >= 0; i--) {
        let d = new Date();
        d.setMonth(d.getMonth() - i);
        let cle = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, '0');
        let label = moisNoms[d.getMonth()] + " " + d.getFullYear();
        statsMois[cle] = { label: label, prod: 0, ventes: 0, consos: 0 };
    }

    // On classe les données dans les bons mois
    pontes.forEach(p => { let cle = p.date.substring(0, 7); if(statsMois[cle]) statsMois[cle].prod += p.quantite; });
    ventes.forEach(v => { let cle = v.date.substring(0, 7); if(statsMois[cle]) statsMois[cle].ventes += v.quantite; });
    consos.forEach(c => { let cle = c.date.substring(0, 7); if(statsMois[cle]) statsMois[cle].consos += c.quantite; });

    const labelsMois = Object.values(statsMois).map(m => m.label);
    const dataProd = Object.values(statsMois).map(m => m.prod);
    const dataVentes = Object.values(statsMois).map(m => m.ventes);
    const dataConsos = Object.values(statsMois).map(m => m.consos);

    const ctxProd = document.getElementById('chart-production');
    if (ctxProd) {
      if (chartProd) chartProd.destroy();
      chartProd = new Chart(ctxProd, {
        type: 'bar',
        data: {
          labels: labelsMois,
          datasets: [
            { label: 'Œufs Pondus', data: dataProd, backgroundColor: '#e8a33d', borderRadius: 4 },
            { label: 'Vendus', data: dataVentes, backgroundColor: '#4c8c4a', borderRadius: 4 },
            { label: 'Consommés', data: dataConsos, backgroundColor: '#5d8aa3', borderRadius: 4 }
          ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
      });
    }
  };
}