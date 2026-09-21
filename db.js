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
let chartProd = null; 
let chartDep = null;  
let chartTxPonte = null; 
let chartPerf = null; 

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
    poules.forEach(p => { if (p.statut !== 'Décédée' && p.statut !== 'Décédé') nbPoules++; });
    
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
      if (chartDep) chartDep.destroy();
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
    
    for(let i = 5; i >= 0; i--) {
        let d = new Date();
        d.setMonth(d.getMonth() - i);
        let cle = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, '0');
        let label = moisNoms[d.getMonth()] + " " + d.getFullYear();
        statsMois[cle] = { label: label, prod: 0, ventes: 0, consos: 0 };
    }

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

    // --- 4. GRAPHIQUE TAUX DE PONTE (30 Jours) ---
    const checkTxPonte = document.getElementById('cfg-graph-txponte');
    
    if (checkTxPonte && checkTxPonte.checked) {
      const tauxQuotidien = [];
      const labels30 = [];
      
      for (let i = 29; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let dateStr = d.toISOString().split('T')[0];
        
        let poulesActivesJour = 0;
        poules.forEach(p => {
          let dateArr = p.dateArrivee ? p.dateArrivee : "1970-01-01"; 
          if (dateArr <= dateStr && p.statut !== 'Décédé' && p.statut !== 'Réforme') {
            poulesActivesJour++;
          }
        });
        
        let oeufsJour = 0;
        pontes.forEach(p => {
          if (p.date === dateStr) oeufsJour += p.quantite;
        });
        
        let taux = poulesActivesJour > 0 ? (oeufsJour / poulesActivesJour) * 100 : 0;
        if (taux > 100) taux = 100; 
        
        labels30.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
        tauxQuotidien.push(taux);
      }
      
      const moyenne7j = [];
      for (let i = 0; i < tauxQuotidien.length; i++) {
        if (i < 6) {
          moyenne7j.push(null); 
        } else {
          let somme = 0;
          for (let j = 0; j < 7; j++) {
            somme += tauxQuotidien[i - j];
          }
          moyenne7j.push(somme / 7);
        }
      }
      
      const tauxAujourdhui = tauxQuotidien[tauxQuotidien.length - 1];
      const elJauge = document.getElementById('jauge-txponte');
      
      if (elJauge) {
        elJauge.innerText = Math.round(tauxAujourdhui) + " %";
        if (tauxAujourdhui >= 90) {
          elJauge.style.color = "#276749"; elJauge.style.backgroundColor = "#c6f6d5"; 
        } else if (tauxAujourdhui >= 70) {
          elJauge.style.color = "#c05621"; elJauge.style.backgroundColor = "#feebc8"; 
        } else {
          elJauge.style.color = "#9b2c2c"; elJauge.style.backgroundColor = "#fed7d7"; 
        }
      }
      
      const ctxTx = document.getElementById('chart-txponte');
      if (ctxTx) {
        if (chartTxPonte) chartTxPonte.destroy(); 
        
        chartTxPonte = new Chart(ctxTx, {
          type: 'line',
          data: {
            labels: labels30,
            datasets: [
              {
                label: 'Taux quotidien (%)',
                data: tauxQuotidien,
                borderColor: '#e0cc9d',
                backgroundColor: 'rgba(224, 204, 157, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3, 
                pointRadius: 1
              },
              {
                label: 'Tendance (Moy. 7j)',
                data: moyenne7j,
                borderColor: '#e8a33d',
                borderWidth: 3,
                borderDash: [5, 5], 
                fill: false,
                tension: 0.4,
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } }
          }
        });
      }
    } else {
      if (chartTxPonte) {
        chartTxPonte.destroy();
        chartTxPonte = null;
      }
    }

    // --- 5. GRAPHIQUE PERFORMANCE (TOP / FLOP) ---
    // CA Y EST ! ON EST BIEN À L'INTÉRIEUR DE LA LECTURE DE DONNÉES !
    const checkPerf = document.getElementById('cfg-graph-perf');
    
    if (checkPerf && checkPerf.checked) {
      let statsPoules = {};
      
      // A. On liste toutes les poules de la base
      poules.forEach(p => {
         if (p.nom) {
             let nomPropre = String(p.nom).trim();
             statsPoules[nomPropre] = { nom: nomPropre, oeufs: 0, statut: p.statut };
         }
      });

      // B. Calcul de la date limite (30 jours en arrière)
      let date30j = new Date();
      date30j.setDate(date30j.getDate() - 30);
      let dateLimite = date30j.toISOString().split('T')[0];

      // C. On ajoute les œufs
      pontes.forEach(p => {
          if (p.date >= dateLimite && p.nomPoule && p.nomPoule !== "Global" && !p.nomPoule.startsWith("Lot ")) {
              let nomPropre = String(p.nomPoule).trim();
              
              if (!statsPoules[nomPropre]) {
                  statsPoules[nomPropre] = { nom: nomPropre, oeufs: 0, statut: "Inconnu" };
              }
              
              statsPoules[nomPropre].oeufs += parseInt(p.quantite) || 0;
          }
      });

      // D. On nettoie et on trie
      let tableauPerf = Object.values(statsPoules).filter(item => {
          if (item.oeufs > 0) return true; 
          if (item.statut === 'Décédé' || item.statut === 'Réforme') return false; 
          return true; 
      }).sort((a, b) => b.oeufs - a.oeufs);

      // E. Couleurs et Textes
      let labelsPerf = [];
      let dataPerf = [];
      let colorsPerf = [];

      if (tableauPerf.length === 0) {
          labelsPerf.push("Aucune donnée 30j");
          dataPerf.push(0);
          colorsPerf.push('#cbd5e0');
      } else {
          tableauPerf.forEach((item, index) => {
              labelsPerf.push(item.nom);
              dataPerf.push(item.oeufs);

              if (item.oeufs > 0 && index < 3) {
                  colorsPerf.push('#4c8c4a'); // Top 3 Vert
              } else if (item.oeufs === 0) {
                  colorsPerf.push('#e53e3e'); // Flop (0 œuf)
              } else if (index >= tableauPerf.length - 3 && tableauPerf.length > 3) {
                  colorsPerf.push('#e53e3e'); // Flop 3 Rouge
              } else {
                  colorsPerf.push('#e0cc9d'); // Milieu Beige
              }
          });
      }

      // F. Dessin du graphique
      const ctxPerf = document.getElementById('chart-perf');
      if (ctxPerf) {
          if (chartPerf) chartPerf.destroy();
          chartPerf = new Chart(ctxPerf, {
              type: 'bar',
              data: {
                  labels: labelsPerf,
                  datasets: [{
                      label: 'Œufs',
                      data: dataPerf,
                      backgroundColor: colorsPerf,
                      borderRadius: 6
                  }]
              },
              options: {
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { 
                      x: { 
                          beginAtZero: true, 
                          suggestedMax: 10,
                          ticks: { stepSize: 1 }
                      } 
                  }
              }
          });
      }
    } else {
      if (chartPerf) { chartPerf.destroy(); chartPerf = null; }
    }

    // --- 6. GRAPHIQUE PYRAMIDE DES ÂGES ---
    const checkAge = document.getElementById('cfg-graph-age');
    if (checkAge && checkAge.checked) {
      let age0_1 = 0, age1_2 = 0, age2_plus = 0;
      let dateActuelle = new Date();

      poules.forEach(p => {
          if (p.statut !== 'Décédé' && p.statut !== 'Réforme') {
              if (p.dateArrivee) {
                  let dateArr = new Date(p.dateArrivee);
                  let diffAnnees = (dateActuelle - dateArr) / (1000 * 60 * 60 * 24 * 365.25);
                  if (diffAnnees < 1) age0_1++;
                  else if (diffAnnees < 2) age1_2++;
                  else age2_plus++;
              } else {
                  // Si pas de date, on la met au milieu par défaut pour ne pas fausser les alertes
                  age1_2++;
              }
          }
      });

      const elAlerte = document.getElementById('alerte-renouvellement');
      if (elAlerte) {
          if (age2_plus > 0) {
              elAlerte.style.display = 'block';
              elAlerte.innerText = `⚠️ ${age2_plus} poule(s) de plus de 2 ans. Prévoir renouvellement.`;
          } else {
              elAlerte.style.display = 'none';
          }
      }

      const ctxAge = document.getElementById('chart-age');
      if (ctxAge) {
          if (window.chartAge) window.chartAge.destroy();
          window.chartAge = new Chart(ctxAge, {
              type: 'bar',
              data: {
                  labels: ['- de 1 an', '1 à 2 ans', '+ de 2 ans'],
                  datasets: [{
                      data: [age0_1, age1_2, age2_plus],
                      backgroundColor: ['#4c8c4a', '#e8a33d', '#e53e3e'],
                      borderRadius: 6
                  }]
              },
              options: {
                  indexAxis: 'y', // Barres horizontales
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
              }
          });
      }
    } else {
      if (window.chartAge) { window.chartAge.destroy(); window.chartAge = null; }
    }


    // --- 7. GRAPHIQUE COÛT DE REVIENT DE L'ŒUF ---
    const checkCoutOeuf = document.getElementById('cfg-graph-cout-oeuf');
    if (checkCoutOeuf && checkCoutOeuf.checked) {
      let statsMoisCout = {};
      const moisNomsCourts = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      
      // Initialisation des 6 derniers mois
      for(let i = 5; i >= 0; i--) {
          let d = new Date();
          d.setMonth(d.getMonth() - i);
          let cle = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, '0');
          statsMoisCout[cle] = { label: moisNomsCourts[d.getMonth()], depenses: 0, oeufs: 0 };
      }

      // Cumul des dépenses (hors investissements matériels lourds)
      couts.forEach(c => {
          let cle = c.date.substring(0, 7);
          if (statsMoisCout[cle]) statsMoisCout[cle].depenses += c.montant;
      });

      // Cumul des œufs pondus
      pontes.forEach(p => {
          let cle = p.date.substring(0, 7);
          if (statsMoisCout[cle]) statsMoisCout[cle].oeufs += p.quantite;
      });

      let labelsCout = [];
      let dataCout = [];
      let dataPrixCommerce = [];
      let prixCommerce = parseFloat(document.getElementById('sim-prix')?.value) || 0.40;
      let coutDernierMois = 0;

      Object.values(statsMoisCout).forEach(mois => {
          labelsCout.push(mois.label);
          let coutUnitaire = mois.oeufs > 0 ? (mois.depenses / mois.oeufs) : 0;
          dataCout.push(coutUnitaire.toFixed(2));
          dataPrixCommerce.push(prixCommerce);
          coutDernierMois = coutUnitaire; // Le dernier itéré sera celui du mois en cours
      });

      const elBadgeCout = document.getElementById('badge-cout-oeuf');
      if (elBadgeCout) {
          elBadgeCout.innerText = coutDernierMois.toFixed(2) + " €";
          elBadgeCout.style.color = coutDernierMois <= prixCommerce ? "#276749" : "#9b2c2c";
          elBadgeCout.style.backgroundColor = coutDernierMois <= prixCommerce ? "#c6f6d5" : "#fed7d7";
      }

      const ctxCout = document.getElementById('chart-cout-oeuf');
      if (ctxCout) {
          if (window.chartCoutOeuf) window.chartCoutOeuf.destroy();
          window.chartCoutOeuf = new Chart(ctxCout, {
              type: 'line',
              data: {
                  labels: labelsCout,
                  datasets: [
                      {
                          label: 'Coût / œuf (€)',
                          data: dataCout,
                          borderColor: '#5d8aa3',
                          backgroundColor: 'rgba(93, 138, 163, 0.2)',
                          borderWidth: 3,
                          fill: true,
                          tension: 0.3
                      },
                      {
                          label: 'Prix Commerce (€)',
                          data: dataPrixCommerce,
                          borderColor: '#e53e3e',
                          borderWidth: 2,
                          borderDash: [5, 5],
                          fill: false,
                          pointRadius: 0
                      }
                  ]
              },
              options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true } },
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }
              }
          });
      }
    } else {
      if (window.chartCoutOeuf) { window.chartCoutOeuf.destroy(); window.chartCoutOeuf = null; }
    }

    // --- 8. GRAPHIQUE BILAN FINANCIER MENSUEL ---
    const checkBilanMois = document.getElementById('cfg-graph-bilan-mois');
    if (checkBilanMois && checkBilanMois.checked) {
      let statsFinMois = {};
      const moisNoms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      
      // On prépare les 6 derniers mois
      for(let i = 5; i >= 0; i--) {
          let d = new Date();
          d.setMonth(d.getMonth() - i);
          let cle = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, '0');
          statsFinMois[cle] = { label: moisNoms[d.getMonth()], ecos: 0, ventes: 0, couts: 0 };
      }

      // On répartit les données financières
      consos.forEach(c => { let cle = c.date.substring(0, 7); if (statsFinMois[cle]) statsFinMois[cle].ecos += c.economie; });
      ventes.forEach(v => { let cle = v.date.substring(0, 7); if (statsFinMois[cle]) statsFinMois[cle].ventes += v.total; });
      couts.forEach(c => { let cle = c.date.substring(0, 7); if (statsFinMois[cle]) statsFinMois[cle].couts += c.montant; });

      let labelsFinMois = [], dataEcos = [], dataVentes = [], dataCouts = [], dataBenef = [];
      Object.values(statsFinMois).forEach(m => {
          labelsFinMois.push(m.label);
          dataEcos.push(m.ecos);
          dataVentes.push(m.ventes);
          dataCouts.push(m.couts);
          dataBenef.push((m.ecos + m.ventes) - m.couts); // Bénéfice = (Économies + Ventes) - Coûts
      });

      const ctxBilanMois = document.getElementById('chart-bilan-mois');
      if (ctxBilanMois) {
          if (window.chartBilanMois) window.chartBilanMois.destroy();
          window.chartBilanMois = new Chart(ctxBilanMois, {
              type: 'bar',
              data: {
                  labels: labelsFinMois,
                  datasets: [
                      { type: 'line', label: 'Bénéfice Net', data: dataBenef, borderColor: '#3182ce', borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.3 },
                      { type: 'line', label: 'Coûts (Dépenses)', data: dataCouts, borderColor: '#e53e3e', borderWidth: 2, fill: false, tension: 0.3 },
                      { type: 'bar', label: 'Ventes', data: dataVentes, backgroundColor: '#2f855a', stack: 'Valeur' },
                      { type: 'bar', label: 'Économies (Conso)', data: dataEcos, backgroundColor: '#68d391', stack: 'Valeur' }
                  ]
              },
              options: {
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: { 
                      y: { beginAtZero: true },
                      x: { stacked: true } // Active l'empilement des barres
                  },
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
              }
          });
      }
    } else {
        if (window.chartBilanMois) { window.chartBilanMois.destroy(); window.chartBilanMois = null; }
    }


    // --- 9. GRAPHIQUE BILAN ANNUEL ---
    const checkBilanAn = document.getElementById('cfg-graph-bilan-an');
    if (checkBilanAn && checkBilanAn.checked) {
        let anneeEnCours = new Date().getFullYear().toString();
        let anEcos = 0, anVentes = 0, anCouts = 0;

        // On ne prend que les données de l'année actuelle
        consos.forEach(c => { if (c.date.startsWith(anneeEnCours)) anEcos += c.economie; });
        ventes.forEach(v => { if (v.date.startsWith(anneeEnCours)) anVentes += v.total; });
        couts.forEach(c => { if (c.date.startsWith(anneeEnCours)) anCouts += c.montant; });

        let anValeur = anEcos + anVentes;
        let anBenef = anValeur - anCouts;

        let dataAn = [anEcos, anVentes, anValeur, anCouts, anBenef];
        let bgColors = [
            '#68d391', // Vert clair (Économies)
            '#2f855a', // Vert foncé (Ventes)
            '#48bb78', // Vert moyen (Valeur)
            '#e53e3e', // Rouge (Coûts)
            anBenef >= 0 ? '#38a169' : '#c53030' // Bénéfice : Vert si >0, Rouge si perte
        ];

        const ctxBilanAn = document.getElementById('chart-bilan-an');
        if (ctxBilanAn) {
            if (window.chartBilanAn) window.chartBilanAn.destroy();
            window.chartBilanAn = new Chart(ctxBilanAn, {
                type: 'bar',
                data: {
                    labels: ['Économies', 'Ventes', 'Valeur Créée', 'Coûts', 'BÉNÉFICE NET'],
                    datasets: [{
                        data: dataAn,
                        backgroundColor: bgColors,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', // Barres à l'horizontale
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true } }
                }
            });
        }
    } else {
        if (window.chartBilanAn) { window.chartBilanAn.destroy(); window.chartBilanAn = null; }
    }

    // --- 10. GRAPHIQUE STOCK & COULEURS ---
    const checkStock = document.getElementById('cfg-graph-stock');
    if (checkStock && checkStock.checked) {
        let stockCouleurs = {};
        let totalOeufs = 0;

        // On compte les pontes
        pontes.forEach(p => {
            let coul = p.couleur || 'Inconnue';
            if (!stockCouleurs[coul]) stockCouleurs[coul] = 0;
            stockCouleurs[coul] += parseInt(p.quantite) || 0;
            totalOeufs += parseInt(p.quantite) || 0;
        });

        // On soustrait les ventes et consos
        const deduireStock = (item) => {
            let coul = "Inconnue";
            if (item.typeOeuf && item.typeOeuf.includes('🥚')) {
                coul = item.typeOeuf.split('🥚')[1].replace(')', '').trim();
            }
            if (stockCouleurs[coul] !== undefined) {
                stockCouleurs[coul] -= parseInt(item.quantite) || 0;
                totalOeufs -= parseInt(item.quantite) || 0;
            }
        };
        ventes.forEach(deduireStock);
        consos.forEach(deduireStock);

        // Algorithme de Fraîcheur (> 14 jours)
        let oeufs14j = 0;
        let date14j = new Date();
        date14j.setDate(date14j.getDate() - 14);
        let limite14j = date14j.toISOString().split('T')[0];
        
        pontes.forEach(p => { if (p.date >= limite14j) oeufs14j += parseInt(p.quantite) || 0; });

        let stockPerime = Math.max(0, totalOeufs - oeufs14j);
        const elAlerteF = document.getElementById('alerte-fraicheur');
        if (elAlerteF) {
            if (stockPerime > 0) {
                elAlerteF.style.display = 'block';
                elAlerteF.innerText = `⚠️ Attention : environ ${stockPerime} œuf(s) ont plus de 14 jours !`;
            } else {
                elAlerteF.style.display = 'none';
            }
        }

        let labelsStock = [], dataStock = [], bgStock = [];
        const colorMap = {
            'Roux / Brun': '#c97445', 'Brun roux': '#c97445', 'Chocolat': '#4a2511',
            'Vert / Bleu': '#a9c9b5', 'Bleu ciel': '#c6daef', 'Bleu-vert': '#a9c9b5',
            'Blanc': '#f0f0f0', 'Crémeux': '#fdf6ea', 'Crème': '#fdf6ea',
            'Brun rosé': '#dca47c', 'Brun clair': '#e6c6a5', 'Beige rose': '#e8d0d0'
        };

        for (let [coul, qte] of Object.entries(stockCouleurs)) {
            if (qte > 0) {
                labelsStock.push(coul); dataStock.push(qte); bgStock.push(colorMap[coul] || '#cccccc');
            }
        }

        const ctxStock = document.getElementById('chart-stock-couleurs');
        if (ctxStock) {
            if (window.chartStockCouleurs) window.chartStockCouleurs.destroy();
            window.chartStockCouleurs = new Chart(ctxStock, {
                type: 'doughnut',
                data: {
                    labels: labelsStock.length > 0 ? labelsStock : ['Stock vide'],
                    datasets: [{
                        data: dataStock.length > 0 ? dataStock : [1],
                        backgroundColor: bgStock.length > 0 ? bgStock : ['#ebedf0'],
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }
    } else {
        if (window.chartStockCouleurs) { window.chartStockCouleurs.destroy(); window.chartStockCouleurs = null; }
    }


    // --- 11. HEATMAP (CALENDRIER GITHUB) ---
    const checkHeatmap = document.getElementById('cfg-graph-heatmap');
    if (checkHeatmap && checkHeatmap.checked) {
        const heatmapContainer = document.getElementById('heatmap-container');
        if (heatmapContainer) {
            heatmapContainer.innerHTML = '';
            let oeufsParJour = {};
            pontes.forEach(p => {
                if (p.date) {
                    if (!oeufsParJour[p.date]) oeufsParJour[p.date] = 0;
                    oeufsParJour[p.date] += parseInt(p.quantite) || 0;
                }
            });

            let maxOeufs = Math.max(1, ...Object.values(oeufsParJour));
            let dateFin = new Date();
            let dateDebut = new Date();
            dateDebut.setDate(dateFin.getDate() - 364); // 52 semaines

            let currentDay = new Date(dateDebut);
            let html = '';
            for (let w = 0; w < 52; w++) {
                html += '<div style="display: flex; flex-direction: column; gap: 3px;">';
                for (let d = 0; d < 7; d++) {
                    let dateStr = currentDay.toISOString().split('T')[0];
                    let oeufs = oeufsParJour[dateStr] || 0;
                    
                    let bgColor = '#ebedf0'; // Vide
                    if (oeufs > 0) {
                        let ratio = oeufs / maxOeufs;
                        if (ratio < 0.25) bgColor = '#c6e48b';
                        else if (ratio < 0.5) bgColor = '#7bc96f';
                        else if (ratio < 0.75) bgColor = '#239a3b';
                        else bgColor = '#196127'; // Top production
                    }
                    
                    html += `<div title="${new Date(dateStr).toLocaleDateString('fr-FR')} : ${oeufs} œuf(s)" style="width: 12px; height: 12px; background: ${bgColor}; border-radius: 2px;"></div>`;
                    currentDay.setDate(currentDay.getDate() + 1);
                }
                html += '</div>';
            }
            heatmapContainer.innerHTML = html;
        }
    } else {
        const heatmapContainer = document.getElementById('heatmap-container');
        if (heatmapContainer) heatmapContainer.innerHTML = '';
    }

    // ==========================================================
    // GRAPHIQUES DES ONGLETS SECONDAIRES (Cheptel & Pontes)
    // ==========================================================

    // --- 12. CHEPTEL : Âge détaillé par poule ---
    const checkCheptelAge = document.getElementById('cfg-graph-cheptel-age');
    if (checkCheptelAge && checkCheptelAge.checked) {
        let labelsAge = [], dataAge = [], bgAge = [];
        let dateActuelle = new Date();

        // On trie les poules actives de la plus vieille à la plus jeune
        let poulesActives = poules.filter(p => p.statut !== 'Décédé' && p.statut !== 'Réforme' && p.dateArrivee);
        poulesActives.sort((a, b) => new Date(a.dateArrivee) - new Date(b.dateArrivee));

        poulesActives.forEach(p => {
            let diffAnnees = (dateActuelle - new Date(p.dateArrivee)) / (1000 * 60 * 60 * 24 * 365.25);
            labelsAge.push(p.nom);
            dataAge.push(diffAnnees.toFixed(1));
            // Si la poule a plus de 3 ans, on la met en rouge (alerte espérance)
            bgAge.push(diffAnnees >= 3 ? '#e53e3e' : '#4c8c4a'); 
        });

        const ctxChAge = document.getElementById('chart-cheptel-age');
        if (ctxChAge) {
            if (window.chartCheptelAge) window.chartCheptelAge.destroy();
            window.chartCheptelAge = new Chart(ctxChAge, {
                type: 'bar',
                data: {
                    labels: labelsAge.length ? labelsAge : ['Aucune date'],
                    datasets: [{ data: dataAge.length ? dataAge : [0], backgroundColor: bgAge, borderRadius: 4 }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, title: { display: true, text: 'Âge (Années)' } } }
                }
            });
        }
    } else { if (window.chartCheptelAge) window.chartCheptelAge.destroy(); }

    // --- 13. CHEPTEL : Répartition des races ---
    const checkCheptelRace = document.getElementById('cfg-graph-cheptel-race');
    if (checkCheptelRace && checkCheptelRace.checked) {
        let statsRaces = {};
        poules.forEach(p => {
            if (p.statut !== 'Décédé' && p.statut !== 'Réforme') {
                let r = p.race && p.race.trim() !== '' ? p.race : 'Inconnue';
                if (!statsRaces[r]) statsRaces[r] = 0;
                statsRaces[r]++;
            }
        });

        let labelsRace = Object.keys(statsRaces);
        let dataRace = Object.values(statsRaces);
        
        const ctxChRace = document.getElementById('chart-cheptel-race');
        if (ctxChRace) {
            if (window.chartCheptelRace) window.chartCheptelRace.destroy();
            window.chartCheptelRace = new Chart(ctxChRace, {
                type: 'doughnut',
                data: {
                    labels: labelsRace.length ? labelsRace : ['Vide'],
                    datasets: [{ data: dataRace.length ? dataRace : [1], backgroundColor: ['#e8a33d', '#4c8c4a', '#5d8aa3', '#e53e3e', '#e0cc9d', '#8a715a'], borderWidth: 2 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
            });
        }
    } else { if (window.chartCheptelRace) window.chartCheptelRace.destroy(); }

    // --- 14. PONTES : Évolution sur 90 jours ---
    const checkPontes90 = document.getElementById('cfg-graph-pontes-90j');
    if (checkPontes90 && checkPontes90.checked) {
        let stats90j = {};
        let date90j = new Date();
        date90j.setDate(date90j.getDate() - 90);
        
        // Initialiser les 90 derniers jours à 0
        for (let i = 89; i >= 0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            stats90j[d.toISOString().split('T')[0]] = 0;
        }

        pontes.forEach(p => {
            if (p.date >= date90j.toISOString().split('T')[0] && stats90j[p.date] !== undefined) {
                stats90j[p.date] += parseInt(p.quantite) || 0;
            }
        });

        let labels90 = [], data90 = [];
        for (let [dateStr, qte] of Object.entries(stats90j)) {
            labels90.push(new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
            data90.push(qte);
        }

        const ctxPontes = document.getElementById('chart-pontes-90j');
        if (ctxPontes) {
            if (window.chartPontes90) window.chartPontes90.destroy();
            window.chartPontes90 = new Chart(ctxPontes, {
                type: 'line',
                data: {
                    labels: labels90,
                    datasets: [{
                        label: 'Œufs récoltés',
                        data: data90,
                        borderColor: '#e8a33d',
                        backgroundColor: 'rgba(232, 163, 61, 0.2)',
                        borderWidth: 2, fill: true, tension: 0.2, pointRadius: 2
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    } else { if (window.chartPontes90) window.chartPontes90.destroy(); }

  }; // <--- FIN DE LA LECTURE DE LA BASE DE DONNÉES (t.oncomplete)
} // <--- FIN DE LA FONCTION actualiserDashboardPoules