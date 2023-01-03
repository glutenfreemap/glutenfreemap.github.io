
function ViewModel() {

    this.data = ko.observable({});
    this.loaded = ko.observable();
    this.mapLoaded = ko.observable();

    this.places = ko.computed(() => this.data().places);

    this.filters = {
        category: {
            values: ko.computed(() => this.data().categories),
            selected: ko.observable(),
            match: function(place) {
                const selected = this.selected();
                return selected == null || place.categories.indexOf(selected.id) != -1;
            }
        },
        district: {
            values: ko.computed(() => this.data().districts),
            selected: ko.observable(),
            match: function(place) {
                const selected = this.selected();
                return selected == null || place.district === selected.id;
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

    this.visiblePlaces = ko.computed(() => {
        const places = this.places();
        if (!places) {
            return [];
        }

        const filters = Object.values(this.filters);
        return places.filter(place => !filters.some(filter => !filter.match(place)));
    });

    this.selectedPlace = ko.observable();

    this.gotoPlace = (place) => {
        this.selectedPlace(place);
    };
}

function subscribeAndUpdate(observable, handler) {
    observable.subscribe(handler);
    handler(observable());
}

const viewModel = new ViewModel();

function main(dataUrl) {
    ko.applyBindings(viewModel);

    fetch(dataUrl, { cache: "force-cache" })
        .then(response => response.json())
        .then(data => {
            viewModel.data(data);
            viewModel.loaded(true);
        });
}

function initMap() {
    subscribeAndUpdate(viewModel.loaded, loaded => {
        if (!loaded) return;

        console.log("loaded!")

        const map = new google.maps.Map(document.getElementById("map"), {
            zoom: 7,
            center: { lat: 39.95411101672692, lng: -8.00837091713906 },
        });

        viewModel.mapLoaded(true);

        // Create popup
        const infoWindow = new google.maps.InfoWindow({});

        // Create markers
        viewModel.places().forEach(place => {
            const marker = new google.maps.Marker({
                map,
                position: place.position,
                title: place.name,
            });
            
            marker.addListener("click", () => viewModel.selectedPlace(place));
            place.marker = marker;
        });

        // Add a clusterer
        const markerCluster = new markerClusterer.MarkerClusterer({ map, markers: viewModel.places().map(p => p.marker) });

        subscribeAndUpdate(viewModel.visiblePlaces, places => {
            infoWindow.close();
            markerCluster.clearMarkers(true);
            markerCluster.addMarkers(places.map(p => p.marker));
        });

        subscribeAndUpdate(viewModel.selectedPlace, place => {
            if (place) {
                map.setZoom(14);
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
