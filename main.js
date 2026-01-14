// main.js - O Orquestrador da Aplicação

// --- Importações dos Módulos ---
import * as DOMElements from './modules/dom-elements.js';
import * as state from './modules/state.js';
import * as authService from './modules/auth.js';
import * as firestoreService from './modules/firestore-service.js';
import * as ui from './modules/ui.js';
import * as planoLogic from './modules/plano-logic.js';
import * as formHandler from './modules/form-handler.js';
import * as pwaHandler from './modules/pwa-handler.js';
import * as neuroNotes from './modules/neuro-notes.js'; // Módulo de Neuro-Anotações
import * as srsEngine from './modules/srs-engine.js'; // NOVO: Motor de Revisão SRS

// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log("[Main] DOM pronto. Iniciando aplicação modularizada.");
    ui.registerServiceWorker();
    pwaHandler.init(); 
    setupEventHandlers();
    formHandler.init(); 
    authService.setupAuthStateObserver(handleAuthStateChange);
    srsEngine.init(); // Inicializa o modal SRS (injeta HTML se necessário)
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
    
    // Chama o auto-scroll após o carregamento inicial
    ui.autoScrollParaDiaAtual();
}

// --- Configuração dos Ouvintes de Eventos (Event Listeners) ---
function setupEventHandlers() {
    console.log('[DEBUG] 1. Configurando Event Handlers...');

    // Autenticação
    DOMElements.loginEmailButton.addEventListener('click', handleLogin);
    DOMElements.signupEmailButton.addEventListener('click', handleSignup);
    DOMElements.logoutButton.addEventListener('click', handleLogout);
    DOMElements.showAuthButton.addEventListener('click', ui.showAuthForm);
    DOMElements.cancelAuthButton.addEventListener('click', ui.hideAuthForm);

    // Navegação Principal
    DOMElements.novoPlanoBtn.addEventListener('click', () => ui.showCadastroForm());
    DOMElements.inicioBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    DOMElements.inicioCadastroBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    
    // Formulário de Plano
    DOMElements.formPlano.addEventListener('submit', handleFormSubmit);

    // Ações nos Cards (Event Delegation)
    if (DOMElements.listaPlanos) {
        console.log('[DEBUG] 2. Listener de clique adicionado com sucesso em listaPlanos');
        DOMElements.listaPlanos.addEventListener('click', handleCardAction);
    } else {
        console.error('[CRITICAL] Elemento listaPlanos NÃO encontrado no DOM durante setupEventHandlers!');
    }

    // Modal de Reavaliação de Carga
    DOMElements.reavaliarCargaBtn.addEventListener('click', handleReavaliarCarga);
    DOMElements.fecharReavaliacaoBtn.addEventListener('click', ui.hideReavaliacaoModal);
    
    // Listener para o modal que lida com o fechamento do overlay e ações internas
    DOMElements.reavaliacaoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.reavaliacaoModal) {
            ui.hideReavaliacaoModal();
            return;
        }
        handleModalReavaliacaoAction(e); 
    });
    
    // Modal de Recálculo
    DOMElements.confirmRecalculoBtn.addEventListener('click', handleConfirmRecalculo);
    DOMElements.recalculoModalCloseBtn.addEventListener('click', ui.hideRecalculoModal);
    DOMElements.cancelRecalculoBtn.addEventListener('click', ui.hideRecalculoModal);
    DOMElements.recalculoModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.recalculoModal) ui.hideRecalculoModal();
    });

    // Exportação para Agenda
    DOMElements.exportarAgendaBtn.addEventListener('click', ui.showAgendaModal);
    DOMElements.confirmAgendaExportBtn.addEventListener('click', handleAgendaExport);
    DOMElements.cancelAgendaExportBtn.addEventListener('click', ui.hideAgendaModal);
    DOMElements.cancelAgendaExportBtnBottom.addEventListener('click', ui.hideAgendaModal);
    DOMElements.agendaModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.agendaModal) ui.hideAgendaModal();
    });

    // Modal de Changelog
    if (DOMElements.versionInfoDiv) {
        DOMElements.versionInfoDiv.addEventListener('click', ui.showChangelogModal);
    }
    if (DOMElements.changelogModalCloseBtn) {
        DOMElements.changelogModalCloseBtn.addEventListener('click', ui.hideChangelogModal);
    }
    if (DOMElements.changelogModal) {
        DOMElements.changelogModal.addEventListener('click', (e) => {
            if (e.target === DOMElements.changelogModal) {
                ui.hideChangelogModal();
            }
        });
    }

    // Listeners para Modais Neuro e Checklist
    const closeNeuroBtn = document.getElementById('close-neuro-modal');
    if (closeNeuroBtn) {
        closeNeuroBtn.addEventListener('click', () => document.getElementById('neuro-modal').classList.remove('visivel'));
    }
    const neuroModal = document.getElementById('neuro-modal');
    if (neuroModal) {
        neuroModal.addEventListener('click', (e) => { if (e.target === neuroModal) neuroModal.classList.remove('visivel'); });
    }
    const btnSaveNeuro = document.getElementById('btn-save-neuro');
    if (btnSaveNeuro) {
        btnSaveNeuro.addEventListener('click', handleSaveNeuroNote);
    }

    const closeChecklistBtn = document.getElementById('close-checklist-modal');
    if (closeChecklistBtn) {
        closeChecklistBtn.addEventListener('click', () => document.getElementById('checklist-modal').classList.remove('visivel'));
    }
    const closeChecklistAction = document.getElementById('btn-close-checklist-action');
    if (closeChecklistAction) {
        closeChecklistAction.addEventListener('click', () => document.getElementById('checklist-modal').classList.remove('visivel'));
    }
    const checklistModal = document.getElementById('checklist-modal');
    if (checklistModal) {
        checklistModal.addEventListener('click', (e) => { if (e.target === checklistModal) checklistModal.classList.remove('visivel'); });
    }

    // LISTENER GLOBAL PARA SEÇÃO DE REVISÕES (NOVO - Prioridade 1)
    // Como a seção de revisões é injetada dinamicamente, usamos delegação no body ou main,
    // ou garantimos que o container exista. Como ele é criado dinamicamente, adicionamos aqui:
    const revisoesSection = document.getElementById('revisoes-section');
    if (revisoesSection) {
        revisoesSection.addEventListener('click', handleCardAction);
    } else {
        // Fallback: Adiciona ao main caso a section ainda não exista no load inicial
        document.querySelector('main').addEventListener('click', handleCardAction);
    }

    // Fechar modais com Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOMElements.reavaliacaoModal.classList.contains('visivel')) ui.hideReavaliacaoModal();
            if (DOMElements.recalculoModal.classList.contains('visivel')) ui.hideRecalculoModal();
            if (DOMElements.agendaModal.classList.contains('visivel')) ui.hideAgendaModal();
            if (DOMElements.changelogModal && DOMElements.changelogModal.classList.contains('visivel')) ui.hideChangelogModal();
            
            const neuroModalEl = document.getElementById('neuro-modal');
            if (neuroModalEl && neuroModalEl.classList.contains('visivel')) neuroModalEl.classList.remove('visivel');

            const checklistModalEl = document.getElementById('checklist-modal');
            if (checklistModalEl && checklistModalEl.classList.contains('visivel')) checklistModalEl.classList.remove('visivel');
            
            const srsModalEl = document.getElementById('srs-modal');
            if (srsModalEl && srsModalEl.classList.contains('visivel')) srsModalEl.classList.remove('visivel');
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
        
        ui.autoScrollParaDiaAtual();

    } catch (error) {
        console.error("[Main] Erro ao submeter formulário:", error);
        alert("Erro: " + error.message);
    }
}

