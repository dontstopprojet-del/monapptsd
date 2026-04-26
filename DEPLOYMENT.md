# Guide de Déploiement Production - TSD et Fils

## Configuration Requise

### 1. Variables d'Environnement

Créez un fichier `.env` basé sur `.env.example`:

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
```

### 2. Base de Données Supabase

La base de données est déjà configurée avec:
- Toutes les migrations appliquées
- Politiques RLS optimisées
- Index de performance en place
- Sécurité renforcée

## Build de Production

### Installation des Dépendances

```bash
npm install
```

### Build Optimisé

```bash
npm run build
```

Cette commande génère:
- Code minifié avec Terser
- Console.log et debugger supprimés
- Code splitting optimisé (React, Supabase, Leaflet)
- Fichiers dans le dossier `dist/`

### Test Local

```bash
npm run preview
```

Accessible sur `http://localhost:4173`

## Déploiement

### Option 1: Netlify (Recommandé)

1. Connectez votre repository GitHub à Netlify
2. Configuration de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Variables d'environnement:
   - Ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
4. Les fichiers `_redirects` et `_headers` sont automatiquement pris en compte

### Option 2: Vercel

1. Importez votre projet dans Vercel
2. Configuration:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Ajoutez les variables d'environnement

### Option 3: Serveur Manuel

```bash
# Après avoir généré le build
npm run build

# Servir les fichiers statiques du dossier dist/
# avec un serveur web (nginx, Apache, etc.)
```

## Configuration Nginx (Exemple)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    root /chemin/vers/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

## Checklist Avant Déploiement

- [ ] Variables d'environnement configurées
- [ ] Build de production testé localement
- [ ] Base de données Supabase en production
- [ ] Politiques RLS vérifiées
- [ ] HTTPS configuré sur le domaine
- [ ] DNS pointant vers l'hébergement
- [ ] Sauvegarde de la base de données effectuée

## Supabase en Production

### Politiques RLS Actives

Toutes les tables ont des politiques RLS optimisées pour:
- Performance (auth.uid() encapsulé)
- Sécurité (accès restreint par rôle)
- Index sur toutes les clés étrangères

### Maintenance Base de Données

1. Sauvegardes automatiques activées dans Supabase
2. Monitoring des performances via le dashboard Supabase
3. Logs d'erreurs disponibles dans l'onglet Logs

## Monitoring et Logs

### Frontend

- Les `console.log` sont supprimés en production
- Utilisez les outils de monitoring (Sentry, LogRocket, etc.) si nécessaire

### Backend (Supabase)

- Dashboard Supabase: Logs SQL, Auth, Functions
- Monitoring des requêtes lentes
- Alertes sur erreurs critiques

## Performance

### Optimisations Appliquées

1. Code splitting par vendor (React, Supabase, Leaflet)
2. Compression Terser
3. Tree shaking automatique
4. Lazy loading des composants
5. Index database optimisés
6. Politiques RLS optimisées

### Métriques Attendues

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

## Sécurité

### En-têtes HTTP

Tous configurés dans `public/_headers`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- CSP (Content Security Policy)
- Permissions Policy

### Base de Données

- RLS activé sur toutes les tables
- Authentification Supabase
- Clés API protégées
- Pas d'exposition de clés privées

## Support

Pour toute question technique:
1. Vérifiez les logs Supabase
2. Consultez la documentation technique
3. Testez en mode preview local

## Rollback

En cas de problème:

```bash
# Revenir à une version précédente
git revert HEAD
npm run build
# Redéployer
```

## Notes Importantes

- Ne commitez JAMAIS le fichier `.env` (déjà dans .gitignore)
- Utilisez toujours HTTPS en production
- Testez toutes les fonctionnalités après déploiement
- Surveillez les métriques de performance les premiers jours
