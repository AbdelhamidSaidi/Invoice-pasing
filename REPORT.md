# Extraction d’informations structurées depuis des factures PDF
## Approche hybride par règles (regex) et appariement flou (RapidFuzz)

**Rapport de projet académique — Février 2026**

**Auteur :** Nom Prénom  \
**Encadrant(e) :** Nom Prénom  \
**Établissement / Département :** …

---

## Résumé

Ce rapport présente la conception et la réalisation d’un pipeline d’extraction d’informations à partir de factures au format PDF. L’objectif est de produire un objet `invoice_json` contenant des champs clés (fournisseur, numéro et date de facture, sous-total, taxe, total) à partir du texte extrait d’un PDF.

Nous proposons une approche **hybride et pragmatique** :

1. **Extraction de texte** à partir du PDF via `pdfplumber`.
2. **Normalisation** (minuscule, nettoyage de ponctuation, segmentation en lignes).
3. **Localisation robuste** des lignes pertinentes par **appariement flou** (RapidFuzz).
4. **Extraction structurée** des valeurs par **expressions régulières**.
5. **Exposition** sous forme d’une API HTTP et d’une interface web statique (HTML/CSS/JS).

Le projet vise un compromis entre **simplicité**, **interprétabilité** et **robustesse** face à la variabilité des formats de factures.

---

## Abstract

This report describes the design and implementation of an information-extraction pipeline for PDF invoices. The goal is to produce a structured `invoice_json` (supplier, invoice number and date, subtotal, tax, total) from extracted text. We use a hybrid approach: text extraction with `pdfplumber`, normalization and segmentation, fuzzy matching with RapidFuzz to locate relevant lines despite layout variations, and regular expressions for structured value capture. The project provides a simple HTTP API and a static HTML/CSS/JS front-end.

---

## Remerciements

