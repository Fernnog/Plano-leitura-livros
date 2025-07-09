// modules/ui.js
// RESPONSABILIDADE ÚNICA: Manipular o DOM, renderizar elementos, ler dados de formulários
// e gerenciar a visibilidade das seções da UI. Não contém lógica de negócio.

import * as DOMElements from './dom-elements.js';
import * as planoLogic from './plano-logic.js';

// Registra os eventos de interação do modal de recálculo assim que o módulo é carregado.
setupRecalculoInteractions();

// --- Funções de Formatação e Helpers ---

/**
 * Formata um objeto Date para uma string legível (dd/mm/aaaa).
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data formatada ou '' se a data for inválida.
 */
function formatarData(date) {
    if (date instanceof Date && !isNaN(date)) {
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // UTC para evitar problemas de fuso
    }
    return '';
}

/**
 * Rola a tela até o card do plano e aplica um destaque visual temporário.
 * @param {number} planoIndex - O índice do plano a ser destacado.
 */
export function highlightAndScrollToPlano(planoIndex) {
    const planoCard = document.getElementById(`plano-${planoIndex}`);
    if (!planoCard) return;

    planoCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    planoCard.classList.add('flash-highlight');

    setTimeout(() => {
        planoCard.classList.remove('flash-highlight');
    }, 1500);
}

// --- Funções de Controle de Visibilidade ---

/** Mostra a seção principal com a lista de planos. */
export function showPlanosList(planos, user) {
    DOMElements.cadastroPlanoSection.style.display = 'none';
    DOMElements.planosLeituraSection.style.display = 'block';
    renderApp(planos, user);
}

/** Mostra o formulário de cadastro/edição de plano. */
export function showCadastroForm(planoParaEditar = null) {
    DOMElements.planosLeituraSection.style.display = 'none';
    DOMElements.leiturasAtrasadasSection.style.display = 'none';
    DOMElements.proximasLeiturasSection.style.display = 'none';
    DOMElements.cadastroPlanoSection.style.display = 'block';

    DOMElements.formPlano.reset();

    if (planoParaEditar) {
        DOMElements.formPlano.querySelector('h2').textContent = 'Editar Plano de Leitura';
        DOMElements.tituloLivroInput.value = planoParaEditar.titulo;
        DOMElements.linkDriveInput.value = planoParaEditar.linkDrive || '';
        DOMElements.paginaInicioInput.value = planoParaEditar.paginaInicio;
        DOMElements.paginaFimInput.value = planoParaEditar.paginaFim;

        DOMElements.definirPorDatasRadio.checked = true;
        DOMElements.periodoPorDatasDiv.style.display = 'block';
        DOMElements.periodoPorDiasDiv.style.display = 'none';

        if (planoParaEditar.dataInicio) {
            DOMElements.dataInicio.value = planoParaEditar.dataInicio.toISOString().split('T')[0];
        }
        if (planoParaEditar.dataFim) {
            DOMElements.dataFim.value = planoParaEditar.dataFim.toISOString().split('T')[0];
        }

        DOMElements.periodicidadeSelect.value = planoParaEditar.periodicidade;
        if (planoParaEditar.periodicidade === 'semanal') {
            DOMElements.diasSemanaSelecao.style.display = 'block';
            const checkboxes = DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = planoParaEditar.diasSemana.includes(parseInt(cb.value));
            });
        } else {
            DOMElements.diasSemanaSelecao.style.display = 'none';
        }
    } else {
        DOMElements.formPlano.querySelector('h2').textContent = 'Novo Plano de Leitura';
    }
}

/** Mostra o formulário de autenticação. */
export function showAuthForm() {
    DOMElements.authFormDiv.style.display = 'flex';
    DOMElements.cancelAuthButton.style.display = 'inline-flex';
    DOMElements.showAuthButton.style.display = 'none';
}

/** Esconde o formulário de autenticação. */
export function hideAuthForm() {
    DOMElements.authFormDiv.style.display = 'none';
    DOMElements.cancelAuthButton.style.display = 'none';
    if (!DOMElements.logoutButton.style.display || DOMElements.logoutButton.style.display === 'none') {
        DOMElements.showAuthButton.style.display = 'inline-flex';
    }
}

/** Mostra o modal de reavaliação. */
export function showReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.add('visivel');
}

/** Esconde o modal de reavaliação. */
export function hideReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.remove('visivel');
}

/**
 * Configura os eventos de interação para o modal de recálculo.
 */
