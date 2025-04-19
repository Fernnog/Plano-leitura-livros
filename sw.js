// --- START OF FILE sw.js (Corrigido) ---

// Nome do cache (opcional, mas útil para versionamento)
const CACHE_NAME = 'gerenciador-leitura-cache-v1';
// Arquivos essenciais para o app shell (com caminhos relativos corrigidos)
const urlsToCache = [
  '.', // Representa o diretório atual (o root do projeto)
  'index.html', // Ou './index.html'
  'style.css',  // Ou './style.css'
  'script.js',  // Ou './script.js'
  'logo.png',   // Ou './logo.png'
  'imagens/logo_192.png', // Ou './imagens/logo_192.png'
  'imagens/logo_512.png', // Ou './imagens/logo_512.png'
  'manifest.json', // Adicionado (Importante que o manifesto seja cacheado também)
  'favicon.ico',   // Adicionado (Se você o referenciar)
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200', // Fonte externa
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Ubuntu:wght@700&display=swap' // Fonte externa
  // Adicione outros CSS, JS, imagens ou fontes essenciais aqui, se necessário
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
  // Ignora requisições que não são http/https (ex: chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

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

        // Clona a requisição para usar separadamente no fetch e no cache.put
        // É necessário porque Request/Response são streams e só podem ser consumidos uma vez.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
            networkResponse => {
                // Verifica se a resposta da rede é válida antes de cachear
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !networkResponse.type.startsWith('cors')) {
                    // Não cacheia respostas inválidas (erros, respostas opacas que não queremos, etc.)
                    // Exceto as fontes do gstatic que são 'cors'
                     if(!(networkResponse && networkResponse.url.includes('fonts.gstatic.com'))) {
                        console.log('Service Worker: Resposta da rede NÃO cacheada (status/tipo inválido):', event.request.url, networkResponse ? networkResponse.status : 'No Response');
                        return networkResponse; // Retorna a resposta (mesmo inválida) para o navegador
                     }
                }

                // Clona a resposta da rede para poder usá-la no cache e retorná-la ao navegador
                const responseToCache = networkResponse.clone();

                // Decide se deve cachear
                const isFirebaseRequest = event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebaseapp.com');
                const isFontRequest = event.request.url.includes('fonts.gstatic.com'); // Cachear fontes é ok

                if (!isFirebaseRequest || isFontRequest) { // Cacheia se NÃO for Firebase ou SE FOR fonte
                     caches.open(CACHE_NAME)
                        .then(cache => {
                            console.log('Service Worker: Cacheando nova resposta de:', event.request.url);
                            cache.put(event.request, responseToCache); // Usa a requisição original (event.request) como chave
                        });
                }

                return networkResponse; // Retorna a resposta original da rede para o navegador
            }
        ).catch(error => { // --- BLOCO CATCH CORRIGIDO ---
            console.error('Service Worker: Erro ao buscar na rede para:', event.request.url, error);

            // Retorna uma resposta de erro genérica para satisfazer o event.respondWith
            // Isso evita o TypeError "Failed to convert value to Response"
            // O navegador provavelmente mostrará seu erro de rede padrão para o recurso que falhou.
            return new Response(
                `Erro de Rede ao buscar: ${event.request.url}. Verifique sua conexão. Detalhes: ${error.message}`,
                {
                    status: 503, // Service Unavailable
                    statusText: 'Network Error',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }
            );
            // --- FIM DA CORREÇÃO ---
        });
      })
  );
});

// --- END OF FILE sw.js (Corrigido) ---
