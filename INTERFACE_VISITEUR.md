# 🌐 Interface Visiteur - Guide d'Utilisation

L'application intègre maintenant le site TSD & FILS avec une interface visiteur complète, en plus de l'application de gestion existante.

---

## ✨ Ce qui a été ajouté

### 🏠 Interface Visiteur (Par défaut)

Lorsque vous lancez l'application, vous verrez maintenant l'**interface visiteur** en premier :

#### **1. Page d'Accueil Visiteur**
- Présentation professionnelle de TSD & FILS
- 6 services détaillés avec icônes
- Statistiques de l'entreprise (7+ ans d'expérience, 500+ projets)
- Boutons d'appel à l'action
- Design moderne avec animations

#### **2. Formulaire de Demande de Devis**
- Nom, email, téléphone
- Type de service (Plomberie, Sanitaire, Chauffe-eau, etc.)
- Niveau d'urgence (Normal, Urgent, Urgence)
- Adresse et description détaillée
- Stockage automatique dans Supabase

#### **3. Page de Contact**
- Informations de contact complètes
- Formulaire de message
- Boîte d'urgence 24/7 bien visible
- Stockage des messages dans Supabase

---

## 🔄 Navigation

### Depuis l'Interface Visiteur

1. **Page d'accueil** → Par défaut à l'ouverture
2. **Cliquer sur "Demander un devis"** → Ouvre le formulaire de devis
3. **Cliquer sur "Nous Contacter"** → Ouvre la page de contact
4. **Cliquer sur "Voir les Services"** → Scroll vers la section services
5. **Cliquer sur "Espace Client"** → Passe à l'application de gestion

### Depuis l'Application de Gestion

- **Bouton "🏠 Retour Visiteur"** en haut à droite → Retourne à l'interface visiteur

---

## 🎨 Fonctionnalités Transversales

### Mode Sombre / Clair
- Bouton **🌙/☀️** en haut à droite (sur la page d'accueil visiteur)
- Sauvegardé automatiquement dans localStorage

### Multilingue (FR/EN)
- Bouton **🇫🇷/🇬🇧** en haut à droite (sur la page d'accueil visiteur)
- Traductions complètes de toute l'interface visiteur
- Sauvegardé automatiquement dans localStorage

### Persistance de la Navigation
- L'application se souvient si vous étiez en mode "visiteur" ou "client"
- Retourne automatiquement au bon mode à la prochaine visite

---

## 📊 Tables Supabase Utilisées

### Table `quote_requests` (Demandes de devis)

```sql
- id: UUID (auto-généré)
- name: Nom complet
- email: Email du visiteur
- phone: Téléphone
- service_type: Type de service demandé
- address: Adresse complète
- description: Description détaillée
- urgency: Niveau d'urgence (normal/urgent/emergency)
- status: Statut (pending par défaut)
- created_at: Date de création
```

### Table `contact_messages` (Messages de contact)

```sql
- id: UUID (auto-généré)
- name: Nom complet
- email: Email du visiteur
- phone: Téléphone
- message: Message du visiteur
- status: Statut (unread par défaut)
- created_at: Date de création
```

---

## 🔐 Sécurité (RLS)

- ✅ **Row Level Security** activé sur les deux tables
- ✅ **Tout le monde peut créer** des demandes (visiteurs anonymes)
- ✅ **Seuls les utilisateurs authentifiés** peuvent lire les demandes
- ✅ Parfait pour un site public avec gestion sécurisée

---

## 🚀 Workflow Complet

### Pour un Visiteur

```
1. Visite le site
   ↓
2. Explore les services
   ↓
3. Clique sur "Demander un devis"
   ↓
4. Remplit le formulaire
   ↓
5. Soumet la demande (stockée dans Supabase)
   ↓
6. Retourne à la page d'accueil
```

### Pour un Employé / Admin

```
1. Clique sur "Espace Client"
   ↓
2. Se connecte avec ses identifiants
   ↓
3. Accède à l'application de gestion complète
   ↓
4. Peut consulter les demandes de devis et messages
   ↓
5. Peut retourner à l'interface visiteur avec le bouton "Retour Visiteur"
```

---

## 💡 Utilisation des Données

### Consulter les Demandes de Devis (depuis l'app de gestion)

Les demandes de devis peuvent être consultées directement depuis l'application de gestion par les employés et admins.

### Consulter les Messages de Contact

Les messages de contact sont également accessibles depuis l'application de gestion.

---

## 📱 Design Responsive

L'interface visiteur est entièrement responsive :

- **Mobile** : Navigation simplifiée, grids adaptatifs
- **Tablette** : Disposition optimisée
- **Desktop** : Expérience complète avec toutes les fonctionnalités

---

## 🎯 Informations Intégrées

- **Entreprise** : TSD & FILS
- **Téléphone** : +224 610 55 32 55
- **Email** : contact@tsdetfils.com
- **Adresse** : Conakry, Guinée
- **Disponibilité** : 24h/24, 7j/7

---

## ✅ Statut

- ✅ Interface visiteur complète intégrée
- ✅ Application de gestion existante préservée
- ✅ Navigation fluide entre les deux modes
- ✅ Build optimisé et fonctionnel
- ✅ Base de données configurée
- ✅ Sécurité RLS en place

---

## 🔧 Personnalisation

### Modifier les Couleurs

Les couleurs sont définies en ligne dans les composants :
- `VisitorHomePage.tsx`
- `DevisForm.tsx`
- `ContactPage.tsx`

### Modifier les Textes

Les traductions sont dans les objets `texts` de chaque composant.

### Ajouter une Langue

Ajouter une nouvelle clé dans les objets `texts` et adapter le système de sélection de langue.

---

**L'interface visiteur est maintenant complètement intégrée et fonctionnelle !** 🎉
