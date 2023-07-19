var protomaps_themes_base = (() => {
  var __defProp = Object.defineProperty;
  var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
  var __export = (target, all) => {
    __markAsModule(target);
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    default: () => src_default,
    labels: () => labels,
    noLabels: () => noLabels
  });

  // src/debug_layers.ts
  function debug_layers_default(source) {
    return [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "black"
        }
      },
      {
        id: "natural",
        type: "fill",
        source,
        "source-layer": "natural",
        paint: {
          "fill-color": "#19A974",
          "fill-opacity": 0.5
        }
      },
      {
        id: "landuse",
        type: "fill",
        source,
        "source-layer": "landuse",
        paint: {
          "fill-color": "white",
          "fill-opacity": 0.25
        }
      },
      {
        id: "water",
        type: "fill",
        source,
        "source-layer": "water",
        paint: {
          "fill-color": "#268bd2",
          "fill-opacity": 0.5
        }
      },
      {
        id: "physical",
        type: "line",
        source,
        "source-layer": "physical",
        paint: {
          "line-color": "#357EDD",
          "line-opacity": 0.5
        }
      },
      {
        id: "buildings",
        type: "fill",
        source,
        "source-layer": "buildings",
        paint: {
          "fill-color": "#6c71c4",
          "fill-opacity": 0.8
        }
      },
      {
        id: "roads",
        type: "line",
        source,
        "source-layer": "roads",
        paint: {
          "line-color": "white",
          "line-opacity": 0.5
        }
      },
      {
        id: "boundaries",
        type: "line",
        source,
        "source-layer": "boundaries",
        paint: {
          "line-color": "#5E2CA5",
          "line-opacity": 0.5
        }
      },
      {
        id: "transit",
        type: "line",
        source,
        "source-layer": "transit",
        paint: {
          "line-color": "#dc322f",
          "line-opacity": 0.5
        }
      },
      {
        id: "pois",
        type: "circle",
        source,
        "source-layer": "pois",
        paint: {
          "circle-radius": 2,
          "circle-color": "#268bd2",
          "circle-opacity": 0.9
        }
      },
      {
        id: "places",
        type: "circle",
        source,
        "source-layer": "places",
        paint: {
          "circle-radius": 5,
          "circle-color": "#b58900",
          "circle-opacity": 0.9
        }
      },
      {
        id: "mask",
        type: "fill",
        source,
        "source-layer": "mask",
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0.5
        }
      }
    ];
  }

  // src/base_layers.ts
  function nolabels_layers(source, c) {
    const casingVisibility = c.hasCasings ? "visible" : "none";
    return [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": c.background
        }
      },
      {
        id: "earth",
        type: "fill",
        source,
        "source-layer": "earth",
        paint: {
          "fill-color": c.earth
        }
      },
      {
        id: "landuse_park",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: [
          "any",
          ["==", "pmap:kind", "park"],
          ["==", "landuse", "cemetery"]
        ],
        paint: {
          "fill-color": c.park
        }
      },
      {
        id: "landuse_hospital",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: ["any", ["==", "pmap:kind", "hospital"]],
        paint: {
          "fill-color": c.hospital
        }
      },
      {
        id: "landuse_industrial",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: ["any", ["==", "pmap:kind", "industrial"]],
        paint: {
          "fill-color": c.industrial
        }
      },
      {
        id: "landuse_school",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: ["any", ["==", "pmap:kind", "school"]],
        paint: {
          "fill-color": c.school
        }
      },
      {
        id: "natural_wood",
        type: "fill",
        source,
        "source-layer": "natural",
        filter: [
          "any",
          ["==", "natural", "wood"],
          ["==", "leisure", "nature_reserve"],
          ["==", "landuse", "forest"]
        ],
        paint: {
          "fill-color": c.wood
        }
      },
      {
        id: "landuse_pedestrian",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: ["any", ["==", "highway", "footway"]],
        paint: {
          "fill-color": c.pedestrian
        }
      },
      {
        id: "natural_scrub",
        type: "fill",
        source,
        "source-layer": "natural",
        filter: ["in", "natural", "scrub", "grassland"],
        paint: {
          "fill-color": c.scrub
        }
      },
      {
        id: "natural_glacier",
        type: "fill",
        source,
        "source-layer": "natural",
        filter: ["==", "natural", "glacier"],
        paint: {
          "fill-color": c.glacier
        }
      },
      {
        id: "natural_sand",
        type: "fill",
        source,
        "source-layer": "natural",
        filter: ["==", "natural", "sand"],
        paint: {
          "fill-color": c.sand
        }
      },
      {
        id: "landuse_aerodrome",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: ["==", "aeroway", "aerodrome"],
        paint: {
          "fill-color": c.aerodrome
        }
      },
      {
        id: "transit_runway",
        type: "line",
        source,
        "source-layer": "transit",
        filter: ["has", "aeroway"],
        paint: {
          "line-color": c.runway,
          "line-width": 6
        }
      },
      {
        id: "landuse_runway",
        type: "fill",
        source,
        "source-layer": "landuse",
        filter: [
          "any",
          ["==", "aeroway", "runway"],
          ["==", "area:aeroway", "runway"],
          ["==", "area:aeroway", "taxiway"]
        ],
        paint: {
          "fill-color": c.runway
        }
      },
      {
        id: "water",
        type: "fill",
        source,
        "source-layer": "water",
        paint: {
          "fill-color": c.water
        }
      },
      {
        id: "roads_tunnels_other_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["<", "pmap:level", 0], ["==", "pmap:kind", "other"]],
        paint: {
          "line-color": c.tunnel_other_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            14,
            0,
            14.5,
            0.5,
            20,
            12
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_tunnels_other",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["<", "pmap:level", 0], ["==", "pmap:kind", "other"]],
        paint: {
          "line-color": c.tunnel_other,
          "line-dasharray": [1, 1],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            14,
            0,
            14.5,
            0.5,
            20,
            12
          ]
        }
      },
      {
        id: "roads_tunnels_minor_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["<", "pmap:level", 0],
          ["==", "pmap:kind", "minor_road"]
        ],
        paint: {
          "line-color": c.tunnel_minor_casing,
          "line-dasharray": [3, 2],
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            0.5,
            20,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_tunnels_minor",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["<", "pmap:level", 0],
          ["==", "pmap:kind", "minor_road"]
        ],
        paint: {
          "line-color": c.tunnel_minor,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            0.5,
            20,
            32
          ]
        }
      },
      {
        id: "roads_tunnels_medium_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["<", "pmap:level", 0],
          ["==", "pmap:kind", "medium_road"]
        ],
        paint: {
          "line-color": c.tunnel_medium_casing,
          "line-dasharray": [3, 2],
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            20,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            10,
            0,
            10.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_tunnels_medium",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["<", "pmap:level", 0],
          ["==", "pmap:kind", "medium_road"]
        ],
        paint: {
          "line-color": c.tunnel_medium,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            20,
            32
          ]
        }
      },
      {
        id: "roads_tunnels_major_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["<", "pmap:level", 0],
          ["==", "pmap:kind", "major_road"]
        ],
        paint: {
          "line-color": c.tunnel_major_casing,
          "line-dasharray": [3, 2],
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            19,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            9,
            0,
            9.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_tunnels_major",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["<", "pmap:level", 0],
          ["==", "pmap:kind", "major_road"]
        ],
        paint: {
          "line-color": c.tunnel_major,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            19,
            32
          ]
        }
      },
      {
        id: "roads_tunnels_highway_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["<", "pmap:level", 0], ["==", "pmap:kind", "highway"]],
        paint: {
          "line-color": c.tunnel_highway_casing,
          "line-dasharray": [3, 2],
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            3,
            0,
            3.5,
            0.5,
            18,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_tunnels_highway",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["<", "pmap:level", 0], ["==", "pmap:kind", "highway"]],
        paint: {
          "line-color": c.tunnel_highway,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            3,
            0,
            3.5,
            0.5,
            18,
            32
          ]
        }
      },
      {
        id: "physical_line_waterway",
        type: "line",
        source,
        "source-layer": "physical_line",
        filter: ["==", ["get", "pmap:kind"], "waterway"],
        paint: {
          "line-color": c.water,
          "line-width": 0.5
        }
      },
      {
        id: "buildings",
        type: "fill-extrusion",
        source,
        "source-layer": "buildings",
        paint: {
          "fill-extrusion-color": c.buildings,
          "fill-extrusion-height": ["to-number", ["get", "height"]],
          "fill-extrusion-opacity": 0.5
        }
      },
      {
        id: "roads_other",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["==", "pmap:level", 0], ["==", "pmap:kind", "other"]],
        paint: {
          "line-color": c.other,
          "line-dasharray": [2, 1],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            14,
            0,
            14.5,
            0.5,
            20,
            12
          ]
        }
      },
      {
        id: "roads_minor_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["==", "pmap:level", 0],
          ["==", "pmap:kind", "minor_road"]
        ],
        paint: {
          "line-color": c.minor_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            0.5,
            20,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_minor",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["==", "pmap:level", 0],
          ["==", "pmap:kind", "minor_road"]
        ],
        paint: {
          "line-color": c.minor,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            0.5,
            20,
            32
          ]
        }
      },
      {
        id: "roads_medium_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["==", "pmap:level", 0],
          ["==", "pmap:kind", "medium_road"]
        ],
        paint: {
          "line-color": c.medium_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            20,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            10,
            0,
            10.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_medium",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["==", "pmap:level", 0],
          ["==", "pmap:kind", "medium_road"]
        ],
        paint: {
          "line-color": c.medium,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            20,
            32
          ]
        }
      },
      {
        id: "roads_major_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["==", "pmap:level", 0],
          ["==", "pmap:kind", "major_road"]
        ],
        paint: {
          "line-color": c.major_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            19,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            9,
            0,
            9.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_major",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          ["==", "pmap:level", 0],
          ["==", "pmap:kind", "major_road"]
        ],
        paint: {
          "line-color": c.major,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            19,
            32
          ]
        }
      },
      {
        id: "roads_highway_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["==", "pmap:level", 0], ["==", "pmap:kind", "highway"]],
        paint: {
          "line-color": c.highway_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            3,
            0,
            3.5,
            0.5,
            18,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_highway",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", ["==", "pmap:level", 0], ["==", "pmap:kind", "highway"]],
        paint: {
          "line-color": c.highway,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            3,
            0,
            3.5,
            0.5,
            18,
            32
          ]
        }
      },
      {
        id: "transit_railway",
        type: "line",
        source,
        "source-layer": "transit",
        filter: ["all", ["==", "pmap:kind", "railway"]],
        paint: {
          "line-color": c.railway,
          "line-width": 2
        }
      },
      {
        id: "transit_railway_tracks",
        type: "line",
        source,
        "source-layer": "transit",
        filter: ["all", ["==", "pmap:kind", "railway"]],
        paint: {
          "line-color": c.railway_tracks,
          "line-width": 0.8,
          "line-dasharray": [6, 10]
        }
      },
      {
        id: "boundaries",
        type: "line",
        source,
        "source-layer": "boundaries",
        paint: {
          "line-color": c.boundaries,
          "line-width": 0.5,
          "line-dasharray": [3, 2]
        }
      },
      {
        id: "roads_bridges_other_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", [">", "pmap:level", 0], ["==", "pmap:kind", "other"]],
        paint: {
          "line-color": c.bridges_other_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            14,
            0,
            14.5,
            0.5,
            20,
            12
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_bridges_other",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", [">", "pmap:level", 0], ["==", "pmap:kind", "other"]],
        paint: {
          "line-color": c.bridges_other,
          "line-dasharray": [2, 1],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            14,
            0,
            14.5,
            0.5,
            20,
            12
          ]
        }
      },
      {
        id: "roads_bridges_minor_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          [">", "pmap:level", 0],
          ["==", "pmap:kind", "minor_road"]
        ],
        paint: {
          "line-color": c.bridges_minor_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            0.5,
            20,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_bridges_minor",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          [">", "pmap:level", 0],
          ["==", "pmap:kind", "minor_road"]
        ],
        paint: {
          "line-color": c.bridges_minor,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            12,
            0,
            12.5,
            0.5,
            20,
            32
          ]
        }
      },
      {
        id: "roads_bridges_medium_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          [">", "pmap:level", 0],
          ["==", "pmap:kind", "medium_road"]
        ],
        paint: {
          "line-color": c.bridges_medium_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            20,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            10,
            0,
            10.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_bridges_medium",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          [">", "pmap:level", 0],
          ["==", "pmap:kind", "medium_road"]
        ],
        paint: {
          "line-color": c.bridges_medium,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            20,
            32
          ]
        }
      },
      {
        id: "roads_bridges_major_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          [">", "pmap:level", 0],
          ["==", "pmap:kind", "major_road"]
        ],
        paint: {
          "line-color": c.bridges_major_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            19,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            9,
            0,
            9.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_bridges_major",
        type: "line",
        source,
        "source-layer": "roads",
        filter: [
          "all",
          [">", "pmap:level", 0],
          ["==", "pmap:kind", "major_road"]
        ],
        paint: {
          "line-color": c.bridges_major,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            0.5,
            19,
            32
          ]
        }
      },
      {
        id: "roads_bridges_highway_casing",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", [">", "pmap:level", 0], ["==", "pmap:kind", "highway"]],
        paint: {
          "line-color": c.bridges_highway_casing,
          "line-gap-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            3,
            0,
            3.5,
            0.5,
            18,
            32
          ],
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            7,
            0,
            7.5,
            1
          ]
        },
        layout: {
          visibility: casingVisibility
        }
      },
      {
        id: "roads_bridges_highway",
        type: "line",
        source,
        "source-layer": "roads",
        filter: ["all", [">", "pmap:level", 0], ["==", "pmap:kind", "highway"]],
        paint: {
          "line-color": c.bridges_highway,
          "line-width": [
            "interpolate",
            ["exponential", 1.6],
            ["zoom"],
            3,
            0,
            3.5,
            0.5,
            18,
            32
          ]
        }
      }
    ];
  }
  function labels_layers(source, c) {
    return [
      {
        id: "physical_line_waterway_label",
        type: "symbol",
        source,
        "source-layer": "physical_line",
        minzoom: 14,
        layout: {
          "symbol-placement": "line",
          "text-font": ["NotoSans-Regular"],
          "text-field": ["get", "name"],
          "text-size": 14,
          "text-letter-spacing": 0.3
        },
        paint: {
          "text-color": c.waterway_label,
          "text-halo-color": c.waterway_label_halo,
          "text-halo-width": 2
        }
      },
      {
        id: "roads_labels",
        type: "symbol",
        source,
        "source-layer": "roads",
        layout: {
          "symbol-placement": "line",
          "text-font": ["NotoSans-Regular"],
          "text-field": ["get", "name"],
          "text-size": 12
        },
        paint: {
          "text-color": c.roads_label,
          "text-halo-color": c.roads_label_halo,
          "text-halo-width": 2
        }
      },
      {
        id: "mask",
        type: "fill",
        source,
        "source-layer": "mask",
        paint: {
          "fill-color": c.background
        }
      },
      {
        id: "physical_point_ocean",
        type: "symbol",
        source,
        "source-layer": "physical_point",
        filter: ["any", ["==", "place", "sea"], ["==", "place", "ocean"]],
        layout: {
          "text-font": ["NotoSans-Regular"],
          "text-field": ["get", "name"],
          "text-size": 13,
          "text-letter-spacing": 0.1
        },
        paint: {
          "text-color": c.ocean_label,
          "text-halo-color": c.ocean_label_halo,
          "text-halo-width": 1
        }
      },
      {
        id: "physical_point_peak",
        type: "symbol",
        source,
        "source-layer": "physical_point",
        filter: ["any", ["==", "natural", "peak"]],
        layout: {
          "text-font": ["NotoSans-Regular"],
          "text-field": ["get", "name"],
          "text-size": 14
        },
        paint: {
          "text-color": c.peak_label,
          "text-halo-color": c.peak_label_halo,
          "text-halo-width": 1.5
        }
      },
      {
        id: "places_subplace",
        type: "symbol",
        source,
        "source-layer": "places",
        filter: ["==", "pmap:kind", "neighbourhood"],
        layout: {
          "text-field": "{name}",
          "text-font": ["NotoSans-Regular"],
          "text-size": {
            base: 1.2,
            stops: [
              [11, 10],
              [14, 12]
            ]
          },
          "text-transform": "uppercase"
        },
        paint: {
          "text-color": c.subplace_label,
          "text-halo-color": c.subplace_label_halo,
          "text-halo-width": 0.5
        }
      },
      {
        id: "places_city_circle",
        type: "circle",
        source,
        "source-layer": "places",
        filter: ["==", "pmap:kind", "city"],
        paint: {
          "circle-radius": 2,
          "circle-stroke-width": 2,
          "circle-stroke-color": c.city_circle_stroke,
          "circle-color": c.city_circle
        },
        maxzoom: 8
      },
      {
        id: "places_city",
        type: "symbol",
        source,
        "source-layer": "places",
        filter: ["==", "pmap:kind", "city"],
        layout: {
          "text-field": "{name}",
          "text-font": ["NotoSans-Bold"],
          "text-size": ["step", ["get", "pmap:rank"], 0, 1, 12, 2, 10],
          "text-variable-anchor": ["bottom-left"],
          "text-radial-offset": 0.2
        },
        paint: {
          "text-color": c.city_label,
          "text-halo-color": c.city_label_halo,
          "text-halo-width": 1
        }
      },
      {
        id: "places_state",
        type: "symbol",
        source,
        "source-layer": "places",
        filter: ["==", "pmap:kind", "state"],
        layout: {
          "text-field": "{name}",
          "text-font": ["NotoSans-Regular"],
          "text-size": 12,
          "text-radial-offset": 0.2,
          "text-anchor": "center",
          "text-transform": "uppercase"
        },
        paint: {
          "text-color": c.state_label,
          "text-halo-color": c.state_label_halo,
          "text-halo-width": 0.5
        }
      },
      {
        id: "places_country",
        type: "symbol",
        source,
        "source-layer": "places",
        filter: ["==", "place", "country"],
        layout: {
          "text-field": "{name}",
          "text-font": ["NotoSans-Bold"],
          "text-size": {
            base: 1.2,
            stops: [
              [2, 13],
              [6, 13],
              [8, 20]
            ]
          },
          "text-transform": "uppercase"
        },
        paint: {
          "text-color": c.country_label,
          "text-halo-color": c.country_label_halo,
          "text-halo-width": 1
        }
      }
    ];
  }

  // src/colors.ts
  var LIGHT = {
    hasCasings: true,
    background: "#dddddd",
    earth: "#e7f1ee",
    park: "#c2f7d1",
    hospital: "#ffeae8",
    industrial: "#f8ffed",
    school: "#f2fef9",
    wood: "#eafbe9",
    pedestrian: "#eef0f0",
    scrub: "rgb(219,239,209)",
    glacier: "white",
    sand: "#eff5e7",
    aerodrome: "#dbe7e7",
    runway: "#d1d9d9",
    water: "#a4cae1",
    tunnel_other_casing: "#ffffff",
    tunnel_other: "#f7f7f7",
    tunnel_minor_casing: "#e2e2e2",
    tunnel_minor: "#ebebeb",
    tunnel_medium_casing: "#e1e1e1",
    tunnel_medium: "#ebebeb",
    tunnel_major_casing: "#e3cfd3",
    tunnel_major: "#ebebeb",
    tunnel_highway_casing: "#ebcea2",
    tunnel_highway: "#ebebeb",
    buildings: "#cbcece",
    other: "#ffffff",
    minor_casing: "#e2e2e2",
    minor: "white",
    medium_casing: "#e1e1e1",
    medium: "#ffffff",
    major_casing: "#e3cfd3",
    major: "#ffffff",
    highway_casing: "#ebcea2",
    highway: "#fefffc",
    railway: "#b3bcc9",
    railway_tracks: "#ffffff",
    boundaries: "#5c4a6b",
    waterway_label_halo: "white",
    waterway_label: "#a4cae1",
    bridges_other_casing: "#ffffff",
    bridges_other: "#ffffff",
    bridges_minor_casing: "#e2e2e2",
    bridges_minor: "white",
    bridges_medium_casing: "#e1e1e1",
    bridges_medium: "#ffffff",
    bridges_major_casing: "#e3cfd3",
    bridges_major: "#ffffff",
    bridges_highway_casing: "#ebcea2",
    bridges_highway: "#fefffc",
    roads_label: "#91888b",
    roads_label_halo: "white",
    ocean_label: "white",
    ocean_label_halo: "#a4cae1",
    peak_label: "#61bb5b",
    peak_label_halo: "#ffffff",
    subplace_label: "#757d91",
    subplace_label_halo: "white",
    city_circle: "#666666",
    city_circle_stroke: "white",
    city_label: "#787878",
    city_label_halo: "white",
    state_label: "#bdbdbd",
    state_label_halo: "White",
    country_label: "#9590aa",
    country_label_halo: "white"
  };
  var DARK = {
    hasCasings: true,
    background: "#dddddd",
    earth: "#151515",
    park: "#1d3e2e",
    hospital: "#2e2226",
    industrial: "#20201e",
    school: "#193a3c",
    wood: "#212e25",
    pedestrian: "#1a1a1a",
    scrub: "#27362a",
    glacier: "#1c1c1c",
    sand: "#374238",
    aerodrome: "#000000",
    runway: "#000000",
    water: "#1e293b",
    tunnel_other_casing: "#ffffff",
    tunnel_other: "#000000",
    tunnel_minor_casing: "#ffffff",
    tunnel_minor: "#000000",
    tunnel_medium_casing: "#ffffff",
    tunnel_medium: "#000000",
    tunnel_major_casing: "#ffffff",
    tunnel_major: "#000000",
    tunnel_highway_casing: "#ffffff",
    tunnel_highway: "#000000",
    buildings: "#393f43",
    other: "#000000",
    minor_casing: "#222222",
    minor: "#000000",
    medium_casing: "#222222",
    medium: "#282828",
    major_casing: "#222222",
    major: "#2f2f2f",
    highway_casing: "#222222",
    highway: "#3b3b3b",
    railway: "#bbbbbb",
    railway_tracks: "#000000",
    boundaries: "#6b1001",
    waterway_label_halo: "#000000",
    waterway_label: "#ffffff",
    bridges_other_casing: "#ffffff",
    bridges_other: "#000000",
    bridges_minor_casing: "#ffffff",
    bridges_minor: "#000000",
    bridges_medium_casing: "#ffffff",
    bridges_medium: "#000000",
    bridges_major_casing: "#ffffff",
    bridges_major: "#000000",
    bridges_highway_casing: "#ffffff",
    bridges_highway: "#000000",
    roads_label: "#7a7a7a",
    roads_label_halo: "#000000",
    ocean_label: "#ffffff",
    ocean_label_halo: "#000000",
    peak_label: "#ffffff",
    peak_label_halo: "#000000",
    subplace_label: "#8e8e8e",
    subplace_label_halo: "#000000",
    city_circle: "#ffffff",
    city_circle_stroke: "#000000",
    city_label: "#ffffff",
    city_label_halo: "#000000",
    state_label: "#ffffff",
    state_label_halo: "#000000",
    country_label: "#ffffff",
    country_label_halo: "#000000"
  };
  var WHITE = {
    hasCasings: false,
    background: "#fff",
    earth: "#fff",
    park: "#fafafa",
    hospital: "#fafafa",
    industrial: "#fafafa",
    school: "#fafafa",
    wood: "#fafafa",
    pedestrian: "#fafafa",
    scrub: "#fafafa",
    glacier: "#ffffff",
    sand: "#eee",
    aerodrome: "#eee",
    runway: "#eee",
    water: "#eeeeee",
    tunnel_other_casing: "#ff00ff",
    tunnel_other: "#c8c8c8",
    tunnel_minor_casing: "#ff00ff",
    tunnel_minor: "#c8c8c8",
    tunnel_medium_casing: "#ff00ff",
    tunnel_medium: "#c8c8c8",
    tunnel_major_casing: "#ff00ff",
    tunnel_major: "#c8c8c8",
    tunnel_highway_casing: "#ff00ff",
    tunnel_highway: "#c8c8c8",
    buildings: "#ffffff",
    other: "#c8c8c8",
    minor_casing: "#ff00ff",
    minor: "#c8c8c8",
    medium_casing: "#ff00ff",
    medium: "#c8c8c8",
    major_casing: "#ff00ff",
    major: "#c8c8c8",
    highway_casing: "#ff00ff",
    highway: "#c8c8c8",
    railway: "#eee",
    railway_tracks: "#ffffff",
    boundaries: "#000000",
    waterway_label_halo: "#ffffff",
    waterway_label: "#000000",
    bridges_other_casing: "#ff00ff",
    bridges_other: "#c8c8c8",
    bridges_minor_casing: "#ff00ff",
    bridges_minor: "#c8c8c8",
    bridges_medium_casing: "#ff00ff",
    bridges_medium: "#c8c8c8",
    bridges_major_casing: "#ff00ff",
    bridges_major: "#c8c8c8",
    bridges_highway_casing: "#ff00ff",
    bridges_highway: "#ffffff",
    roads_label: "#888",
    roads_label_halo: "#ffffff",
    ocean_label: "#aaa",
    ocean_label_halo: "#ffffff",
    peak_label: "#888",
    peak_label_halo: "#ffffff",
    subplace_label: "#888",
    subplace_label_halo: "#ffffff",
    city_circle: "#aaa",
    city_circle_stroke: "#ffffff",
    city_label: "#888",
    city_label_halo: "#ffffff",
    state_label: "#999",
    state_label_halo: "#ffffff",
    country_label: "#bbb",
    country_label_halo: "#ffffff"
  };
  var BLACK = {
    hasCasings: false,
    background: "#000000",
    earth: "#000000",
    park: "#060606",
    hospital: "#060606",
    industrial: "#060606",
    school: "#060606",
    wood: "#060606",
    pedestrian: "#060606",
    scrub: "#060606",
    glacier: "#060606",
    sand: "#060606",
    aerodrome: "#060606",
    runway: "#060606",
    water: "#333",
    tunnel_other_casing: "#ff00ff",
    tunnel_other: "#222",
    tunnel_minor_casing: "#ff00ff",
    tunnel_minor: "#222",
    tunnel_medium_casing: "#ff00ff",
    tunnel_medium: "#222",
    tunnel_major_casing: "#ff00ff",
    tunnel_major: "#222",
    tunnel_highway_casing: "#ff00ff",
    tunnel_highway: "#222",
    buildings: "#101010",
    other: "#000000",
    minor_casing: "#ff00ff",
    minor: "#222",
    medium_casing: "#ff00ff",
    medium: "#222",
    major_casing: "#ff00ff",
    major: "#222",
    highway_casing: "#ff00ff",
    highway: "#222",
    railway: "#121212",
    railway_tracks: "#121212",
    boundaries: "#555",
    waterway_label_halo: "#333",
    waterway_label: "#888",
    bridges_other_casing: "#ff00ff",
    bridges_other: "#222",
    bridges_minor_casing: "#ff00ff",
    bridges_minor: "#222",
    bridges_medium_casing: "#ff00ff",
    bridges_medium: "#222",
    bridges_major_casing: "#ff00ff",
    bridges_major: "#222",
    bridges_highway_casing: "#ff00ff",
    bridges_highway: "#222",
    roads_label: "#666",
    roads_label_halo: "#000",
    ocean_label: "#666",
    ocean_label_halo: "#333",
    peak_label: "#777",
    peak_label_halo: "#000000",
    subplace_label: "#777",
    subplace_label_halo: "#000000",
    city_circle: "#777",
    city_circle_stroke: "#000000",
    city_label: "#777",
    city_label_halo: "#000000",
    state_label: "#555",
    state_label_halo: "#000000",
    country_label: "#555",
    country_label_halo: "#000000"
  };
  var GRAYSCALE = {
    hasCasings: false,
    background: "#eee",
    earth: "#eee",
    park: "#e8e8e8",
    hospital: "#e8e8e8",
    industrial: "#e8e8e8",
    school: "#e8e8e8",
    wood: "#e8e8e8",
    pedestrian: "#e8e8e8",
    scrub: "#e8e8e8",
    glacier: "#e8e8e8",
    sand: "#e8e8e8",
    aerodrome: "#e8e8e8",
    runway: "#e8e8e8",
    water: "#ddd",
    tunnel_other_casing: "#ff00ff",
    tunnel_other: "#ffffff",
    tunnel_minor_casing: "#ff00ff",
    tunnel_minor: "#ffffff",
    tunnel_medium_casing: "#ff00ff",
    tunnel_medium: "#ffffff",
    tunnel_major_casing: "#ff00ff",
    tunnel_major: "#ffffff",
    tunnel_highway_casing: "#ff00ff",
    tunnel_highway: "#ffffff",
    buildings: "#ffffff",
    other: "#fff",
    minor_casing: "#ff00ff",
    minor: "#fff",
    medium_casing: "#ff00ff",
    medium: "#fff",
    major_casing: "#ff00ff",
    major: "#fff",
    highway_casing: "#ff00ff",
    highway: "#fff",
    railway: "#fff",
    railway_tracks: "#eee",
    boundaries: "#666",
    waterway_label_halo: "#bbbbbb",
    waterway_label: "#ffffff",
    bridges_other_casing: "#ff00ff",
    bridges_other: "#ffffff",
    bridges_minor_casing: "#ff00ff",
    bridges_minor: "#ffffff",
    bridges_medium_casing: "#ff00ff",
    bridges_medium: "#ffffff",
    bridges_major_casing: "#ff00ff",
    bridges_major: "#ffffff",
    bridges_highway_casing: "#ff00ff",
    bridges_highway: "#ffffff",
    roads_label: "#888",
    roads_label_halo: "#ffffff",
    ocean_label: "#666",
    ocean_label_halo: "#ffffff",
    peak_label: "#000000",
    peak_label_halo: "#ffffff",
    subplace_label: "#888",
    subplace_label_halo: "#ffffff",
    city_circle: "#666",
    city_circle_stroke: "#ffffff",
    city_label: "#888",
    city_label_halo: "#ffffff",
    state_label: "#888",
    state_label_halo: "#ffffff",
    country_label: "#888",
    country_label_halo: "#ffffff"
  };
  var colors_default = {
    light: LIGHT,
    dark: DARK,
    white: WHITE,
    black: BLACK,
    grayscale: GRAYSCALE
  };

  // src/index.ts
  function src_default(source, variant) {
    if (variant == "debug")
      return debug_layers_default(source);
    let theme = colors_default[variant];
    return nolabels_layers(source, theme).concat(labels_layers(source, theme));
  }
  function noLabels(source, variant) {
    let theme = colors_default[variant];
    return nolabels_layers(source, theme);
  }
  function labels(source, variant) {
    let theme = colors_default[variant];
    return labels_layers(source, theme);
  }
  return src_exports;
})();
