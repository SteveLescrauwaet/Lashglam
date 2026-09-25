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
