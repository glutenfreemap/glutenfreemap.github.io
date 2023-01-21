#!/bin/bash

for F in .github/ISSUE_TEMPLATE/*_suggest_venue.yml
do
    yq -i ".body[] | select(.id == \"categories\") | .attributes.options = (load(\"./docs/data/data.json\") | [.categories[].name.${F:23:2}] | ... style=\"\") | parent | parent | parent" $F
    git add $F
done

