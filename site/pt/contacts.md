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
lang: pt
title: Contactos
emails:
  error: |
    Descreva aqui o problema, e qual seria o comportamento esperado:
    
    
    Não apague a seguinte informação, que nos ajudará a identificar a causa do problema:
    
  missing: |
    Nome do estabelecimento:
    
    Categoria(s): take-away, restaurante, pastelaria, gelataria, talho, hotel
    
    Morada:
    Indique a morada do estabelecimento. Se não tiver a certeza, indique pelo menos a localidade.

    Descrição:
    Dê uma breve descrição do estabelecimento, e em que medida é adequado para celíacos e intolerantes ao glúten.
---
# Contactos

Procuramos que a informação apresentada no GlutenFreeMap seja a mais correta e completa possível. Caso encontre algum erro, queira sugerir algum local em falta ou para qualquer outro assunto relacionado com esta aplicação, pode contactar-nos e tentaremos integrar as suas sugestões.

Existem vários formulários de contacto, de acordo com o tipo de contacto:

- [**Reportar erros na aplicação**](mailto:glutenfreemap@aaubry.net?body={{ page.emails.error | url_encode | replace: "+", "%20" }}){:id="report-error"}  
  Utilize esta opção para qualquer problema que encontre na aplicação, desde erros durante a utilização a incorreções na informação apresentada.

- [**Sugerir um estabelecimento em falta**](mailto:glutenfreemap@aaubry.net?body={{ page.emails.missing | url_encode | replace: "+", "%20" }})  
  Utilize esta opção para sugerir um estabelecimento que considere que devia constar desta aplicação.

- [**Outros assuntos**](mailto:glutenfreemap@aaubry.net?subject=GlutenFreeMap)  
  Utilize esta opção para sugestões, comentários ou outros assuntos.
