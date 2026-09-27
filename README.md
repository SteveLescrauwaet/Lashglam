# LASHGLAM PWA – version 1.16.0

## Important : passage au code PIN uniquement

Cette version ne dépend plus d’une session Supabase enregistrée sur l’appareil. L’accès se fait avec le **code 2502** uniquement.

Avant de remettre les fichiers sur GitHub, exécute **une seule fois** dans Supabase > SQL Editor :

`supabase/update_v1.16_pin_only.sql`

Cette mise à jour conserve toutes les ventes, clientes, prestations et réglages existants. Elle crée des fonctions Supabase qui vérifient le code côté base de données.

Ensuite, remplace les fichiers du dépôt GitHub par ceux de cette version et fais **Commit changes**.

Le bouton **Verrouiller** redemande le code 2502. Aucun identifiant ni mot de passe n’est nécessaire sur un nouvel appareil.

> Remarque de sécurité : un code à 4 chiffres est moins robuste qu’un vrai compte avec mot de passe/MFA. Il correspond ici volontairement au niveau de protection demandé pour cette application.

---

# LASHGLAM PWA – version 1.15.0

Accès quotidien par code PIN uniquement : **2502**. L’identifiant et le mot de passe ne sont plus affichés. La session Supabase existante reste active en arrière-plan pour conserver les règles RLS et la sécurité de la base. Le bouton **Déconnexion** est remplacé par **Verrouiller**.

Aucune commande SQL n’est nécessaire pour cette mise à jour.

# LASHGLAM PWA – version 1.14.0

Logo LASHGLAM intégré dans l’application (écran de chargement, connexion et barre supérieure).

# Beauty CA PWA v1.13

Mise à jour des moyens de paiement :

- **Espèces** : bouton vert
- **CB Perso** : bouton orange
- **CB Pro** : bouton jaune

Les identifiants internes Supabase restent inchangés (`espece`, `carte_perso`, `carte_pro`) : aucune modification SQL n'est nécessaire et les anciennes ventes restent compatibles.

---

# Beauty CA PWA v1.12

Mise à jour : dans **Nouvelle vente**, le client peut être recherché directement en tapant son prénom, son nom ou son numéro client. Les résultats apparaissent sous le champ et un clic sélectionne le client. La touche **Entrée** sélectionne également le premier résultat.

Aucune modification SQL Supabase n'est nécessaire par rapport à la v1.11.

# Suivi Beauty PWA — v1.11

Version directe pour GitHub Pages : aucun npm, aucun build et aucune GitHub Action n’est nécessaire.


## Nouveauté v1.11

- Dans l’**Historique**, chaque vente affiche maintenant automatiquement l’**heure à laquelle elle a été encodée** (HH:mm).
- La date reste la date de vente sélectionnée dans **Nouvelle vente**.
- Aucune mise à jour SQL Supabase n’est nécessaire pour cette fonction : l’heure d’encodage utilise le champ `created_at` déjà présent.

## Nouveauté v1.9

Le pourcentage de remise fidélité est maintenant **modifiable**. Dans l’onglet **Clients**, un bloc **Remise fidélité à partir du 5e RDV** permet de choisir le taux souhaité (par exemple 5 %, 10 %, 15 %, etc.).

- Le taux par défaut reste **10 %**.
- Le taux choisi est commun à tous les clients.
- Il s’applique automatiquement au **5e RDV avec prestation** et aux RDV suivants.
- Une vente uniquement composée de produits ne fait pas avancer le compteur de RDV.
- Le total du panier reste modifiable pour accorder une remise supplémentaire.
- Les anciennes ventes et les fiches clients existantes sont conservées.

## Mise à jour depuis la v1.8

Il y a une seule petite étape Supabase :

1. Ouvre **Supabase > SQL Editor**.
2. Ouvre le fichier `supabase/update_v1.9_loyalty_rate.sql` fourni dans ce ZIP.
3. Copie/colle son contenu dans SQL Editor.
4. Clique sur **Run**.
5. Remplace ensuite les anciens fichiers du dépôt GitHub par ceux du ZIP et fais **Commit changes**.

Après la mise à jour, va dans **Clients** pour choisir le pourcentage de fidélité. Tant que tu ne le changes pas, il reste fixé à 10 %.

GitHub Pages peut rester configuré sur :

- Source : **Deploy from a branch**
- Branch : **main**
- Folder : **/(root)**

## Nouvelle installation

Le fichier `supabase/schema.sql` contient le schéma complet à jour. Le fichier `supabase/update_v1.8_clients.sql` reste fourni pour l’historique des migrations.


## v1.11 - Recherche client
Dans **Nouvelle vente**, tapez directement le prénom, le nom ou le numéro client (CL0001…) pour retrouver rapidement une fiche. Cliquez ensuite sur le résultat pour sélectionner le client. Aucune mise à jour SQL Supabase n’est nécessaire.
