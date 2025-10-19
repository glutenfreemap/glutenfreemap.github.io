import fs from "fs";
import { Flavor, layers, namedFlavor } from "@protomaps/basemaps";

const lightFlavor: Flavor = {
  background: "#dddddd",
  earth: "#e7f1ee",
  park_a: "#cfddd5",
  park_b: "#e2f7e8",
  hospital: "#ffeae8",
  industrial: "#f8ffed",
  school: "#f2fef9",
  wood_a: "#d0ded0",
  wood_b: "#eafbe9",
  pedestrian: "#eef0f0",
  scrub_a: "#cedcd7",
  scrub_b: "#dbefd1",
  glacier: "#ffffff",
  sand: "#eff5e7",
  beach: "#e8e4d0",
  aerodrome: "#dbe7e7",
  runway: "#d1d9d9",
  water: "#a4cae1",
  zoo: "#c6dcdc",
  military: "#dcdcdc",
  tunnel_other_casing: "#ffffff",
  tunnel_other: "#f7f7f7",
  tunnel_minor_casing: "#e2e2e2",
  tunnel_minor: "#ebebeb",
  tunnel_link_casing: "#e1e1e1",
  tunnel_link: "#ebebeb",
  tunnel_major_casing: "#e3cfd3",
  tunnel_major: "#ebebeb",
  tunnel_highway_casing: "#ebcea2",
  tunnel_highway: "#ebebeb",
  pier: "#e0e0e0",
  buildings: "#cbcece",
  minor_service_casing: "#e0e0e0",
  minor_casing: "#e2e2e2",
  link_casing: "#e0e0e0",
  major_casing_late: "#e0e0e0",
  highway_casing_late: "#e0e0e0",
  other: "#ebebeb",
  minor_service: "#ebebeb",
  minor_a: "#ebebeb",
  minor_b: "#ffffff",
  link: "#ffffff",
  major_casing_early: "#e0e0e0",
  major: "#ffffff",
  highway_casing_early: "#e0e0e0",
  highway: "#ffffff",
  railway: "#a7b1b3",
  boundaries: "#5c4a6b",
  bridges_other_casing: "#ffffff",
  bridges_other: "#ffffff",
  bridges_minor_casing: "#e2e2e2",
  bridges_minor: "#ffffff",
  bridges_link_casing: "#e1e1e1",
  bridges_link: "#ffffff",
  bridges_major_casing: "#e3cfd3",
  bridges_major: "#ffffff",
  bridges_highway_casing: "#ebcea2",
  bridges_highway: "#fefffc",
  roads_label_minor: "#91888b",
  roads_label_minor_halo: "#ffffff",
  roads_label_major: "#938a8d",
  roads_label_major_halo: "#ffffff",
  ocean_label: "#728dd4",
  subplace_label: "#757d91",
  subplace_label_halo: "#ffffff",
  city_label: "#787878",
  city_label_halo: "#ffffff",
  state_label: "#bdbdbd",
  state_label_halo: "#ffffff",
  country_label: "#9590aa",
  address_label: "#91888b",
  address_label_halo: "#ffffff",
  pois: {
    blue: "#1a8cbd",
    green: "#20834d",
    lapis: "#315bcf",
    pink: "#ef56ba",
    red: "#f2567a",
    slategray: "#6a5b8f",
    tangerine: "#cb6704",
    turquoise: "#00c3d4"
  },
  landcover: {
    grassland: "rgba(210, 239, 207, 1)",
    barren: "rgba(255, 243, 215, 1)",
    urban_area: "rgba(230, 230, 230, 1)",
    farmland: "rgba(216, 239, 210, 1)",
    glacier: "rgba(255, 255, 255, 1)",
    scrub: "rgba(234, 239, 210, 1)",
    forest: "rgba(196, 231, 210, 1)"
  }
};

const lightStyle = layers("protomaps", lightFlavor, { lang: "${lang}" });
const darkStyle = layers("protomaps", namedFlavor("dark"), { lang: "${lang}" });

function replacerWithPath(replacer: (this: any, key: string, value: any, path: string[]) => any): (this: any, key: string, value: any) => any {
  const m = new Map<any, string[]>();

  return function(field, value) {
    const previousPath = m.get(this) || [];
    const path = field ? [...previousPath, field] : previousPath;
    if (value===Object(value)) m.set(value, path);
    return replacer.call(this, field, value, path);
  }
}

const styleJson = JSON.stringify(lightStyle, replacerWithPath(function(key, value, path) {
  if (!((this as any).isDarkModeExpression) && /^#[0-9a-fA-F]+|^rgba?\(.*\)/.test(value)) {
    const darkColor = path.reduce((dark, key) => dark[key], darkStyle as any);
    if (darkColor) {
      const darkModeExpression = [
        "case",
        ["boolean", ["global-state", "dark-mode"]],
        darkColor,
        value
      ];
      (darkModeExpression as any).isDarkModeExpression = true;

      return darkModeExpression;
    }
    return value;
  }

  return value;
}), 2);

fs.writeFile(
  "src/generated/map.style.json",
  styleJson,
  () => { console.log("Done"); }
);

fs.writeFile("src/generated/map.style.ts", `
import { LayerSpecification } from "maplibre-gl";
export function getStyle(lang: string): LayerSpecification[] {
  return ${styleJson.replace(/"([^"]+:\$\{lang\})"/, "`$1`")};
}
`, () => { console.log("Done"); });
