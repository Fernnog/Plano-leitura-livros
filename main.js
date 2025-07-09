// main.js - O Orquestrador da Aplicação

// --- Importações dos Módulos ---
import * as DOMElements from './modules/dom-elements.js';
import * as state from './modules/state.js';
import * as authService from './modules/auth.js';
import * as firestoreService from './modules/firestore-service.js';
import * as ui from './modules/ui.js';
import * as planoLogic from './modules/plano-logic.js';

// --- Variáveis de Controle de Fluxo da UI ---
// NOVA MELHORIA: Flag para controlar o fluxo de recálculo e reabrir o modal de reavaliação.
let recalculoIniciadoPorReavaliacao = false;

// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log("[Main] DOM pronto. Iniciando aplicação modularizada.");
    ui.registerServiceWorker();
    setupEventHandlers();
    authService.setupAuthStateObserver(handleAuthStateChange);
}

// --- Gerenciamento Central de Autenticação ---
async function handleAuthStateChange(firebaseUser) {
    state.setUser(firebaseUser);
    
    ui.toggleLoading(true);
    if (state.getCurrentUser()) {
        try {
            const planosCarregados = await firestoreService.carregarPlanos(state.getCurrentUser());
            state.setPlanos(planosCarregados);
        } catch (error) {
            console.error(error);
            alert("Falha ao carregar seus dados. Verifique sua conexão e tente recarregar a página.");
        }
    } else {
        state.setPlanos([]);
    }
    
    ui.renderApp(state.getPlanos(), state.getCurrentUser());
    ui.toggleLoading(false);
}

// --- Configuração dos Ouvintes de Eventos (Event Listeners) ---
function setupEventHandlers() {
    // Autenticação
    DOMElements.loginEmailButton.addEventListener('click', handleLogin);
    DOMElements.signupEmailButton.addEventListener('click', handleSignup);
    DOMElements.logoutButton.addEventListener('click', handleLogout);
    DOMElements.showAuthButton.addEventListener('click', ui.showAuthForm);
    DOMElements.cancelAuthButton.addEventListener('click', ui.hideAuthForm);

    // Navegação Principal
    DOMElements.novoPlanoBtn.addEventListener('click', ui.showCadastroForm);
    DOMElements.inicioBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    DOMElements.inicioCadastroBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    
    // Formulário de Plano
    DOMElements.formPlano.addEventListener('submit', handleFormSubmit);

    // Ações nos Cards (Event Delegation)
    DOMElements.listaPlanos.addEventListener('click', handleCardAction);

    // Modal de Reavaliação de Carga
    DOMElements.reavaliarCargaBtn.addEventListener('click', handleReavaliarCarga);
    DOMElements.fecharReavaliacaoBtn.addEventListener('click', ui.hideReavaliacaoModal);
    // NOVA MELHORIA: Delegação de eventos para ações dentro do modal de reavaliação
    DOMElements.reavaliacaoModal.addEventListener('click', handleModalReavaliacaoAction);
    
    // Modal de Recálculo
    DOMElements.confirmRecalculoBtn.addEventListener('click', handleConfirmRecalculo);
    DOMElements.recalculoModalCloseBtn.addEventListener('click', () => {
        recalculoIniciadoPorReavaliacao = false; // NOVA MELHORIA: Reseta a flag ao fechar
        ui.hideRecalculoModal();
    });
    DOMElements.cancelRecalculoBtn.addEventListener('click', () => {
        recalculoIniciadoPorReavaliacao = false; // NOVA MELHORIA: Reseta a flag ao cancelar
        ui.hideRecalculoModal();
    });
    DOMElements.recalculoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.recalculoModal) {
            recalculoIniciadoPorReavaliacao = false; // NOVA MELHORIA: Reseta a flag ao clicar fora
            ui.hideRecalculoModal();
        }
    });
}

// --- Manipuladores de Ações (Handlers) ---

async function handleLogin() {
    try {
        const email = DOMElements.emailLoginInput.value;
        const password = DOMElements.passwordLoginInput.value;
        await authService.loginWithEmailPassword(email, password);
    } catch (error) {
        console.error('[Main] Erro no login:', error);
        alert('Erro ao fazer login: ' + error.message);
    }
}
async function handleSignup() {
    try {
        const email = DOMElements.emailLoginInput.value;
        const password = DOMElements.passwordLoginInput.value;
        await authService.signupWithEmailPassword(email, password);
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
        const formData = ui.getFormData(); 
        const planoData = planoLogic.construirObjetoPlano(formData, state.getPlanoByIndex(state.getPlanoEditandoIndex()));
        planoLogic.distribuirPaginasPlano(planoData);
        
        const indexEditando = state.getPlanoEditandoIndex();
        if (indexEditando !== -1) {
            state.updatePlano(indexEditando, planoData);
        } else {
            state.addPlano(planoData);
        }
        
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());

        const acao = indexEditando !== -1 ? 'atualizado' : 'criado';
        alert(`Plano "${planoData.titulo}" ${acao} com sucesso!`);
        
        state.setPlanoEditando(-1);
        ui.showPlanosList(state.getPlanos(), currentUser);
        
        const planoIndexFinal = state.getPlanos().findIndex(p => p.id === planoData.id);
        if(planoIndexFinal !== -1) {
            ui.highlightAndScrollToPlano(planoIndexFinal);
        }

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

    if (isNaN(planoIndex) || !plano || !currentUser) return;

    switch (action) {
        case 'editar':
            state.setPlanoEditando(planoIndex);
            ui.showCadastroForm(plano);
            break;

        case 'excluir':
            if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
                state.removePlano(planoIndex);
                await firestoreService.salvarPlanos(currentUser, state.getPlanos());
                alert(`Plano excluído.`);
                ui.renderApp(state.getPlanos(), currentUser);
            }
            break;
            
        case 'marcar-lido':
            const diaIndex = parseInt(target.dataset.diaIndex, 10);
            plano.diasPlano[diaIndex].lido = target.checked;
            planoLogic.atualizarPaginasLidas(plano);
            state.updatePlano(planoIndex, plano);
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            ui.renderApp(state.getPlanos(), currentUser);
            break;
        
        case 'recalcular':
            ui.showRecalculoModal(plano, planoIndex);
            break;
    }
}

