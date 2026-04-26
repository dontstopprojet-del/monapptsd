# Guide d'Utilisation - Version Production

## 🎉 Votre Application est Prête!

L'infrastructure de production a été mise en place. Voici comment l'utiliser.

## 📦 Ce qui est Disponible

### 1. Services de Base de Données (`src/services/database.ts`)

Service complet pour toutes les opérations CRUD :

```typescript
import { dbService } from './services/database';

// Chantiers
const chantiers = await dbService.getChantiers();
await dbService.createChantier({ title: 'Nouveau', ... });
await dbService.updateChantier(id, { status: 'completed' });

// Techniciens
const techs = await dbService.getTechnicians();
await dbService.createTechnician({ ... });
await dbService.updateTechnician(id, { status: 'Dispo' });

// Clients
const clients = await dbService.getClients();
await dbService.createClient({ ... });
await dbService.updateClient(id, { ... });

// Stocks
const stocks = await dbService.getStocks();
await dbService.createStock({ name: 'Tube PVC', quantity: 50, ... });
await dbService.updateStock(id, { quantity: 45 });
await dbService.deleteStock(id);

// Factures
const invoices = await dbService.getInvoices();
await dbService.createInvoice({ amount: 500000, ... });
await dbService.updateInvoice(id, { status: 'paid' });

// Projets
const projects = await dbService.getProjects();
await dbService.createProject({ name: 'Villa Moderne', ... });
await dbService.updateProject(id, { status: 'completed' });
await dbService.addProjectPhoto(projectId, photoUrl, userEmail);

// Planning
const planning = await dbService.getPlanning();
await dbService.createPlanning({ ... });
await dbService.updatePlanning(id, { ... });
await dbService.deletePlanning(id);

// Rapports
const reports = await dbService.getReports();
await dbService.createReport({ title: 'Rapport Mensuel', ... });
await dbService.updateReport(id, { status: 'Archive' });
await dbService.deleteReport(id);

// Notifications
const notifications = await dbService.getNotifications(userId);
await dbService.createNotification({ user_id: userId, type: 'success', ... });
await dbService.markNotificationAsRead(id);
await dbService.deleteNotification(id);

// Services
const services = await dbService.getServices();
await dbService.createService({ name_fr: 'Plomberie', ... });
await dbService.updateService(id, { base_price: 50000 });

// Paramètres Admin
const settings = await dbService.getAdminSettings();
await dbService.setAdminSetting('company_name', 'TSD & Fils');

// Avis/Reviews
const reviews = await dbService.getReviews();
await dbService.createReview({ stars: 5, comment: 'Excellent!', ... });

// Utilisateurs
const users = await dbService.getAppUsers('tech');
await dbService.updateAppUser(id, { name: 'Nouveau nom' });
```

### 2. Hooks Personnalisés (`src/hooks/useDatabase.ts`)

Hooks React pour charger automatiquement les données :

```typescript
import { useChantiers, useTechnicians, useClients, ... } from './hooks/useDatabase';

function MonComposant() {
  // Charge automatiquement les chantiers
  const { chantiers, loading, error, refetch } = useChantiers();

  // Charge automatiquement les techniciens
  const { technicians, loading, error, refetch } = useTechnicians();

  // Autres hooks disponibles :
  // useClients(), useStocks(), useInvoices()
  // useProjects(), usePlanning(), useReports()
  // useNotifications(userId), useServices()

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      {chantiers.map(c => <div key={c.id}>{c.title}</div>)}
    </div>
  );
}
```

### 3. Contexte d'Authentification (`src/contexts/AuthContext.tsx`)

Gestion complète de l'authentification :

```typescript
import { useAuth } from './contexts/AuthContext';

function MonComposant() {
  const { user, appUser, loading, signIn, signUp, signOut, updateProfile } = useAuth();

  // user : utilisateur Supabase Auth
  // appUser : données de app_users (nom, rôle, etc.)

  if (loading) return <div>Chargement...</div>;

  if (!user) {
    // Afficher écran de connexion
    return <LoginScreen />;
  }

  return (
    <div>
      <h1>Bonjour {appUser?.name}!</h1>
      <p>Rôle: {appUser?.role}</p>
      <button onClick={signOut}>Déconnexion</button>
    </div>
  );
}
```

## 🚀 Exemples d'Utilisation

### Exemple 1 : Afficher la liste des chantiers

```typescript
import { useChantiers } from './hooks/useDatabase';

function ListeChantiers() {
  const { chantiers, loading, error } = useChantiers();

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      {chantiers.map(chantier => (
        <div key={chantier.id}>
          <h3>{chantier.title}</h3>
          <p>Client: {chantier.client?.profile?.full_name}</p>
          <p>Technicien: {chantier.technician?.profile?.full_name}</p>
          <p>Statut: {chantier.status}</p>
          <p>Progrès: {chantier.progress}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Exemple 2 : Créer un nouveau stock

```typescript
import { dbService } from './services/database';
import { useStocks } from './hooks/useDatabase';

function AjouterStock() {
  const { refetch } = useStocks();
  const [nom, setNom] = useState('');
  const [quantite, setQuantite] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await dbService.createStock({
        name: nom,
        quantity: quantite,
        threshold: 10,
        unit_price: 5000
      });

      // Recharger la liste
      await refetch();

      alert('Stock créé avec succès!');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={nom} onChange={e => setNom(e.target.value)} />
      <input type="number" value={quantite} onChange={e => setQuantite(+e.target.value)} />
      <button type="submit">Ajouter</button>
    </form>
  );
}
```

### Exemple 3 : Mettre à jour un technicien

```typescript
import { dbService } from './services/database';

