const CACHE_NAME = 'judolingo-v28'; // Mude este número sempre que atualizar o site ou a planilha!

// Arquivos essenciais que o jogo precisa para funcionar offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './questions.csv',
    './icon-192.png'
    // Se tiver 'icon-512.png', adicione aqui também
];

// 1. Instalação: Baixa os arquivos para o cache do celular
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all: app shell and content');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Força o SW a ativar imediatamente
    );
});

// 2. Ativação: Limpa os caches antigos (v7, v6, etc) para liberar espaço e atualizar
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
        .then(() => self.clients.claim()) // Assume o controle da página imediatamente
    );
});

// 3. Fetch: Intercepta os pedidos. Se tiver no cache, entrega rápido. Se não, busca na internet.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Retorna o cache se encontrar, senão vai para a rede
            return response || fetch(event.request);
        })
    );
});
