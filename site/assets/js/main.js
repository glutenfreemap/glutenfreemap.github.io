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

function Changelog(storage) {
    var changeKeyPrefix = "change_viewed_";
    
    var latestChangeId = $("#latest-change").attr("data-latest-change-id");

    this.latestChange = ko.observable(latestChangeId);
    this.viewedChanges = ko.observableArray();
    
    this.isViewed = function (changeId) {
        return this.viewedChanges.indexOf(changeId) !== -1;
    }

    this.setViewed = function (changeId) {
        var alreadyViewed = this.isViewed(changeId);
        if (!alreadyViewed) {
            // Do not update the view model because we still want the change to appear as not viewed.
            storage.setItem(changeKeyPrefix + changeId, "1");
        }
        return alreadyViewed;
    }

    for (var key in storage) {
        if (key.indexOf(changeKeyPrefix) === 0) {
            var changeId = key.substring(changeKeyPrefix.length);
            this.viewedChanges.push(changeId);
        }
    }

    var isFreshInstall = storage.getItem("fresh_install") === "1";
    if (isFreshInstall) {
        window.localStorage.removeItem("fresh_install");
        this.setViewed(latestChangeId);
        this.viewedChanges.push(latestChangeId);
        return;
    }

    if (!document.getElementById("changelog") && !this.isViewed(latestChangeId)) {
        var newsPrompt = document.getElementById("newsPrompt");
        var lastNotifiedChangeKey = "last_change_notified";
        var lastNotifiedChangeId = storage.getItem(lastNotifiedChangeKey);
        if (newsPrompt && lastNotifiedChangeId !== latestChangeId) {
            var notification = new bootstrap.Toast(newsPrompt, {
                autohide: false
            });
            notification.show();
            
            $(newsPrompt).on("hide.bs.toast", function() {
                storage.setItem(lastNotifiedChangeKey, latestChangeId);
            });
        }
    }
}

