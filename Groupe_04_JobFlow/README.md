## JobFlow — Plateforme de matching CV / Offres d'emploi
Une application alimentée par l'IA qui analyse votre CV, recherche les offres d'emploi correspondantes dans la base France Travail, et adapte automatiquement votre CV à chaque offre — pour maximiser vos chances d'être sélectionné.

Pourquoi ce projet existe
JobFlow relie les étapes fragmentées de la recherche d'emploi en une expérience fluide et intelligente.
Le projet est explicitement IA-first : il s'appuie sur des données ouvertes en temps réel (API France Travail), traite les profils candidats via un pipeline structuré, et conserve une trace complète du raisonnement de matching.
En une phrase Un moteur IA adaptatif, augmenté d'agents spécialisés, pour transformer un CV brut et des offres d'emploi en recommandations de candidature expliquables et actionnables.

Du CV brut à la candidature prête à l'envoi
CV déposé (PDF / DOCX)
        │
        ▼
┌──────────────────────────────┐
│   Extraction & structuration │
│  Compétences, expériences,   │
│  formations, préférences     │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│   Récupération des offres    │
│  API France Travail          │
│  (temps réel, filtrable)     │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│   Matching sémantique (IA)   │
│  Score de similarité,        │
│  alignement mots-clés,       │
│  classement profil ↔ offre   │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│   Génération de CV adaptatif │
│  Réécriture ciblée,          │
│  injection de mots-clés,     │
│  ajustement par offre        │
└─────────────┬────────────────┘
              │
              ▼
       Candidature en un clic


Pourquoi ce projet ne passerait pas à l'échelle sans agents
Un pipeline ETL classique est conçu pour des sources stables et prédéfinies. Il ne peut pas faire trois choses essentielles ici :
Adapter le traitement au profil : les offres pertinentes dépendent des compétences, de la localisation et des préférences contractuelles du candidat. Les agents décident dynamiquement quels filtres et sources interroger, plutôt que de tout récupérer aveuglément.


Standardiser des entrées hétérogènes à la volée : les CV arrivent dans des formats, structures et styles d'écriture très variés. Les agents les normalisent et les réconcilent, plutôt que d'échouer ou d'exiger un mapping manuel.


Améliorer l'inférence croisée : combiner le profil de compétences, la trajectoire de carrière, les mots-clés d'une offre et le contexte du marché n'est pas une jointure déterministe. Les agents pondèrent les signaux, arbitrent la pertinence et signalent les incohérences.



Fonctionnalités clés
Fonctionnalité
Description
📄 Analyse de CV
Extraction automatique des compétences, expériences et formations depuis PDF/DOCX
🤖 Matching IA
Score de similarité sémantique entre le profil candidat et les offres d'emploi
✏️ CV adaptatif
Réécriture ciblée du CV par offre — mots-clés, mise en valeur, structure
⚡ Candidature express
Postuler à une offre en quelques secondes, sans ressaisie
📊 Tableau de bord
Score visuel de correspondance pour chaque offre


Sources de données
API France Travail (Pôle Emploi) — offres d'emploi en temps réel, filtrables par localisation, type de contrat et secteur
CV du candidat — fichier PDF ou DOCX déposé par l'utilisateur, analysé et structuré par le pipeline IA

Parcours utilisateur
1. L'utilisateur dépose son CV (PDF ou DOCX)
        │
2. JobFlow analyse et structure le profil
        │
3. Les offres pertinentes sont récupérées depuis l'API France Travail
        │
4. Chaque offre est scorée par rapport au profil (% de correspondance)
        │
5. L'utilisateur sélectionne une offre → le CV est adapté pour cette offre
        │
6. L'utilisateur relit et postule


Stack technique
Couche
Technologie
APIs
API France Travail (offres d'emploi)
IA / NLP
API Claude (Anthropic) — analyse CV, matching, réécriture
Backend
Python / FastAPI
Frontend
React
Traitement des données
Pipeline d'extraction PDF/DOCX


Principes du pipeline
Le pipeline repose sur trois principes non négociables :
Traçabilité totale — aucune sortie boîte noire ; chaque score de matching est explicable
Dégradation gracieuse — une source défaillante n'arrête jamais l'exécution
Éthique & confidentialité — les données candidat sont traitées localement, jamais persistées sans consentement

État du projet
🚧 En cours de développement
Le socle déterministe est opérationnel : parsing de CV, structuration du profil, intégration de l'API France Travail et scoring de matching sont en place et testés.

Équipe
Groupe 4
