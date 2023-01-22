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
---
if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(function () {
            console.log("Service worker registered");

            // detect controller change and refresh the page
            var refreshing = false;
            navigator.serviceWorker.addEventListener("controllerchange", function() {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        });
} else {
    console.log("Service workers not available")
}

function ViewModel(storage) {
    var self = this;

    this.data = ko.observable({});

    this.language = ko.observable();

    this.loaded = ko.observable();
    this.mapLoaded = ko.observable();

    this.places = ko.computed(function() { return self.data().places; });

    this.filters = {
        category: {
            values: ko.computed(function() {
                var lang = self.language();
                var categories = self.data().categories;
                if (!lang || !categories) return [];

                return self.data().categories
                    .map(function(d) { return { id: d.id, name: d.name[lang] }; })
                    .sort(function(a, b) { return compareStringsIgnoreCase(a.name, b.name); });
            }),
            selected: ko.observable(),
            match: function(place) {
                var selected = this.selected();
                return selected == null || place.categories.indexOf(selected) != -1;
            }
        },
        district: {
            values: ko.computed(function() { return self.data().districts; }),
            selected: ko.observable(),
            match: function(place) {
                var selected = this.selected();
                return selected == null || place.district === selected;
            }
        },
        certified: {
            selected: ko.observable(false),
            match: function(place) {
                var selected = this.selected();
                return !selected || place.certified;
            }
        }
    };

    function bindToStorage(observable, key) {
        self.loaded.subscribe(function() {
            observable(storage.getItem(key));
            observable.subscribe(function(value) { storage.setItem(key, value); });
        });
    }

    bindToStorage(this.filters.category.selected, "filters.category");
    bindToStorage(this.filters.district.selected, "filters.district");
    bindToStorage(this.filters.certified.selected, "filters.certified");

    this.categoriesById = ko.computed(function() {
        return self.filters.category.values().reduce(function(a, c) { a[c.id] = c.name; return a; }, {});
    });

    this.visiblePlaces = ko.computed(function() {
        var places = self.places();
        if (!places) {
            return [];
        }

        return places.filter(function(place) {
            for (var filterName in self.filters) {
                if (!self.filters[filterName].match(place)) {
                    return false;
                }
            }
            return true;
        });
    });

    this.selectedPlace = ko.observable();

    this.gotoPlace = function (place) {
        var map = document.getElementById("map");
        var rect = map.getBoundingClientRect();

        try {
            window.scrollTo({
                top: window.pageYOffset + rect.top - rect.left,
                behavior: "smooth"
            });
        } catch(e) {
            window.scrollTo(0, window.pageYOffset + rect.top - rect.left);
        }

        self.selectedPlace(place);
    };

    this.getTranslatedValue = function (values) {
        var lang = self.language();
        return values[lang] || values.pt;
    };

    this.getCategory = function (id) {
        return self.categoriesById()[id];
    };
}

function subscribeAndUpdate(observable, handler) {
    observable.subscribe(handler);
    handler(observable());
}

function Deferred() {
    var self = this;
    this.promise = new Promise(function (resolve, reject) {
        self.resolve = resolve;
        self.reject = reject;
    });
}

function compareStringsIgnoreCase(a, b) {
    var lowerA = a.toLowerCase();
    var lowerB = b.toLowerCase();
    return lowerA < lowerB ? -1 : (lowerA > lowerB ? 1 : 0);
}

var futureViewModel = new Deferred();

function main(dataUrl, lang) {
    var viewModel = new ViewModel(window.localStorage);
    viewModel.language(lang);
    ko.applyBindings(viewModel);
    futureViewModel.resolve(viewModel);

    $.get(dataUrl, function(data) {
        data.districts.sort(function (a, b) {
            return compareStringsIgnoreCase(a.name, b.name);
        });
        data.places.sort(function (a, b) {
            return compareStringsIgnoreCase(a.name, b.name);
        });

        viewModel.data(data);
        viewModel.loaded(true);
    });
}

function initMap() {
    futureViewModel.promise.then(function (viewModel) {
        subscribeAndUpdate(viewModel.loaded, function (loaded) {
            if (!loaded) return;

            var map = new google.maps.Map(document.getElementById("map"), {
                zoom: 7,
                center: { lat: 40, lng: -8 },
                streetViewControl: false,
                gestureHandling: "greedy"
            });

            viewModel.mapLoaded(true);

            if (navigator.geolocation) {
                var centerBt = document.getElementById("center-bt");
                centerBt.parentNode.removeChild(centerBt);

                centerBt.addEventListener("click", function () {
                    centerBt.className = "center-button pending";

                    console.log("Requesting location");
                    navigator.geolocation.getCurrentPosition(
                        function (position) {
                            console.log("Location received", position);
                            centerBt.className = "center-button";

                            var pos = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                            };

                            map.setCenter(pos);
                        },
                        function (err) {
                            console.log("Location unavailable", err);
                            centerBt.className = "center-button";
                        }
                    );
                });

                map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerBt);
            }

            // Create popup
            var infoWindow = new google.maps.InfoWindow({});

            // Create markers
            var selectingPlaceFromMap = false;
            var markers = viewModel.places().map(function (place) {
                var marker = new google.maps.Marker({
                    map: map,
                    position: place.position,
                    title: place.name,
                    icon:  ["/assets/img/pin-", place.certified ? "green" : "black", ".svg"].join("")
                });

                marker.addListener("click", function () {
                    selectingPlaceFromMap = true;
                    return viewModel.selectedPlace(place);
                });
                place.marker = marker;
                return marker;
            });

            // Add a clusterer
            var markerCluster = new markerClusterer.MarkerClusterer({
                map: map,
                markers: viewModel.places().map(function (p) {
                    return p.marker;
                }),
                onClusterClick: function () {
                    infoWindow.close();
                    markerClusterer.defaultOnClusterClickHandler.apply(this, arguments);
                }
            });

            subscribeAndUpdate(viewModel.visiblePlaces, function (places) {
                infoWindow.close();

                markers.forEach(function (m) {
                    m.setMap(null);
                });

                markerCluster.clearMarkers(true);
                markerCluster.addMarkers(places.map(function (p) {
                    p.marker.setMap(map);
                    return p.marker;
                }));
            });

            subscribeAndUpdate(viewModel.selectedPlace, function (place) {
                if (place) {
                    if (!selectingPlaceFromMap) {
                        map.setZoom(12);
                    }
                    selectingPlaceFromMap = false;

                    map.panTo(place.position);

                    setTimeout(function () {
                        infoWindow.setOptions({
                            ariaLabel: place.name,
                            content: document.getElementById("popup").querySelector("div").cloneNode(true)
                        });
                        infoWindow.open({
                            anchor: place.marker,
                            shouldFocus: false,
                            map: map
                        });
                    }, 0);
                } else {
                    infoWindow.close();
                }
            });
        });
    });
}

