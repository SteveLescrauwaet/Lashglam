# Suivi Beauty – version GitHub Pages simple

Cette version est volontairement **sans React, sans Vite, sans npm et sans GitHub Actions**.
Elle fonctionne directement depuis `index.html` et est déjà configurée avec le projet Supabase fourni.

## Mise en ligne la plus simple

1. Dans ton dépôt GitHub, remplace les anciens fichiers par le contenu de ce dossier et fais **Commit changes**.
2. Dans **Settings > Pages**, choisis **Deploy from a branch** puis **main** et **/(root)**.
3. Attends environ 1 minute puis ouvre l'adresse GitHub Pages et fais `Ctrl + F5` une fois.

Le fichier `supabase/schema.sql` est conservé uniquement comme copie du schéma. Si tu l'as déjà exécuté dans Supabase, tu ne dois pas le refaire.

## Connexion Supabase

L'URL du projet et la publishable key sont déjà renseignées dans `app.js`.
Ne mets jamais de clé `service_role` dans ce projet.

## Fonctionnalités

- connexion Supabase par e-mail / mot de passe ;
- catalogue prestations + produits ;
- images choisies depuis le PC et stockées dans Supabase Storage ;
- prestations cil à cil / mixte / volume russe affichées par paires ;
- rehaussement, rehaussement avec teinture, Browlift et Dépose seuls sur une ligne ;
- panier et encaissement ;
- Espèce / CB perso / CB Pro ;
- historique mensuel regroupé par moyen de paiement ;
- tableau de bord mensuel ;
- thème noir et vieux rose ;
- PWA installable.

Version : 1.2.0


## Version 1.3.0
- Dans **Historique**, chaque prestation/produit d'une vente peut être supprimé séparément.
- Chaque vente peut aussi être supprimée entièrement.
- Une confirmation est demandée avant toute suppression.
- Si on supprime le seul élément d'une vente, l'application propose de supprimer la vente complète.
- Le chiffre d'affaires et les totaux par moyen de paiement se recalculent automatiquement après suppression.
- Aucun nouveau script SQL n'est nécessaire si `supabase/schema.sql` avait déjà été exécuté.


## Version 1.4.0
- Onglets : Nouvelle vente → Tableau de bord → Catalogue → Historique.
- L'application s'ouvre sur Nouvelle vente.
- Après validation, un message « Vente validée » s'affiche et l'application reste sur Nouvelle vente.


## Version 1.5.0
- Les moyens de paiement par carte sont renommés **CB perso** et **CB Pro**.
- Les identifiants internes Supabase restent inchangés afin de conserver la compatibilité avec les ventes déjà enregistrées.


## Version 1.6
- Le total du panier peut être modifié manuellement pour appliquer une remise.
- Le sous-total, la remise et le total payé apparaissent dans l’historique.
- Le chiffre d’affaires et les moyens de paiement utilisent automatiquement le montant réellement payé.
- Aucune modification SQL supplémentaire n’est nécessaire.
