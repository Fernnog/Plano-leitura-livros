// modules/ui.js
// RESPONSABILIDADE ÚNICA: Manipular o DOM, renderizar componentes e
// interagir com o usuário. Não contém lógica de negócio.

import * as DOMElements from './dom-elements.js';
import * as planoLogic from './plano-logic.js';

// --- Funções de Navegação e Visibilidade ---

/** Mostra a seção de lista de planos e esconde o formulário. */
export function showPlanosList(planos, user) {
    DOMElements.cadastroPlanoSection.style.display = 'none';
    DOMElements.planosLeituraSection.style.display = 'block';
    DOMElements.proximasLeiturasSection.style.display = 'block';
    DOMElements.leiturasAtrasadasSection.style.display = 'block';
    DOMElements.inicioBtn.style.display = 'none';
    DOMElements.novoPlanoBtn.style.display = user ? 'inline-flex' : 'none';
    renderApp(planos, user); // Re-renderiza para garantir que tudo está atualizado
}

/** Mostra o formulário de cadastro/edição e esconde a lista de planos. */
export function showCadastroForm(planoParaEditar = null) {
    DOMElements.planosLeituraSection.style.display = 'none';
    DOMElements.proximasLeiturasSection.style.display = 'none';
    DOMElements.leiturasAtrasadasSection.style.display = 'none';
    DOMElements.cadastroPlanoSection.style.display = 'block';
    DOMElements.inicioBtn.style.display = 'inline-flex';
    DOMElements.novoPlanoBtn.style.display = 'none';

    DOMElements.formPlano.reset(); // Limpa o formulário

    if (planoParaEditar) {
        // Preenche o formulário com dados do plano para edição
        DOMElements.formPlano.querySelector('h2').textContent = 'Editar Plano de Leitura';
        DOMElements.tituloLivroInput.value = planoParaEditar.titulo;
        DOMElements.linkDriveInput.value = planoParaEditar.linkDrive || '';
        DOMElements.paginaInicioInput.value = planoParaEditar.paginaInicio;
        DOMElements.paginaFimInput.value = planoParaEditar.paginaFim;
        DOMElements.dataInicio.value = planoParaEditar.dataInicio.toISOString().split('T')[0];
        DOMElements.dataFim.value = planoParaEditar.dataFim.toISOString().split('T')[0];
        // Adicionar lógica para outros campos se necessário (periodicidade, etc.)
    } else {
        DOMElements.formPlano.querySelector('h2').textContent = 'Novo Plano de Leitura';
    }
}

/** Mostra o formulário de autenticação. */
export function showAuthForm() {
    DOMElements.authFormDiv.style.display = 'flex';
    DOMElements.showAuthButton.style.display = 'none';
    DOMElements.cancelAuthButton.style.display = 'inline-block';
}

/** Esconde o formulário de autenticação. */
export function hideAuthForm() {
    DOMElements.authFormDiv.style.display = 'none';
    DOMElements.showAuthButton.style.display = 'block';
    DOMElements.cancelAuthButton.style.display = 'none';
}

/** Ativa/desativa um feedback visual de carregamento. */
export function toggleLoading(isLoading) {
    // Implementação futura: mostrar um spinner ou desabilitar botões
    console.log(`[UI] Carregamento: ${isLoading}`);
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}

// --- Funções de Renderização ---

/**
 * Função central que renderiza toda a aplicação com base no estado atual.
 * @param {Array} planos - O array de planos de leitura.
 * @param {object} user - O objeto de usuário do Firebase (ou null).
 */
export function renderApp(planos, user) {
    // Controla a visibilidade dos botões e seções com base no login
    if (user) {
        DOMElements.showAuthButton.style.display = 'none';
        DOMElements.authFormDiv.style.display = 'none';
        DOMElements.logoutButton.style.display = 'inline-flex';
        DOMElements.novoPlanoBtn.style.display = 'inline-flex';
        DOMElements.exportarAgendaBtn.style.display = 'inline-flex';
        // AQUI ESTÁ A CORREÇÃO PRINCIPAL
        DOMElements.reavaliarCargaBtn.style.display = 'inline-flex'; 
    } else {
        DOMElements.showAuthButton.style.display = 'block';
        DOMElements.logoutButton.style.display = 'none';
        DOMElements.novoPlanoBtn.style.display = 'none';
        DOMElements.exportarAgendaBtn.style.display = 'none';
        DOMElements.reavaliarCargaBtn.style.display = 'none';
    }

    if (planos && planos.length > 0) {
        renderizarPlanos(planos);
        renderizarDashboard(planos); // Renderiza painéis de próximas/atrasadas
    } else {
        DOMElements.listaPlanos.innerHTML = `<p>Nenhum plano de leitura encontrado. Crie um novo no botão "Novo"!</p>`;
        DOMElements.proximasLeiturasSection.style.display = 'none';
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
    }
    hideAuthForm();
}


