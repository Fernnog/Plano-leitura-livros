// modules/ui.js
// RESPONSABILIDADE ÚNICA: Manipular o DOM, renderizar elementos, ler dados de formulários
// e gerenciar a interação visual da aplicação. Não contém lógica de negócio.

import * as DOMElements from './dom-elements.js';
import { determinarStatusPlano, verificarAtraso } from './plano-logic.js';

// --- Funções Auxiliares de Formatação ---

/**
 * Formata um objeto Date para o formato YYYY-MM-DD, compatível com input[type="date"].
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data no formato 'YYYY-MM-DD'.
 */
function toISODateString(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return date.toISOString().split('T')[0];
}

/**
 * Formata um objeto Date para o formato DD/MM/YYYY para exibição.
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data no formato 'DD/MM/YYYY'.
 */
function formatarData(date) {
    if (!(date instanceof Date) || isNaN(date)) return 'Data inválida';
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// --- Gerenciamento de Visibilidade das Seções e Componentes ---

/** Registra o Service Worker para funcionalidades PWA. */
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('[UI] Service Worker registrado com sucesso:', registration.scope))
            .catch(error => console.error('[UI] Falha ao registrar Service Worker:', error));
    }
}

/** Mostra a tela principal com a lista de planos. */
export function showPlanosList(planos, user) {
    DOMElements.cadastroPlanoSection.style.display = 'none';
    DOMElements.planosLeituraSection.style.display = 'block';
    DOMElements.proximasLeiturasSection.style.display = 'block';
    DOMElements.leiturasAtrasadasSection.style.display = 'block';
    DOMElements.inicioBtn.style.display = 'none';
    if (user) {
       DOMElements.novoPlanoBtn.style.display = 'inline-flex';
    }
    renderApp(planos, user); // Re-renderiza para garantir que tudo está atualizado
}

/** Mostra o formulário de cadastro/edição de plano. */
export function showCadastroForm(planoParaEditar = null) {
    DOMElements.planosLeituraSection.style.display = 'none';
    DOMElements.proximasLeiturasSection.style.display = 'none';
    DOMElements.leiturasAtrasadasSection.style.display = 'none';
    DOMElements.cadastroPlanoSection.style.display = 'block';
    DOMElements.novoPlanoBtn.style.display = 'none';
    DOMElements.inicioBtn.style.display = 'inline-flex';
    
    DOMElements.formPlano.reset(); // Limpa o formulário
    // Reseta a visibilidade dos campos condicionais
    DOMElements.periodoPorDatasDiv.style.display = 'block';
    DOMElements.periodoPorDiasDiv.style.display = 'none';
    DOMElements.diasSemanaSelecao.style.display = 'none';

    if (planoParaEditar) {
        DOMElements.cadastroPlanoSection.querySelector('h2').textContent = 'Editar Plano de Leitura';
        populateForm(planoParaEditar);
    } else {
        DOMElements.cadastroPlanoSection.querySelector('h2').textContent = 'Novo Plano de Leitura';
    }
    window.scrollTo(0, 0);
}

/** Mostra o formulário de autenticação no header. */
export function showAuthForm() {
    DOMElements.authFormDiv.style.display = 'flex';
    DOMElements.cancelAuthButton.style.display = 'inline-flex';
    DOMElements.showAuthButton.style.display = 'none';
}

/** Esconde o formulário de autenticação. */
export function hideAuthForm() {
    DOMElements.authFormDiv.style.display = 'none';
    DOMElements.cancelAuthButton.style.display = 'none';
    DOMElements.showAuthButton.style.display = 'block';
}

/** Alterna um indicador de carregamento global (ainda não implementado visualmente). */
export function toggleLoading(isLoading) {
    // Implementação futura: mostrar/esconder um spinner global
    console.log(`[UI] Carregando: ${isLoading}`);
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}

// --- Interação com Formulários ---

/**
 * Coleta e valida os dados do formulário de plano de leitura.
 * @returns {object} Um objeto com os dados validados do formulário.
 * @throws {Error} Se algum campo obrigatório estiver inválido.
 */
