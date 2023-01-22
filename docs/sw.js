---
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
---
"use strict";

console.log("Hello from ServiceWorker at " + (new Date().toLocaleTimeString()), this);

const cacheName = "GlutenFreeMap-{{ site.time | date:"%s" }}";

const contentToCache = [
{% for collection in site.static_files %}
    {{collection.path | jsonify}},
{% endfor %}

{% for page in site.pages %}
    {{page.url | jsonify}},
{% endfor %}

];

self.addEventListener("install", e => {
    console.log("[Service Worker] Install");
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        console.log("[Service Worker] Caching all: app shell and content");
        await cache.addAll(contentToCache);

        self.skipWaiting();
    })());
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key === cacheName) {
                        return;
                    }
                    console.log(`[Service Worker] Deleting old cache ${key}`);
                    return caches.delete(key);
                })
            );
        })
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith((async () => {
        const r = await caches.match(e.request);
        console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
        if (r) {
            return r;
        }
        const response = await fetch(e.request);
        const cache = await caches.open(cacheName);
        console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
        cache.put(e.request, response.clone());
        return response;
    })());
});