function setupRecalculoInteractions() {
    DOMElements.recalculoPorDataRadio.addEventListener('change', () => {
        DOMElements.recalculoOpcaoDataDiv.style.display = 'block';
        DOMElements.recalculoOpcaoPaginasDiv.style.display = 'none';
    });

    DOMElements.recalculoPorPaginasRadio.addEventListener('change', () => {
        DOMElements.recalculoOpcaoDataDiv.style.display = 'none';
        DOMElements.recalculoOpcaoPaginasDiv.style.display = 'block';
    });
}

/** Mostra o modal de recálculo com os dados do plano. */
export function showRecalculoModal(plano, planoIndex) {
    DOMElements.recalculoPlanoTitulo.textContent = `"${plano.titulo}"`;
    DOMElements.confirmRecalculoBtn.dataset.planoIndex = planoIndex;

    // Reseta o modal para o estado padrão (por data)
    DOMElements.recalculoPorDataRadio.checked = true;
    DOMElements.recalculoOpcaoDataDiv.style.display = 'block';
    DOMElements.recalculoOpcaoPaginasDiv.style.display = 'none';
    DOMElements.novaPaginasPorDiaInput.value = '';

    // Define a data mínima para o input de data
    const hoje = new Date();
    const amanha = new Date(hoje.setDate(hoje.getDate() + 1));
    DOMElements.novaDataFimInput.min = amanha.toISOString().split('T')[0];
    DOMElements.novaDataFimInput.value = '';

    DOMElements.recalculoModal.classList.add('visivel');
}

/** Esconde o modal de recálculo. */
export function hideRecalculoModal() {
    DOMElements.recalculoModal.classList.remove('visivel');
}

// --- Funções de Leitura de Dados da UI (Formulário) ---

/**
 * Coleta e valida os dados do formulário de plano.
 * @returns {object} Um objeto com todos os dados do formulário.
 * @throws {Error} Se algum campo obrigatório estiver faltando ou for inválido.
 */
export function getFormData() {
    const formData = {
        titulo: DOMElements.tituloLivroInput.value.trim(),
        linkDrive: DOMElements.linkDriveInput.value.trim(),
        paginaInicio: parseInt(DOMElements.paginaInicioInput.value, 10),
        paginaFim: parseInt(DOMElements.paginaFimInput.value, 10),
        periodicidade: DOMElements.periodicidadeSelect.value,
        diasSemana: [],
    };

    if (DOMElements.definirPorDatasRadio.checked) {
        formData.definicaoPeriodo = 'datas';
        formData.dataInicio = new Date(DOMElements.dataInicio.value + 'T00:00:00');
        formData.dataFim = new Date(DOMElements.dataFim.value + 'T00:00:00');
    } else {
        formData.definicaoPeriodo = 'dias';
        formData.dataInicio = new Date(DOMElements.dataInicioDias.value + 'T00:00:00');
        formData.numeroDias = parseInt(DOMElements.numeroDias.value, 10);
    }

    if (formData.periodicidade === 'semanal') {
        const checkboxes = DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]:checked');
        formData.diasSemana = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
        if (formData.diasSemana.length === 0) {
            throw new Error("Selecione pelo menos um dia da semana para a leitura semanal.");
        }
    }

    if (!formData.titulo) throw new Error("O título do livro é obrigatório.");
    if (isNaN(formData.paginaInicio) || isNaN(formData.paginaFim) || formData.paginaFim < formData.paginaInicio) {
        throw new Error("As páginas de início e fim são inválidas.");
    }

    return formData;
}

// --- Funções de Renderização ---

/**
 * Renderiza a lista principal de planos de leitura.
 * @param {Array} planos - A lista de planos a serem renderizados.
 * @param {object|null} user - O objeto de usuário do Firebase.
 */
