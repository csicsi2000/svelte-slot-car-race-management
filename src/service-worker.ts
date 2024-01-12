import { build, files, version } from "$service-worker";

const worker = self as unknown as ServiceWorkerGlobalScope;
const STATIC_CACHE_NAME = `cache${version}`;
const APP_CACHE_NAME = `offline${version}`;

// hard-coded list of app routes we want to preemptively cache
const routes = ["/"];

// hard-coded list of other assets necessary for page load outside our domain
const customAssets = [
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap",
    "https://unpkg.com/ress/dist/ress.min.css",
    "https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2",
];

// `build` is an array of all the files generated by the bundler,
// `files` is an array of everything in the `static` directory
// `version` is the current version of the app

const addDomain = (assets: string[]) =>
    assets.map((f) => self.location.origin + f);

// we filter the files because we don't want to cache logos for iOS
// (they're big and largely unused)
// also, we add the domain to our assets, so we can differentiate routes of our
// app from those of other apps that we cache
const ourAssets = addDomain([
    ...files.filter((f) => !/\/icons\/(apple.*?|original.png)/.test(f)),
    ...build,
    ...routes,
]);

const toCache = [...ourAssets, ...customAssets];
const staticAssets = new Set(toCache);

worker.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE_NAME)
            .then((cache) => {
                return cache.addAll(toCache);
            })
            .then(() => {
                worker.skipWaiting();
            })
    );
});

worker.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(async (keys) => {
            // delete old caches
            for (const key of keys) {
                if (key !== STATIC_CACHE_NAME && key !== APP_CACHE_NAME) {
                    await caches.delete(key);
                }
            }

            worker.clients.claim();
        })
    );
});

/**
 * Fetch the asset from the network and store it in the cache.
 * Fall back to the cache if the user is offline.
 */
async function fetchAndCache(request: Request) {
    const cache = await caches.open(APP_CACHE_NAME);

    try {
        const response = await fetch(request);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${request} with status ${response.status}`);
        }
        cache.put(request, response.clone());
        return response;
    } catch (err) {
        console.error(`Failed to fetch and cache ${request}:`, err);
        const response = await cache.match(request);
        if (response) {
            return response;
        }

        throw err;
    }
}

worker.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET" || event.request.headers.has("range")) {
        return;
    }

    const url = new URL(event.request.url);

    // don't try to handle e.g. data: URIs
    const isHttp = url.protocol.startsWith("http");
    const isDevServerRequest =
        url.hostname === self.location.hostname && url.port !== self.location.port;
    const isStaticAsset = staticAssets.has(url.href);
    const skipBecauseUncached =
        event.request.cache === "only-if-cached" && !isStaticAsset;

    if (isHttp && !isDevServerRequest && !skipBecauseUncached) {
        event.respondWith(
            (async () => {
                // always serve static files and bundler-generated assets from cache.
                // if your application has other URLs with data that will never change,
                // set this variable to true for them, and they will only be fetched once.
                const cachedAsset =
                    isStaticAsset && (await caches.match(event.request));

                return cachedAsset || fetchAndCache(event.request);
            })()
        );
    }
});