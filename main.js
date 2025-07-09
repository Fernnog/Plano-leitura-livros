// main.js - O Orquestrador da Aplicação

// --- Importações dos Módulos ---
import * as DOMElements from './modules/dom-elements.js';
import * as state from './modules/state.js';
import * as authService from './modules/auth.js';
import * as firestoreService from './modules/firestore-service.js';
import * as ui from './modules/ui.js';
import * as planoLogic from './modules/plano-logic.js';

// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log("[Main] DOM pronto. Iniciando aplicação modularizada.");
    ui.registerServiceWorker(); // Lógica de PWA movida para o módulo de UI
    setupEventHandlers();
    authService.setupAuthStateObserver(handleAuthStateChange); // Observa o estado de login
}

// --- Gerenciamento Central de Autenticação ---
async function handleAuthStateChange(firebaseUser) {
    state.setUser(firebaseUser); // Atualiza o estado central
    
    ui.toggleLoading(true); // Mostra um feedback de carregamento para o usuário
    if (state.getCurrentUser()) {
        const planosCarregados = await firestoreService.carregarPlanos(state.getCurrentUser());
        state.setPlanos(planosCarregados);
    } else {
        state.setPlanos([]); // Limpa os planos se o usuário deslogar
    }
    
    // Após carregar os dados (ou limpar), renderiza a aplicação inteira com o novo estado
    ui.renderApp(state.getPlanos(), state.getCurrentUser());
    ui.toggleLoading(false);
}

// --- Configuração dos Ouvintes de Eventos (Event Listeners) ---
function setupEventHandlers() {
    // --- Autenticação ---
    DOMElements.loginEmailButton.addEventListener('click', handleLogin);
    DOMElements.signupEmailButton.addEventListener('click', handleSignup);
    DOMElements.logoutButton.addEventListener('click', handleLogout);
    DOMElements.showAuthButton.addEventListener('click', ui.showAuthForm);
    DOMElements.cancelAuthButton.addEventListener('click', ui.hideAuthForm);

    // --- Navegação Principal ---
    DOMElements.novoPlanoBtn.addEventListener('click', ui.showCadastroForm);
    DOMElements.inicioBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    DOMElements.inicioCadastroBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    
    // --- Formulário de Plano (Criação/Edição) ---
    DOMElements.formPlano.addEventListener('submit', handleFormSubmit);

    // --- Ações nos Cards (Usando Event Delegation) ---
    DOMElements.listaPlanos.addEventListener('click', handleCardAction);
}

// --- Manipuladores de Ações (Handlers) ---

async function handleLogin() {
    try {
        await authService.loginWithEmailPassword();
        // O sucesso será tratado pelo `handleAuthStateChange`
    } catch (error) {
        console.error('[Main] Erro no login:', error);
        alert('Erro ao fazer login: ' + error.message);
    }
}

async function handleSignup() {
    try {
        await authService.signupWithEmailPassword();
        alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
        ui.hideAuthForm();
    } catch (error) {
        console.error('[Main] Erro no cadastro:', error);
        alert('Erro ao cadastrar: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await authService.logout();
        // A atualização da UI será tratada pelo `handleAuthStateChange`
    } catch (error) {
        console.error('[Main] Erro no logout:', error);
        alert('Erro ao sair: ' + error.message);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const currentUser = state.getCurrentUser();
    if (!currentUser) {
        alert("Você precisa estar logado para salvar um plano.");
        return;
    }

    try {
        // 1. Obter e validar dados do formulário (responsabilidade da UI)
        const formData = ui.getFormData(); 

        // 2. Gerar a estrutura de dias (responsabilidade da lógica de negócio)
        const diasPlano = planoLogic.gerarDiasDoPlano(formData);
        if (!diasPlano || diasPlano.length === 0) {
            alert("Não foi possível gerar dias de leitura com as configurações fornecidas.");
            return;
        }
        
        // 3. Montar o objeto final do plano
        const planoData = planoLogic.construirObjetoPlano(formData, diasPlano, state.getPlanoByIndex(state.getPlanoEditandoIndex()));
        
        // 4. Distribuir as páginas
        planoLogic.distribuirPaginasPlano(planoData);
        
        // 5. Atualizar o estado local
        if (state.getPlanoEditandoIndex() !== -1) {
            state.updatePlano(state.getPlanoEditandoIndex(), planoData);
        } else {
            state.addPlano(planoData);
        }
        
        // 6. Salvar no Firestore
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());

        // 7. Resetar e navegar
        const acao = state.getPlanoEditandoIndex() !== -1 ? 'atualizado' : 'criado';
        alert(`Plano "${planoData.titulo}" ${acao} com sucesso!`);
        state.setPlanoEditando(-1);
        ui.showPlanosList(state.getPlanos(), currentUser);

    } catch (error) {
        console.error("[Main] Erro ao submeter formulário:", error);
        alert("Erro: " + error.message);
    }
}

async function handleCardAction(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const plano = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (!plano || !currentUser) return;

    switch (action) {
        case 'editar':
            state.setPlanoEditando(planoIndex);
            ui.showCadastroForm(plano);
            break;

        case 'excluir':
            if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
                const titulo = state.removePlano(planoIndex);
                await firestoreService.salvarPlanos(currentUser, state.getPlanos());
                alert(`Plano "${titulo}" excluído.`);
                ui.renderApp(state.getPlanos(), currentUser);
            }
            break;
            
        case 'marcar-lido':
            const diaIndex = parseInt(target.dataset.diaIndex, 10);
            const isChecked = target.checked;
            
            planoLogic.marcarDiaLido(plano, diaIndex, isChecked); // Modifica o objeto plano
            state.updatePlano(planoIndex, plano); // Atualiza o plano modificado no estado
            
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            ui.renderApp(state.getPlanos(), currentUser); // Re-renderiza tudo para refletir o progresso
            break;
        
        // Adicionar outros casos: 'editar-link', 'recalcular', etc.
        // Cada um chamando sua respectiva função de lógica/ui e depois salvando/re-renderizando.
    }
}