export function getFormData() {
    const titulo = DOMElements.tituloLivroInput.value.trim();
    if (!titulo) throw new Error("O título do livro é obrigatório.");

    const paginaInicio = parseInt(DOMElements.paginaInicioInput.value, 10);
    const paginaFim = parseInt(DOMElements.paginaFimInput.value, 10);
    if (isNaN(paginaInicio) || isNaN(paginaFim) || paginaInicio < 1 || paginaFim < paginaInicio) {
        throw new Error("As páginas de início e fim são inválidas.");
    }

    const definirPor = DOMElements.definirPorDatasRadio.checked ? 'datas' : 'dias';
    let dataInicio, dataFim, numeroDias;

    if (definirPor === 'datas') {
        dataInicio = new Date(DOMElements.dataInicio.value + 'T00:00:00');
        dataFim = new Date(DOMElements.dataFim.value + 'T00:00:00');
        if (isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            throw new Error("As datas de início e fim são inválidas.");
        }
    } else {
        dataInicio = new Date(DOMElements.dataInicioDias.value + 'T00:00:00');
        numeroDias = parseInt(DOMElements.numeroDias.value, 10);
        if (isNaN(dataInicio) || isNaN(numeroDias) || numeroDias < 1) {
            throw new Error("A data de início e o número de dias são inválidos.");
        }
    }

    const periodicidade = DOMElements.periodicidadeSelect.value;
    const diasSemana = periodicidade === 'semanal'
        ? Array.from(DOMElements.diasSemanaSelecao.querySelectorAll('input:checked')).map(cb => parseInt(cb.value, 10))
        : [];

    if (periodicidade === 'semanal' && diasSemana.length === 0) {
        throw new Error("Selecione pelo menos um dia da semana para a leitura.");
    }
    
    return {
        titulo,
        linkDrive: DOMElements.linkDriveInput.value.trim(),
        paginaInicio,
        paginaFim,
        definirPor,
        dataInicio,
        dataFim,
        numeroDias,
        periodicidade,
        diasSemana,
    };
}


/**
 * Preenche o formulário com os dados de um plano existente para edição.
 * @param {object} plano - O objeto do plano a ser editado.
 */
function populateForm(plano) {
    DOMElements.tituloLivroInput.value = plano.titulo || '';
    DOMElements.linkDriveInput.value = plano.linkDrive || '';
    DOMElements.paginaInicioInput.value = plano.paginaInicio || 1;
    DOMElements.paginaFimInput.value = plano.paginaFim || 1;

    // Define o período (assumimos 'datas' como padrão se não especificado)
    DOMElements.definirPorDatasRadio.checked = true;
    DOMElements.periodoPorDatasDiv.style.display = 'block';
    DOMElements.periodoPorDiasDiv.style.display = 'none';
    DOMElements.dataInicio.value = toISODateString(plano.dataInicio);
    DOMElements.dataFim.value = toISODateString(plano.dataFim);
    
    DOMElements.periodicidadeSelect.value = plano.periodicidade || 'diario';
    if (plano.periodicidade === 'semanal') {
        DOMElements.diasSemanaSelecao.style.display = 'block';
        DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = plano.diasSemana.includes(parseInt(cb.value, 10));
        });
    }
}

// --- Renderização Principal e dos Componentes ---

/**
 * Renderiza toda a aplicação (cabeçalho, painéis, lista de planos) com base no estado atual.
 * @param {Array} planos - A lista de planos do usuário.
 * @param {object|null} user - O objeto de usuário do Firebase ou null.
 */
