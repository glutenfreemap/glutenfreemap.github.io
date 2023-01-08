
function ViewModel(storage) {

    this.data = ko.observable({});

    this.language = ko.observable();

    this.loaded = ko.observable();
    this.mapLoaded = ko.observable();

    this.places = ko.computed(() => this.data().places);

    this.filters = {
        category: {
            values: ko.computed(() => {
                const lang = this.language();
                const categories = this.data().categories;
                if (!lang || !categories) return [];

                return this.data().categories
                    .map(d => ({ id: d.id, name: d.name[lang] }))
                    .sort((a, b) => compareStringsIgnoreCase(a.name, b.name));
            }),
            selected: ko.observable(),
            match: function(place) {
                const selected = this.selected();
                return selected == null || place.categories.indexOf(selected) != -1;
            }
        },
        district: {
            values: ko.computed(() => this.data().districts),
            selected: ko.observable(),
            match: function(place) {
                const selected = this.selected();
                return selected == null || place.district === selected;
            }
        },
        certified: {
            selected: ko.observable(false),
            match: function(place) {
                const selected = this.selected();
                return !selected || place.certified;
            }
        }
    };

    const bindToStorage = (observable, key) => {
        this.loaded.subscribe(() => {
            observable(storage.getItem(key));
            observable.subscribe(value => storage.setItem(key, value));
        });
    }

    bindToStorage(this.filters.category.selected, "filters.category");
    bindToStorage(this.filters.district.selected, "filters.district");
    bindToStorage(this.filters.certified.selected, "filters.certified");

    this.categoriesById = ko.computed(() => {
        return this.filters.category.values().reduce((a, c) => { a[c.id] = c.name; return a; }, {});
    });

    this.visiblePlaces = ko.computed(() => {
        const places = this.places();
        if (!places) {
            return [];
        }

        const filters = Object.values(this.filters);
        return places.filter(place => !filters.some(filter => !filter.match(place)));
    });

    this.selectedPlace = ko.observable();

    this.gotoPlace = place => {
        document.getElementById("map").scrollIntoView();
        this.selectedPlace(place);
    };

    this.getTranslatedValue = values => {
        const lang = this.language();
        return values[lang] || values.pt;
    };

    this.getCategory = id => this.categoriesById()[id];
}

function subscribeAndUpdate(observable, handler) {
    observable.subscribe(handler);
    handler(observable());
}

const viewModel = new ViewModel(window.localStorage);

function compareStringsIgnoreCase(a, b) {
    var lowerA = a.toLowerCase();
    var lowerB = b.toLowerCase();
    return lowerA < lowerB ? -1 : (lowerA > lowerB ? 1 : 0);
}

function main(dataUrl, lang) {
    viewModel.language(lang);
    ko.applyBindings(viewModel);

    fetch(dataUrl, { cache: "force-cache" })
        .then(response => response.json())
        .then(data => {
            data.districts.sort((a, b) => compareStringsIgnoreCase(a.name, b.name));
            data.places.sort((a, b) => compareStringsIgnoreCase(a.name, b.name));

            viewModel.data(data);
            viewModel.loaded(true);
        });
}


function initMap() {
    subscribeAndUpdate(viewModel.loaded, loaded => {
        if (!loaded) return;

        const map = new google.maps.Map(document.getElementById("map"), {
            zoom: 7,
            center: { lat: 39.95411101672692, lng: -8.00837091713906 },
            streetViewControl: false
        });

        viewModel.mapLoaded(true);
        
        if (navigator.geolocation) {
            const centerBt = document.getElementById("center-bt");
            centerBt.parentNode.removeChild(centerBt);
    
            centerBt.addEventListener("click", () => {
                centerBt.className = "center-button pending";

                navigator.geolocation.getCurrentPosition(
                    position => {
                        centerBt.className = "center-button";

                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                
                        map.setCenter(pos);
                    },
                    () => {
                        centerBt.className = "center-button";
                    }
                );
            });
    
            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerBt);
        }

        // Create popup
        const infoWindow = new google.maps.InfoWindow({});

        // Create markers
        const markers = viewModel.places().map(place => {
            const marker = new google.maps.Marker({
                map,
                position: place.position,
                title: place.name,
                icon: `/assets/img/pin-${ place.certified ? "green" : "black" }.svg`
            });
            
            marker.addListener("click", () => viewModel.selectedPlace(place));
            place.marker = marker;
            return marker;
        });

        // Add a clusterer
        const markerCluster = new markerClusterer.MarkerClusterer({
            map,
            markers: viewModel.places().map(p => p.marker),
            onClusterClick: function() {
                infoWindow.close();
                markerClusterer.defaultOnClusterClickHandler.apply(this, arguments);
            }
        });

        subscribeAndUpdate(viewModel.visiblePlaces, places => {
            infoWindow.close();

            markers.forEach(m => m.setMap(null));

            markerCluster.clearMarkers(true);
            markerCluster.addMarkers(places.map(p => {
                p.marker.setMap(map);
                return p.marker;
            }));
        });

        subscribeAndUpdate(viewModel.selectedPlace, place => {
            if (place) {
                map.panTo(place.position);

                setTimeout(function() {
                    infoWindow.setOptions({
                        ariaLabel: place.name,
                        content: document.getElementById("popup").querySelector("div").cloneNode(true)
                    });
                    infoWindow.open({
                        anchor: place.marker,
                        shouldFocus: false,
                        map,
                    });
                }, 0);
            } else {
                infoWindow.close();
            }
        });
    });
}
