
function ViewModel(data, map) {
    this.filters = {
        category: {
            values: data.categories,
            selected: ko.observable(),
            match: function(place) {
                const selected = this.selected();
                return selected == null || place.categories.indexOf(selected.id) != -1;
            }
        },
        district: {
            values: data.districts,
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

    // Create popup
    const infoWindow = new google.maps.InfoWindow({});

    // Create markers
    const places = data.places.map(info => {
        const marker = new google.maps.Marker({
            map,
            position: info.position,
            title: info.name,
        });
        
        const place = {
            info,
            marker
        };

        marker.addListener("click", () => this.selectedPlace(place));

        return place;
    });

    this.visiblePlaces = ko.computed(() => {
        const filters = Object.values(this.filters);
        return places.filter(place => !filters.some(filter => !filter.match(place.info)));
    });

    const markerCluster = new markerClusterer.MarkerClusterer({ map, markers: places.map(p => p.marker) });

    this.visiblePlaces.subscribe(places => {
        infoWindow.close();
        markerCluster.clearMarkers(true);
        markerCluster.addMarkers(places.map(p => p.marker));
    });

    this.selectedPlace = ko.observable();

    this.gotoPlace = (place) => {
        this.selectedPlace(place);
    };

    this.selectedPlace.subscribe(place => {
        if (place) {
            map.setZoom(14);
            map.panTo(place.info.position);

            setTimeout(function() {
                infoWindow.setOptions({
                    ariaLabel: place.info.name,
                    content: document.getElementById("popup").querySelector("div").cloneNode(true)
                });
                infoWindow.open({
                    anchor: place.marker,
                    shouldFocus: false,
                    map,
                });
            }, 0);
        }
    });
}


function initMap() {
    
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: { lat: 39.95411101672692, lng: -8.00837091713906 },
    });

    fetch(dataUrl, { cache: "force-cache" })
        .then(response => response.json())
        .then(data => ko.applyBindings(new ViewModel(data, map)));
}
