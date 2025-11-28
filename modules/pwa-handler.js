// modules/pwa-handler.js

let deferredPrompt;

export function init() {
    const installButton = document.getElementById('install-button');

    // 1. Ouvir o evento que o navegador dispara quando o app é instalável
    window.addEventListener('beforeinstallprompt', (e) => {
        // Impede o navegador de mostrar o prompt padrão imediatamente (e.g. barra inferior no Chrome antigo)
        e.preventDefault();
        // Salva o evento para disparar mais tarde
        deferredPrompt = e;
        // Mostra o nosso botão personalizado
        if (installButton) installButton.style.display = 'inline-flex';
        console.log("[PWA] App pronto para instalação.");
    });

    // 2. Lidar com o clique no botão
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            // Mostra o prompt de instalação nativo
            deferredPrompt.prompt();

            // Espera a escolha do usuário
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`[PWA] Escolha do usuário: ${outcome}`);

            // Limpa a variável, pois o prompt só pode ser usado uma vez
            deferredPrompt = null;
            // Esconde o botão novamente
            installButton.style.display = 'none';
        });
    }

    // 3. Opcional: Detectar se o app já foi instalado
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Aplicativo instalado com sucesso');
        if (installButton) installButton.style.display = 'none';
    });
}