export function renderApp(planos, user) {
    // Atualiza o estado visual da autenticação
    if (user) {
        DOMElements.showAuthButton.style.display = 'none';
        DOMElements.logoutButton.style.display = 'inline-flex';
        DOMElements.novoPlanoBtn.style.display = 'inline-flex';
        DOMElements.exportarAgendaBtn.style.display = 'inline-flex';
        DOMElements.reavaliarCargaBtn.style.display = 'inline-flex'; // NOVO
        hideAuthForm();
    } else {
        DOMElements.showAuthButton.style.display = 'block';
        DOMElements.logoutButton.style.display = 'none';
        DOMElements.novoPlanoBtn.style.display = 'none';
        DOMElements.exportarAgendaBtn.style.display = 'none';
        DOMElements.reavaliarCargaBtn.style.display = 'none'; // NOVO
    }
    
    // Renderiza os componentes da tela principal
    renderizarPainelLeiturasAtrasadas(planos);
    renderizarPainelProximasLeituras(planos);
    renderizarPlanos(planos);
}

/**
 * Renderiza os cards dos planos de leitura na lista principal.
 * @param {Array<object>} planos - A lista de planos a ser renderizada.
 */
function renderizarPlanos(planos) {
    const listaPlanos = DOMElements.listaPlanos;
    listaPlanos.innerHTML = '';

    if (!planos || planos.length === 0) {
        listaPlanos.innerHTML = `<p>Você ainda não tem nenhum plano de leitura. Clique em "Novo" para começar!</p>`;
        return;
    }

    planos.forEach((plano, index) => {
        const status = determinarStatusPlano(plano);
        const diasAtrasados = verificarAtraso(plano);
        const progresso = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;
        const numeroDoPlano = planos.length - index;

        const diasHtml = plano.diasPlano.map((dia, diaIndex) => `
            <div class="dia-leitura ${dia.lido ? 'lido' : ''}">
                <input type="checkbox" id="dia-${index}-${diaIndex}" data-action="marcar-lido" data-plano-index="${index}" data-dia-index="${diaIndex}" ${dia.lido ? 'checked' : ''}>
                <label for="dia-${index}-${diaIndex}">
                    <strong>${formatarData(dia.data)}:</strong> Pág. ${dia.paginaInicioDia} a ${dia.paginaFimDia} (${dia.paginas} pág.)
                </label>
            </div>
        `).join('');

        const card = document.createElement('div');
        card.className = `plano-leitura card-${status}`;
        card.innerHTML = `
            <div class="plano-header">
                <h3><span class="plano-numero">${numeroDoPlano}</span>${plano.titulo}</h3>
                <span class="status-tag status-${status.replace('_', '-')}">${status.replace('_', ' ')}</span>
                <div class="plano-acoes-principais">
                    <button data-action="editar" data-plano-index="${index}"><span class="material-symbols-outlined">edit</span> Editar</button>
                    <button data-action="excluir" data-plano-index="${index}"><span class="material-symbols-outlined">delete</span> Excluir</button>
                </div>
            </div>
            
            ${plano.linkDrive ? `<div class="link-drive-container"><a href="${plano.linkDrive}" target="_blank" class="button-link-drive"><span class="material-symbols-outlined">link</span> Acessar Anotações</a></div>` : ''}

            <p>Progresso: ${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progresso.toFixed(1)}%).</p>
            <div class="progresso-container"><span class="barra-progresso" style="width: ${progresso}%;"></span></div>
            
            ${diasAtrasados > 0 ? `
                <div class="aviso-atraso">
                    <p><span class="material-symbols-outlined">warning</span> Você tem ${diasAtrasados} dia(s) de leitura atrasado(s).</p>
                    <div class="acoes-dados">
                        <button data-action="recalcular-data" data-plano-index="${index}">Recalcular com nova data</button>
                    </div>
                </div>
            ` : ''}

            <details class="dias-leitura-details">
                <summary>Ver/Marcar dias de leitura</summary>
                <div class="dias-leitura">${diasHtml}</div>
            </details>
        `;
        listaPlanos.appendChild(card);
    });
}

