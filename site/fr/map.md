---
# Copyright 2023 Antoine Aubry, Catarina Tavares
# 
# This file is part of GlutenFreeMap.
# 
# GlutenFreeMap is free software: you can redistribute it and/or modify it under the terms of
# the GNU General Public License as published by the Free Software Foundation,
# either version 3 of the License, or (at your option) any later version.
# 
# GlutenFreeMap is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
# without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License along with GlutenFreeMap.
# If not, see <https://www.gnu.org/licenses/>.

permalink: /fr/
layout: localized
lang: fr
strings:
  category:
    label: Categorie
    all: (toutes)
  district:
    label: District
    all: (tous)
  certified:
    filter:
      label: Établissements certifiés seulement
      labelDetails: |
        Le moyen le plus sûr d'obtenir votre repas est de vous rendre dans des établissements certifiés par le projet sans gluten de l'Association cœliaque portugaise (APC), ou les chaînes de restauration qui proposent des produits marqués et validés par l'APC.<br/>
        Pour plus d'informations et certifications : <a href="https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/">https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/</a>.
    badge:
      certified: certifié
      validated: validé
  text:
    filter:
      label: filtrer
  noResults: Pas de résultats
  finalHint: Un endroit manque-t-il?<br/><a href="/en/contacts.html">Dites-le nous ici</a>.
  map:
    viewOnGoogleMaps: Voir sur Google Maps
    centerMap: Centrer sur la localisation courrante
---
{% include map.html %}