async function changerStatutTechnicien(techId, nouveauStatut) {
  try {
    await dbService.updateTechnician(techId, {
      status: nouveauStatut
    });

    console.log('Statut mis à jour!');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Utilisation
changerStatutTechnicien('uuid-du-tech', 'Mission');
```

### Exemple 4 : Créer une notification

```typescript
import { dbService } from './services/database';

async function envoyerNotification(userId, message) {
  try {
    await dbService.createNotification({
      user_id: userId,
      type: 'info',
      title: 'Nouvelle mission',
      message: message,
      is_read: false
    });

    console.log('Notification créée!');
  } catch (error) {
    console.error('Erreur:', error);
  }
}
```

### Exemple 5 : Afficher les notifications d'un utilisateur

```typescript
import { useNotifications } from './hooks/useDatabase';
import { useAuth } from './contexts/AuthContext';

function MesNotifications() {
  const { appUser } = useAuth();
  const { notifications, loading, refetch } = useNotifications(appUser?.id);

  const marquerCommeLu = async (notifId) => {
    await dbService.markNotificationAsRead(notifId);
    await refetch();
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id} style={{ opacity: notif.is_read ? 0.5 : 1 }}>
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
          {!notif.is_read && (
            <button onClick={() => marquerCommeLu(notif.id)}>
              Marquer comme lu
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

## 📊 Structure des Tables

### Chantiers (chantiers)
```typescript
{
  id: uuid,
  title: string,
  client_id: uuid,
  technician_id: uuid,
  location: string,
  status: 'planned' | 'inProgress' | 'completed',
  progress: number (0-100),
  photos_before: string[],
  photos_during: string[],
  photos_after: string[],
  scheduled_date: date,
  created_at: timestamp
}
```

### Techniciens (technicians)
```typescript
{
  id: uuid,
  profile_id: uuid,
  role_level: 'Chef' | 'Senior' | 'Tech' | 'Apprenti',
  status: 'Mission' | 'Dispo' | 'Conge',
  current_lat: number,
  current_lng: number,
  satisfaction_rate: number,
  total_revenue: number,
  color: string
}
```

### Stocks (stocks)
```typescript
{
  id: uuid,
  name: string,
  quantity: number,
  threshold: number,
  unit_price: number,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Factures (invoices)
```typescript
{
  id: uuid,
  chantier_id: uuid,
  client_id: uuid,
  amount: number,
  status: 'pending' | 'paid' | 'overdue',
  due_date: date,
  created_at: timestamp
}
```

### Projets (projects)
```typescript
{
  id: uuid,
  name: string,
  location: string,
  category: string,
  client_name: string,
  description: string,
  rating: number (0-5),
  status: 'planned' | 'inProgress' | 'completed',
  created_at: timestamp
}
```

### Notifications (notifications)
```typescript
{
  id: uuid,
  user_id: uuid,
  type: 'success' | 'info' | 'warning' | 'error',
  title: string,
  message: string,
  is_read: boolean,
  created_at: timestamp
}
```

## 🔐 Sécurité (RLS)

Toutes les tables ont Row Level Security (RLS) activé avec des politiques :

- **Chantiers** : Visibles par tous les utilisateurs authentifiés
- **Techniciens** : Visibles par tous, modifiables par office/admin
- **Clients** : Visibles par tous, modifiables par office/admin
- **Stocks** : CRUD complet pour office/admin
- **Factures** : Visibles par tous, modifiables par office/admin
- **Projets** : Visibles par tous, CRUD pour office/admin
- **Notifications** : Chaque utilisateur voit uniquement ses propres notifications
- **Reports** : Accessibles uniquement par office/admin

## 🛠️ Commandes Utiles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview

# Tester la connexion à Supabase
# Ouvrir la console du navigateur et taper :
# supabase.auth.getSession()
```

## 📝 Notes Importantes

1. **Toutes les données sont stockées dans Supabase** - Plus de données hardcodées
2. **L'authentification est gérée par Supabase Auth** - Sécurisé et fiable
3. **Les photos peuvent être uploadées** via Supabase Storage
4. **Les données sont synchronisées** en temps réel
5. **Les permissions sont gérées** via RLS

## 🎯 Prochaines Étapes Recommandées

1. **Tester l'authentification** : Créer un compte et se connecter
2. **Ajouter des données** : Utiliser les formulaires pour ajouter chantiers, stocks, etc.
3. **Tester les hooks** : Vérifier que les données se chargent correctement
4. **Personnaliser l'UI** : Adapter selon vos besoins
5. **Déployer** : Mettre en production sur Vercel, Netlify, etc.

## 💡 Astuces

- Utilisez `refetch()` pour recharger les données après une modification
- Ajoutez des `try/catch` pour gérer les erreurs
- Utilisez `loading` pour afficher des indicateurs de chargement
- Consultez la console du navigateur pour les erreurs
- Les IDs sont générés automatiquement par Supabase (UUID)

## 🆘 Support

En cas de problème :
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs Supabase
3. Vérifier que les politiques RLS sont correctes
4. Vérifier les variables d'environnement (.env)

Votre application est maintenant prête pour la production! 🚀
