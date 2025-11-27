// --- START OF FILE sw.js (AJUSTADO PARA GITHUB PAGES) ---

// Mudei para v3 para garantir que o navegador descarte a versão antiga conflituosa
const CACHE_NAME = 'gerenciador-leitura-cache-v3';

// Define o caminho exato do repositório no GitHub Pages
const REPO = '/Plano-leitura-livros';

// Lista completa de arquivos essenciais.
// Agora concatenamos (somamos) o nome do repositório aos caminhos para evitar ambiguidade.
const urlsToCache = [
  REPO + '/',                 // A raiz da aplicação
  REPO + '/index.html',
  REPO + '/style.css',
  REPO + '/manifest.json',
  REPO + '/favicon.ico',
  REPO + '/logo.png',
  
  // Imagens
  REPO + '/imagens/logo_192.png',
  REPO + '/imagens/logo_512.png',

  // Scripts JavaScript modulares
  REPO + '/main.js',
  REPO + '/modules/dom-elements.js',
  REPO + '/modules/ui.js',
  REPO + '/modules/plano-logic.js',
  REPO + '/modules/state.js',
  REPO + '/modules/auth.js',
  REPO + '/modules/firestore-service.js',
  REPO + '/config/firebase-config.js',
  
  // Recursos externos (fontes e ícones) - Estes mantêm-se como URLs absolutas
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Ubuntu:wght@700&display=swap'
];

// --- Evento 'install': Cacheia os arquivos e força a ativação ---
self.addEventListener('install', event => {
  console.log('[SW Leitura] Evento: install');
  self.skipWaiting(); // Força a ativação imediata (movido para fora do waitUntil por segurança)
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW Leitura] Cacheando o App Shell...');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[SW Leitura] Falha na instalação. Verifique caminhos.', error);
      })
  );
});

// --- Evento 'activate': Limpa caches antigos e assume o controle ---
self.addEventListener('activate', event => {
    console.log('[SW Leitura] Evento: activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Se o cache não for o atual (v3) e for um cache antigo deste app, apaga.
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW Leitura] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW Leitura] Cache antigo limpo.');
            return self.clients.claim();
        })
    );
});

// --- Evento 'fetch': Intercepta requisições de rede ---
self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam HTTP/HTTPS
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // --- Lógica de Bypass para APIs do Firebase (MANTIDA ORIGINAL) ---
  const isFirebaseApiRequest = 
    event.request.url.includes('identitytoolkit.googleapis.com') || 
    event.request.url.includes('firestore.googleapis.com');         

  if (isFirebaseApiRequest) {
    return; // Passa direto para a rede
  }

  // Estratégia "Cache, falling back to Network"
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(
          networkResponse => {
            // Cache dinâmico para novos arquivos encontrados (ex: fontes woff2 carregadas pelo CSS)
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('[SW Leitura] Falha na rede.', event.request.url);
            // Opcional: Retornar página offline se desejar no futuro
        });
      })
  );
});
// --- END OF FILE sw.js ---
              
