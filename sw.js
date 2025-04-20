// --- START OF FILE sw.js (Atualizado com Bypass para Firebase Auth) ---

// Nome do cache (mantenha ou atualize se precisar limpar tudo)
const CACHE_NAME = 'gerenciador-leitura-cache-v1';
// Arquivos essenciais para o app shell (verifique se todos os caminhos estão corretos)
const urlsToCache = [
  '.', // Diretório raiz
  './index.html',
  './style.css',
  './script.js',
  './logo.png',
  './imagens/logo_192.png',
  './imagens/logo_512.png',
  './manifest.json',
  './favicon.ico',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Ubuntu:wght@700&display=swap'
  // Adicione outros recursos que seu app precisa offline
];

// Evento install: Instala o SW e cacheia o App Shell
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Abrindo cache e adicionando arquivos do app shell');
        // Use catch para evitar que um único erro 404 impeça a instalação
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Service Worker: Falha ao adicionar um ou mais arquivos ao cache durante a instalação:', error);
        });
      })
      .then(() => {
        console.log('Service Worker: App shell cacheado.');
        return self.skipWaiting(); // Força a ativação imediata do novo SW
      })
  );
});

// Evento activate: Limpa caches antigos e assume controle das páginas
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
            return self.clients.claim(); // Assume o controle das abas abertas
        })
    );
    console.log('Service Worker: Ativado e pronto para controlar a página.');
});


// Evento fetch: Intercepta as requisições de rede
self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam HTTP/HTTPS
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // --- INÍCIO: Lógica de Bypass para Autenticação Firebase ---
  // Verifica se a URL da requisição pertence aos serviços de autenticação do Firebase
  // Ajuste essas strings se o Firebase mudar os endpoints ou se você notar outros no DevTools Network tab
  const isFirebaseAuthRequest =
    event.request.url.includes('identitytoolkit.googleapis.com') || // Login, Signup, etc.
    event.request.url.includes('securetoken.googleapis.com');      // Obtenção/refresh de tokens

  if (isFirebaseAuthRequest) {
    console.log('[SW Bypass] Ignorando interceptação para requisição de Auth Firebase:', event.request.url);
    // NÃO chama event.respondWith(). Isso permite que a requisição vá direto para a rede.
    return;
  }
  // --- FIM: Lógica de Bypass ---

  // Se não for uma requisição de Auth, aplica a estratégia de cache
  console.log('[SW Intercept] Interceptando requisição:', event.request.url);

  // Estratégia: Cache first, then network (para os demais recursos)
  event.respondWith(
    caches.match(event.request) // 1. Tenta encontrar no cache
      .then(cachedResponse => {
        if (cachedResponse) {
          // 1a. Encontrado no cache, retorna a resposta cacheada
          console.log('[SW Cache Hit] Servindo do cache:', event.request.url);
          return cachedResponse;
        }

        // 2. Não encontrado no cache, busca na rede
        console.log('[SW Cache Miss] Buscando na rede:', event.request.url);
        return fetch(event.request.clone()).then( // Clona a requisição para poder usá-la e cacheá-la
            networkResponse => {
                // 2a. Resposta da rede recebida

                // Verifica se a resposta é válida para cachear
                const isValidResponse = networkResponse && networkResponse.status === 200 &&
                                        (networkResponse.type === 'basic' || networkResponse.type === 'cors'); // Aceita 'basic' e 'cors'

                // Define o que NÃO deve ser cacheado explicitamente (além do Auth já tratado)
                const isFirebaseDataRequest = event.request.url.includes('firestore.googleapis.com'); // Ex: Firestore

                // Define o que PODE ser cacheado mesmo vindo de fora (ex: fontes)
                const isFontRequest = event.request.url.includes('fonts.gstatic.com') || event.request.url.includes('fonts.googleapis.com');

                // Decide se vai cachear: Resposta válida E (NÃO é Firestore OU É uma Fonte)
                const shouldCache = isValidResponse && (!isFirebaseDataRequest || isFontRequest);

                if (shouldCache) {
                    // Clona a resposta para poder cachear e retornar ao navegador
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            console.log('[SW Caching] Cacheando nova resposta de:', event.request.url);
                            cache.put(event.request, responseToCache); // Salva a requisição/resposta no cache
                        })
                        .catch(cacheError => {
                            console.error('[SW Cache Put Error] Erro ao salvar no cache:', event.request.url, cacheError);
                        });
                } else if (isValidResponse && isFirebaseDataRequest && !isFontRequest) {
                     console.log('[SW No Cache] Não cacheando API Firestore Data:', event.request.url);
                } else if (!isValidResponse) {
                     console.log('[SW No Cache] Resposta inválida da rede, não cacheada:', event.request.url, networkResponse ? networkResponse.status : 'Sem Resposta');
                }

                // Retorna a resposta original da rede para o navegador
                return networkResponse;
            }
        ).catch(fetchError => { // 2b. Erro ao buscar na rede
            console.error('[SW Fetch Error] Falha ao buscar na rede:', event.request.url, fetchError);
            // Retorna uma resposta de erro genérica (poderia ser uma página offline customizada)
            return new Response(
                `Erro de Rede: Não foi possível buscar ${event.request.url}. Verifique sua conexão.`,
                {
                    status: 503, // Service Unavailable
                    statusText: 'Network Error',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }
            );
        });
      })
  );
});

// --- END OF FILE sw.js (Atualizado com Bypass para Firebase Auth) ---
