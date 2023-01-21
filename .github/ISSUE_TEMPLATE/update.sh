#!/bin/bash

for LANG in pt en
do
    yq -i ".body[] | select(.id == \"categories\") | .attributes.options = (load(\"../../docs/data/data.json\") | [.categories[].name.$LANG] | ... style=\"\") | parent | parent | parent" ${LANG}_suggest_venue.yml
done
