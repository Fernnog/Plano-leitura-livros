// --- START OF FILE main.js (COMPLETO E ATUALIZADO) ---

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
import * as neuroNotes from './modules/neuro-notes.js'; // NOVA IMPORTAÇÃO: Módulo de Neuro-Anotações

// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log("[Main] DOM pronto. Iniciando aplicação modularizada.");
    ui.registerServiceWorker();
    pwaHandler.init(); 
    setupEventHandlers();
    formHandler.init(); 
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
    DOMElements.novoPlanoBtn.addEventListener('click', () => ui.showCadastroForm());
    DOMElements.inicioBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    DOMElements.inicioCadastroBtn.addEventListener('click', () => ui.showPlanosList(state.getPlanos(), state.getCurrentUser()));
    
    // Formulário de Plano
    DOMElements.formPlano.addEventListener('submit', handleFormSubmit);

    // Ações nos Cards (Event Delegation - Inclui agora as ações Neuro)
    DOMElements.listaPlanos.addEventListener('click', handleCardAction);

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

    // --- CORREÇÃO PRIORIDADE 1: Delegação de Eventos para o Modal Neuro ---
    // Como o modal é injetado dinamicamente no DOM, usamos delegação no 'document'
    // para garantir que o clique seja capturado mesmo se o elemento foi criado depois.
    document.addEventListener('click', (e) => {
        // Verifica se o clique foi no botão de fechar (ou no ícone dentro dele)
        if (e.target.matches('#close-neuro-modal') || e.target.closest('#close-neuro-modal')) {
            const neuroModal = document.getElementById('neuro-modal');
            if (neuroModal) {
                neuroModal.classList.remove('visivel');
            }
        }
        
        // Verifica se o clique foi no Overlay (fundo escuro) para fechar
        if (e.target.matches('#neuro-modal')) {
             e.target.classList.remove('visivel');
        }

        // Verifica o botão de Salvar (Delegação para garantir funcionamento)
        if (e.target.matches('#btn-save-neuro') || e.target.closest('#btn-save-neuro')) {
            handleSaveNeuroNote();
        }
    });

    // MELHORIA DE UX: Fechar modais com a tecla 'Escape'
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOMElements.reavaliacaoModal.classList.contains('visivel')) ui.hideReavaliacaoModal();
            if (DOMElements.recalculoModal.classList.contains('visivel')) ui.hideRecalculoModal();
            if (DOMElements.agendaModal.classList.contains('visivel')) ui.hideAgendaModal();
            if (DOMElements.changelogModal && DOMElements.changelogModal.classList.contains('visivel')) ui.hideChangelogModal();
            
            // Novo: Fechar modal Neuro
            const neuroModalEl = document.getElementById('neuro-modal');
            if (neuroModalEl && neuroModalEl.classList.contains('visivel')) {
                neuroModalEl.classList.remove('visivel');
            }
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

// Mapeamento de ações para suas respectivas funções de tratamento
const actionHandlers = {
    'editar': handleEditarPlano,
    'excluir': handleExcluirPlano,
    'marcar-lido': handleMarcarLido,
    'pausar': handlePausarPlano,
    'retomar': handleRetomarPlano,
    'recalcular': handleRecalcularPlano,
    'salvar-parcial': handleSalvarParcial,
    // NOVAS AÇÕES NEURO
    'open-neuro': handleOpenNeuro,
    'download-md': handleDownloadMarkdown
};

function handleCardAction(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const planoIndex = parseInt(target.dataset.planoIndex, 10);
    const plano = state.getPlanoByIndex(planoIndex);
    const currentUser = state.getCurrentUser();

    if (isNaN(planoIndex) || !plano || !currentUser) return;

    if (actionHandlers[action]) {
        actionHandlers[action](target, plano, planoIndex, currentUser);
    }
}

// --- Funções de Tratamento de Ações do Card ---

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
    // Se o botão foi clicado na lista de dias (contexto específico do dia)
    const diaIndex = target.dataset.diaIndex ? parseInt(target.dataset.diaIndex, 10) : null;
    
    // Se não tiver dia específico (ex: botão geral do painel), tentamos achar o próximo dia não lido
    let targetDiaIndex = diaIndex;
    if (targetDiaIndex === null || isNaN(targetDiaIndex)) {
        targetDiaIndex = planoLogic.encontrarProximoDiaDeLeituraIndex(plano);
        if (targetDiaIndex === -1) targetDiaIndex = plano.diasPlano.length - 1; // Se tudo lido, abre o último
    }

    neuroNotes.openNoteModal(planoIndex, targetDiaIndex);
}

function handleDownloadMarkdown(target, plano, planoIndex, currentUser) {
    neuroNotes.downloadMarkdown(plano);
}

async function handleSaveNeuroNote() {
    const btn = document.getElementById('btn-save-neuro');
    // Verificação de segurança: se o botão não for encontrado (ex: modal fechado muito rápido), aborta
    if (!btn) return;

    const planoIndex = parseInt(btn.dataset.planoIndex, 10);
    const diaIndex = parseInt(btn.dataset.diaIndex, 10);
    const currentUser = state.getCurrentUser();

    if (isNaN(planoIndex) || isNaN(diaIndex)) {
        console.error("Erro ao identificar plano/dia para salvar nota.");
        return;
    }

    // Chama o módulo neuro para processar os dados do DOM
    const noteData = neuroNotes.extractNoteDataFromDOM();
    
    // Atualiza o estado
    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano.diasPlano[diaIndex].neuroNote) {
        plano.diasPlano[diaIndex].neuroNote = {};
    }
    plano.diasPlano[diaIndex].neuroNote = noteData;

    // Persiste no Firebase
    try {
        state.updatePlano(planoIndex, plano);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        
        // Feedback e UI
        alert('Neuro-conexão registrada com sucesso!');
        const neuroModal = document.getElementById('neuro-modal');
        if (neuroModal) neuroModal.classList.remove('visivel');
        
        ui.renderApp(state.getPlanos(), currentUser); // Re-renderiza para atualizar ícones de status
        
    } catch (error) {
        console.error("Erro ao salvar nota:", error);
        alert("Erro ao salvar: " + error.message);
    }
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