/**
 * Renderiza a lista de cards de planos de leitura.
 * @param {Array} planos - O array de planos de leitura.
 */
function renderizarPlanos(planos) {
    DOMElements.listaPlanos.innerHTML = ''; // Limpa a lista
    planos.forEach((plano, index) => {
        const status = planoLogic.determinarStatusPlano(plano);
        const progresso = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;

        const card = document.createElement('div');
        card.className = `plano-leitura card-${status.replace('_', '-')}`;
        card.id = `plano-${plano.id}`;
        card.innerHTML = `
            <div class="plano-header">
                <h3><span class="plano-numero">${planos.length - index}</span>${plano.titulo}</h3>
                <span class="status-tag status-${status.replace('_', '-')}">${status.replace('_', ' ').toUpperCase()}</span>
                <div class="plano-acoes-principais">
                    <button data-action="editar" data-plano-index="${index}" title="Editar plano"><span class="material-symbols-outlined">edit</span></button>
                    <button data-action="excluir" data-plano-index="${index}" title="Excluir plano"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </div>
            <p><strong>Período:</strong> ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}</p>
            <div class="progresso-container">
                <span class="barra-progresso" style="width: ${progresso.toFixed(2)}%;"></span>
            </div>
            <p><strong>Progresso:</strong> ${progresso.toFixed(0)}% (${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas)</p>
            
            <details class="dias-leitura-details">
                <summary>Ver dias de leitura</summary>
                <div class="dias-leitura">
                    ${plano.diasPlano.map((dia, diaIndex) => `
                        <div class="dia-leitura ${dia.lido ? 'lido' : ''}">
                            <input type="checkbox" id="dia-${index}-${diaIndex}" data-action="marcar-lido" data-plano-index="${index}" data-dia-index="${diaIndex}" ${dia.lido ? 'checked' : ''}>
                            <label for="dia-${index}-${diaIndex}">${dia.data ? dia.data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Data inválida'}: Pág. ${dia.paginaInicioDia} a ${dia.paginaFimDia} (${dia.paginas} pág.)</label>
                        </div>
                    `).join('')}
                </div>
            </details>
        `;
        DOMElements.listaPlanos.appendChild(card);
    });
}

/**
 * Renderiza os painéis de leituras atrasadas e próximas leituras.
 * @param {Array<object>} planos - A lista completa de planos do usuário.
 */
function renderizarDashboard(planos) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let leiturasAtrasadas = [];
    let proximasLeituras = [];

    planos.forEach((plano, planoIndex) => {
        if (!plano.diasPlano) return;
        plano.diasPlano.forEach(dia => {
            if (!dia.data || dia.lido) return;

            const dataDia = new Date(dia.data);
            dataDia.setHours(0, 0, 0, 0);
            const item = {
                planoNum: planos.length - planoIndex,
                titulo: plano.titulo,
                data: dia.data,
                paginas: `Pág. ${dia.paginaInicioDia} - ${dia.paginaFimDia}`
            };

            if (dataDia < hoje) {
                leiturasAtrasadas.push(item);
            } else {
                proximasLeituras.push(item);
            }
        });
    });

    // Ordena e limita
    leiturasAtrasadas.sort((a, b) => a.data - b.data);
    proximasLeituras.sort((a, b) => a.data - b.data);
    const top3Atrasadas = leiturasAtrasadas.slice(0, 3);
    const top3Proximas = proximasLeituras.slice(0, 3);

    // Renderiza Leituras Atrasadas
    if (top3Atrasadas.length > 0) {
        DOMElements.leiturasAtrasadasSection.style.display = 'block';
        DOMElements.semLeiturasAtrasadasP.style.display = 'none';
        DOMElements.listaLeiturasAtrasadasDiv.innerHTML = top3Atrasadas.map(item => `
            <div class="leitura-atrasada-item">
                <span class="leitura-atrasada-data">${item.data.toLocaleDateString('pt-BR')}</span>
                <span class="numero-plano-tag">${item.planoNum}</span>
                <span class="leitura-atrasada-titulo">${item.titulo}</span>
                <span class="leitura-atrasada-paginas">${item.paginas}</span>
            </div>
        `).join('');
    } else {
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
    }

    // Renderiza Próximas Leituras
    if (top3Proximas.length > 0) {
        DOMElements.proximasLeiturasSection.style.display = 'block';
        DOMElements.semProximasLeiturasP.style.display = 'none';
        DOMElements.listaProximasLeiturasDiv.innerHTML = top3Proximas.map(item => `
            <div class="proxima-leitura-item">
                <span class="proxima-leitura-data">${item.data.toLocaleDateString('pt-BR')}</span>
                <span class="numero-plano-tag">${item.planoNum}</span>
                <span class="proxima-leitura-titulo">${item.titulo}</span>
                <span class="proxima-leitura-paginas">${item.paginas}</span>
            </div>
        `).join('');
    } else {
        DOMElements.proximasLeiturasSection.style.display = 'none';
    }
}