Ce travail a été réalisé dans un cadre pédagogique. Nous remercions l’encadrant(e) et l’équipe enseignante pour leur accompagnement méthodologique, ainsi que les retours sur la définition du périmètre et la rigueur de la démarche.

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Contexte et état de l’art](#2-contexte-et-état-de-lart)
3. [Spécification et méthodologie](#3-spécification-et-méthodologie)
4. [Architecture du système](#4-architecture-du-système)
5. [Implémentation](#5-implémentation)
6. [Évaluation et analyse des erreurs](#6-évaluation-et-analyse-des-erreurs)
7. [Limites et perspectives](#7-limites-et-perspectives)
8. [Conclusion](#8-conclusion)
9. [Annexes](#9-annexes)
10. [Références](#10-références)

---

# 1. Introduction

## 1.1 Motivation

La facture est un document central des processus administratifs et comptables : achats, validation, paiement, archivage, contrôle fiscal. Dans de nombreuses organisations, une partie importante du temps reste consacrée à la **saisie manuelle** de champs (numéro, date, montants, taxe), à la **vérification** et au **rapprochement**.

Or, les factures sont de plus en plus disponibles sous forme de **PDF** (générés automatiquement par un ERP, reçus par e-mail, exportés depuis un portail fournisseur). L’extraction automatique d’informations depuis ces documents peut réduire significativement :

- les erreurs humaines,
- le temps de traitement,
- le coût global de la chaîne de facturation.

Cependant, l’extraction est difficile, car le PDF est un format orienté **rendu** (mise en page) plutôt que **structure** (tables/champs). Les factures varient également selon les pays, les langues, les conventions de devise, et la mise en page.

## 1.2 Objectifs

### Objectif principal

Étant donné un fichier PDF de facture, produire un objet JSON (nommé `invoice_json`) contenant :

- `supplier`
- `invoice_number`
- `invoice_date`
- `subtotal`
- `tax`
- `total`

Le système doit fonctionner en **mode interactif** (frontend web) et via **API**.

### Objectifs secondaires

- Robustesse aux variations de libellés (ex. « Total », « Amount due », « Grand total », « TVA », « VAT »).
- Interprétabilité : comprendre pourquoi un champ a été extrait (règles/regex explicites).
- Rapidité de développement et de déploiement (solution légère, sans données annotées).

## 1.3 Périmètre et hypothèses

### Périmètre inclus

- PDF **textuels** (non scannés) : extraction par lecture de contenu texte du PDF.
- Règles (regex) + appariement flou (fuzzy matching) pour améliorer la localisation des champs.
- API HTTP simple (Flask) acceptant un upload PDF.
- Interface web statique pour téléverser un document et afficher le JSON.

### Hors périmètre

- OCR (Tesseract, services cloud) pour PDF scannés.
- Extraction exhaustive de tables de lignes d’articles.
- Modèle appris supervisé (NER, CRF, deep learning) : pas de dataset annoté.
- Garantie « production » (durcissement sécurité, quotas, authentification, logs, etc.).

## 1.4 Contributions

- Un pipeline d’extraction hybride : texte → normalisation → localisation fuzzy → extraction regex → `invoice_json`.
- Une implémentation Python s’appuyant sur `pdfplumber` et RapidFuzz.
- Une API et une interface web statique.
- Une analyse des limites et des pistes d’amélioration.

---

# 2. Contexte et état de l’art

## 2.1 Le PDF : un format orienté mise en page

Le PDF vise à préserver la mise en page de manière fidèle. Cela implique :

- Les éléments (texte, images) sont positionnés par coordonnées.
- La notion de « ligne » ou de « cellule de tableau » n’est pas toujours explicite.
- L’ordre de lecture « naturel » peut être difficile à reconstruire.

Ainsi, lors de l’extraction, on observe fréquemment :

- des retours à la ligne inattendus,
- des espaces manquants,
- des colonnes concaténées,
- des fragments de texte dans un ordre perturbé.

Dans ce projet, on exploite `pdfplumber` car il est adapté aux PDF textuels et permet d’obtenir une chaîne de caractères exploitable.

## 2.2 Extraction d’information : règles vs modèles appris

L’extraction d’information (IE) transforme un contenu non structuré en données structurées. Deux grandes familles :

### Approches par règles

- Expressions régulières, dictionnaires de libellés, heuristiques.
- Avantages : rapides, interprétables, pas besoin de données annotées.
- Limites : fragiles aux variations, maintenance difficile à grande échelle.

### Approches statistiques / apprentissage

- NER, modèles séquence, deep learning, approches de type “document understanding”.
- Avantages : meilleure robustesse si entraînées sur un corpus divers.
- Limites : données + étiquetage + coût de calcul, complexité d’industrialisation.

Le projet privilégie une solution hybride légère (règles + fuzzy matching) pour maximiser le ratio valeur/effort.

## 2.3 Appariement approximatif de chaînes (fuzzy matching)

### 2.3.1 Principe

L’appariement approximatif vise à mesurer la similarité entre chaînes malgré des différences (erreurs, variantes, permutations). Les métriques peuvent reposer sur :

- la distance d’édition (Levenshtein),
- des ratios normalisés (0–100),
- des scores “token-based” (tri, ensembles).

### 2.3.2 Pourquoi en extraction de factures ?

Les factures contiennent souvent des libellés proches mais non identiques :

- “Tax” / “Taxes” / “VAT” / “TVA”
- “Amount due” / “Balance due” / “Total due”
- “Invoice #” / “Invoice No.” / “Invoice Number”

Une simple recherche exacte échoue. Le fuzzy matching permet de **localiser** des lignes “probables” même si le libellé change.

### 2.3.3 RapidFuzz

RapidFuzz fournit :

- des fonctions `fuzz.*` (scores de similarité),
- une API `process.extractOne` pour choisir le meilleur candidat parmi une liste.

Dans ce projet, on privilégie `fuzz.partial_ratio`, utile lorsque le mot-clé n’est qu’une sous-partie d’une ligne.

---

# 3. Spécification et méthodologie

## 3.1 Cas d’usage

Deux cas d’usage principaux :

1. **Utilisateur interactif** : téléverse un PDF via une page web, obtient un JSON et peut le télécharger.
2. **Intégration système** : envoie un PDF à une API, récupère un JSON pour traitement aval.

## 3.2 Données d’entrée et sortie

### Entrée

- Un fichier PDF (multipart/form-data).

### Sortie

Un JSON de forme :

```json
{
  "invoice_json": {
    "supplier": "...",
    "invoice_number": "...",
    "invoice_date": "...",
    "subtotal": "...",
    "tax": "...",
    "total": "..."
  }
}
```

## 3.3 Pipeline proposé

Le pipeline suit les étapes suivantes :

1. **Lecture du PDF** et extraction de texte (concaténation des pages).
2. **Normalisation** (minuscule, suppression de ponctuation, segmentation en lignes).
3. **Localisation fuzzy** des lignes candidates à partir de mots-clés.
4. **Extraction regex** (montants, identifiants, dates).
5. **Assemblage** dans `invoice_json`.

## 3.4 Normalisation

### Objectif

Réduire les variations superficielles et faciliter :

- la recherche fuzzy (éviter l’impact de la ponctuation),
- la correspondance de libellés,
- l’application de regex simples.

### Choix

- `lower()`
- remplacement des caractères non `[a-z0-9\s]` par un espace
- suppression des lignes vides

## 3.5 Localisation via fuzzy matching

### Formulation

On considère un ensemble de lignes candidates `L = {l1, …, ln}` (après normalisation). Pour un champ donné, on a un ensemble de mots-clés `K = {k1, …, km}`.

On recherche :

$$
\arg\max_{l \in L,\ k \in K} \text{score}(k, l)
$$

avec `score` issu de RapidFuzz (`partial_ratio`) et un seuil `T`.

### Intuition

Cette étape ne vise pas à extraire la valeur directement, mais à **réduire l’espace de recherche** aux segments pertinents.

## 3.6 Extraction regex

### 3.6.1 Montants

On exploite des patrons du type :

- libellé (tax/subtotal/etc.)
- séparateurs optionnels
- devise optionnelle
- nombre avec séparateur `.` ou `,`

Puis on normalise `, → .`.

### 3.6.2 Numéro de facture

Plusieurs patrons sont testés (invoice #, invoice no, etc.) et on retient la première occurrence.

### 3.6.3 Date

On détecte :

- `dd/mm/yyyy` (ou `dd-mm-yyyy`)
- `yyyy-mm-dd`
- variantes avec mois abrégé

Limite : ambiguïté si plusieurs dates apparaissent.

---

# 4. Architecture du système

## 4.1 Vue d’ensemble

Le système comprend :

- **Backend** : API Flask (`app.py`) exposant `POST /extract`.
- **Frontend** : fichiers statiques `static/index.html`, `static/style.css`, `static/script.js`.

Le navigateur envoie le PDF à l’API et affiche `invoice_json`.

## 4.2 Justification du découplage

- Le backend (Python) concentre la logique d’extraction (pdf + regex + fuzzy).
- Le frontend reste simple, portable et facilement modifiable.
- L’API peut être utilisée indépendamment du frontend (scripts, intégrations).

## 4.3 Contrat de l’API

- Endpoint : `POST /extract`
- Entrée : `multipart/form-data` avec champ `file`
- Sortie : JSON `{ "invoice_json": {...} }`

Gestion d’erreurs :

- 400 : fichier manquant/nom vide
- 500 : exception interne

## 4.4 CORS (développement)

Le backend ajoute des en-têtes permissifs :

- `Access-Control-Allow-Origin: *`

Cela simplifie les tests si le frontend est servi sur un autre port. En production, il faut restreindre ces règles.

---

# 5. Implémentation

## 5.1 Backend (Flask) : extraction

### 5.1.1 Lecture PDF

Le backend lit le flux binaire, puis utilise `pdfplumber.open(BytesIO(...))` et concatène le texte de toutes les pages.

Points d’attention :

- `extract_text()` peut renvoyer `None` selon la page, d’où l’usage de `or ""`.
- la concaténation multi-pages peut introduire des ambiguïtés ; une stratégie page-ciblée est une amélioration possible.

### 5.1.2 Normalisation et segmentation

Le texte normalisé est segmenté en lignes. La liste de lignes est la base du fuzzy matching.

### 5.1.3 Extraction “supplier” via fuzzy_extract

Le champ `supplier` est obtenu via la localisation fuzzy sur des mots-clés comme :

- `company`, `vendor`, `supplier`, `issued by`

Le résultat n’est pas un “nom normalisé” parfait ; il s’agit de la meilleure ligne candidate (utile pour extraction/contrôle).

### 5.1.4 Extraction des montants et autres champs

Les fonctions d’extraction :

- `extract_invoice_number`
- `extract_invoice_date`
- `extract_amount` (pour subtotal/tax)
- `extract_total`

renvoient des chaînes (ou `None`). Une amélioration serait de convertir en `Decimal` et d’appliquer une validation.

## 5.2 Frontend (HTML/CSS/JS)

### 5.2.1 Rôle

Le frontend :

- affiche un champ “upload PDF”,
- envoie un `FormData` vers `/extract`,
- affiche le JSON dans un `<pre>`,
- offre un bouton “Download JSON”.

### 5.2.2 Points d’implémentation

- Utilisation de `fetch`.
- Gestion d’état (bouton désactivé pendant la requête).
- Affichage d’erreurs lisibles.

### 5.2.3 Robustesse UX

Le frontend inclut un statut :

- “Uploading and extracting…”
- messages d’erreur serveur

Ce choix est important car l’extraction PDF peut prendre quelques secondes.

---

# 6. Évaluation et analyse des erreurs

## 6.1 Protocole

Une évaluation complète nécessite un corpus annoté. Dans le cadre du projet, on adopte une évaluation **qualitative** et **semi-quantitative** :

- vérifier que chaque champ est extrait lorsque présent,
- vérifier la cohérence des formats,
- analyser les cas d’échec pour améliorer les règles.

## 6.2 Métriques proposées

### 6.2.1 Taux d’extraction

$$
\text{taux} = \frac{\#\{\text{champs non nuls}\}}{\#\{\text{champs attendus}\}}
$$

### 6.2.2 Exactitude par champ

Lorsque la vérité terrain est disponible :

- exactitude stricte (égalité de chaîne)
- exactitude normalisée (espaces/séparateurs)
- tolérance numérique (écart relatif)

## 6.3 Typologie d’erreurs

### (E1) Valeur sur la ligne suivante

Certaines factures écrivent :

```
Total
123.45
```

Un pattern “libellé + valeur sur la même ligne” échoue.

**Piste :** après localisation fuzzy du libellé, analyser une fenêtre de lignes (ligne courante + suivante).

### (E2) Extraction de texte dégradée

Les PDF peuvent fragmenter :

- `1 234,56` en `1` `234,56`
- ou concaténer des colonnes

**Piste :** extraction structurée (tables) quand possible, ou post-traitement plus robuste.

### (E3) Ambiguïté entre dates

Plusieurs dates peuvent coexister (date de facture, échéance, commande). Un simple regex “première date” peut se tromper.

**Piste :** fuzzy matching sur des libellés proches de “invoice date”/“date de facture”.

### (E4) Faux positifs fuzzy

“total” peut apparaître dans des sections annexes (notes, tableaux). Le fuzzy matching localise une ligne plausible mais pas le champ voulu.

**Piste :** combiner score fuzzy + contraintes regex + heuristiques de position (bas de page pour total).

## 6.4 Performance

Le coût principal est l’ouverture/lecture du PDF. Les regex et scores fuzzy sur des dizaines/centaines de lignes restent généralement rapides.

---

# 7. Limites et perspectives

## 7.1 Limites

### PDF image (scan)

Sans OCR, l’extraction de texte peut être vide.

### Variabilité extrême des formats

Une approche par règles peut devenir difficile à maintenir si l’on doit couvrir des centaines de templates.

### Normalisation uniforme

Nettoyer trop agressivement peut dégrader certains champs (ex. identifiants avec tirets). Une normalisation par champ est préférable.

### Sécurité / industrialisation

Le serveur Flask est un serveur de développement. En production :

- serveur WSGI,
- limites de taille,
- authentification,
- logs/traces,
- CORS restreint.

## 7.2 Perspectives

### OCR optionnel

Ajouter un mode OCR conditionnel si l’extraction texte est vide.

### Fenêtre multi-lignes

Après localisation d’un libellé, analyser `±k` lignes autour.

### Validation métier

- vérifier `subtotal + tax ≈ total`
- validation de devise
- détection d’anomalies

### Approches apprenantes

À long terme : modèles entraînés ou pipelines hybrides (règles + modèle). Nécessite corpus annoté et gouvernance des données.

---

# 8. Conclusion

Le projet démontre qu’une solution **légère** et **interprétable** peut déjà extraire automatiquement des champs clés d’une facture PDF dans de nombreux cas (PDF textuels). L’usage combiné de `pdfplumber`, d’expressions régulières et de RapidFuzz améliore la robustesse face aux variations de libellés, tout en conservant un code simple à comprendre.

L’API et l’interface web statique facilitent l’expérimentation et l’intégration. Les limites identifiées (OCR, ambiguïtés, mise en page complexe) dessinent une feuille de route claire : extraction multi-lignes, validations, et potentiellement modèles appris pour franchir un palier de robustesse.

---

# 9. Annexes

## Annexe A — Spécification API

### Endpoint

- **Méthode :** `POST`
- **URL :** `/extract`
- **Type :** `multipart/form-data`
- **Champ :** `file` (PDF)

### Réponse succès (200)

```json
{
  "invoice_json": {
    "supplier": "...",
    "invoice_number": "...",
    "invoice_date": "...",
    "subtotal": "...",
    "tax": "...",
    "total": "..."
  }
}
```

### Erreurs

- 400 : champ `file` manquant / nom vide
- 500 : erreur interne

### Exemple curl

```bash
curl -F "file=@invoice.pdf" http://127.0.0.1:5000/extract
```

## Annexe B — Patrons regex (exemples)

| Champ | Exemple de libellés | Idée de patron (simplifiée) |
|---|---|---|
| Sous-total | subtotal, net amount | `\bsubtotal\b\s*[:\-]?\s*\$?\s*(\d+[.,]?\d*)` |
| Taxe | tax, vat, tva | `\b(tax|vat|tva)\b\s*[:\-]?\s*\$?\s*(\d+[.,]?\d*)` |
| Total | total, grand total, amount due | `\b(total|grand\s+total|amount\s+due)\b.*?(\d+[.,]?\d*)` |

## Annexe C — Glossaire

- **IE** : Information Extraction.
- **OCR** : Optical Character Recognition.
- **CORS** : Cross-Origin Resource Sharing.
- **Levenshtein** : distance d’édition.
- **Regex** : expressions régulières.

---

# 10. Références

- Gonzalo Navarro. *A guided tour to approximate string matching*. ACM Computing Surveys, 2001.
- RapidFuzz Contributors. *RapidFuzz*. https://github.com/rapidfuzz/RapidFuzz
- pdfplumber Contributors. *pdfplumber*. https://github.com/jsvine/pdfplumber
- Flask Documentation. https://flask.palletsprojects.com/
