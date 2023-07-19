/*
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
*/
if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(function () {
            console.log("Service worker registered");

            // detect controller change and refresh the page
            var refreshing = false;
            navigator.serviceWorker.addEventListener("controllerchange", function() {
                console.log("Service worked updated");
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        });
} else {
    console.log("Service workers not available")
}

function main() {
    var lastLanguage = null;
    if (window.localStorage) {
      lastLanguage = window.localStorage.getItem("preferences.language");
      if (!lastLanguage) {
        window.localStorage.setItem("fresh_install", "1");
      }
    }
  
    var languages = window.navigator.languages || [window.navigator.language || window.navigator.userLanguage];
    if (lastLanguage) {
      languages = Array.from(languages);
      languages.unshift(lastLanguage);
    }
  
    var language = languages.map(function(l) {
      return l.split("-")[0];
    }).filter(function(l) {
        return l == "pt" || l == "en" || l == "es" || l == "fr";
    })[0] ?? "pt";

    var prefix = "others";
    var redirect = true;

    if ("Android" in window) {
        prefix = "android";
        var version = window.Android.getAppVersion();
        if (version == 2) {
            redirect = false;
        }
    }

    if (redirect) {
        window.location = "https://glutenfreemap.org" + window.location.pathname;
    }

    document.querySelectorAll(".js-info").forEach(function(div) {
        div.style.display = "none";
    });

    document.getElementById(prefix + "-" + language).style.display = "block";
}

document.addEventListener("DOMContentLoaded", main);