if ("Android" in window) {
    document.body.className = "android";

    var menu = Array.prototype.slice.call(document.querySelectorAll("#navbarSupportedContent .nav-item")).map(function (li) {
        if (li.className.indexOf("dropdown") >= 0) {
            return {
                label: li.querySelector("a.dropdown-toggle").getAttribute("aria-label"),
                children: Array.prototype.slice.call(li.querySelectorAll(".dropdown-menu a")).map(function (link) {
                    return ({ label: link.textContent, url: link.href });
                })
            };
        } else {
            var link = li.querySelector("a");
            return { label: link.textContent, url: link.href };
        }
    });

    Android.setMenu(JSON.stringify(menu));
}

window.addEventListener("beforeinstallprompt", function (e) {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    if (window.localStorage.getItem("install-refused") === "yes") {
        return;
    }

    // Stash the event so it can be triggered later.
    var deferredPrompt = e;

    var installPrompt = new bootstrap.Toast(document.getElementById("installPrompt"), {
        autohide: false
    });
    installPrompt.show();

    document.getElementById("installButton").addEventListener("click", function (e) {
        // hide our user interface that shows our A2HS button
        installPrompt.hide();

        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then(function (choiceResult) {
            if (choiceResult.outcome === "accepted") {
                console.log("User accepted the A2HS prompt");
            } else {
                console.log("User dismissed the A2HS prompt");
            }
            deferredPrompt = null;
        });
    });

    document.getElementById("cancelButton").addEventListener("click", function (e) {
        window.localStorage.setItem("install-refused", "yes");
    });
});

$(function() {
    function matchUserAgent(userAgent, patterns) {
        var result = { name: "", version: "" };
        for(var i = 0; i < patterns.length; ++i) {
            var match = patterns[i].pattern.exec(userAgent);
            if (match) {
                result.name = patterns[i].name;
                result.version = match[1] || "";
                break;
            }
        }
        return result;
    }

    var userAgent = navigator.userAgent;

    var browser = matchUserAgent(userAgent, [
        { pattern: /(?:chrome|chromium|crios)(?:\/([0-9.]*))/i, name: "Chrome" },
        { pattern: /(?:firefox|fxios)(?:\/([0-9.]*))/i, name: "Firefox" },
        { pattern: /safari(?:\/([0-9.]*))/i, name: "Safari" }
    ]);

    var os = matchUserAgent(userAgent, [
        { pattern: /Android/, name: "Android" },
        { pattern: /(iPhone|iPad|iPod)/, name: "iOS" },
        { pattern: /Windows\s+(?:NT\s+)?([0-9.]*)/, name: "Windows" },
        { pattern: /Mac/, name: "Mac OS" },
        { pattern: /Linux|X11/, name: "Linux" }
    ]);

    if ("Android" in window) {
        browser = { name: "Android App", version: Android.getAppVersion() };
        os = { name: "Android", version: Android.getAndroidVersion() };
    }

    var instructionsPanel = document.getElementById(browser.name.toLowerCase() + "Instructions");
    if (instructionsPanel) {
        instructionsPanel.className = "";
    }

    var reportErrorLink = document.getElementById("report-error");
    if (reportErrorLink) {
        reportErrorLink.href += [
            "&os-type=" + encodeURIComponent(os.name),
            "&os-version=" + encodeURIComponent(os.version),
            "&browser-version=" + encodeURIComponent(browser.name),
            "&browser-version=" + encodeURIComponent(browser.version)
        ].join("");
    }
});
