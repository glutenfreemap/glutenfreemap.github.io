

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

    this.openPlaceInfo = function(place) {
        setTimeout(function() {
            infowindow.setOptions({
                ariaLabel: place.info.name,
                content: document.getElementById("popup").querySelector("div").cloneNode(true)
            });
            infowindow.open({
                anchor: place.marker,
                shouldFocus: false,
                map,
            });
        }, 0);
    }

    // Create popup
    const infowindow = new google.maps.InfoWindow({
    });

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

        marker.addListener("click", () => this.openPlaceInfo(place));

        return place;
    });

    this.visiblePlaces = ko.computed(() => {
        const filters = Object.values(this.filters);
        return places.filter(place => !filters.some(filter => !filter.match(place.info)));
    });

    const markerCluster = new markerClusterer.MarkerClusterer({ map, markers: places.map(p => p.marker) });

    this.visiblePlaces.subscribe(places => {
        infowindow.close();
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
            this.openPlaceInfo(place);
        }
    });
}


function initMap() {
    
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: { lat: 39.95411101672692, lng: -8.00837091713906 },
    });

    $.getJSON("data.json", data => {
        ko.applyBindings(new ViewModel(data, map));
    });


    // const contentString =
    //     '<div id="content">' +
    //     '<div id="siteNotice">' +
    //     "</div>" +
    //     '<h1 id="firstHeading" class="firstHeading">Uluru</h1>' +
    //     '<div id="bodyContent">' +
    //     "<p><b>Uluru</b>, also referred to as <b>Ayers Rock</b>, is a large " +
    //     "sandstone rock formation in the southern part of the " +
    //     "Northern Territory, central Australia. It lies 335&#160;km (208&#160;mi) " +
    //     "south west of the nearest large town, Alice Springs; 450&#160;km " +
    //     "(280&#160;mi) by road. Kata Tjuta and Uluru are the two major " +
    //     "features of the Uluru - Kata Tjuta National Park. Uluru is " +
    //     "sacred to the Pitjantjatjara and Yankunytjatjara, the " +
    //     "Aboriginal people of the area. It has many springs, waterholes, " +
    //     "rock caves and ancient paintings. Uluru is listed as a World " +
    //     "Heritage Site.</p>" +
    //     '<p>Attribution: Uluru, <a href="https://en.wikipedia.org/w/index.php?title=Uluru&oldid=297882194">' +
    //     "https://en.wikipedia.org/w/index.php?title=Uluru</a> " +
    //     "(last visited June 22, 2009).</p>" +
    //     "</div>" +
    //     "</div>";
    // const infowindow = new google.maps.InfoWindow({
    //     content: contentString,
    //     ariaLabel: "Uluru",
    // });
    // const marker = new google.maps.Marker({
    //     position: uluru,
    //     map,
    //     title: "Uluru (Ayers Rock)",
    // });

    // const marker2 = new google.maps.Marker({
    //     position: { lat: -20.453, lng: 131.044 },
    //     map,
    //     title: "Uluru2",
    // });

    // marker.addListener("click", () => {
    //     infowindow.open({
    //         anchor: marker,
    //         map,
    //     });
    // });

    // document.getElementById("bt1").addEventListener("click", function() {
    //     marker.setVisible(!marker.getVisible());
    // });
}