async function handleAgendaExport() {
    const planos = state.getPlanos();
    const planosAtivos = planos.filter(p => planoLogic.determinarStatusPlano(p) !== 'concluido' && planoLogic.determinarStatusPlano(p) !== 'pausado');

    if (!planosAtivos || planosAtivos.length === 0) {
        alert("Não há planos ativos para exportar.");
        return;
    }

    const horaInicio = DOMElements.agendaStartTimeInput.value;
    const horaFim = DOMElements.agendaEndTimeInput.value;

    if (!horaInicio || !horaFim) {
        alert("Por favor, preencha os horários de início e fim.");
        return;
    }

    try {
        const icsContent = planoLogic.gerarConteudoICS(planos, horaInicio, horaFim);
        ui.triggerDownload('planos_de_leitura.ics', icsContent);
        ui.hideAgendaModal();
        alert('Seu arquivo de agenda (.ics) foi gerado e o download deve começar em breve!');
    } catch (error) {
        console.error("[Main] Erro ao gerar arquivo de agenda:", error);
        alert("Ocorreu um erro ao gerar a agenda. Tente novamente.");
    }
}

// --- Mapeamento de Ações ---
const actionHandlers = {
    'editar': handleEditarPlano,
    'excluir': handleExcluirPlano,
    'marcar-lido': handleMarcarLido,
    'pausar': handlePausarPlano,
    'retomar': handleRetomarPlano,
    'recalcular': handleRecalcularPlano,
    'salvar-parcial': handleSalvarParcial,
    'open-neuro': handleOpenNeuro,
    // --- NOVA AÇÃO: Diário de Bordo ---
    'open-logbook': handleOpenLogbook,
    'download-md': handleDownloadMarkdown,
    'open-checklist': () => document.getElementById('checklist-modal').classList.add('visivel'),
    'toggle-historico': handleToggleHistorico,
    'iniciar-revisao': handleIniciarRevisao
};

