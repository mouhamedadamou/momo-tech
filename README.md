# Momo Tech — Site e-commerce Free Fire (Bénin)

Site complet pour vendre des diamants et services Free Fire, avec paiement par
MTN Mobile Money à validation manuelle, et un espace administrateur sécurisé
pour gérer les commandes.

---

## 1. Technologies utilisées

| Côté | Techno | Rôle |
|---|---|---|
| Backend | Node.js + Express | Serveur, API REST |
| Base de données | SQLite (`better-sqlite3`) | Stockage des commandes, fichier local, aucun serveur à gérer |
| Authentification admin | JWT (cookie `httpOnly`) + `bcryptjs` | Session admin sécurisée, mot de passe jamais stocké en clair |
| Upload de fichiers | `multer` | Réception des preuves de paiement (JPG/PNG/PDF, 5 Mo max) |
| Sécurité HTTP | `helmet`, `express-rate-limit` | En-têtes sécurisés, limitation des tentatives de connexion et des commandes |
| Frontend | HTML / CSS / JavaScript natif | Aucun framework, chargement rapide, pas de build à faire |

Aucune clé API de paiement n'est utilisée : le client transfère lui-même
l'argent sur le numéro MTN Mobile Money indiqué, puis envoie une preuve. La
validation est **manuelle**, faite par vous depuis l'espace admin.

---

## 2. Installer le projet

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus (Node 22 est très bien).

```bash
cd momo-tech
npm install
```

Cela télécharge Express, better-sqlite3, etc. (nécessite une connexion internet).

---

## 3. Configurer le fichier `.env`

Le mot de passe admin **n'est jamais écrit dans le code**. Tout passe par des
variables d'environnement.

```bash
cp .env.example .env
```

Ouvrez `.env` et complétez :