// --- Funções do Formulário e PWA ---

/**
 * Coleta e valida os dados do formulário de criação/edição de plano.
 * @returns {object} Um objeto com os dados do formulário.
 */
export function getFormData() {
    // Implementação simplificada. Adicionar validações robustas.
    const diasSemanaNodes = DOMElements.diasSemanaSelecao.querySelectorAll('input[type="checkbox"]:checked');
    const diasSemana = Array.from(diasSemanaNodes).map(node => parseInt(node.value, 10));

    const definirPor = DOMElements.definirPorDatasRadio.checked ? 'datas' : 'dias';

    const formData = {
        titulo: DOMElements.tituloLivroInput.value.trim(),
        linkDrive: DOMElements.linkDriveInput.value.trim(),
        paginaInicio: parseInt(DOMElements.paginaInicioInput.value, 10),
        paginaFim: parseInt(DOMElements.paginaFimInput.value, 10),
        periodicidade: DOMElements.periodicidadeSelect.value,
        diasSemana,
        definirPor,
        dataInicio: definirPor === 'datas' ? new Date(DOMElements.dataInicio.value + 'T00:00:00') : new Date(DOMElements.dataInicioDias.value + 'T00:00:00'),
        dataFim: definirPor === 'datas' ? new Date(DOMElements.dataFim.value + 'T00:00:00') : null,
        numeroDias: definirPor === 'dias' ? parseInt(DOMElements.numeroDias.value, 10) : null
    };

    if (!formData.titulo) throw new Error("O título do livro é obrigatório.");
    if (formData.paginaFim < formData.paginaInicio) throw new Error("A página final não pode ser menor que a página de início.");
    // Outras validações...
    
    return formData;
}

/** Tenta registrar o Service Worker para funcionalidades PWA. */
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('[UI] Service Worker registrado com sucesso:', registration.scope))
                .catch(error => console.error('[UI] Falha ao registrar Service Worker:', error));
        });
    }
}


// --- NOVAS FUNÇÕES PARA O MODAL DE REAVALIAÇÃO ---

/**
 * Renderiza o quadro de reavaliação de carga semanal.
 * @param {Array<object>} dadosCarga - Os dados gerados por `analisarCargaSemanal`.
 */
export function renderizarQuadroReavaliacao(dadosCarga) {
    const tbody = DOMElements.tabelaReavaliacaoBody;
    tbody.innerHTML = ''; // Limpa conteúdo anterior

    dadosCarga.forEach(dia => {
        const tr = document.createElement('tr');

        const planosHTML = dia.planos.length > 0 ? dia.planos.map(p => `
            <span class="plano-carga-tag">
                <span class="numero-plano-tag">${p.numero}</span>
                <span>~${p.media} pág.</span>
            </span>
        `).join('') : '<span>Nenhum plano ativo neste dia.</span>';

        tr.innerHTML = `
            <td><strong>${dia.nome}</strong></td>
            <td class="planos-dia-cell">${planosHTML}</td>
            <td class="total-paginas-dia">${dia.totalPaginas > 0 ? dia.totalPaginas : '-'}</td>
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