// --- FUNÇÃO DE DELEGAÇÃO DE EVENTOS INSTRUMENTADA ---
function handleCardAction(event) {
    console.log('[DEBUG] 3. Clique detectado. Alvo original:', event.target);

    const target = event.target.closest('[data-action]');
    console.log('[DEBUG] 4. Elemento com data-action encontrado:', target);

    if (!target) return;

    const action = target.dataset.action;
    console.log(`[DEBUG] 5. Ação identificada: "${action}"`);
    
    // Tratamento direto para ações que não precisam de plano/usuário
    if (action === 'open-checklist') {
        if(actionHandlers[action]) actionHandlers[action]();
        return;
    }

    // Tratamento para toggle de histórico
    if (action === 'toggle-historico') {
        if (actionHandlers[action]) {
            actionHandlers[action](target);
        }
        return;
    }

    // Tratamento para Iniciar Revisão (SRS) - Dados específicos no dataset
    if (action === 'iniciar-revisao') {
        if (actionHandlers[action]) {
            actionHandlers[action](target); // Não precisa de plano/user aqui, handler resolve
        }
        return;
    }
    // -----------------------------------------------------

    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const plano = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (isNaN(planoIndex) || !plano || !currentUser) return;

    if (actionHandlers[action]) {
        console.log(`[DEBUG] Executando handler padrão para: ${action}`);
        actionHandlers[action](target, plano, planoIndex, currentUser);
    }
}

// --- Funções de Tratamento de Ações do Card ---

// Função de Toggle Histórico
function handleToggleHistorico(target) {
    const card = target.closest('.plano-leitura');
    if (!card) return;

    const listaDias = card.querySelector('.dias-leitura');
    if (!listaDias) return;

    listaDias.classList.toggle('mostrar-historico');
    
    const iconSpan = target.querySelector('.material-symbols-outlined');
    if (iconSpan) {
        const isVisible = listaDias.classList.contains('mostrar-historico');
        iconSpan.textContent = isVisible ? 'expand_less' : 'history';
        target.style.color = isVisible ? 'var(--neuro-primary)' : '';
        target.title = isVisible ? "Ocultar histórico" : "Ver histórico completo";
    }
}

function handleEditarPlano(target, plano, planoIndex, currentUser) {
    state.setPlanoEditando(planoIndex);
    ui.showCadastroForm(plano);
}

