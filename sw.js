const CACHE_NAME = 'plano-leitura-v1-0-3'; // Atualize a versão conforme necessário para invalidar caches antigos

// Lista de arquivos estáticos fundamentais para a aplicação rodar offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './manifest.json',
    './favicon.ico',
    './logo.png',
    
    // Módulos JavaScript (Core)
    './modules/auth.js',
    './modules/dom-elements.js',
    './modules/firestore-service.js',
    './modules/form-handler.js',
    './modules/neuro-notes.js',
    './modules/plano-logic.js',
    './modules/pwa-handler.js',
    './modules/state.js',
    './modules/ui.js',
    
    // Configurações
    './config/firebase-config.js',
    './config/version-config.js'
];

// 1. Instalação: Cacheia os arquivos estáticos iniciais
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Força o SW a ativar imediatamente
    );
});

// 2. Ativação: Limpa caches antigos de versões anteriores
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. Fetch: Intercepta requisições de rede
self.addEventListener('fetch', (event) => {
    // --- CORREÇÃO DE RUÍDO NO CONSOLE ---
    // Ignora requisições que não sejam GET (ex: POST do Firebase/Firestore)
    // A API de Cache não suporta métodos POST, PUT, DELETE, etc.
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignora requisições para esquemas que não sejam http ou https (ex: chrome-extension://)
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Se encontrou no cache, retorna o cache
                if (response) {
                    return response;
                }

                // Se não, busca na rede
                return fetch(event.request).then((networkResponse) => {
                    // Verifica se a resposta é válida antes de cachear
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Clona a resposta (streams só podem ser consumidas uma vez)
                    const responseToCache = networkResponse.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                }).catch(() => {
                    // Opcional: Retornar uma página de fallback offline se a rede falhar
                    // e o recurso não estiver em cache (não implementado aqui para manter simplicidade)
                });
            })
    );
});
