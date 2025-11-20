self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('movie-pwa-v1').then(cache => cache.addAll([
            '/',
            '/index.html',
            'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
        ]))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

// Background sync for movie requests
self.addEventListener('sync', event => {
    if (event.tag === 'sync-movie-queue') {
        event.waitUntil(syncMovieQueue());
    }
});

async function syncMovieQueue() {
    const db = await openDB();
    const tx = db.transaction('queue', 'readonly');
    const store = tx.objectStore('queue');
    const getAllReq = store.getAll();
    getAllReq.onsuccess = async function() {
        const all = getAllReq.result;
        for (const req of all) {
            // Simulate fetch (mock DB)
            const details = getMockMovieDetails(req.title);
            // Send to all clients
            const clientsList = await self.clients.matchAll();
            for (const client of clientsList) {
                client.postMessage({ type: 'movie-result', details });
            }
        }
        // Clear queue
        const tx2 = db.transaction('queue', 'readwrite');
        tx2.objectStore('queue').clear();
    };
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('movie-queue', 1);
        request.onupgradeneeded = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { autoIncrement: true });
            }
        };
        request.onsuccess = function(e) { resolve(e.target.result); };
        request.onerror = function(e) { reject(e.target.error); };
    });
}

function getMockMovieDetails(title) {
    const key = title.trim().toLowerCase();
    const mockMovies = {
        'inception': {
            title: 'Inception',
            year: 2010,
            director: 'Christopher Nolan',
            plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
            thumbnail: 'https://m.media-amazon.com/images/I/51v5ZpFyaFL._AC_SY679_.jpg'
        },
        'interstellar': {
            title: 'Interstellar',
            year: 2014,
            director: 'Christopher Nolan',
            plot: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
            thumbnail: 'https://m.media-amazon.com/images/I/91kFYg4fX3L._AC_SY679_.jpg'
        },
        'matrix': {
            title: 'The Matrix',
            year: 1999,
            director: 'The Wachowskis',
            plot: 'A computer hacker learns about the true nature of his reality and his role in the war against its controllers.',
            thumbnail: 'https://m.media-amazon.com/images/I/51EG732BV3L.jpg'
        }
    };
    return mockMovies[key] || {
        title: title,
        year: 2025,
        director: 'Unknown',
        plot: 'No details found. This is a made-up movie.',
        thumbnail: 'https://cdn-icons-png.flaticon.com/512/744/744922.png'
    };
}