async function handleExcluirPlano(target, plano, planoIndex, currentUser) {
    if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
        state.removePlano(planoIndex);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        alert(`Plano excluído.`);
        ui.renderApp(state.getPlanos(), currentUser);
    }
}

async function handleMarcarLido(target, plano, planoIndex, currentUser) {
    const diaIndex = parseInt(target.dataset.diaIndex, 10);
    const dia = plano.diasPlano[diaIndex];
    
    dia.lido = target.checked;

    if (dia.lido) {
        dia.ultimaPaginaLida = null;
    }

    planoLogic.atualizarPaginasLidas(plano);
    state.updatePlano(planoIndex, plano);
    await firestoreService.salvarPlanos(currentUser, state.getPlanos());
    ui.renderApp(state.getPlanos(), currentUser);
}

async function handleSalvarParcial(target, plano, planoIndex, currentUser) {
    const diaIndex = parseInt(target.dataset.diaIndex, 10);
    const dia = plano.diasPlano[diaIndex];
    const inputParcial = document.getElementById(`parcial-${planoIndex}-${diaIndex}`);
    const ultimaPagina = parseInt(inputParcial.value, 10);

    if (!ultimaPagina || isNaN(ultimaPagina) || ultimaPagina < dia.paginaInicioDia || ultimaPagina > dia.paginaFimDia) {
        alert(`Por favor, insira um número de página válido entre ${dia.paginaInicioDia} e ${dia.paginaFimDia}.`);
        inputParcial.focus();
        return;
    }

    dia.ultimaPaginaLida = ultimaPagina;

    if (ultimaPagina === dia.paginaFimDia) {
        dia.lido = true;
        dia.ultimaPaginaLida = null;
    } else {
        dia.lido = false;
    }

    planoLogic.atualizarPaginasLidas(plano);
    state.updatePlano(planoIndex, plano);
    await firestoreService.salvarPlanos(currentUser, state.getPlanos());
    ui.renderApp(state.getPlanos(), currentUser);
}

async function handlePausarPlano(target, plano, planoIndex, currentUser) {
    if (confirm(`Tem certeza que deseja pausar o plano "${plano.titulo}"? O cronograma será congelado.`)) {
        plano.isPaused = true;
        plano.dataPausa = new Date();
        state.updatePlano(planoIndex, plano);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        alert(`Plano pausado.`);
        ui.renderApp(state.getPlanos(), currentUser);
    }
}

async function handleRetomarPlano(target, plano, planoIndex, currentUser) {
    const planoRetomado = planoLogic.retomarPlano(plano);
    state.updatePlano(planoIndex, planoRetomado);
    await firestoreService.salvarPlanos(currentUser, state.getPlanos());
    alert(`Plano "${plano.titulo}" retomado! As datas futuras foram ajustadas.`);
    ui.renderApp(state.getPlanos(), currentUser);
}

function handleRecalcularPlano(target, plano, planoIndex, currentUser) {
    ui.showRecalculoModal(plano, planoIndex, 'Confirmar Recálculo');
}

// --- Novos Handlers NEURO ---
function handleOpenNeuro(target, plano, planoIndex, currentUser) {
    let targetDiaIndex = target.dataset.diaIndex ? parseInt(target.dataset.diaIndex, 10) : null;
    neuroNotes.openNoteModal(planoIndex, targetDiaIndex);
}

// --- Handler Diário de Bordo ---
function handleOpenLogbook(target, plano, planoIndex, currentUser) {
    neuroNotes.openLogbook(planoIndex);
}

// --- NOVO HANDLER SRS (Revisão Espaçada) - ATUALIZADO ---
function handleIniciarRevisao(target) {
    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const notaId = target.dataset.notaId;
    const tipoRevisao = target.dataset.tipoRevisao;

    if (isNaN(planoIndex) || !notaId) {
        console.error("Dados de revisão inválidos.");
        return;
    }

    // Chama o novo motor dedicado para iniciar a sessão
    srsEngine.startSession(planoIndex, notaId, tipoRevisao);
}