// NOVA MELHORIA: Função para lidar com ações dentro do Modal de Reavaliação
async function handleModalReavaliacaoAction(event) {
    const target = event.target.closest('[data-action="remanejar-plano"]');
    if (target) {
        const planoIndex = parseInt(target.dataset.planoIndex, 10);
        const plano = state.getPlanoByIndex(planoIndex);

        if (isNaN(planoIndex) || !plano) return;

        // Ativa a flag para indicar que o fluxo de remanejamento começou
        recalculoIniciadoPorReavaliacao = true;
        
        // Esconde o modal atual e abre o de recálculo
        ui.hideReavaliacaoModal();
        setTimeout(() => {
            ui.showRecalculoModal(plano, planoIndex);
        }, 300); // Timeout para uma transição suave entre modais
    } else if (event.target === DOMElements.reavaliacaoModal) {
        // Lógica para fechar o modal clicando fora (já existente, mas agora dentro desta função)
        ui.hideReavaliacaoModal();
    }
}


async function handleConfirmRecalculo() {
    const planoIndex = parseInt(DOMElements.confirmRecalculoBtn.dataset.planoIndex, 10);
    const planoOriginal = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (!planoOriginal || !currentUser) return;

    try {
        let planoRecalculado;

        if (DOMElements.recalculoPorDataRadio.checked) {
            const novaDataFimStr = DOMElements.novaDataFimInput.value;
            if (!novaDataFimStr) throw new Error("Por favor, selecione uma nova data de fim.");

            const novaDataFim = new Date(novaDataFimStr + 'T00:00:00');
            if (isNaN(novaDataFim.getTime()) || novaDataFim <= new Date()) {
                throw new Error("Data inválida. Por favor, insira uma data futura.");
            }
            planoRecalculado = planoLogic.recalcularPlanoComNovaData(planoOriginal, novaDataFim);

        } else {
            const paginasPorDia = parseInt(DOMElements.novaPaginasPorDiaInput.value, 10);
            if (!paginasPorDia || paginasPorDia <= 0) {
                throw new Error("Por favor, insira um número de páginas por dia válido.");
            }
            planoRecalculado = planoLogic.recalcularPlanoPorPaginasDia(planoOriginal, paginasPorDia);
        }

        state.updatePlano(planoIndex, planoRecalculado);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        
        ui.hideRecalculoModal();
        alert(`Plano "${planoOriginal.titulo}" recalculado com sucesso!`);
        
        // NOVA MELHORIA: Lógica de feedback instantâneo
        if (recalculoIniciadoPorReavaliacao) {
            // Se o fluxo veio do modal de reavaliação, reabra-o com os dados atualizados
            recalculoIniciadoPorReavaliacao = false; // Reseta a flag
            handleReavaliarCarga(); // Reabre o modal de reavaliação
        } else {
            // Comportamento padrão: renderiza a lista de planos e destaca o plano alterado
            ui.renderApp(state.getPlanos(), currentUser);
            ui.highlightAndScrollToPlano(planoIndex);
        }

    } catch (error) {
        recalculoIniciadoPorReavaliacao = false; // Garante que a flag seja resetada em caso de erro
        console.error('[Main] Erro ao confirmar recálculo:', error);
        alert('Erro ao recalcular: ' + error.message);
    }
}

// NOVA MELHORIA: A função agora orquestra a renderização da tabela E da legenda
function handleReavaliarCarga() {
    const planosAtuais = state.getPlanos();
    const totalPlanos = planosAtuais.length; 
    const dadosCarga = planoLogic.analisarCargaSemanal(planosAtuais, totalPlanos);
    
    // Delega para a UI a renderização completa do modal (tabela e legenda)
    ui.renderizarQuadroReavaliacao(dadosCarga);
    // Assumindo que ui.js exportará uma função para renderizar a legenda, conforme o plano.
    // O nome da função no plano era `renderizarLegendaReavaliacaoUI`
    ui.renderizarLegendaReavaliacaoUI(planosAtuais, totalPlanos);

    ui.showReavaliacaoModal();
}