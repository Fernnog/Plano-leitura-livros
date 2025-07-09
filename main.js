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
    ui.registerServiceWorker();
    setupEventHandlers();
    authService.setupAuthStateObserver(handleAuthStateChange);
}

// --- Gerenciamento Central de Autenticação ---
async function handleAuthStateChange(firebaseUser) {
    state.setUser(firebaseUser);
    
    ui.toggleLoading(true);
    if (state.getCurrentUser()) {
        const planosCarregados = await firestoreService.carregarPlanos(state.getCurrentUser());
        state.setPlanos(planosCarregados);
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
    DOMElements.reavaliacaoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.reavaliacaoModal) ui.hideReavaliacaoModal();
    });
    
    // NOVO: Modal de Recálculo
    DOMElements.confirmRecalculoBtn.addEventListener('click', handleConfirmRecalculo);
    DOMElements.recalculoModalCloseBtn.addEventListener('click', ui.hideRecalculoModal);
    DOMElements.cancelRecalculoBtn.addEventListener('click', ui.hideRecalculoModal);
    DOMElements.recalculoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.recalculoModal) ui.hideRecalculoModal();
    });
}

// --- Manipuladores de Ações (Handlers) ---

async function handleLogin() { /* ...código inalterado... */ }
async function handleSignup() { /* ...código inalterado... */ }
async function handleLogout() { /* ...código inalterado... */ }

async function handleFormSubmit(event) {
    event.preventDefault();
    const currentUser = state.getCurrentUser();
    if (!currentUser) {
        alert("Você precisa estar logado para salvar um plano.");
        return;
    }

    try {
        const formData = ui.getFormData(); 
        const diasPlano = planoLogic.gerarDiasDoPlano(formData); // Note: Esta função não existe, vamos criar um helper
        if (!diasPlano || diasPlano.length === 0) {
            throw new Error("Não foi possível gerar dias de leitura com as configurações fornecidas.");
        }
        
        // Helper para montar o objeto plano
        const planoData = construirObjetoPlano(formData, diasPlano); 
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
        
        const planoIndexFinal = indexEditando !== -1 ? indexEditando : 0;
        state.setPlanoEditando(-1);
        ui.showPlanosList(state.getPlanos(), currentUser);
        ui.highlightAndScrollToPlano(planoIndexFinal); // UX Feedback

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
            // Agora apenas abre o modal
            ui.showRecalculoModal(plano, planoIndex);
            break;
    }
}

async function handleConfirmRecalculo() {
    const planoIndex = parseInt(DOMElements.confirmRecalculoBtn.dataset.planoIndex, 10);
    const planoOriginal = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();
    const novaDataFimStr = DOMElements.novaDataFimInput.value;

    if (!planoOriginal || !currentUser || !novaDataFimStr) {
        alert("Por favor, selecione uma nova data de fim.");
        return;
    }

    try {
        const novaDataFim = new Date(novaDataFimStr + 'T00:00:00');
        if (isNaN(novaDataFim.getTime()) || novaDataFim <= new Date()) {
            throw new Error("Data inválida. Por favor, insira uma data futura.");
        }
        
        const planoRecalculado = planoLogic.recalcularPlanoComNovaData(planoOriginal, novaDataFim);
        
        state.updatePlano(planoIndex, planoRecalculado);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        
        ui.hideRecalculoModal();
        alert(`Plano "${planoOriginal.titulo}" recalculado com sucesso!`);
        
        ui.renderApp(state.getPlanos(), currentUser);
        ui.highlightAndScrollToPlano(planoIndex); // UX Feedback

    } catch (error) {
        console.error('[Main] Erro ao confirmar recálculo:', error);
        alert('Erro ao recalcular: ' + error.message);
    }
}

function handleReavaliarCarga() {
    const planosAtuais = state.getPlanos();
    const totalPlanos = planosAtuais.length; 
    const dadosCarga = planoLogic.analisarCargaSemanal(planosAtuais, totalPlanos);
    ui.renderizarQuadroReavaliacao(dadosCarga);
    ui.showReavaliacaoModal();
}

// --- Funções Helper (movidas de handleFormSubmit para reutilização) ---
// (Adicionei estes helpers para manter o handleFormSubmit mais limpo)
function gerarDiasDoPlano(formData) {
    if (formData.definicaoPeriodo === 'datas') {
        return planoLogic.gerarDiasPlanoPorDatas(formData.dataInicio, formData.dataFim, formData.periodicidade, formData.diasSemana);
    } else {
        return planoLogic.gerarDiasPlanoPorDias(formData.dataInicio, formData.numeroDias, formData.periodicidade, formData.diasSemana);
    }
}

function construirObjetoPlano(formData, diasPlano) {
    const planoEditado = state.getPlanoByIndex(state.getPlanoEditandoIndex());
    const id = planoEditado ? planoEditado.id : crypto.randomUUID();
    const dataFim = formData.definicaoPeriodo === 'datas' ? formData.dataFim : (diasPlano[diasPlano.length - 1]?.data || new Date());

    return {
        id: id,
        titulo: formData.titulo,
        linkDrive: formData.linkDrive,
        paginaInicio: formData.paginaInicio,
        paginaFim: formData.paginaFim,
        dataInicio: formData.dataInicio,
        dataFim: dataFim,
        periodicidade: formData.periodicidade,
        diasSemana: formData.diasSemana,
        diasPlano: diasPlano,
        paginasLidas: 0,
        totalPaginas: formData.paginaFim - formData.paginaInicio + 1
    };
}

// Código para `handleLogin`, `handleSignup`, `handleLogout` sem alterações.
async function handleLogin() {
    try {
        await authService.loginWithEmailPassword();
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
    } catch (error) {
        console.error('[Main] Erro no logout:', error);
        alert('Erro ao sair: ' + error.message);
    }
}