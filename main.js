// --- START OF FILE main.js ---

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
    
    // MODIFICAÇÃO: Botão de agenda do cabeçalho agora abre o modal de exportação.
    DOMElements.exportarAgendaBtn.addEventListener('click', () => {
        ui.showExportModal(state.getPlanos());
    });
    
    // Formulário de Plano
    DOMElements.formPlano.addEventListener('submit', handleFormSubmit);

    // Ações nos Cards (Event Delegation)
    DOMElements.listaPlanos.addEventListener('click', handleCardAction);

    // Modal de Reavaliação de Carga
    DOMElements.reavaliarCargaBtn.addEventListener('click', handleReavaliarCarga);
    DOMElements.fecharReavaliacaoBtn.addEventListener('click', ui.hideReavaliacaoModal);
    
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

    // MODIFICAÇÃO: Listeners para o novo Modal de Exportação de Agenda
    DOMElements.exportModalCloseBtn.addEventListener('click', ui.hideExportModal);
    DOMElements.cancelExportBtn.addEventListener('click', ui.hideExportModal);
    DOMElements.confirmExportBtn.addEventListener('click', handleConfirmarExportacao);
    DOMElements.exportModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.exportModal) ui.hideExportModal();
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
            const dia = plano.diasPlano[diaIndex];
            dia.lido = target.checked;
            if(dia.lido) {
                dia.ultimaPaginaLida = null;
            }
            planoLogic.atualizarPaginasLidas(plano);
            state.updatePlano(planoIndex, plano);
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            ui.renderApp(state.getPlanos(), currentUser);
            break;
        
        case 'salvar-parcial':
            const diaParcialIndex = parseInt(target.dataset.diaIndex, 10);
            const diaParcial = plano.diasPlano[diaParcialIndex];
            const inputParcial = document.getElementById(`parcial-${planoIndex}-${diaParcialIndex}`);
            const ultimaPagina = parseInt(inputParcial.value, 10);

            if (!ultimaPagina || isNaN(ultimaPagina) || ultimaPagina < diaParcial.paginaInicioDia || ultimaPagina > diaParcial.paginaFimDia) {
                alert(`Por favor, insira um número de página válido entre ${diaParcial.paginaInicioDia} e ${diaParcial.paginaFimDia}.`);
                inputParcial.focus();
                return;
            }
            
            diaParcial.ultimaPaginaLida = ultimaPagina;
            if(ultimaPagina === diaParcial.paginaFimDia) {
                diaParcial.lido = true;
                diaParcial.ultimaPaginaLida = null;
            } else {
                diaParcial.lido = false;
            }

            planoLogic.atualizarPaginasLidas(plano);
            state.updatePlano(planoIndex, plano);
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            
            ui.renderApp(state.getPlanos(), currentUser);
            break;

        case 'pausar':
            if (confirm(`Tem certeza que deseja pausar o plano "${plano.titulo}"? O cronograma será congelado.`)) {
                plano.isPaused = true;
                plano.dataPausa = new Date();
                state.updatePlano(planoIndex, plano);
                await firestoreService.salvarPlanos(currentUser, state.getPlanos());
                alert(`Plano pausado.`);
                ui.renderApp(state.getPlanos(), currentUser);
            }
            break;

        case 'retomar':
            const planoRetomado = planoLogic.retomarPlano(plano);
            state.updatePlano(planoIndex, planoRetomado);
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            alert(`Plano "${plano.titulo}" retomado! As datas futuras foram ajustadas.`);
            ui.renderApp(state.getPlanos(), currentUser);
            break;

        case 'recalcular':
            ui.showRecalculoModal(plano, planoIndex, 'Confirmar Recálculo');
            break;
    }
}

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

// MODIFICAÇÃO: Nova função para lidar com a confirmação do modal de exportação.
async function handleConfirmarExportacao() {
    const checkboxesMarcados = DOMElements.exportPlanosListContainer.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkboxesMarcados.length === 0) {
        alert("Por favor, selecione pelo menos um plano para exportar.");
        return;
    }

    const indicesDosPlanosSelecionados = Array.from(checkboxesMarcados).map(cb => parseInt(cb.dataset.planoIndex, 10));
    const planosParaExportar = indicesDosPlanosSelecionados.map(index => state.getPlanoByIndex(index));

    const horaInicio = DOMElements.exportHoraInicioInput.value;
    const horaFim = DOMElements.exportHoraFimInput.value;

    if (!horaInicio || !horaFim) {
        alert("Por favor, defina um horário de início e fim.");
        return;
    }
    
    try {
        const conteudoICS = planoLogic.gerarConteudoICS(planosParaExportar, horaInicio, horaFim);
        if (conteudoICS) {
            ui.dispararDownloadICS(conteudoICS, 'meu_plano_de_leitura');
            ui.hideExportModal();
        } else {
            alert("Não foram encontrados dias de leitura válidos nos planos selecionados.");
        }
    } catch (error) {
        console.error("Erro ao gerar arquivo ICS:", error);
        alert("Ocorreu um erro ao tentar exportar o(s) plano(s).");
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
