// --- START OF FILE sw.js ---

// Nome do cache (opcional, mas útil para versionamento)
const CACHE_NAME = 'gerenciador-leitura-cache-v1';
// Arquivos essenciais para o app shell (adicione os seus)
const urlsToCache = [
  '/', // Ou '/index.html' ou '.' dependendo da sua estrutura e start_url
  './index.html',
  './style.css',
  './script.js', // Se o script.js for essencial para o carregamento inicial
  './logo.png', // Logo usado no header
  './imagens/logo_192.png', // Ícone do manifest
  './imagens/logo_512.png', // Ícone do manifest
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200', // Fonte externa
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Ubuntu:wght@700&display=swap' // Fonte externa
  // Adicione outros CSS, JS, imagens ou fontes essenciais aqui
];

// Evento install: chamado quando o SW é registrado pela primeira vez
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Espera até que o cache seja aberto e os arquivos sejam adicionados
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Abrindo cache e adicionando arquivos do app shell');
        // Importante: `addAll` falhará se *qualquer* um dos arquivos não for encontrado (404)
        // Verifique os caminhos cuidadosamente!
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Service Worker: Falha ao adicionar arquivos ao cache durante a instalação:', error);
            // Mesmo que falhe, não queremos quebrar a instalação do SW completamente
            // Em um cenário real, você pode querer lidar com isso de forma diferente
        });
      })
      .then(() => {
        console.log('Service Worker: App shell cacheado com sucesso.');
        // Força o novo Service Worker a se tornar ativo imediatamente
        // (útil para desenvolvimento, pode ser removido em produção se preferir esperar)
         return self.skipWaiting();
      })
  );
});

// Evento activate: chamado após a instalação, quando o SW se torna ativo
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    // Limpa caches antigos (se o CACHE_NAME mudou)
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
            // Assume o controle das páginas abertas imediatamente
            return self.clients.claim();
        })
    );
     console.log('Service Worker: Ativado e pronto para controlar a página.');
});


// Evento fetch: intercepta todas as requisições de rede da página
self.addEventListener('fetch', event => {
  console.log('Service Worker: Interceptando fetch para:', event.request.url);
  // Estratégia: Cache first, then network
  event.respondWith(
    caches.match(event.request) // Tenta encontrar a requisição no cache
      .then(response => {
        // Se encontrar no cache, retorna a resposta do cache
        if (response) {
          console.log('Service Worker: Encontrado no cache:', event.request.url);
          return response;
        }
        // Se não encontrar no cache, busca na rede
        console.log('Service Worker: Não encontrado no cache, buscando na rede:', event.request.url);
        return fetch(event.request).then(
            // Opcional: Cachear a resposta da rede para futuras requisições
            // Cuidado: Não cacheie tudo, especialmente requisições POST ou dados dinâmicos do Firebase sem uma estratégia adequada
            networkResponse => {
                // Verifica se a resposta é válida e se é uma requisição GET para cachear
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    // Não cacheamos dados do Firebase aqui por padrão, pois são dinâmicos
                    const isFirebaseRequest = event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebaseapp.com');
                    const isFontRequest = event.request.url.includes('fonts.gstatic.com'); // Cachear fontes é ok

                    // Clona a resposta para poder usá-la no cache e retorná-la ao navegador
                    const responseToCache = networkResponse.clone();

                    if (!isFirebaseRequest || isFontRequest) { // Cacheia se NÃO for Firebase ou SE FOR fonte
                         caches.open(CACHE_NAME)
                            .then(cache => {
                                console.log('Service Worker: Cacheando nova resposta de:', event.request.url);
                                cache.put(event.request, responseToCache);
                            });
                    }
                }
                return networkResponse;
            }
        ).catch(error => {
            console.error('Service Worker: Erro ao buscar na rede:', error);
            // Opcional: Retornar uma página offline genérica se a rede falhar e não estiver no cache
            // return caches.match('/offline.html'); // Você precisaria criar e cachear 'offline.html'
        });
      })
  );
});

// --- END OF FILE sw.js ---
