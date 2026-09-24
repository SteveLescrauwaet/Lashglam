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
- Espèce / Carte compte perso / Carte compte pro ;
- historique mensuel regroupé par moyen de paiement ;
- tableau de bord mensuel ;
- thème noir et vieux rose ;
- PWA installable.

Version : 1.2.0
