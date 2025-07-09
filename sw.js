// Substitua o conteúdo do seu arquivo sw.js por este:

// --- START OF FILE sw.js (CORRIGIDO E MAIS ROBUSTO) ---

// MODIFICAÇÃO: Atualize a versão do cache para forçar a reinstalação do Service Worker
const CACHE_NAME = 'gerenciador-leitura-cache-v2';

// MODIFICAÇÃO: Lista de arquivos atualizada e completa
const urlsToCache = [
  '.',
  './index.html',
  './style.css',
  './manifest.json',
  './favicon.ico',
  './logo.png',
  
  // CORREÇÃO: Caminhos corretos para as imagens do PWA (verifique se a pasta 'imagens' existe!)
  // Se não existir, crie-a ou mova os arquivos e ajuste os caminhos aqui e no manifest.json.
  './imagens/logo_192.png',
  './imagens/logo_512.png',

  // CORREÇÃO: Adicionando o script principal e todos os seus módulos
  './main.js',
  './modules/dom-elements.js',
  './modules/ui.js',
  './modules/plano-logic.js',
  './modules/state.js',
  './modules/auth.js',
  './modules/firestore-service.js',
  './config/firebase-config.js',
  
  // Fontes e ícones externos
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Ubuntu:wght@700&display=swap',
  // Adicionamos a fonte em si, que o CSS acima chama
  'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2' // Exemplo, o nome pode variar
];

// O resto do arquivo permanece o mesmo, mas o incluí para completude.

// Evento install: Instala o SW e cacheia o App Shell
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Abrindo cache e adicionando arquivos do app shell');
        return cache.addAll(urlsToCache); // Agora a lista está correta
      })
      .then(() => {
        console.log('Service Worker: App shell cacheado com sucesso.');
        return self.skipWaiting();
      })
      .catch(error => {
        // Este log agora será muito mais útil para depurar
        console.error('Service Worker: Falha ao adicionar arquivos ao cache. Verifique se todos os caminhos em urlsToCache estão corretos e acessíveis.', error);
      })
  );
});

// Evento activate: Limpa caches antigos
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Cache antigo limpo.');
            return self.clients.claim();
        })
    );
});


// Evento fetch: Intercepta as requisições de rede
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const isFirebaseAuthRequest =
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('securetoken.googleapis.com');

  if (isFirebaseAuthRequest) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(
            networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return networkResponse;
            }
        ).catch(error => {
            console.error('[SW Fetch Error] Falha ao buscar na rede:', event.request.url, error);
            // Poderíamos retornar aqui uma página offline customizada
        });
      })
  );
});