- `JWT_SECRET` : une longue chaîne aléatoire. Générez-la avec :
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_USERNAME` : l'identifiant que vous utiliserez pour vous connecter à l'admin.
- `ADMIN_PASSWORD_HASH` : **ne mettez jamais le mot de passe en clair.** Générez le hash :
  ```bash
  npm run hash-password -- "VotreMotDePasse"
  ```
  Copiez la ligne `ADMIN_PASSWORD_HASH=...` affichée dans votre `.env`.

---

## 4. Lancer le site

```bash
npm start
```

Le site est disponible sur **http://localhost:3000**
L'espace admin est sur **http://localhost:3000/admin**

Pour le développement (redémarrage automatique) :

```bash
npm run dev
```

---

## 5. Configurer la base de données

Rien à installer : au premier démarrage, le serveur crée automatiquement le
fichier `database/momo-tech.db` (SQLite) et la table `orders`. Ce fichier
contient toutes les commandes ; pensez à le sauvegarder régulièrement (copie
du dossier `database/`) si vous êtes en production.

---

## 6. Configurer l'espace administrateur

1. Allez sur `/admin`.
2. Connectez-vous avec `ADMIN_USERNAME` et le mot de passe que vous avez haché à l'étape 3.
3. Vous arrivez sur le tableau de bord des commandes : filtres par statut,
   recherche, et une fiche détaillée par commande (clic sur une ligne) pour
   voir la preuve de paiement, changer le statut (`En attente`, `Payée`,
   `Traitée`, `Annulée`) et ajouter une note interne.

Pour changer le mot de passe plus tard : relancez `npm run hash-password --
"NouveauMotDePasse"` et remplacez `ADMIN_PASSWORD_HASH` dans `.env`, puis
redémarrez le serveur.

---

## 7. Déployer le site en ligne

Le projet est un serveur Node.js classique avec un fichier SQLite — il faut
donc un hébergement qui garde un processus Node actif (pas un hébergement
"statique seul"). Options simples et abordables :

- **Render.com** (recommandé pour débuter) : créez un "Web Service", reliez
  votre dépôt Git, commande de build `npm install`, commande de démarrage
  `npm start`. Ajoutez vos variables d'environnement (`JWT_SECRET`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `NODE_ENV=production`) dans
  l'onglet "Environment". Activez un disque persistant pour que
  `database/` et `uploads/` survivent aux redéploiements.
- **Railway.app** : principe identique à Render.
- **VPS** (ex. un petit serveur chez un hébergeur africain ou international) :
  installez Node.js, clonez le projet, `npm install --production`, lancez
  avec un gestionnaire de process comme `pm2` (`pm2 start server/index.js
  --name momo-tech`), et mettez Nginx devant pour le HTTPS.

Dans tous les cas :
- Mettez `NODE_ENV=production` en production (active les cookies `secure`).
- Servez le site en **HTTPS** (Render/Railway le font automatiquement).
- Sauvegardez régulièrement `database/momo-tech.db` et le dossier `uploads/`.

---

## 8. Où modifier les prix et les coordonnées

Un seul endroit pour chaque chose — pas besoin de toucher au code :

- **Prix et offres** : `server/data/pricing.json`
  (packs de diamants et abonnements/services — ajoutez, retirez ou modifiez
  une entrée, le site et le formulaire de commande se mettent à jour
  automatiquement).
- **Numéro MTN, WhatsApp, e-mail** : `server/data/contact.json`

Après modification, redémarrez le serveur (`npm start`) pour que les
changements soient pris en compte.

> **À vérifier :** le champ `whatsappIntl` de `contact.json` est utilisé pour
> construire les liens `wa.me` (format attendu : indicatif pays + numéro,
> sans le `0` initial ni le `+`). Il a été rempli à partir du numéro fourni
> (`229` + `0197650741` sans le premier `0`) — ouvrez le site et cliquez sur
> un bouton "Commander sur WhatsApp" pour confirmer qu'il ouvre bien la bonne
> conversation, et ajustez cette valeur si besoin.

---

## 9. Sécurité — ce qui est déjà en place

- Mot de passe admin haché avec bcrypt, jamais stocké en clair, jamais dans le code.
- Session admin via cookie **httpOnly** signé (JWT) — inaccessible en JavaScript côté client.
- Validation de toutes les données de commande **côté serveur** (champs
  obligatoires, longueur, format), en plus de la validation côté navigateur.
- Le prix d'une commande est toujours recalculé côté serveur à partir de
  l'offre choisie — jamais fait confiance à une valeur envoyée par le client.
- Upload de preuve limité à JPG/PNG/PDF, 5 Mo maximum, nom de fichier
  aléatoire (pas le nom original), et vérification de la signature réelle du
  fichier (pas seulement l'extension ou le type déclaré).
- Limitation du nombre de tentatives de connexion admin et du nombre de
  commandes par heure et par IP (anti-abus).
- Les preuves de paiement ne sont accessibles que depuis l'espace admin
  authentifié — jamais via une URL publique.
- Variables sensibles (`JWT_SECRET`, identifiants admin) uniquement dans `.env`,
  qui est exclu du dépôt Git (`.gitignore`).

À faire vous-même avant une mise en production sérieuse : activer HTTPS,
choisir un `JWT_SECRET` réellement aléatoire et long, et sauvegarder la base
régulièrement.

---

## 10. Parcours complet (vérifié dans le code)

1. Le client choisit une offre → le formulaire de commande s'ouvre pré-rempli
   (offre + prix, en lecture seule).
2. Il saisit son UID Free Fire, son numéro WhatsApp, choisit "MTN Mobile
   Money" et voit les instructions de paiement (section Paiement).
3. Il effectue le transfert MTN de son côté, saisit la référence de
   transaction et téléverse sa preuve (JPG/PNG/PDF).
4. À l'envoi, le serveur valide tout, enregistre la commande avec le statut
   `En attente`, et affiche : *"Commande reçue. Votre paiement sera vérifié
   manuellement. Vous serez contacté sur WhatsApp après validation."*
5. La commande apparaît immédiatement dans `/admin` (triée par date, statut
   `En attente`), avec un lien vers la preuve de paiement.
6. Vous vérifiez le paiement MTN de votre côté, ouvrez la commande, passez le
   statut à `Payée` puis `Traitée`, ajoutez une note si besoin, et contactez
   le client sur WhatsApp.

---

## Structure du projet

```
momo-tech/
├── server/
│   ├── index.js            # Serveur Express
│   ├── db.js                # Connexion SQLite + schéma
│   ├── pricing.js           # Lecture du catalogue de prix
│   ├── data/
│   │   ├── pricing.json     # ⚙️ Prix des offres — à modifier ici
│   │   └── contact.json     # ⚙️ Numéro MTN / WhatsApp / e-mail — à modifier ici
│   ├── middleware/
│   │   ├── auth.js          # Vérification de session admin (JWT)
│   │   └── upload.js        # Règles d'upload des preuves de paiement
│   ├── routes/
│   │   ├── offers.js        # GET  /api/offers
│   │   ├── contact.js       # GET  /api/contact
│   │   ├── orders.js        # POST /api/orders
│   │   └── admin.js         # Routes protégées /api/admin/*
│   └── scripts/
│       └── hash-password.js # Génère un hash bcrypt pour .env
├── public/
│   ├── index.html            # Page d'accueil
│   ├── admin.html            # Espace admin
│   ├── css/
│   └── js/
├── uploads/                  # Preuves de paiement (créé automatiquement)
├── database/                 # Fichier SQLite (créé automatiquement)
├── .env.example
└── package.json
```
