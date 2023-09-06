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
lang: en
title: Contacts
emails:
  error: |
    Describe the problem here, and what the expected behaviour would be:
    
    
    Do not delete the following information, which will help us identify the cause of the problem:
    
  missing: |
    Name of the establishment:
    
    Category(ies): take-away, restaurant, pastry shop, ice cream shop, butcher, hotel
    
    Address:
    Indicate the address of the establishment. If you are not sure, at least indicate the town.

    Description:
    Give a brief description of the establishment, and to what extent it is suitable for celiac and gluten-intolerant people.
---
# Contacts

We try to ensure that the information presented on GlutenFreeMap is as correct and complete as possible. If you find an error, want to suggest a missing location or for any other matter related to this application, you can contact us and we will try to integrate your suggestions.

There are several contact forms, according to the type of contact:

- [**Report application errors**](mailto:glutenfreemap@aaubry.net?body={{ page.emails.error | url_encode | replace: "+", "%20" }}){:id="report-error"}  
  Use this option for any problem you find in the application, from errors during use to inaccuracies in the displayed information.

- [**Suggest a missing venue**](mailto:glutenfreemap@aaubry.net?body={{ page.emails.missing | url_encode | replace: "+", "%20" }})  
  Use this option to suggest an establishment that you think should be included in this application.

- [**Other topics**](mailto:glutenfreemap@aaubry.net?subject=GlutenFreeMap)  
  Use this option for suggestions, comments or other matters.
