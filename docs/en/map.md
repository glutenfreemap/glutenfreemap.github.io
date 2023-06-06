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

permalink: /en/
layout: localized
lang: en
strings:
  category:
    label: Category
    all: (all)
  district:
    label: District
    all: (all)
  certified:
    filter:
      label: Only certified establishments
      labelDetails: |
        The safest way to get your meal is to go to establishments certified by the Gluten Free Project of the Portuguese Celiac Association (APC).
        For more information and certifications: <a href="https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/">https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/</a>.
    badge: certified
  noResults: No results
  finalHint: Is there a missing location?<br/><a href="/en/contacts.html">Tell us here</a>.
  map:
    viewOnGoogleMaps: View on Google Maps
    centerMap: Center on current location
---
{% include map.html %}
