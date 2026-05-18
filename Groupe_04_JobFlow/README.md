# ⚡ JobFlow — Plateforme de matching CV / Offres d'emploi

> Un moteur IA adaptatif, augmenté d'agents spécialisés, pour transformer un CV brut et des offres d'emploi en recommandations de candidature **expliquables et actionnables**.

Une application alimentée par l'IA qui analyse votre CV, recherche les offres d'emploi correspondantes dans la base France Travail, et adapte automatiquement votre CV à chaque offre — pour maximiser vos chances d'être sélectionné.

![Status](https://img.shields.io/badge/statut-en%20développement-orange)
![Python](https://img.shields.io/badge/backend-Python%20%2F%20FastAPI-blue)
![React](https://img.shields.io/badge/frontend-React-61dafb)
![Claude API](https://img.shields.io/badge/IA-Claude%20API-7c3aed)
![France Travail](https://img.shields.io/badge/data-France%20Travail%20API-1d4ed8)

---

## 🎯 Pourquoi ce projet existe

JobFlow relie les étapes fragmentées de la recherche d'emploi en une expérience fluide et intelligente.

Le projet est explicitement **IA-first** : il s'appuie sur des données ouvertes en temps réel (API France Travail), traite les profils candidats via un pipeline structuré, et conserve une trace complète du raisonnement de matching.

---

## 🚀 Fonctionnalités clés

| Fonctionnalité | Description |
|---|---|
| 📄 **Analyse de CV** | Extraction automatique des compétences, expériences et formations depuis PDF/DOCX |
| 🤖 **Matching IA** | Score de similarité sémantique entre le profil candidat et les offres d'emploi |
| ✏️ **CV adaptatif** | Réécriture ciblée du CV par offre — mots-clés, mise en valeur, structure |
| ⚡ **Candidature express** | Postuler à une offre en quelques secondes, sans ressaisie |
| 📊 **Tableau de bord** | Score visuel de correspondance pour chaque offre |

---

## 🗺️ Parcours utilisateur

```
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
```

---

## 🏗️ Stack technique

| Couche | Technologie |
|---|---|
| APIs | API France Travail (offres d'emploi en temps réel) |
| IA / NLP | API Claude (Anthropic) — analyse CV, matching, réécriture |
| Backend | Python / FastAPI |
| Frontend | React |
| Traitement des données | Pipeline d'extraction PDF/DOCX |

---

## 🧠 Pourquoi des agents, et pas un pipeline classique ?

Un pipeline ETL classique est conçu pour des sources stables et prédéfinies. Il ne peut pas faire trois choses essentielles ici :

- **Adapter le traitement au profil** — les offres pertinentes dépendent des compétences, de la localisation et des préférences contractuelles. Les agents décident dynamiquement quels filtres et sources interroger.

- **Standardiser des entrées hétérogènes à la volée** — les CV arrivent dans des formats, structures et styles très variés. Les agents les normalisent plutôt que d'échouer ou d'exiger un mapping manuel.

- **Améliorer l'inférence croisée** — combiner profil de compétences, trajectoire de carrière, mots-clés d'une offre et contexte du marché n'est pas une jointure déterministe. Les agents pondèrent les signaux et arbitrent la pertinence.

---

## 🔒 Principes du pipeline

Le pipeline repose sur trois principes non négociables :

| Principe | Description |
|---|---|
| 🔍 **Traçabilité totale** | Aucune sortie boîte noire — chaque score de matching est explicable |
| 🛡️ **Dégradation gracieuse** | Une source défaillante n'arrête jamais l'exécution |
| 🔐 **Éthique & confidentialité** | Données traitées localement, jamais persistées sans consentement |

---

## 📦 Sources de données

- **API France Travail (Pôle Emploi)** — offres d'emploi en temps réel, filtrables par localisation, type de contrat et secteur
- **CV du candidat** — fichier PDF ou DOCX déposé par l'utilisateur, analysé et structuré par le pipeline IA

---

## ⚙️ Installation

```bash
# Cloner le repo
git clone https://github.com/groupe4/jobflow.git
cd jobflow

# Backend
pip install -r requirements.txt
cp .env.example .env        # renseigner les clés API
uvicorn backend.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

Variables d'environnement nécessaires (`.env`) :

```env
ANTHROPIC_API_KEY=your_key_here
FRANCE_TRAVAIL_CLIENT_ID=your_id_here
FRANCE_TRAVAIL_CLIENT_SECRET=your_secret_here
```

---

## 📊 État du projet

> 🚧 **En cours de développement**

Le socle déterministe est opérationnel : parsing de CV, structuration du profil, intégration de l'API France Travail et scoring de matching sont en place et testés.

- [x] Parsing CV (PDF / DOCX)
- [x] Structuration du profil candidat
- [x] Intégration API France Travail
- [x] Scoring de matching sémantique
- [ ] CV adaptatif par offre
- [ ] Interface candidature express
- [ ] Tableau de bord complet

---

## 👥 Équipe

Groupe 4
