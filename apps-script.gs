/****************************************************************************
 * FÊTE DE L'AMOUR — backend Google Apps Script (gratuit), lié au Google Sheet.
 *
 * Il gère deux choses :
 *   1. le LIVRE D'OR public (onglet « Messages »), pour index.html ;
 *   2. la LISTE D'ORGA partagée Leo/Adrien (onglet « Orga »), pour orga.html.
 *
 * --- MISE À JOUR (tu as déjà le livre d'or en place) ---
 * 1. Ouvre le Sheet > Extensions > Apps Script.
 * 2. Remplace TOUT le code par ce fichier.
 * 3. Change ORGA_CODE ci-dessous pour un code à toi (c'est lui qu'on tapera
 *    une fois sur chaque téléphone/ordi pour pouvoir cocher).
 * 4. Enregistre, puis Déployer > Gérer les déploiements > (crayon) >
 *    Version : Nouvelle version > Déployer.
 *    /!\ Il faut bien une NOUVELLE VERSION du déploiement EXISTANT. Si tu passes
 *        par « Nouveau déploiement », Google crée une deuxième application web
 *        avec une AUTRE URL /exec, et il faut alors reporter cette URL dans
 *        index.html (GUESTBOOK_URL) et orga.html (SYNC_URL).
 * 5. Avec une nouvelle version du même déploiement, l'URL ne change pas :
 *    rien à modifier dans le site.
 *
 * --- PREMIÈRE INSTALLATION (si tu repars de zéro) ---
 * Crée un Sheet, Extensions > Apps Script, colle ce fichier, puis
 * Déployer > Nouveau déploiement > Application web,
 * « Exécuter en tant que : Moi », « Qui a accès : Tout le monde ».
 * Copie l'URL qui finit par /exec et colle-la dans index.html (GUESTBOOK_URL)
 * et dans orga.html (SYNC_URL).
 *
 * Note sur le code d'accès : il protège l'écriture, pas la lecture. Il vit
 * ici, côté serveur — il n'est jamais écrit dans les pages du site.
 ****************************************************************************/

const SHEET_NAME = 'Messages';
const MAX_NAME = 40;
const MAX_MSG  = 500;

/* ====================== ORGA (liste partagée) ====================== */
const ORGA_SHEET = 'Orga';
const ORGA_CODE  = 'CHANGE-MOI';   // <-- mets ton code ici avant de déployer
const ORGA_MAX   = 45000;          // garde-fou : une cellule Sheets tient 50 000 caractères

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Date', 'Prénom', 'Message']);
  }
  return sh;
}

function getOrgaSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ORGA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ORGA_SHEET);
    sh.appendRow(['Etat (JSON)', 'Derniere modif', 'Par']);
    sh.getRange('A2').setValue('{"faits":{},"qui":{}}');
    sh.setColumnWidth(1, 420);
  }
  return sh;
}

function lireOrga_() {
  const sh = getOrgaSheet_();
  const brut = String(sh.getRange('A2').getValue() || '{}');
  let etat;
  try { etat = JSON.parse(brut); } catch (e) { etat = {}; }
  if (!etat.faits) etat.faits = {};
  if (!etat.qui)   etat.qui   = {};
  return {
    etat: etat,
    maj: String(sh.getRange('B2').getValue() || ''),
    par: String(sh.getRange('C2').getValue() || '')
  };
}

// Fusion horodatée : pour chaque ligne, la modification la plus récente gagne.
// C'est ce qui évite qu'un appareil resté longtemps hors ligne écrase le reste.
function fusionner_(a, b) {
  const out = { faits: {}, qui: {} };
  ['faits', 'qui'].forEach(function (bac) {
    const A = (a && a[bac]) || {}, B = (b && b[bac]) || {};
    for (const k in A) out[bac][k] = A[k];
    for (const k in B) {
      const vieux = out[bac][k];
      const tB = (B[k] && +B[k].t) || 0;
      const tA = (vieux && +vieux.t) || 0;
      if (!vieux || tB > tA) out[bac][k] = B[k];
    }
  });
  return out;
}

function ecrireOrga_(recu, par) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);                       // deux téléphones qui cochent en même temps
  try {
    const actuel = lireOrga_().etat;
    const fusion = fusionner_(actuel, recu);
    const json = JSON.stringify(fusion);
    if (json.length > ORGA_MAX) throw new Error('etat trop gros');
    const sh = getOrgaSheet_();
    sh.getRange('A2').setValue(json);
    sh.getRange('B2').setValue(Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm'));
    sh.getRange('C2').setValue(String(par || '').slice(0, MAX_NAME));
    return fusion;
  } finally {
    lock.releaseLock();
  }
}

/* ====================== Entrées HTTP ====================== */

// Écriture : livre d'or (par défaut) ou orga (mode:'orga').
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (data.mode === 'orga') {
      if (String(data.code || '') !== ORGA_CODE) return json_({ ok: false, error: 'code' });
      ecrireOrga_(data.etat || {}, data.par);
      return json_({ ok: true });
    }

    if (data.website) return json_({ ok: true });           // piège anti-bot rempli -> on ignore
    const name = String(data.name || '').trim().slice(0, MAX_NAME);
    const msg  = String(data.message || '').trim().slice(0, MAX_MSG);
    if (!name || !msg) return json_({ ok: false, error: 'vide' });
    getSheet_().appendRow([new Date(), name, msg]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Lecture : messages du livre d'or, ou état de l'orga si ?mode=orga.
// JSONP si ?callback=..., sinon JSON brut.
function doGet(e) {
  const p = (e && e.parameter) || {};

  if (p.mode === 'orga') {
    return sortie_(lireOrga_(), p.callback);
  }

  const rows = getSheet_().getDataRange().getValues();
  rows.shift(); // enlève l'en-tête
  const entries = rows.map(function (r) {
    return {
      date: r[0] ? Utilities.formatDate(new Date(r[0]), 'Europe/Paris', 'dd/MM/yyyy') : '',
      name: r[1],
      message: r[2]
    };
  }).filter(function (x) { return x.name && x.message; }).reverse(); // plus récents d'abord

  return sortie_(entries, p.callback);
}

function sortie_(obj, cb) {
  const payload = JSON.stringify(obj);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + payload + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
