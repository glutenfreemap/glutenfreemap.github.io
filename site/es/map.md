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

permalink: /es/
layout: localized
lang: es
strings:
  category:
    label: Categoría
    all: (todas)
  district:
    label: Província
    all: (todas)
  certified:
    filter:
      label: Solo establecimientos certificados
      labelDetails: |
        La forma más segura de conseguir tu comida es acudir a establecimientos certificados por el Proyecto Sin Gluten de la Asociación Portuguesa de Celíacos (APC), o las cadenas de restauración que ofrecen productos marcados y validados por la APC.<br/>
        Para más información y certificaciones: <a href="https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/">https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/</a>.
    badge:
      certified: asesorado
      validated: validado
  text:
    filter:
      label: filtrar
  noResults: Sin resultados
  finalHint: Falta algún lugar?<br/><a href="/en/contacts.html">Dinos aquí</a>.
  map:
    viewOnMaps: Abrir con otro mapa
    centerMap: Centrar en la ubicación actual
---
{% include map.html %}
