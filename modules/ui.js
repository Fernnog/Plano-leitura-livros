// modules/ui.js
// RESPONSABILIDADE ÚNICA: Manipular o DOM, renderizar elementos, ler dados de formulários
// e gerenciar a visibilidade das seções da UI. Não contém lógica de negócio.

import * as DOMElements from './dom-elements.js';
import * as planoLogic from './plano-logic.js';
import { versionConfig } from '../config/version-config.js'; 
import './neuro-notes.js'; 

// --- Funções de Formatação e Helpers ---

function formatarData(date) {
    if (date instanceof Date && !isNaN(date)) {
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
    }
    return '';
}

export function highlightAndScrollToPlano(planoIndex) {
    const planoCard = document.getElementById(`plano-${planoIndex}`);
    if (!planoCard) return;

    planoCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    planoCard.classList.add('flash-highlight');

    setTimeout(() => {
        planoCard.classList.remove('flash-highlight');
    }, 1500);
}

export function autoScrollParaDiaAtual() {
    setTimeout(() => {
        const alvos = document.querySelectorAll('[data-scroll-target="true"]');
        if (alvos.length > 0) {
            alvos[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 600);
}

// --- Funções de Controle de Visibilidade ---

export function showPlanosList(planos, user) {
    DOMElements.cadastroPlanoSection.style.display = 'none';
    DOMElements.planosLeituraSection.style.display = 'block';
    renderApp(planos, user);
}

export function showCadastroForm(planoParaEditar = null) {
    DOMElements.planosLeituraSection.style.display = 'none';
    DOMElements.leiturasAtrasadasSection.style.display = 'none';
    DOMElements.proximasLeiturasSection.style.display = 'none';
    DOMElements.planosPausadosSection.style.display = 'none';
    
    const revisoesSection = document.getElementById('revisoes-section');
    if (revisoesSection) revisoesSection.style.display = 'none';

    DOMElements.cadastroPlanoSection.style.display = 'block';

    DOMElements.formPlano.reset();
    togglePeriodoFields();
    toggleDiasSemana();

    if (planoParaEditar) {
        DOMElements.cadastroPlanoSection.querySelector('h2').textContent = 'Editar Plano de Leitura';
        DOMElements.tituloLivroInput.value = planoParaEditar.titulo;
        DOMElements.linkDriveInput.value = planoParaEditar.linkDrive || '';
        DOMElements.paginaInicioInput.value = planoParaEditar.paginaInicio;
        DOMElements.paginaFimInput.value = planoParaEditar.paginaFim;

        DOMElements.definirPorDatasRadio.checked = true;
        DOMElements.periodoPorDatasDiv.style.display = 'block';
        DOMElements.periodoPorDiasDiv.style.display = 'none';
        DOMElements.periodoPorPaginasDiv.style.display = 'none';

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
        DOMElements.cadastroPlanoSection.querySelector('h2').textContent = 'Novo Plano de Leitura';
    }
}

export function togglePeriodoFields() {
    const isPorDatas = DOMElements.definirPorDatasRadio.checked;
    const isPorDias = DOMElements.definirPorDiasRadio.checked;
    const isPorPaginas = DOMElements.definirPorPaginasRadio.checked;

    DOMElements.periodoPorDatasDiv.style.display = isPorDatas ? 'block' : 'none';
    DOMElements.periodoPorDiasDiv.style.display = isPorDias ? 'block' : 'none';
    DOMElements.periodoPorPaginasDiv.style.display = isPorPaginas ? 'block' : 'none';

    DOMElements.dataInicio.required = isPorDatas;
    DOMElements.dataFim.required = isPorDatas;
    DOMElements.dataInicioDias.required = isPorDias;
    DOMElements.numeroDias.required = isPorDias;
    DOMElements.dataInicioPaginas.required = isPorPaginas;
    DOMElements.paginasPorDiaInput.required = isPorPaginas;
}

export function toggleDiasSemana() {
    if (DOMElements.periodicidadeSelect.value === 'semanal') {
        DOMElements.diasSemanaSelecao.style.display = 'block';
    } else {
        DOMElements.diasSemanaSelecao.style.display = 'none';
    }
}

export function renderizarDataFimEstimada(data, erroMsg = '') {
    const feedbackElement = DOMElements.estimativaDataFimP;
    if (!feedbackElement) return;

    if (erroMsg) {
        feedbackElement.textContent = erroMsg;
        feedbackElement.style.color = '#dc3545';
        return;
    }

    if (data instanceof Date && !isNaN(data)) {
        feedbackElement.textContent = `Estimativa de término: ${formatarData(data)}`;
        feedbackElement.style.color = '#555';
    } else {
        feedbackElement.textContent = '';
    }
}

export function showAuthForm() {
    DOMElements.authFormDiv.style.display = 'flex';
    DOMElements.cancelAuthButton.style.display = 'inline-flex';
    DOMElements.showAuthButton.style.display = 'none';
}

export function hideAuthForm() {
    DOMElements.authFormDiv.style.display = 'none';
    DOMElements.cancelAuthButton.style.display = 'none';
    if (!DOMElements.logoutButton.style.display || DOMElements.logoutButton.style.display === 'none') {
        DOMElements.showAuthButton.style.display = 'inline-flex';
    }
}

export function showReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.add('visivel');
}

export function hideReavaliacaoModal() {
    DOMElements.reavaliacaoModal.classList.remove('visivel');
}

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
setupRecalculoInteractions();

export function showRecalculoModal(plano, planoIndex, buttonText) {
    DOMElements.recalculoPlanoTitulo.textContent = `"${plano.titulo}"`;
    DOMElements.confirmRecalculoBtn.dataset.planoIndex = planoIndex;
    DOMElements.confirmRecalculoBtn.textContent = buttonText || 'Confirmar Remanejamento';

    const recalculoCheckboxes = document.querySelectorAll('#recalculo-dias-semana-selecao input[type="checkbox"]');
    recalculoCheckboxes.forEach(cb => {
        cb.checked = plano.diasSemana.includes(parseInt(cb.value));
    });

    DOMElements.recalculoPorDataRadio.checked = true;
    DOMElements.recalculoOpcaoDataDiv.style.display = 'block';
    DOMElements.recalculoOpcaoPaginasDiv.style.display = 'none';
    DOMElements.novaPaginasPorDiaInput.value = '';

    const hoje = new Date();
    const amanha = new Date(hoje.setDate(hoje.getDate() + 1));
    DOMElements.novaDataFimInput.min = amanha.toISOString().split('T')[0];
    DOMElements.novaDataFimInput.value = '';

    DOMElements.recalculoModal.classList.add('visivel');
}

export function hideRecalculoModal() {
    DOMElements.recalculoModal.classList.remove('visivel');
}

export function showAgendaModal() {
    DOMElements.agendaStartTimeInput.value = "16:30";
    DOMElements.agendaEndTimeInput.value = "17:00";
    DOMElements.agendaModal.classList.add('visivel');
}

export function hideAgendaModal() {
    DOMElements.agendaModal.classList.remove('visivel');
}

export function showChangelogModal() {
    if (!DOMElements.changelogModal || !DOMElements.changelogModalTitle || !DOMElements.changelogModalContent) return;

    DOMElements.changelogModalTitle.innerHTML = `<span class="material-symbols-outlined">rocket_launch</span> ${versionConfig.changelog.title}`;
    
    let contentHTML = '';
    versionConfig.changelog.sections.forEach(section => {
        contentHTML += `<h3>${section.title}</h3><ul>`;
        section.points.forEach(point => {
            contentHTML += `<li>${point}</li>`;
        });
        contentHTML += `</ul>`;
    });
    DOMElements.changelogModalContent.innerHTML = contentHTML;

    DOMElements.changelogModal.classList.add('visivel');
}

export function hideChangelogModal() {
    if (!DOMElements.changelogModal) return;
    DOMElements.changelogModal.classList.remove('visivel');
}

export function triggerDownload(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

export function getFormData() {
    const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
    
    let dataInicio;
    if (definicaoPeriodo === 'datas') {
        dataInicio = new Date(DOMElements.dataInicio.value + 'T00:00:00');
    } else if (definicaoPeriodo === 'dias') {
        dataInicio = new Date(DOMElements.dataInicioDias.value + 'T00:00:00');
    } else {
        dataInicio = new Date(DOMElements.dataInicioPaginas.value + 'T00:00:00');
    }

    const formData = {
        titulo: DOMElements.tituloLivroInput.value.trim(),
        linkDrive: DOMElements.linkDriveInput.value.trim(),
        paginaInicio: parseInt(DOMElements.paginaInicioInput.value, 10),
        paginaFim: parseInt(DOMElements.paginaFimInput.value, 10),
        periodicidade: DOMElements.periodicidadeSelect.value,
        diasSemana: [],
        definicaoPeriodo: definicaoPeriodo,
        dataInicio: dataInicio,
    };

    if (formData.definicaoPeriodo === 'datas') {
        formData.dataFim = new Date(DOMElements.dataFim.value + 'T00:00:00');
    } else if (formData.definicaoPeriodo === 'dias') {
        formData.numeroDias = parseInt(DOMElements.numeroDias.value, 10);
    } else {
        formData.paginasPorDia = parseInt(DOMElements.paginasPorDiaInput.value, 10);
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
    if (isNaN(formData.dataInicio.getTime())) {
        throw new Error("A data de início é obrigatória.");
    }

    return formData;
}

// --- Funções de Renderização ---

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
        const isPausado = status === 'pausado';
        const proximoDiaIndex = planoLogic.encontrarProximoDiaDeLeituraIndex(plano);

        let statusTagHTML = '';
        switch (status) {
            case 'proximo': statusTagHTML = '<span class="status-tag status-proximo">Próximo</span>'; break;
            case 'em_dia': statusTagHTML = '<span class="status-tag status-em-dia">Em Dia</span>'; break;
            case 'atrasado': statusTagHTML = '<span class="status-tag status-atrasado">Atrasado</span>'; break;
            case 'concluido': statusTagHTML = '<span class="status-tag status-concluido">Concluído</span>'; break;
            case 'pausado': statusTagHTML = '<span class="status-tag status-concluido">Pausado</span>'; break;
        }

        const botaoPausarRetomarHTML = isPausado
            ? `<button data-action="retomar" data-plano-index="${index}" title="Retomar Plano" class="acao-retomar"><span class="material-symbols-outlined">play_circle</span></button>`
            : `<button data-action="pausar" data-plano-index="${index}" title="Pausar Plano"><span class="material-symbols-outlined">pause</span></button>`;
        
        let diasOcultosCount = 0;

        const globalAnnotations = plano.neuroAnnotations || [];

        const diasLeituraHTML = plano.diasPlano.map((dia, diaIndex) => {
            let acoesDiaHTML = '';
            if (diaIndex === proximoDiaIndex && !isPausado) {
                acoesDiaHTML = `
                    <div class="dia-leitura-acoes">
                        <div class="leitura-parcial-container">
                            <label for="parcial-${index}-${diaIndex}">Parei na pág:</label>
                            <input type="number" id="parcial-${index}-${diaIndex}" class="leitura-parcial-input" 
                                   min="${dia.paginaInicioDia}" max="${dia.paginaFimDia}"
                                   placeholder="${dia.paginaInicioDia}"
                                   value="${dia.ultimaPaginaLida || ''}">
                            <button class="leitura-parcial-save-btn" data-action="salvar-parcial" 
                                    data-plano-index="${index}" data-dia-index="${diaIndex}">
                                <span class="material-symbols-outlined">save</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            const temAnnotationMatch = globalAnnotations.some(note => {
                return (dia.paginaInicioDia <= note.pageEnd && dia.paginaFimDia >= note.pageStart);
            });

            const temLegacyNote = dia.neuroNote && (
                (dia.neuroNote.insights && dia.neuroNote.insights.length > 0) ||
                (dia.neuroNote.meta && dia.neuroNote.meta.length > 0) ||
                (dia.neuroNote.triggers && dia.neuroNote.triggers.length > 0)
            );
            
            const showNeuroIcon = temAnnotationMatch || temLegacyNote;
            
            const neuroIcon = showNeuroIcon 
                ? `<span class="material-symbols-outlined" style="font-size: 1.1em; color: #d35400; vertical-align: middle; margin-left: 5px;" title="Neuro-contexto ativo nestas páginas">psychology</span>` 
                : '';
            
            const neuroClass = showNeuroIcon ? 'neuro-range-active' : '';

            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const dataDia = dia.data ? new Date(dia.data) : null;
            if (dataDia) dataDia.setHours(0,0,0,0);

            const isHoje = dataDia && dataDia.getTime() === hoje.getTime();
            const isAlvoScroll = isHoje || (index === 0 && diaIndex === proximoDiaIndex && !dia.lido);
            
            const classeScroll = isAlvoScroll ? 'dia-atual-scroll-target' : '';
            const attrScroll = isAlvoScroll ? 'data-scroll-target="true"' : '';
            
            const badgeHoje = isHoje ? '<span class="status-tag status-em-dia" style="font-size:0.7em; margin-left:5px; background-color:#e67e22; color:white; border:none;">HOJE</span>' : '';

            const deveMostrar = !dia.lido || showNeuroIcon;
            let classeVisibilidade = '';
            
            if (!deveMostrar) {
                diasOcultosCount++;
                classeVisibilidade = 'item-recolhido';
            }

            return `
            <div class="dia-leitura ${dia.lido ? 'lido' : ''} ${neuroClass} ${classeScroll} ${classeVisibilidade}" ${attrScroll}>
                <div style="display:flex; align-items:center; width:100%;">
                    <input type="checkbox" id="dia-${index}-${diaIndex}" data-action="marcar-lido" data-plano-index="${index}" data-dia-index="${diaIndex}" ${dia.lido ? 'checked' : ''}>
                    <label for="dia-${index}-${diaIndex}" style="margin-left:8px;">
                        <strong>${formatarData(dia.data)}:</strong> Pág. ${dia.paginaInicioDia} a ${dia.paginaFimDia}
                        ${badgeHoje}
                        ${neuroIcon}
                    </label>
                </div>
                ${acoesDiaHTML}
            </div>
        `}).join('');

        const podeRecalcular = status === 'atrasado' || status === 'em_dia';
        const avisoAtrasoHTML = podeRecalcular ? `
            <div class="aviso-atraso">
                <p>${status === 'atrasado' ? 'Este plano tem leituras atrasadas!' : 'Ajuste o ritmo do seu plano, se desejar.'}</p>
                <div class="acoes-dados">
                    <button data-action="recalcular" data-plano-index="${index}" title="Recalcular o plano com uma nova data de término">
                        <span class="material-symbols-outlined">restart_alt</span> Recalcular
                    </button>
                </div>
            </div>
        ` : '';

        const botaoHistoricoHTML = diasOcultosCount > 0 
            ? `<button class="btn-toggle-historico" data-action="toggle-historico" data-plano-index="${index}" title="Ver dias anteriores">
                 <span class="material-symbols-outlined" style="font-size: 1.1em; vertical-align: text-bottom;">history</span> ${diasOcultosCount}
               </button>` 
            : '';

        const styleData = (plano.dataFim && new Date(plano.dataFim) < new Date() && status !== 'concluido') ? 'color: #e74c3c; font-weight: bold;' : '';

        html += `
            <div class="plano-leitura card-${status}" id="plano-${index}">
                <div class="plano-header">
                    <h3><span class="plano-numero">${numeroPlano}</span>${plano.titulo}</h3>
                    ${statusTagHTML}
                    <div class="plano-acoes-principais">
                        ${botaoPausarRetomarHTML}
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

                <!-- BARRA DE PROGRESSO & PREVISÃO -->
                <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 5px; color: #666;">
                    <span><strong>Progresso:</strong> ${progresso.toFixed(0)}% (${plano.paginasLidas}/${plano.totalPaginas})</span>
                    <span style="${styleData}"><strong>Previsão:</strong> ${formatarData(plano.dataFim)}</span>
                </div>
                <div class="progresso-container" title="${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas">
                    <span class="barra-progresso" style="width: ${progresso}%;"></span>
                </div>
                
                <!-- LAYOUT DE GRID -->
                <div class="plano-leitura-grid">
                    <!-- Coluna Esquerda: Cronograma -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; margin-top: 0;">
                            <h4 class="dias-leitura-titulo" style="margin: 0;">Cronograma:</h4>
                            ${botaoHistoricoHTML}
                        </div>
                        <div class="dias-leitura">${diasLeituraHTML}</div>
                    </div>

                    <!-- Coluna Direita: Painel Neuro-Cognitivo (LIMPO) -->
                    <div class="neuro-panel">
                        <h4 class="neuro-panel-title">Painel Neuro</h4>
                        
                        <div class="neuro-panel-actions" style="display:flex; flex-direction:column; gap:8px; flex-grow:1;">
                            <!-- NOVO BOTÃO: DIÁRIO DE BORDO -->
                            <button type="button" class="btn-neuro-action" data-action="open-logbook" data-plano-index="${index}" title="Gerenciar histórico deste capítulo">
                                <span class="material-symbols-outlined" style="pointer-events: none;">history_edu</span>
                                <span style="pointer-events: none;">Diário de Bordo</span>
                            </button>

                            <button type="button" class="btn-neuro-action" data-action="open-neuro" data-plano-index="${index}" title="Registrar aprendizado M.E.T.A.">
                                <span class="material-symbols-outlined" style="pointer-events: none;">psychology_alt</span>
                                <span style="pointer-events: none;">Anotar Insight</span>
                            </button>
                            
                            <button type="button" class="btn-neuro-action" data-action="download-md" data-plano-index="${index}" title="Baixar anotações em Markdown">
                                <span class="material-symbols-outlined" style="pointer-events: none;">download</span>
                                <span style="pointer-events: none;">Baixar Resumo</span>
                            </button>
                            
                            <button type="button" class="btn-neuro-action" data-action="open-checklist" title="Verificar checklist de retenção">
                                <span class="material-symbols-outlined" style="pointer-events: none;">fact_check</span>
                                <span style="pointer-events: none;">Checklist Retenção</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    DOMElements.listaPlanos.innerHTML = html;
}

function renderizarPaginador(planos) {
    const totalPlanos = planos.length;
    if (totalPlanos <= 1) {
        DOMElements.paginadorPlanosDiv.innerHTML = '';
        DOMElements.paginadorPlanosDiv.classList.add('hidden');
        return;
    }

    let paginadorHTML = `<a href="#" id="paginador-home-btn" title="Ir para o topo">
                            <span class="material-symbols-outlined">home</span>
                         </a>`;
    
    planos.forEach((plano, index) => {
        const numeroPlano = totalPlanos - index;
        const status = planoLogic.determinarStatusPlano(plano);
        const classePausado = status === 'pausado' ? 'paginador-pausado' : '';

        paginadorHTML += `<a href="#plano-${index}" title="Ir para o plano '${plano.titulo}'" class="${classePausado}">${numeroPlano}</a>`;
    });
    
    DOMElements.paginadorPlanosDiv.innerHTML = paginadorHTML;
    DOMElements.paginadorPlanosDiv.classList.remove('hidden');
}

function renderizarPainelProximasLeituras(planos, totalPlanos) {
    if (!DOMElements.proximasLeiturasSection) return;

    const planosAtivos = planos.filter(p => !p.isPaused);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasAsProximasLeituras = planosAtivos.flatMap((plano, planoIndexOriginal) => {
        const planoIndexGlobal = planos.findIndex(p => p.id === plano.id);
        return plano.diasPlano
            .filter(dia => dia.data && new Date(dia.data) >= hoje && !dia.lido)
            .map(dia => ({ ...dia, titulo: plano.titulo, planoIndex: planoIndexGlobal }));
    }).sort((a, b) => a.data - b.data);
    
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
    if (!DOMElements.leiturasAtrasadasSection) return;

    const planosAtivos = planos.filter(p => !p.isPaused);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasAsLeiturasAtrasadas = planosAtivos.flatMap((plano, planoIndexOriginal) => {
        const planoIndexGlobal = planos.findIndex(p => p.id === plano.id);
        return plano.diasPlano
            .filter(dia => dia.data && new Date(dia.data) < hoje && !dia.lido)
            .map(dia => ({ ...dia, titulo: plano.titulo, planoIndex: planoIndexGlobal }));
    }).sort((a, b) => a.data - b.data);

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

function renderizarPainelPlanosPausados(planos, totalPlanos) {
    if (!DOMElements.planosPausadosSection) return;

    const planosPausados = planos.filter(plano => plano.isPaused);

    if (planosPausados.length > 0) {
        const html = planosPausados.map(plano => {
            const planoIndex = planos.findIndex(p => p.id === plano.id);
            return `
                <div class="plano-pausado-item">
                    <span class="plano-pausado-data">Pausado em: ${formatarData(plano.dataPausa)}</span>
                    <span class="numero-plano-tag">${totalPlanos - planoIndex}</span>
                    <span class="plano-pausado-titulo">${plano.titulo}</span>
                </div>
            `;
        }).join('');
        DOMElements.listaPlanosPausadosDiv.innerHTML = html;
        DOMElements.semPlanosPausadosP.style.display = 'none';
        DOMElements.planosPausadosSection.style.display = 'block';
    } else {
        DOMElements.planosPausadosSection.style.display = 'none';
    }
}

function renderizarPainelRevisoes(planos) {
    const section = document.getElementById('revisoes-section');
    const container = document.getElementById('lista-revisoes');
    
    if (!section || !container) return;

    let revisoes = [];
    try {
        if (typeof planoLogic.verificarRevisoesPendentes === 'function') {
            revisoes = planoLogic.verificarRevisoesPendentes(planos);
        }
    } catch (e) {
        console.warn('Função SRS de verificação pendente no plano-logic.js');
    }

    if (revisoes.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    
    container.innerHTML = revisoes.map(rev => `
        <div class="neuro-item-card" style="border-left: 4px solid #8e44ad; display: block;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <span class="status-tag" style="background: #8e44ad; color: white; border: none;">${rev.tipo}</span>
                    <strong style="display: block; margin-top: 5px; color: #2c3e50; font-size: 1.05em;">${rev.planoTitulo}</strong>
                    <span style="font-size: 0.85em; color: #7f8c8d;">${rev.capitulo}</span>
                </div>
                
                <button class="button-confirm" 
                        data-action="iniciar-revisao" 
                        data-plano-index="${rev.planoIndex}" 
                        data-nota-id="${rev.notaId}"
                        data-tipo-revisao="${rev.tipo}"
                        style="font-size: 0.9em; padding: 6px 12px; background-color: #8e44ad;">
                    <span class="material-symbols-outlined" style="font-size: 1.2em; vertical-align: bottom;">play_arrow</span> Iniciar
                </button>
            </div>
            
            <div style="font-size: 0.85em; color: #555; background: #fff; padding: 10px; border-radius: 6px; border: 1px dashed #d1c4e9;">
                <strong style="color:#8e44ad;">Desafio:</strong> ${rev.desafio}
            </div>
        </div>
    `).join('');
}

function renderizarQuadroReavaliacao(dadosCarga) {
    let html = '';
    dadosCarga.forEach(dia => {
        const planosDoDia = dia.planos.map(p => 
            `<span class="plano-carga-tag" data-action="remanejar-plano" data-plano-index="${p.planoIndex}" title="Remanejar plano '${p.numero}'">
                <span class="numero-plano-tag">${p.numero}</span> ${p.media} pág.
            </span>`
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

function renderizarLegendaReavaliacao(planos, totalPlanos) {
    const legendaContainer = DOMElements.reavaliacaoLegenda;
    if (!planos || planos.length === 0 || !legendaContainer) {
        if(legendaContainer) legendaContainer.innerHTML = '';
        return;
    }

    const planosAtivos = planos.filter(p => planoLogic.determinarStatusPlano(p) !== 'concluido' && planoLogic.determinarStatusPlano(p) !== 'invalido');
    
    if (planosAtivos.length === 0) {
        legendaContainer.innerHTML = '';
        return;
    }
    
    let legendaHTML = '<h4>Legenda de Planos</h4><ul class="reavaliacao-legenda-lista">';
    
    const mapaPlanoNumero = {};
    planos.forEach((plano, index) => {
        mapaPlanoNumero[index] = planos.length - index;
    });

    planosAtivos.forEach((plano) => {
        const originalIndex = planos.findIndex(p => p.id === plano.id);
        const numeroPlano = mapaPlanoNumero[originalIndex];
        
        legendaHTML += `
            <li class="reavaliacao-legenda-item">
                <span class="numero-plano-tag">${numeroPlano}</span>
                <span>${plano.titulo}</span>
            </li>
        `;
    });
    legendaHTML += '</ul>';

    legendaContainer.innerHTML = legendaHTML;
}

export function renderizarModalReavaliacaoCompleto(dadosCarga, planos, totalPlanos) {
    renderizarQuadroReavaliacao(dadosCarga);
    renderizarLegendaReavaliacao(planos, totalPlanos);
}

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

        if (DOMElements.headerMetaInfoDiv) {
            DOMElements.userEmailDisplaySpan.textContent = user.email;
            DOMElements.versionDisplaySpan.textContent = `v${versionConfig.version}`;
            DOMElements.headerMetaInfoDiv.style.display = 'flex';
        }

    } else {
        DOMElements.showAuthButton.style.display = 'inline-flex';
        DOMElements.logoutButton.style.display = 'none';
        DOMElements.novoPlanoBtn.style.display = 'none';
        DOMElements.inicioBtn.style.display = 'none';
        DOMElements.exportarAgendaBtn.style.display = 'none';
        DOMElements.reavaliarCargaBtn.style.display = 'none';
        hideAuthForm();
        
        if (DOMElements.headerMetaInfoDiv) {
            DOMElements.headerMetaInfoDiv.style.display = 'none';
        }
    }

    if (planos && planos.length > 0) {
        renderizarPainelRevisoes(planos);
        
        renderizarPainelProximasLeituras(planos, planos.length);
        renderizarPainelLeiturasAtrasadas(planos, planos.length);
        renderizarPainelPlanosPausados(planos, planos.length);
        renderizarPlanos(planos, user);
        renderizarPaginador(planos);
        DOMElements.paginadorPlanosDiv.classList.remove('hidden');
    } else {
        DOMElements.listaPlanos.innerHTML = user ? '<p>Você ainda não tem planos. Clique em "Novo" para criar o seu primeiro!</p>' : '<p>Faça login ou cadastre-se para ver e criar seus planos de leitura.</p>';
        DOMElements.proximasLeiturasSection.style.display = 'none';
        DOMElements.leiturasAtrasadasSection.style.display = 'none';
        DOMElements.planosPausadosSection.style.display = 'none';
        
        const revSection = document.getElementById('revisoes-section');
        if(revSection) revSection.style.display = 'none';
        
        DOMElements.paginadorPlanosDiv.innerHTML = '';
        DOMElements.paginadorPlanosDiv.classList.add('hidden');
    }
}

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
