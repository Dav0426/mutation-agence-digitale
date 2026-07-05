# MUTATION® — Agence de transformation digitale (site fictif)

Site vitrine one-page **dark immersif** pour une agence fictive de transformation digitale, dans l'esprit des studios Lusion / Active Theory / OHZI. Réalisé en **HTML / CSS / JS pur**, sans build ni framework.

> Projet de portfolio — Conçu & développé par **David Azoulay**, élève-ingénieur ECE Lyon.

## Aperçu

- **Preloader** compteur 0→100 avec rideau (skippable, < 1,5 s)
- **Hero WebGL** : icosaèdre wireframe + points, déformé par bruit simplex en vertex shader, rotation lente réactive à la souris (Three.js r160, modules ES via import map jsDelivr)
- **Marquee infini** Stratégie — Data — IA — Cloud — Expérience
- **Manifesto** avec révélation mot à mot au scroll
- **4 services** en lignes full-width (inversion fond acide au hover, flèche SVG)
- **3 études de cas fictives** avec visuels SVG/CSS, métriques accent et parallax léger
- **Compteurs animés**, **CTA bouton magnétique**, curseur custom, grain, smooth scroll (Lenis via CDN)

## Accessibilité & performance

- `prefers-reduced-motion` : preloader sauté, WebGL remplacé par un dégradé statique, marquee et reveals désactivés
- Fallback CSS animé si WebGL indisponible
- Curseur custom désactivé sur écran tactile
- `pixelRatio` plafonné à 2, scène en pause quand l'onglet est caché, géométrie < 15k sommets
- Responsive 375 / 768 / 1024 / 1440, contraste AA sur le corps de texte

## Structure

```
02-agence-mutation/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js      # preloader, curseur, scroll, reveals, compteurs, bouton magnétique
│   └── webgl.js     # scène Three.js du hero
└── README.md
```

## Lancer en local

Aucun build nécessaire. Un simple serveur statique suffit (les modules ES exigent `http://`, pas `file://`) :

```bash
npx serve .
# ou
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000>.

## Déploiement sur Vercel

1. Pousser le dossier sur un dépôt GitHub.
2. Sur [vercel.com](https://vercel.com) → **Add New Project** → importer le dépôt.
3. Framework preset : **Other** (site statique, aucune commande de build, output directory : racine).
4. **Deploy** — le site est en ligne en quelques secondes.

En CLI :

```bash
npm i -g vercel
vercel --prod
```

## Crédits

- [Three.js](https://threejs.org/) r160 (CDN jsDelivr)
- [Lenis](https://lenis.darkroom.engineering/) 1.1 (CDN jsDelivr)
- Polices [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) & [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)
- Bruit simplex GLSL : Ashima Arts / Ian McEwan (domaine public)

---

*Site fictif : toutes les entreprises, métriques et références clients sont inventées.*
