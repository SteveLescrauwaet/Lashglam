# Suivi Beauty PWA — v1.8

Version directe pour GitHub Pages : aucun npm, aucun build et aucune GitHub Action n'est nécessaire.

## Nouveautés v1.8

- Ajout d'un **fichier Clients** avec un onglet dédié.
- Numérotation automatique : `CL0001`, `CL0002`, etc.
- Fiche client : **Prénom, Nom, E-mail, Téléphone**.
- Dans **Nouvelle vente**, il faut sélectionner ou créer le client avant de pouvoir choisir le moyen de paiement.
- Les anciennes ventes déjà présentes (notamment septembre) **ne créent aucun client automatiquement** et restent sans client associé.
- Fidélité : le **5e RDV avec prestation** bénéficie automatiquement de **10 % de remise**, puis la remise de 10 % reste active pour les ventes suivantes.
- Une vente ne contenant que des produits ne fait pas avancer le compteur de RDV. Une fois les 5 RDV atteints, la remise fidélité reste toutefois active également sur les ventes suivantes.
- Le total du panier reste modifiable : pour un client fidélisé, le total ne peut pas être remonté au-dessus du prix avec les 10 % de remise, mais une remise supplémentaire peut être accordée.
- L'export Excel mensuel contient maintenant le numéro de client, son nom, son e-mail et son téléphone.

## Mise à jour depuis la v1.7

Il y a une seule étape supplémentaire dans Supabase avant d'utiliser le fichier clients :

1. Ouvrir **Supabase > SQL Editor**.
2. Ouvrir le fichier `supabase/update_v1.8_clients.sql` fourni dans ce package.
3. Copier/coller tout son contenu dans SQL Editor.
4. Cliquer sur **Run**.

Ce script ne touche pas aux anciennes ventes et ne crée aucun client à partir de l'historique.

Ensuite, remplace simplement les anciens fichiers de ton dépôt GitHub par ceux de ce ZIP et fais **Commit changes**.

GitHub Pages peut rester configuré sur :

- Source : **Deploy from a branch**
- Branch : **main**
- Folder : **/(root)**

## Première utilisation du fichier clients

Le premier client créé recevra `CL0001`, le suivant `CL0002`, etc. Dans une nouvelle vente, sélectionne un client existant ou clique sur **+ Nouveau**. Le moyen de paiement reste bloqué tant qu'aucun client n'est sélectionné.

Le fichier `supabase/schema.sql` contient également le schéma complet mis à jour pour une nouvelle installation.