function renderizarPlanos(planos, user) {
    if (!user) {
        DOMElements.listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para ver e criar seus planos de leitura.</p>';
        return;
    }
    if (planos.length === 0) {
        DOMElements.listaPlanos.innerHTML = '<p>Você ainda não tem planos. Clique em "Novo" para criar o seu primeiro!</p>';
        return;
    }

    let html = '';
    planos.forEach((plano, index) => {
        const status = planoLogic.determinarStatusPlano(plano);
        const progresso = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;
        const numeroPlano = planos.length - index;

        let statusTagHTML = '';
        switch (status) {
            case 'proximo': statusTagHTML = '<span class="status-tag status-proximo">Próximo</span>'; break;
            case 'em_dia': statusTagHTML = '<span class="status-tag status-em-dia">Em Dia</span>'; break;
            case 'atrasado': statusTagHTML = '<span class="status-tag status-atrasado">Atrasado</span>'; break;
            case 'concluido': statusTagHTML = '<span class="status-tag status-concluido">Concluído</span>'; break;
        }

        const diasLeituraHTML = plano.diasPlano.map((dia, diaIndex) => `
            <div class="dia-leitura ${dia.lido ? 'lido' : ''}">
                <input type="checkbox" id="dia-${index}-${diaIndex}" data-action="marcar-lido" data-plano-index="${index}" data-dia-index="${diaIndex}" ${dia.lido ? 'checked' : ''}>
                <label for="dia-${index}-${diaIndex}">
                    <strong>${formatarData(dia.data)}:</strong> Pág. ${dia.paginaInicioDia} a ${dia.paginaFimDia} (${dia.paginas} pág.)
                </label>
            </div>
        `).join('');

        const avisoAtrasoHTML = status === 'atrasado' ? `
            <div class="aviso-atraso">
                <p>Este plano tem leituras atrasadas!</p>
                <div class="acoes-dados">
                    <button data-action="recalcular" data-plano-index="${index}" title="Recalcular o plano com uma nova data de término">
                        <span class="material-symbols-outlined">restart_alt</span> Recalcular
                    </button>
                </div>
            </div>
        ` : '';

        html += `
            <div class="plano-leitura card-${status}" id="plano-${index}">
                <div class="plano-header">
                    <h3><span class="plano-numero">${numeroPlano}</span>${plano.titulo}</h3>
                    ${statusTagHTML}
                    <div class="plano-acoes-principais">
                        <button data-action="editar" data-plano-index="${index}" title="Editar Plano"><span class="material-symbols-outlined">edit</span></button>
                        <button data-action="excluir" data-plano-index="${index}" title="Excluir Plano"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
                ${plano.linkDrive ? `
                    <div class="link-drive-container">
                        <a href="${plano.linkDrive}" target="_blank" class="button-link-drive">
                            <span class="material-symbols-outlined">link</span> Acessar Anotações
                        </a>
                    </div>` : ''
                }
                ${avisoAtrasoHTML}
                <p>Progresso: ${progresso.toFixed(0)}% (${plano.paginasLidas} de ${plano.totalPaginas} páginas)</p>
                <div class="progresso-container">
                    <span class="barra-progresso" style="width: ${progresso}%;"></span>
                </div>
                <details class="dias-leitura-details">
                    <summary>Ver/Marcar Dias de Leitura</summary>
                    <div class="dias-leitura">${diasLeituraHTML}</div>
                </details>
            </div>
        `;
    });
    DOMElements.listaPlanos.innerHTML = html;
}

/** Renderiza os botões do paginador flutuante. */
function renderizarPaginador(planos) {
    const totalPlanos = planos.length;
    if (totalPlanos <= 1) {
        DOMElements.paginadorPlanosDiv.innerHTML = '';
        return;
    }
    
    let paginadorHTML = '';
    planos.forEach((plano, index) => {
        const numeroPlano = totalPlanos - index;
        paginadorHTML += `<a href="#plano-${index}" title="Ir para o plano '${plano.titulo}'">${numeroPlano}</a>`;
    });

    DOMElements.paginadorPlanosDiv.innerHTML = paginadorHTML;
}