function handleDownloadMarkdown(target, plano, planoIndex, currentUser) {
    neuroNotes.downloadMarkdown(plano);
}

async function handleSaveNeuroNote() {
    const btn = document.getElementById('btn-save-neuro');
    const planoIndex = parseInt(btn.dataset.planoIndex, 10);
    const diaIndex = parseInt(btn.dataset.diaIndex, 10);
    const currentUser = state.getCurrentUser();

    // Se estivermos salvando via Wizard, a lógica é tratada internamente no neuro-notes.js.
    // Este handler aqui serve mais para interações externas ou legadas.
    // A função abaixo é apenas um fallback.
    
    const noteData = neuroNotes.extractNoteDataFromDOM();
    if(!noteData.id) {
        // Se não tiver ID, provavelmente não estamos no contexto correto
        return;
    }
    // ... (restante da lógica de salvamento externa, se houver)
}


// --- Handlers de Modais ---

async function handleConfirmRecalculo() {
    const planoIndex = parseInt(DOMElements.confirmRecalculoBtn.dataset.planoIndex, 10);
    const planoOriginal = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (!planoOriginal || !currentUser) return;

    try {
        const planoModificado = JSON.parse(JSON.stringify(planoOriginal));
        const recalculoCheckboxes = document.querySelectorAll('#recalculo-dias-semana-selecao input[type="checkbox"]:checked');
        const novosDiasSemana = Array.from(recalculoCheckboxes).map(cb => parseInt(cb.value));

        if (novosDiasSemana.length === 0) {
            throw new Error("Selecione pelo menos um dia da semana para o remanejamento.");
        }

        planoModificado.diasSemana = novosDiasSemana;
        planoModificado.periodicidade = 'semanal';

        let planoRecalculado;
        if (DOMElements.recalculoPorDataRadio.checked) {
            const novaDataFimStr = DOMElements.novaDataFimInput.value;
            if (!novaDataFimStr) throw new Error("Por favor, selecione uma nova data de fim.");
            const novaDataFim = new Date(novaDataFimStr + 'T00:00:00');
            planoRecalculado = planoLogic.recalcularPlanoComNovaData(planoModificado, novaDataFim);
        } else {
            const paginasPorDia = parseInt(DOMElements.novaPaginasPorDiaInput.value, 10);
            if (!paginasPorDia || paginasPorDia <= 0) throw new Error("Insira um número válido de páginas por dia.");
            planoRecalculado = planoLogic.recalcularPlanoPorPaginasDia(planoModificado, paginasPorDia);
        }
        
        state.updatePlano(planoIndex, planoRecalculado);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        
        ui.hideRecalculoModal();
        alert(`Plano "${planoOriginal.titulo}" remanejado e recalculado com sucesso!`);
        
        ui.renderApp(state.getPlanos(), currentUser);
        ui.highlightAndScrollToPlano(planoIndex);
        
        // Garante o auto-scroll após recalcular
        ui.autoScrollParaDiaAtual();

    } catch (error) {
        console.error('[Main] Erro ao confirmar recálculo/remanejamento:', error);
        alert('Erro ao remanejar: ' + error.message);
    }
}

function handleReavaliarCarga() {
    const planosAtuais = state.getPlanos();
    const totalPlanos = planosAtuais.length; 
    const dadosCarga = planoLogic.analisarCargaSemanal(planosAtuais, totalPlanos);
    
    ui.renderizarModalReavaliacaoCompleto(dadosCarga, planosAtuais, totalPlanos); 
    
    ui.showReavaliacaoModal();
}

function handleModalReavaliacaoAction(event) {
    const target = event.target.closest('[data-action="remanejar-plano"]');
    if (!target) return;

    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const plano = state.getPlanoByIndex(planoIndex);

    if (isNaN(planoIndex) || !plano) return;
    
    ui.hideReavaliacaoModal();
    setTimeout(() => {
        ui.showRecalculoModal(plano, planoIndex, 'Confirmar Remanejamento');
    }, 300);
}
