# Beauty CA — PWA + Supabase

Version web installable (PWA) de l'application de suivi d'activité.

## Configuration Supabase déjà intégrée

Le projet est déjà relié à :

- Project URL : `https://cbgxfacrfcblckrwciuh.supabase.co`
- Publishable key : intégrée dans `src/lib/supabase.js`

La clé utilisée est une **publishable key**, prévue pour être utilisée dans une application web côté navigateur. Elle peut donc être présente dans un dépôt GitHub. **Ne jamais mettre de clé `service_role` dans cette application.**

La sécurité des données dépend des politiques **Row Level Security (RLS)** fournies dans `supabase/schema.sql`.

## Fonctionnalités

- Tableau de bord mensuel : CA total, prestations, produits, panier moyen.
- Répartition par paiement : **Espèce**, **Carte compte perso**, **Carte compte pro**.
- Encaissement d'une vente avec plusieurs prestations/produits.
- Historique mensuel regroupé en sous-catégories par moyen de paiement.
- Catalogue administrable : ajout, modification, suppression et ordre d'affichage.
- Ajout d'une image directement depuis le PC, envoyée dans **Supabase Storage**.
- Les 6 prestations extensions/remplissages sont affichées 2 par 2.
- Rehaussement, rehaussement avec teinture, browlift et dépose sont en pleine largeur.
- Connexion Supabase Auth : les données sont isolées par compte avec RLS.
- PWA installable sur PC, Android et iPhone/iPad selon les capacités du navigateur.
- Workflow GitHub Actions inclus pour GitHub Pages.

## 1. Initialiser la base Supabase

Avant la première utilisation :

1. Ouvre ton projet Supabase.
2. Va dans **SQL Editor**.
3. Copie tout le contenu de `supabase/schema.sql`.
4. Exécute le script.
5. Dans **Authentication > Providers**, vérifie que **Email** est activé.

Le script crée les tables, les politiques RLS et le bucket `catalog-images`.

## 2. Tester localement

Installe Node.js 20+ ou 22+, puis dans le dossier du projet :

```bash
npm install
npm run dev
```

La connexion Supabase fonctionne directement : aucun fichier `.env` n'est obligatoire.

Pour tester la version de production :

```bash
npm run build
npm run preview
```

## 3. Publier sur GitHub Pages

1. Crée un dépôt GitHub.
2. Envoie tout le contenu du dossier dans le dépôt.
3. Dans **Settings > Pages > Build and deployment**, choisis **GitHub Actions**.
4. Fais un push sur la branche `main`.

Le workflow `.github/workflows/deploy-pages.yml` construit et publie automatiquement la PWA. Il n'est plus nécessaire d'ajouter les identifiants Supabase dans les secrets GitHub puisque la publishable key et l'URL sont déjà intégrées au code client.

## 4. Configurer l'URL GitHub Pages dans Supabase

Quand GitHub Pages te donne l'URL finale de l'application, va dans :

**Supabase > Authentication > URL Configuration**

Puis renseigne :

- **Site URL** : l'URL GitHub Pages de l'application.
- **Redirect URLs** : ajoute également cette URL ; tu peux ajouter une variante avec `/**` si nécessaire.

C'est particulièrement important si la confirmation par e-mail est activée.

## 5. Images

Les images choisies depuis le PC sont envoyées dans le bucket Supabase `catalog-images`.
Le bucket est public uniquement pour permettre l'affichage des images. Les politiques Storage du script SQL limitent l'ajout, la modification et la suppression au dossier de l'utilisateur connecté.

## Données préchargées

Lors de la première connexion d'un compte, les 10 prestations de départ sont automatiquement ajoutées une seule fois. Les produits restent à ajouter depuis **Catalogue**.
