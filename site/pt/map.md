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

permalink: /pt/
layout: localized
lang: pt
strings:
  category:
    label: Categoria
    all: (todas)
  district:
    label: Distrito
    all: (todos)
  certified:
    filter:
      label: Apenas estabelecimentos certificados pela APC
      labelDetails: |
        A forma mais segura de obter a sua refeição passa por privilegiar a ida aos estabelecimentos certificados pelo Projeto Gluten Free da Associação Portuguesa de Celíacos (APC), ou a cadeias de restauração que oferecem produtos assinalados e validados pela APC.<br/>
        Para mais informações e certificações: <a href="https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/">https://www.celiacos.org.pt/como-certificar-o-seu-estabelecimento/</a>.
    badge:
      certified: certificado
      validated: validado
  text:
    filter:
      label: filtrar
  noResults: Sem resultados
  finalHint: Há algum local em falta?<br/><a href="/en/contacts.html">Diga-nos aqui</a>.
  map:
    viewOnMaps: Abrir com outro mapa
    centerMap: Centrar na localização corrente
---
{% include map.html %}
