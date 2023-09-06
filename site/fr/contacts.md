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

layout: page
lang: fr
title: Contacts
emails:
  error: |
    Décrivez le problème ici et quel serait le comportement attendu :
    
    
    Ne supprimez pas les informations suivantes, qui nous aideront à identifier la cause du problème :
    
  missing: |
    Nom de l'établissement :
    
    Catégories : plats à emporter, restaurant, pâtisserie, glacier, boucherie, hôtel
    
    Adresse:
    Indiquez l'adresse de l'établissement. Si vous n'êtes pas sûr, indiquez au moins l'emplacement.

    Description:
    Donnez une brève description de l'établissement et dans quelle mesure il est adapté aux personnes coeliaques et intolérantes au gluten.
---
# Contacts

Nous essayons de faire en sorte que les informations présentées sur GlutenFreeMap soient aussi correctes et complètes que possible. Si vous trouvez une erreur, souhaitez suggérer un lieu manquant ou pour toute autre question liée à cette application, vous pouvez nous contacter et nous essaierons d'intégrer vos suggestions.

Il existe plusieurs formulaires de contact, selon le type de contact :

- [**Signaler les erreurs d'application**](mailto:glutenfreemap@aaubry.net?body={{ page.emails.error | url_encode | replace: "+", "%20" }}){:id="report-error"}  
   Utilisez cette option pour tout problème rencontré dans l'application, des erreurs d'utilisation aux inexactitudes dans les informations affichées.

- [**Suggérer un lieu manquant**](mailto:glutenfreemap@aaubry.net?body={{ page.emails.missing | url_encode | replace: "+", "%20" }})  
   Utilisez cette option pour suggérer un établissement qui, selon vous, devrait être inclus dans cette application.

- [**Autres questions**](mailto:glutenfreemap@aaubry.net?subject=GlutenFreeMap)  
   Utilisez cette option pour des suggestions, des commentaires ou d'autres questions.
