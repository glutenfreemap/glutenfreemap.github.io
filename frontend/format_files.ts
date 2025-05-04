import fs from "fs";
import { placeSchema } from "./src/datamodel/place";

const files = fs.readdirSync("../../GlutenFreeMapData/places");
files.forEach(file => {
  console.log(file);
  const json = fs.readFileSync(`../../GlutenFreeMapData/places/${file}`, "utf-8")
  const place = JSON.parse(json);
  const parsed = placeSchema.parse(place);
  fs.writeFileSync(`../../GlutenFreeMapData/places/${file}`, JSON.stringify(parsed, (key, value) => key !== "parent" ? value : undefined, 2));
});