function ViewModel(storage) {
    var self = this;

    this.data = ko.observable({});

    this.language = ko.observable(document.documentElement.getAttribute("lang"));
    this.changelog = new Changelog(storage);

    this.loaded = ko.observable();
    this.mapLoaded = ko.observable();

    this.places = ko.computed(function () { return self.data().places; });

    this.filters = {
        category: {
            selected: ko.observableArray(),
            match: function (place) {
                var selected = this.selected();
                return selected.length == 0 || place.categories.some(function(c) {
                    return selected.indexOf(c) >= 0;
                });
            },
            toggle: function(category) {
                var index = self.filters.category.selected.indexOf(category.id);
                if (index >= 0) {
                    self.filters.category.selected.splice(index, 1);
                } else {
                    self.filters.category.selected.push(category.id);
                }
            }
        },
        district: {
            selected: ko.observableArray(),
            match: function (place) {
                var selected = this.selected();
                return selected.length == 0 || selected.indexOf(place.district) >= 0;
            },
            toggle: function(district) {
                var index = self.filters.district.selected.indexOf(district.id);
                if (index >= 0) {
                    self.filters.district.selected.splice(index, 1);
                } else {
                    self.filters.district.selected.push(district.id);
                }
            }
        },
        text: {
            value: ko.observable().extend({ rateLimit: 500 }),
            match: function (place) {
                var value = this.lowerCaseValue();
                if (value.length == 0) {
                    return true;
                }

                const fieldToSearch = place.subtitle || place.name;
                return fieldToSearch.toLowerCase().indexOf(value) >= 0;
            }
        },
        certified: {
            selected: ko.observable(false),
            match: function (place) {
                var selected = this.selected();
                return !selected || place.attestation !== "none";
            }
        }
    };

    this.filters.category.values = ko.computed(function () {
        var lang = self.language();
        var categories = self.data().categories;
        if (!lang || !categories) return [];

        return categories
            .map(function (d) {
                return {
                    id: d.id,
                    name: d.name[lang],
                    selected: self.filters.category.selected.indexOf(d.id) >= 0
                };
            })
            .sort(function (a, b) { return compareStringsIgnoreCase(a.name, b.name); });
    });

    this.filters.category.label = ko.computed(function() {
        var values = self.filters.category.values().filter(function(c) {
            return c.selected;
        });

        switch(values.length) {
            case 0:
                return "";

            case 1:
                return ": " + values[0].name;

            default:
                return ": " + values[0].name + "(+" + (values.length - 1) + ")";
        }
    });

    this.filters.district.values = ko.computed(function () {
        var districts = self.data().districts;
        if (!districts) return [];
        
        return districts
            .map(function (d) {
                return {
                    id: d.id,
                    name: d.name,
                    selected: self.filters.district.selected.indexOf(d.id) >= 0
                };
            })
            .sort(function (a, b) { return compareStringsIgnoreCase(a.id, b.id); });
    });

    this.filters.district.label = ko.computed(function() {
        var values = self.filters.district.values().filter(function(c) {
            return c.selected;
        });

        switch(values.length) {
            case 0:
                return "";

            case 1:
                return ": " + values[0].name;

            default:
                return ": " + values[0].name + "(+" + (values.length - 1) + ")";
        }
    });

    this.filters.text.lowerCaseValue = ko.computed(function() {
        var value = self.filters.text.value();
        return value && value.length ? value.toLowerCase() : "";
    });

    function bindToStorage(observable, key, parser) {
        self.loaded.subscribe(function () {
            var value = storage.getItem(key);
            var parsedValue = parser ? parser(value) : value;
            observable(parsedValue);

            observable.subscribe(function (value) { storage.setItem(key, value); });
        });
    }

    function parseArray(value) {
        return value && value.length && value !== "undefined" ? value.split(",") : [];
    }

    bindToStorage(this.filters.category.selected, "filters.category", parseArray);
    bindToStorage(this.filters.district.selected, "filters.district", parseArray);
    bindToStorage(this.filters.certified.selected, "filters.certified", function(value) { return value === "true"; });

    this.categoriesById = ko.computed(function () {
        return self.filters.category.values().reduce(function (a, c) { a[c.id] = c.name; return a; }, {});
    });

    function isVisible(place) {
        for (var filterName in self.filters) {
            if (!self.filters[filterName].match(place)) {
                return false;
            }
        }
        return true;
    }
    
    this.placesById = ko.computed(function() {
        var places = self.places();
        if (!places) {
            return {};
        }

        var placesById = {};
        places.forEach(function (place) {
            if (place.locations) {
                place.locations.forEach(function (location) {
                    placesById[location.id] = location;
                });
            } else {
                placesById[place.id] = place;
            }
        });
        return placesById;
    });

    this.visiblePlaces = ko.computed(function () {
        var places = self.places();
        if (!places) {
            return [];
        }

        var filteredPlaces = [];
        places.forEach(function (place) {
            if (place.locations) {
                var filteredLocations = place.locations.filter(isVisible);
                if (filteredLocations.length) {
                    var attestation = (filteredLocations.filter(function(l) { return l.attestation !== "none"; })[0] || filteredLocations[0]).attestation;

                    filteredPlaces.push({
                        id: place.id,
                        name: place.name,
                        attestation: attestation,
                        locations: filteredLocations
                    });
                }
            } else {
                if (isVisible(place)) {
                    filteredPlaces.push(place);
                }
            }
        });
        return filteredPlaces;
    });

    this.selectedPlace = ko.observable();
    this.expandedPlace = ko.observable();

    this.selectPlaceById = function (id) {
        var place = self.placesById()[id];
        self.selectedPlace(place);
        if (place.group) {
            self.expandPlace(place.group);
        }
    }

    this.togglePlace = function (place) {
        if (self.expandedPlace() === place) {
            self.expandedPlace(null);
        } else {
            self.expandedPlace(place);
        }
    }

    this.expandPlace = function (place) {
        self.expandedPlace(place);
    }

    this.isExpanded = function (place) {
        var expandedPlace = self.expandedPlace();
        return expandedPlace && expandedPlace.id === place.id;
    }

    this.isSelected = function (place) {
        return self.selectedPlace() === place;
    }

    this.gotoPlace = function (place) {
        var map = document.getElementById("map");
        var rect = map.getBoundingClientRect();

        try {
            window.scrollTo({
                top: window.pageYOffset + rect.top - rect.left,
                behavior: "smooth"
            });
        } catch (e) {
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

    this.getGoogleMapsUrl = function (place) {
        if (place.gid) {
            // gid is directly from Google Maps
            return ['https://www.google.com/maps/search/?api=1&query=', encodeURI(place.address.join(',')), '&query_place_id=', encodeURI(place.gid)].join('');
        } else {
            return ['https://www.google.com/maps/search/?api=1&query=', encodeURI(place.name), ",", encodeURI(place.address.join(','))].join('');
        }
    };
}

function subscribeAndUpdate(observable, handler) {
    observable.subscribe(handler);
    handler(observable());
}

function compareStringsIgnoreCase(a, b) {
    var lowerA = a.toLowerCase();
    var lowerB = b.toLowerCase();
    return lowerA < lowerB ? -1 : (lowerA > lowerB ? 1 : 0);
}

function main() {
    var viewModel = new ViewModel(window.localStorage);

    applyHostSpecificChanges(viewModel);
    
    window.viewModel = viewModel;
    ko.applyBindings(viewModel);

    var mapElement = document.getElementById("map");
    if (mapElement) {
        loadMap(mapElement);
    }
}

function WebBrowser() {
    function matchUserAgent(userAgent, patterns) {
        var result = { name: "", version: "" };
        for (var i = 0; i < patterns.length; ++i) {
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

    this.browser = matchUserAgent(userAgent, [
        { pattern: /(?:chrome|chromium|crios)(?:\/([0-9.]*))/i, name: "Chrome" },
        { pattern: /(?:firefox|fxios)(?:\/([0-9.]*))/i, name: "Firefox" },
        { pattern: /safari(?:\/([0-9.]*))/i, name: "Safari" }
    ]);

    this.os = matchUserAgent(userAgent, [
        { pattern: /Android/, name: "Android" },
        { pattern: /(iPhone|iPad|iPod)/, name: "iOS" },
        { pattern: /Windows\s+(?:NT\s+)?([0-9.]*)/, name: "Windows" },
        { pattern: /Mac/, name: "Mac OS" },
        { pattern: /Linux|X11/, name: "Linux" }
    ]);

    this.customizePage = function () { }

    this.setLanguage = function (lang) {
        window.localStorage.setItem("preferences.language", lang);
    }
}

function AndroidApp(nativeInterface) {
    this.browser = { name: "Android App", version: nativeInterface.getAppVersion() };
    
    var androidVersion = nativeInterface.getAndroidVersion();
    this.os = { name: "Android", version: androidVersion };

    this.customizePage = function () {
        document.body.className = "android android-" + androidVersion;

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

        nativeInterface.setMenu(JSON.stringify(menu));
    }

    this.setLanguage = function (lang) {
        nativeInterface.setLanguage(lang);
    }
}

function createHost() {
    if ("Android" in window) {
        return new AndroidApp(window.Android);
    } else if (window.location.search === "?android") {
        return new AndroidApp({
            getAppVersion: function () { return "fake" },
            getAndroidVersion: function () { return "1" },
            setMenu: function (menu) { console.log("Menu set", JSON.parse(menu)); },
            setLanguage: function (lang) {
                window.localStorage.setItem("preferences.language", lang);
            }
        });
    } else {
        return new WebBrowser();
    }
}

function applyHostSpecificChanges(viewModel) {
    var host = createHost();
    host.customizePage();

    $("button[data-target='#" + host.browser.name.toLowerCase() + "Instructions']").click();

    var reportErrorLink = document.getElementById("report-error");
    if (reportErrorLink) {
        reportErrorLink.href += encodeURIComponent([
            "os-type: " + host.os.name,
            "os-version: " + host.os.version,
            "browser-type: " + host.browser.name,
            "browser-version: " + host.browser.version
        ].join("\r\n"));
    }

    subscribeAndUpdate(viewModel.language, function(lang) {
        host.setLanguage(lang);
    });
}

function loadMap(mapElement) {
    var dataUrl = mapElement.getAttribute("data-url");

    $.get(dataUrl, function (data) {

        var loaders = [];

        data.places.forEach(function (p) {
            if (p.locations) {
                if (typeof p.locations === "string") {
                    var urlSegments = dataUrl.split('/');
                    var lastSegment = urlSegments.pop()
                    lastSegment = p.locations + '?' + lastSegment.split('?')[1];
                    urlSegments.push(lastSegment);
                    var url = urlSegments.join('/');

                    loaders.push($.get(url, function(subData) {
                        p.locations = subData;
                    }));
                }
            }
        });

        var emptyDescription = { pt: "" };

        $.when.apply($, loaders).then(function() {
            data.districts.sort(function (a, b) {
                return compareStringsIgnoreCase(a.name, b.name);
            });
            data.places.sort(function (a, b) {
                return compareStringsIgnoreCase(a.name, b.name);
            });

            var groupId = 1;
            data.places.forEach(function (p) {
                p.description = p.description || emptyDescription;
                p.id = p.id || p.gid;

                if (p.locations) {
                    p.id = "gr" + groupId++;

                    p.locations.sort(function (a, b) {
                        return compareStringsIgnoreCase(a.subtitle, b.subtitle);
                    });
                    p.locations.forEach(function (l) {
                        l.group = p;
                        l.name = p.name;
                        l.categories = p.categories;
                        l.attestation = p.attestation;
                        l.description = l.description || emptyDescription;
                        l.id = p.id + '-' + (l.id || l.gid);
                    });
                }
            });

            viewModel.data(data);
            viewModel.loaded(true);
        });
    });

    var protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    var map = new maplibregl.Map({
        container: "map-container",
        center: [-8.267, 39.608],
        zoom: 6.5,
        style: {
            version: 8,
            glyphs: "https://cdn.glutenfreemap.org/fonts/pbf/{fontstack}/{range}.pbf",
            sources: {
                "protomaps": {
                    type: "vector",
                    tiles: ["https://api.glutenfreemap.org/tiles/v2/{z}/{x}/{y}.pbf?key=34e1462a1b9ab8a0"],
                    attribution: 'Protomaps © <a href="https://openstreetmap.org">OpenStreetMap</a>',
                    maxzoom: 14
                }
            },
            layers: protomaps_themes_base.default("protomaps", "light")
        }
    });

    map.addControl(new maplibregl.NavigationControl());

    map.addControl(new maplibregl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));

    map.addControl(new maplibregl.FullscreenControl({
        container: mapElement
    }));

    map.on("load", function () {
        var images = new Promise(function (resolve, reject) {
            map.loadImage("/assets/img/pin-green.png", function (error, certifiedPin) {
                if (error) return reject(error);

                map.addImage("certified-marker", certifiedPin);
                map.loadImage("/assets/img/pin-black.png", function (error, nonCertifiedPin) {
                    if (error) return reject(error);

                    map.addImage("non-certified-marker", nonCertifiedPin);
                    resolve();
                });
            });
        });

        map.addSource("places", {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: []
            },
            promoteId: "id",
            cluster: true
        });

        map.on("mouseenter", "places", function () {
            map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "places", function () {
            map.getCanvas().style.cursor = "";
        });

        map.on("mouseenter", "clusters1", function () {
            map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "clusters1", function () {
            map.getCanvas().style.cursor = "";
        });

        // inspect a cluster on click
        map.on("click", "clusters1", function (e) {
            var features = map.queryRenderedFeatures(e.point, {
                layers: ["clusters1"]
            });

            var clusterId = features[0].properties.cluster_id;
            map.getSource("places").getClusterExpansionZoom(
                clusterId,
                function (err, zoom) {
                    if (err) return;

                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });

        map.on("click", "places", function (e) {
            return viewModel.selectPlaceById(e.features[0].properties.id);
        });

        // Create popup
        var popupOffset = 42;
        var infoWindow = new maplibregl.Popup({
            offset: popupOffset,
            anchor: "bottom"
        });

        function findPlaceInClusters(placesSource, clusterId, placeId, callback) {
            placesSource.getClusterChildren(clusterId, function (error, children) {
                if (error) return callback(error);
                for (var i = 0; i < children.length; ++i) {
                    var child = children[i];
                    if (child.properties.id === placeId) {
                        callback(null, clusterId, child);
                        return;
                    }
                    if (child.properties.cluster) {
                        findPlaceInClusters(placesSource, child.properties.cluster_id, placeId, callback);
                    }
                }
            });
        }

        subscribeAndUpdate(viewModel.selectedPlace, function (place) {
            if (place) {
                var coords = [place.position.lng, place.position.lat];

                // After moving, we may need to zoom if the place is inside a cluster
                map.once("moveend", function(evt) {
                    var clusters = map.queryRenderedFeatures(null, {
                        layers: ["clusters1"]
                    });

                    var placesSource = map.getSource("places");
                    clusters.forEach(function(cluster) {
                        if (cluster.properties.cluster) {
                            findPlaceInClusters(placesSource, cluster.properties.cluster_id, place.id, function (error, clusterId, feature) {
                                if (error) return console.error(error);

                                placesSource.getClusterExpansionZoom(
                                    clusterId,
                                    function (err, zoom) {
                                        if (err) return;
                    
                                        map.easeTo({
                                            center: coords,
                                            zoom: zoom
                                        });
                                    }
                                );
                            });
                        }
                    });
                });

                // Check if the place is already inside the map
                var bounds = map.getBounds();
                if (bounds.contains(coords)) {
                    map.easeTo({
                        center: coords,
                        offset: [0, popupOffset * 2]
                    });
                } else {
                    map.flyTo({
                        center: coords,
                        offset: [0, popupOffset * 2],
                        zoom: Math.max(map.getZoom(), 12)
                    });
                }

                setTimeout(function () {
                    infoWindow.setLngLat(coords);
                    infoWindow.setDOMContent(document.getElementById("popup").querySelector("div").cloneNode(true));
                    infoWindow.addTo(map);
                }, 0);
            } else {
                infoWindow.remove();
            }
        });

        function placeToFeature(place) {
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [place.position.lng, place.position.lat]
                },
                properties: {
                    id: place.id,
                    attestation: place.attestation
                }
            };
        }

        subscribeAndUpdate(viewModel.visiblePlaces, function (places) {
            var flatPlaces = places.flatMap(function (place) {
                return place.locations || place;
            });

            if (flatPlaces.length) {
                var visiblePlacesBounds = flatPlaces.reduce(
                    function (a, place) {
                        return a.extend([place.position.lng, place.position.lat]);
                    },
                    new maplibregl.LngLatBounds(flatPlaces[0].position, flatPlaces[0].position)
                );
                var mapBounds = map.getBounds();
                var visiblePlacesAreInMap =
                    mapBounds.contains(visiblePlacesBounds.getNorthEast()) &&
                    mapBounds.contains(visiblePlacesBounds.getSouthWest());
    
                if (!visiblePlacesAreInMap) {
                    map.fitBounds(visiblePlacesBounds, {
                        padding: 50,
                        maxZoom: 10
                    });
                }
            }

            map.getSource("places").setData({
                type: "FeatureCollection",
                features: flatPlaces.map(placeToFeature)
            });
        });

        viewModel.mapLoaded(true);

        images.then(function () {
            map.addLayer({
                id: "clusters1",
                type: "circle",
                source: "places",
                filter: ["has", "point_count"],
                paint: {
                    "circle-radius": 20,
                    "circle-color": "#0015e9",
                    "circle-opacity": 0.2
                }
            });

            map.addLayer({
                id: "clusters2",
                type: "circle",
                source: "places",
                filter: ["has", "point_count"],
                paint: {
                    "circle-radius": 16,
                    "circle-color": "#0015e9",
                    "circle-opacity": 0.4
                }
            });

            map.addLayer({
                id: "clusters3",
                type: "circle",
                source: "places",
                filter: ["has", "point_count"],
                paint: {
                    "circle-radius": 12,
                    "circle-color": "#0015e9",
                    "circle-opacity": 0.6
                }
            });

            map.addLayer({
                id: "cluster-count",
                type: "symbol",
                source: "places",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count_abbreviated}",
                    "text-font": ["NotoSans-Regular"],
                    "text-size": 12
                },
                paint: {
                    "text-color": "#ffffff"
                }
            });

            map.addLayer({
                id: "places",
                type: "symbol",
                source: "places",
                filter: ["!", ["has", "point_count"]],
                layout: {
                    "icon-image": [
                        "case",
                        ["!=", ["get", "attestation"], "none"], "certified-marker",
                        "non-certified-marker"
                    ],
                    "icon-anchor": "bottom",
                    "icon-size": 0.5
                }
            });
        });
    });
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

document.addEventListener("DOMContentLoaded", main);
