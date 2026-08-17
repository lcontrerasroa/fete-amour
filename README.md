# fete-amour

Site d'infos pour les invités de la Fête de l'Amour — 14 ans de Leo & Adrien.
Samedi 29 août 2026, à la Ferme du Domaine, Broualan (35120).

## Pages
- `index.html` — page d'accueil unique (style kitsch GeoCities) : programme, accès, hébergement, inscription.
- `carte.html` — carte interactive d'accès (Leaflet), intégrée dans l'accueil et ouvrable en plein écran.
- `orga.html` — **page d'orga Leo & Adrien** (lien discret en pied de l'accueil) : checklist chrono / repas /
  référents / angles morts, météo de la ferme (Open-Meteo), thème clair-sombre. Les cases cochées et les
  référents sont **partagés via le Google Sheet** (onglet « Orga »), avec copie locale hors ligne et fusion
  horodatée ligne par ligne. Écriture protégée par un code d'accès (`ORGA_CODE` dans `apps-script.gs`),
  demandé une fois par appareil et jamais écrit dans la page. Source : scans dans `orga/` (non versionnés).

## Backend
`apps-script.gs` (anciennement `apps-script-livre-dor.gs`) sert le livre d'or **et** la liste d'orga,
sur le même Sheet et la même URL `/exec`. Après modification, il faut redéployer une **nouvelle version**
depuis Apps Script, sinon l'ancien code reste en ligne.

## Médias
- `pascal.gif` — Pascal le chien, détouré (fond transparent) depuis `perro-pascal.mp4`.

## Crédits
Fond de carte (c) contributeurs OpenStreetMap (licence ODbL), tuiles (c) CARTO.