/** Renderiza o painel de "Leituras Atrasadas". */
function renderizarPainelLeiturasAtrasadas(planos) {
    const leiturasAtrasadas = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    planos.forEach((plano, planoIdx) => {
        if (!plano.diasPlano) return;
        plano.diasPlano.forEach((dia) => {
            if (dia.data && new Date(dia.data) < hoje && !dia.lido) {
                leiturasAtrasadas.push({ ...dia, titulo: plano.titulo, numeroPlano: planos.length - planoIdx });
            }
        });
    });

    leiturasAtrasadas.sort((a, b) => a.data - b.data); // Ordena pela data mais antiga
    const top3Atrasadas = leiturasAtrasadas.slice(0, 3);

    if (top3Atrasadas.length > 0) {
        DOMElements.leiturasAtrasadasSection.style.display = 'block';
        DOMElements.semLeiturasAtrasadasP.style.display = 'none';
        DOMElements.listaLeiturasAtrasadasDiv.innerHTML = top3Atrasadas.map(dia => `
            <div class="leitura-atrasada-item">
                <span class="leitura-atrasada-data">${formatarData(dia.data)}</span>
                <span class="numero-plano-tag">${dia.numeroPlano}</span>
                <span class="leitura-atrasada-titulo">${dia.titulo}</span>
                <span class="leitura-atrasada-paginas">Págs: ${dia.paginaInicioDia}-${dia.paginaFimDia}</span>
            </div>
        `).join('');
    } else {
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
    }
}

/** Renderiza o painel de "Próximas Leituras". */
function renderizarPainelProximasLeituras(planos) {
    const proximasLeituras = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    planos.forEach((plano, planoIdx) => {
        if (!plano.diasPlano) return;
        plano.diasPlano.forEach((dia) => {
            if (dia.data && new Date(dia.data) >= hoje && !dia.lido) {
                proximasLeituras.push({ ...dia, titulo: plano.titulo, numeroPlano: planos.length - planoIdx });
            }
        });
    });

    proximasLeituras.sort((a, b) => a.data - b.data); // Ordena pela data mais próxima
    const top3Proximas = proximasLeituras.slice(0, 3);

    if (top3Proximas.length > 0) {
        DOMElements.proximasLeiturasSection.style.display = 'block';
        DOMElements.semProximasLeiturasP.style.display = 'none';
        DOMElements.listaProximasLeiturasDiv.innerHTML = top3Proximas.map(dia => `
            <div class="proxima-leitura-item">
                <span class="proxima-leitura-data">${formatarData(dia.data)}</span>
                <span class="numero-plano-tag">${dia.numeroPlano}</span>
                <span class="proxima-leitura-titulo">${dia.titulo}</span>
                <span class="proxima-leitura-paginas">Págs: ${dia.paginaInicioDia}-${dia.paginaFimDia}</span>
            </div>
        `).join('');
    } else {
        DOMElements.proximasLeiturasSection.style.display = 'none';
    }
}

// --- Funções do Modal de Reavaliação ---

/**
 * Renderiza o quadro de reavaliação de carga semanal.
 * @param {Array<object>} dadosCarga - Os dados gerados por `analisarCargaSemanal`.
 */
export function renderizarQuadroReavaliacao(dadosCarga) {
    const tbody = DOMElements.tabelaReavaliacaoBody;
    tbody.innerHTML = ''; // Limpa conteúdo anterior

    if (!dadosCarga || dadosCarga.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Não há dados para exibir.</td></tr>';
        return;
    }

    dadosCarga.forEach(dia => {
        const tr = document.createElement('tr');

        const planosHTML = dia.planos.length > 0
            ? dia.planos.map(p => `
                <span class="plano-carga-tag">
                    <span class="numero-plano-tag">${p.numero}</span>
                    <span>~${p.media} pág.</span>
                </span>
            `).join('')
            : 'Nenhum plano ativo';

        tr.innerHTML = `
            <td><strong>${dia.nome}</strong></td>
            <td class="planos-dia-cell">${planosHTML}</td>
            <td class="total-paginas-dia">${dia.totalPaginas}</td>
        `;
        tbody.appendChild(tr);
    });
}

/** Mostra o modal de reavaliação. */
export function showReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.add('visivel');
}

/** Esconde o modal de reavaliação. */
export function hideReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.remove('visivel');
}