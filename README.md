# TSD & Fils - Application de Gestion

Application professionnelle de gestion pour entreprise de plomberie avec gestion des chantiers, techniciens, clients, stocks, factures et planning.

## 🚀 Fonctionnalités

### Pour les Techniciens
- ✅ Visualisation des chantiers assignés
- ✅ Suivi GPS en temps réel
- ✅ Gestion des heures de travail (pointage)
- ✅ Notes quotidiennes avec photos
- ✅ Partage de localisation
- ✅ Déclaration d'incidents
- ✅ Historique des missions

### Pour le Bureau (Office)
- ✅ Gestion complète des chantiers
- ✅ Affectation des techniciens
- ✅ Gestion des stocks et alertes
- ✅ Facturation et suivi des paiements
- ✅ Planning hebdomadaire
- ✅ Statistiques et rapports
- ✅ Gestion des clients
- ✅ Projets et portfolio

### Pour les Administrateurs
- ✅ Gestion des utilisateurs
- ✅ Paramètres système
- ✅ Envoi d'alertes
- ✅ Gestion des anniversaires
- ✅ Rapports avancés
- ✅ Configuration de l'entreprise

### Pour les Clients
- ✅ Suivi de leurs chantiers
- ✅ Visualisation des photos
- ✅ Évaluation des services
- ✅ Historique des interventions
- ✅ Factures et paiements

## 📦 Technologies

- **Frontend** : React + TypeScript + Vite
- **Styling** : Tailwind CSS (design custom)
- **Backend** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **Storage** : Supabase Storage
- **Maps** : OpenStreetMap / Leaflet

## 🛠️ Installation

### Prérequis
- Node.js 18+ installé
- Compte Supabase configuré

### Étapes

1. **Cloner le projet**
```bash
git clone <url-du-projet>
cd tsd-et-fils
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

4. **Lancer en développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🏗️ Structure du Projet

```
src/
├── components/           # Composants React
│   ├── TSDApp.tsx       # App principale (techniciens)
│   ├── OfficeApp.tsx    # App bureau
│   ├── LoginScreen.tsx  # Écran de connexion
│   ├── CreateAccountForm.tsx
│   ├── AdminSettings.tsx
│   └── ...
├── contexts/            # Contextes React
│   └── AuthContext.tsx  # Gestion auth
├── services/            # Services métier
│   └── database.ts      # Service CRUD Supabase
├── hooks/               # Hooks personnalisés
│   └── useDatabase.ts   # Hooks pour charger les données
├── utils/               # Utilitaires
│   ├── permissions.ts
│   ├── clientTexts.ts
│   └── initializeData.ts
├── constants/           # Constantes
│   └── theme.ts
└── lib/                 # Librairies
    └── supabase.ts      # Client Supabase

supabase/
└── migrations/          # Migrations SQL
    └── *.sql