function renderizarPainelProximasLeituras(planos, totalPlanos) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasAsProximasLeituras = planos.flatMap((plano, planoIndex) =>
        plano.diasPlano
            .filter(dia => dia.data && new Date(dia.data) >= hoje && !dia.lido)
            .map(dia => ({ ...dia, titulo: plano.titulo, planoIndex }))
    ).sort((a, b) => a.data - b.data);

    const proximas3 = todasAsProximasLeituras.slice(0, 3);

    if (proximas3.length > 0) {
        const html = proximas3.map(dia => `
            <div class="proxima-leitura-item">
                <span class="proxima-leitura-data">${formatarData(dia.data)}</span>
                <span class="numero-plano-tag">${totalPlanos - dia.planoIndex}</span>
                <span class="proxima-leitura-titulo">${dia.titulo}</span>
                <span class="proxima-leitura-paginas">Pág. ${dia.paginaInicioDia}-${dia.paginaFimDia}</span>
            </div>
        `).join('');
        DOMElements.listaProximasLeiturasDiv.innerHTML = html;
        DOMElements.semProximasLeiturasP.style.display = 'none';
        DOMElements.proximasLeiturasSection.style.display = 'block';
    } else {
        DOMElements.proximasLeiturasSection.style.display = 'none';
    }
}
function renderizarPainelLeiturasAtrasadas(planos, totalPlanos) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasAsLeiturasAtrasadas = planos.flatMap((plano, planoIndex) =>
        plano.diasPlano
            .filter(dia => dia.data && new Date(dia.data) < hoje && !dia.lido)
            .map(dia => ({ ...dia, titulo: plano.titulo, planoIndex }))
    ).sort((a, b) => a.data - b.data);

    const atrasadas3 = todasAsLeiturasAtrasadas.slice(0, 3);

    if (atrasadas3.length > 0) {
        const html = atrasadas3.map(dia => `
            <div class="leitura-atrasada-item">
                <span class="leitura-atrasada-data">${formatarData(dia.data)}</span>
                <span class="numero-plano-tag">${totalPlanos - dia.planoIndex}</span>
                <span class="leitura-atrasada-titulo">${dia.titulo}</span>
                <span class="leitura-atrasada-paginas">Pág. ${dia.paginaInicioDia}-${dia.paginaFimDia}</span>
            </div>
        `).join('');
        DOMElements.listaLeiturasAtrasadasDiv.innerHTML = html;
        DOMElements.semLeiturasAtrasadasP.style.display = 'none';
        DOMElements.leiturasAtrasadasSection.style.display = 'block';
    } else {
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
    }
}
export function renderizarQuadroReavaliacao(dadosCarga) {
    let html = '';
    dadosCarga.forEach(dia => {
        const planosDoDia = dia.planos.map(p => 
            `<span class="plano-carga-tag"><span class="numero-plano-tag">${p.numero}</span> ${p.media} pág.</span>`
        ).join('') || 'Nenhum plano ativo';

        html += `
            <tr>
                <td>${dia.nome}</td>
                <td class="planos-dia-cell">${planosDoDia}</td>
                <td class="total-paginas-dia">${dia.totalPaginas}</td>
            </tr>
        `;
    });
    DOMElements.tabelaReavaliacaoBody.innerHTML = html;
}
// --- Função Principal de Renderização da Aplicação ---
export function renderApp(planos, user) {
    console.log('[UI] Renderizando a aplicação completa...');

    if (user) {
        DOMElements.showAuthButton.style.display = 'none';
        DOMElements.authFormDiv.style.display = 'none';
        DOMElements.logoutButton.style.display = 'inline-flex';
        DOMElements.novoPlanoBtn.style.display = 'inline-flex';
        DOMElements.inicioBtn.style.display = 'inline-flex';
        DOMElements.exportarAgendaBtn.style.display = 'inline-flex';
        DOMElements.reavaliarCargaBtn.style.display = 'inline-flex';
    } else {
        DOMElements.showAuthButton.style.display = 'inline-flex';
        DOMElements.logoutButton.style.display = 'none';
        DOMElements.novoPlanoBtn.style.display = 'none';
        DOMElements.inicioBtn.style.display = 'none';
        DOMElements.exportarAgendaBtn.style.display = 'none';
        DOMElements.reavaliarCargaBtn.style.display = 'none';
        hideAuthForm();
    }

    if (planos && planos.length > 0) {
        renderizarPainelProximasLeituras(planos, planos.length);
        renderizarPainelLeiturasAtrasadas(planos, planos.length);
        renderizarPlanos(planos, user);
        renderizarPaginador(planos);
        DOMElements.paginadorPlanosDiv.classList.remove('hidden');
    } else {
        DOMElements.listaPlanos.innerHTML = user ? '<p>Você ainda não tem planos. Clique em "Novo" para criar o seu primeiro!</p>' : '<p>Faça login ou cadastre-se para ver e criar seus planos de leitura.</p>';
        DOMElements.proximasLeiturasSection.style.display = 'none';
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
        DOMElements.paginadorPlanosDiv.innerHTML = '';
        DOMElements.paginadorPlanosDiv.classList.add('hidden');
    }
}

// --- Funções Auxiliares (PWA, Loading, etc) ---

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('Service Worker registrado com sucesso:', registration))
                .catch(error => console.log('Falha ao registrar Service Worker:', error));
        });
    }
}

export function toggleLoading(isLoading) {
    console.log(`[UI] Carregamento: ${isLoading ? 'ON' : 'OFF'}`);
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}