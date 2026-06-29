/****************************************************************************
 * LIVRE D'OR — Fête de l'Amour
 * Backend Google Apps Script (gratuit) lié à un Google Sheet.
 *
 * --- INSTALLATION (une seule fois) ---
 * 1. Crée un Google Sheet, par ex. « Livre d'or - Fête de l'Amour ».
 * 2. Menu Extensions > Apps Script.
 * 3. Supprime le code par défaut, colle TOUT ce fichier, puis Enregistre.
 * 4. Déployer > Nouveau déploiement > (roue dentée) Type : Application web.
 *      - Description : livre d'or
 *      - Exécuter en tant que : Moi
 *      - Qui a accès : Tout le monde
 *    Déployer, puis « Autoriser l'accès » (choisis ton compte, Avancé >
 *    Accéder au projet si Google avertit).
 * 5. Copie l'URL de l'application web (elle finit par /exec).
 * 6. Donne-moi cette URL : je la colle dans index.html (constante
 *    GUESTBOOK_URL) et je pousse. Terminé !
 *
 * Astuce : après chaque modif du code, refais « Déployer > Gérer les
 * déploiements > (crayon) > Nouvelle version » pour publier les changements.
 ****************************************************************************/

const SHEET_NAME = 'Messages';
const MAX_NAME = 40;
const MAX_MSG  = 500;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Date', 'Prénom', 'Message']);
  }
  return sh;
}

// Enregistre un nouveau message (appelé par le formulaire du site).
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
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

// Renvoie les messages (JSONP si ?callback=..., sinon JSON brut).
function doGet(e) {
  const rows = getSheet_().getDataRange().getValues();
  rows.shift(); // enlève l'en-tête
  const entries = rows.map(function (r) {
    return {
      date: r[0] ? Utilities.formatDate(new Date(r[0]), 'Europe/Paris', 'dd/MM/yyyy') : '',
      name: r[1],
      message: r[2]
    };
  }).filter(function (x) { return x.name && x.message; }).reverse(); // plus récents d'abord

  const payload = JSON.stringify(entries);
  const cb = e && e.parameter && e.parameter.callback;
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