```

## 📊 Base de Données

### Tables Principales

- **app_users** : Utilisateurs de l'application
- **profiles** : Profils Supabase Auth
- **technicians** : Données des techniciens
- **clients** : Données des clients
- **chantiers** : Chantiers/sites
- **stocks** : Gestion des stocks
- **invoices** : Factures
- **projects** : Projets/portfolio
- **planning** : Planning des interventions
- **reports** : Rapports générés
- **notifications** : Notifications utilisateurs
- **services** : Services proposés
- **reviews** : Avis clients
- **incidents** : Déclarations d'incidents
- **daily_notes** : Notes quotidiennes
- **work_shifts** : Pointages
- **admin_alerts** : Alertes admin
- **admin_settings** : Paramètres système

### Sécurité

- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Politiques de sécurité par rôle
- ✅ Authentification requise
- ✅ Permissions granulaires

## �� Rôles et Permissions

### Rôles Disponibles

1. **client** : Accès limité à ses propres données
2. **tech** : Gestion de ses chantiers et données personnelles
3. **office** : Gestion complète (CRUD) sauf paramètres admin
4. **admin** : Accès complet à toutes les fonctionnalités

### Permissions par Rôle

| Fonctionnalité | Client | Tech | Office | Admin |
|---------------|--------|------|--------|-------|
| Voir chantiers | Siens | Siens | Tous | Tous |
| Créer chantiers | ❌ | ❌ | ✅ | ✅ |
| Voir stocks | ❌ | ❌ | ✅ | ✅ |
| Gérer stocks | ❌ | ❌ | ✅ | ✅ |
| Voir factures | Siennes | ❌ | Toutes | Toutes |
| Créer factures | ❌ | ❌ | ✅ | ✅ |
| Voir rapports | ❌ | ❌ | ✅ | ✅ |
| Paramètres | ❌ | ❌ | ❌ | ✅ |
| Alertes | ❌ | Reçoit | Reçoit | Envoie |

## 📱 Utilisation

### Première Connexion

1. Créer un compte via l'écran d'inscription
2. Sélectionner votre rôle (client, tech, office)
3. Remplir les informations requises
4. Se connecter avec email et mot de passe

### Comptes Demo

Consultez `COMPTES_DEMO.md` pour les comptes de démonstration.

### Initialiser les Données

Pour initialiser les services, stocks et paramètres par défaut :

```typescript
import { initializeAllDefaults } from './utils/initializeData';

// Appeler une seule fois
await initializeAllDefaults();
```

## 🎨 Personnalisation

### Thème

Le thème est défini dans `src/constants/theme.ts`. Vous pouvez modifier :
- Couleurs primaires/secondaires
- Mode sombre/clair
- Typographie
- Espacements

### Langue

L'application supporte 3 langues :
- Français (par défaut)
- English
- العربية (Arabe)

La langue est sélectionnable dans les paramètres.

## 📈 Déploiement

### Build de Production

```bash
npm run build
```

Le build sera généré dans le dossier `dist/`.

### Déploiement Vercel

```bash
npm i -g vercel
vercel --prod
```

### Déploiement Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Variables d'Environnement

N'oubliez pas de configurer les variables d'environnement sur la plateforme de déploiement :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🧪 Tests

```bash
# Lancer les tests (si configurés)
npm test

# Build et vérifier
npm run build
npm run preview
```

## 📝 Documentation

- `GUIDE_UTILISATION.md` : Guide complet d'utilisation des services et hooks
- `MIGRATION_PRODUCTION.md` : Guide de migration vers la production
- `COMPTES_DEMO.md` : Comptes de démonstration

## 🐛 Résolution de Problèmes

### Erreur de connexion Supabase
- Vérifier les variables d'environnement dans `.env`
- Vérifier que l'URL et la clé sont correctes
- Vérifier que le projet Supabase est actif

### Erreur RLS
- Vérifier que les politiques RLS sont correctes
- Vérifier que l'utilisateur est authentifié
- Consulter les logs Supabase

### Erreur de build
- Supprimer `node_modules` et `package-lock.json`
- Réinstaller : `npm install`
- Retenter le build : `npm run build`

## 🤝 Support

Pour toute question ou problème :
1. Consulter la documentation
2. Vérifier les logs (console navigateur + Supabase)
3. Contacter l'équipe technique

## 📄 Licence

© 2024 TSD & Fils. Tous droits réservés.

## 🎯 Roadmap

### Version Actuelle (1.0.0)
- ✅ Gestion complète des chantiers
- ✅ Suivi GPS temps réel
- ✅ Gestion des stocks
- ✅ Facturation
- ✅ Planning
- ✅ Rapports

### Prochaines Versions
- 🔲 Application mobile native (React Native)
- 🔲 Notifications push
- 🔲 Intégration paiement mobile
- 🔲 Signature électronique
- 🔲 Export PDF avancé
- 🔲 Analytics avancés
- 🔲 Chat intégré
- 🔲 API publique

---

Développé avec ❤️ pour TSD & Fils
