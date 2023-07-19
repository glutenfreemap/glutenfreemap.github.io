"use strict";

const cacheName = "GlutenFreeMap-1689161568";

const contentToCache = [

    "/assets/css/bootstrap.4.6.2.min.css",

    "/assets/css/maplibre-gl.2.4.0.css",

    "/assets/img/android-icon-144x144.png",

    "/assets/img/android-icon-192x192.png",

    "/assets/img/android-icon-36x36.png",

    "/assets/img/android-icon-48x48.png",

    "/assets/img/android-icon-72x72.png",

    "/assets/img/android-icon-96x96.png",

    "/assets/img/apple-icon-114x114.png",

    "/assets/img/apple-icon-120x120.png",

    "/assets/img/apple-icon-144x144.png",

    "/assets/img/apple-icon-152x152.png",

    "/assets/img/apple-icon-180x180.png",

    "/assets/img/apple-icon-57x57.png",

    "/assets/img/apple-icon-60x60.png",

    "/assets/img/apple-icon-72x72.png",

    "/assets/img/apple-icon-76x76.png",

    "/assets/img/apple-icon-precomposed.png",

    "/assets/img/apple-icon.png",

    "/assets/img/favicon-16x16.png",

    "/assets/img/favicon-32x32.png",

    "/assets/img/favicon-96x96.png",

    "/assets/img/install/chrome-1.png",

    "/assets/img/install/chrome-1b.png",

    "/assets/img/install/chrome-2.png",

    "/assets/img/install/chrome-3.png",

    "/assets/img/install/chrome-4.png",

    "/assets/img/install/firefox-1.png",

    "/assets/img/install/firefox-1b.png",

    "/assets/img/install/firefox-2.png",

    "/assets/img/install/firefox-3.png",

    "/assets/img/install/safari-1.png",

    "/assets/img/install/safari-2.png",

    "/assets/img/install/safari-3.png",

    "/assets/img/install/safari-4.png",

    "/assets/img/ms-icon-144x144.png",

    "/assets/img/ms-icon-150x150.png",

    "/assets/img/ms-icon-310x310.png",

    "/assets/img/ms-icon-70x70.png",

    "/assets/img/pin-black.png",

    "/assets/img/pin-green.png",

    "/assets/js/bootstrap.4.6.2.min.js",

    "/assets/js/jquery-3.6.3.min.js",

    "/assets/js/knockout-3.5.0-min.js",

    "/assets/js/main.js",

    "/assets/js/maplibre-gl.2.4.0.js",

    "/assets/js/pmtiles.2.4.0.js",

    "/assets/js/protomaps-themes-base.1.3.0.js",

    "/browserconfig.xml",

    "/data/burgerking.json",

    "/data/data.json",

    "/data/mcdonalds.json",

    "/data/pansandcompany.json",

    "/data/telepizza.json",

    "/favicon.ico",

    "/find-place.html",



    "/pt/about.html",

    "/en/about.html",

    "/es/about.html",

    "/fr/about.html",

    "/fr/changes.html",

    "/pt/changes.html",

    "/es/changes.html",

    "/en/changes.html",

    "/en/contacts.html",

    "/fr/contacts.html",

    "/pt/contacts.html",

    "/es/contacts.html",

    "/assets/img/icon.svg",

    "/",

    "/assets/img/location.svg",

    "/assets/css/main.css",

    "/es/manifest.json",

    "/en/manifest.json",

    "/pt/manifest.json",

    "/fr/manifest.json",

    "/en/",

    "/es/",

    "/pt/",

    "/fr/",

    "/assets/img/pin-black.svg",

    "/assets/img/pin-green.svg",

    "/sitemap.xml",

    "/sw.js",

];

self.addEventListener("install", e => {
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
                    return caches.delete(key);
                })
            );
        })
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith((async () => {
        const r = await caches.match(e.request);
        if (r) {
            return r;
        }
        const response = await fetch(e.request);
        const cache = await caches.open(cacheName);
        cache.put(e.request, response.clone());
        return response;
    })());
});