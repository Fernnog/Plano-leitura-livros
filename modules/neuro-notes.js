// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (M.E.T.A.),
// persistência local/remota dessas anotações e exportação para Markdown.
// ATUALIZADO: Suporte a Contexto Geral (diaIndex opcional), Robustez no Recálculo
// e Integração com Ditado Inteligente (Neuro-Voice).

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';
import { attachDictationToInput } from './dictation-widget.js'; // Integração Neuro-Voice

// --- Variável de Estado Local (Temporária enquanto o modal está aberto) ---
let tempNoteData = {
    id: null,        // ID único da anotação
    chapterTitle: '',
    pageStart: null,
    pageEnd: null,
    insights: [],
    meta: [],
    triggers: []
};

let currentPlanoIndex = null;
let currentDiaIndex = null; // Pode ser null se aberto pelo botão geral do painel

// --- Inicialização e Helpers ---

function migrateLegacyData(oldData) {
    if (!oldData) return {
        id: crypto.randomUUID(),
        chapterTitle: '',
        pageStart: null,
        pageEnd: null,
        insights: [],
        meta: [],
        triggers: []
    };

    const newData = {
        id: oldData.id || crypto.randomUUID(),
        chapterTitle: oldData.chapterTitle || '',
        pageStart: oldData.pageStart || null,
        pageEnd: oldData.pageEnd || null,
        insights: oldData.insights || [],
        meta: oldData.meta && Array.isArray(oldData.meta) ? oldData.meta : [],
        triggers: oldData.triggers && Array.isArray(oldData.triggers) ? oldData.triggers : []
    };

    // Migrações de legado (objetos antigos para arrays)
    if (oldData.meta && !Array.isArray(oldData.meta)) {
        if (oldData.meta.map) newData.meta.push({ page: 'Geral', type: 'map', text: oldData.meta.map });
        if (oldData.meta.engage) newData.meta.push({ page: 'Geral', type: 'engage', text: oldData.meta.engage });
        if (oldData.meta.translate) newData.meta.push({ page: 'Geral', type: 'translate', text: oldData.meta.translate });
        if (oldData.meta.apply) newData.meta.push({ page: 'Geral', type: 'apply', text: oldData.meta.apply });
    }

    if (oldData.triggers && !Array.isArray(oldData.triggers)) {
        if (oldData.triggers.prediction) newData.triggers.push({ page: 'Geral', type: 'prediction', text: oldData.triggers.prediction });
        if (oldData.triggers.connection) newData.triggers.push({ page: 'Geral', type: 'connection', text: oldData.triggers.connection });
        if (oldData.triggers.emotion) newData.triggers.push({ page: 'Geral', type: 'emotion', text: oldData.triggers.emotion });
        if (oldData.triggers.visual) newData.triggers.push({ page: 'Geral', type: 'dual_coding', text: oldData.triggers.visual });
    }

    return newData;
}

// --- Gerenciamento do Modal (Injeção Dinâmica) ---

function ensureModalExists() {
    if (document.getElementById('neuro-modal')) return;

    // Estrutura base do Modal
    const modalHTML = `
    <div id="neuro-modal" class="reavaliacao-modal-overlay">
        <div class="reavaliacao-modal-content neuro-theme" style="max-width: 800px; padding: 0; display: flex; flex-direction: column; max-height: 90vh;">
            <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #1a252f 0%, #2c3e50 100%); padding: 15px 20px; border-radius: 8px 8px 0 0; color: white; flex-shrink: 0;">
                <h2 style="color: white; font-family: 'Playfair Display', serif; margin:0; display:flex; align-items:center; gap:10px;">
                    <span class="material-symbols-outlined">psychology_alt</span> Neuro-Insights
                </h2>
                <button id="close-neuro-modal" class="reavaliacao-modal-close" style="color: white; opacity: 0.8;">×</button>
            </div>
            
            <div id="neuro-modal-body" class="neuro-modal-body" style="padding: 20px; overflow-y: auto; flex-grow: 1;">
                <!-- Conteúdo injetado via JS -->
            </div>

            <!-- Rodapé placeholder - Será sobrescrito pela função setupModalButtons para garantir o layout correto -->
            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0; flex-shrink: 0;">
                 <!-- Botões injetados dinamicamente -->
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-neuro-modal').addEventListener('click', closeNoteModal);
}

// ATUALIZADO: diaIndex agora é opcional (default null)
export function openNoteModal(planoIndex, diaIndex = null) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    currentDiaIndex = diaIndex;

    const plano = state.getPlanoByIndex(planoIndex);
    
    // Validação básica do plano
    if (!plano) {
        console.error("Erro ao abrir modal: Plano não encontrado.");
        return;
    }

    let annotationFound = null;
    const annotations = plano.neuroAnnotations || [];

    // LÓGICA DE SELEÇÃO DE CONTEXTO

    // Cenário 1: Usuário clicou em um dia específico na lista
    if (diaIndex !== null && plano.diasPlano && plano.diasPlano[diaIndex]) {
        const dia = plano.diasPlano[diaIndex];
        
        // Procura anotação global que intercepte o intervalo do dia
        annotationFound = annotations.find(note => 
            (dia.paginaInicioDia <= note.pageEnd && dia.paginaFimDia >= note.pageStart)
        );

        // Fallback para legado (se existir nota presa no dia e não houver global)
        if (!annotationFound && dia.neuroNote) {
            annotationFound = dia.neuroNote;
        }
    }

    // Cenário 2: Usuário clicou no botão geral (sem dia específico) ou não achou nota no dia
    // Carrega o ÚLTIMO contexto trabalhado (continuidade)
    if (!annotationFound && annotations.length > 0) {
        // Assume que a última anotação do array é a mais recente
        annotationFound = annotations[annotations.length - 1];
    }

    // 3. Prepara os dados temporários
    tempNoteData = migrateLegacyData(annotationFound);

    // Configuração de Defaults (se for nova nota)
    if (!annotationFound) {
        // Se temos um dia de referência, usamos as páginas dele
        if (diaIndex !== null && plano.diasPlano && plano.diasPlano[diaIndex]) {
            const dia = plano.diasPlano[diaIndex];
            tempNoteData.chapterTitle = `Leitura Pág. ${dia.paginaInicioDia} - ${dia.paginaFimDia}`;
            tempNoteData.pageStart = dia.paginaInicioDia;
            tempNoteData.pageEnd = dia.paginaFimDia;
        } else {
            // Se contexto geral e sem histórico, inicia limpo ou genérico
            tempNoteData.chapterTitle = 'Novo Contexto Neuro';
            // Deixa pageStart/End nulos para o usuário preencher
        }
    }

    renderModalUI();
    setupModalButtons();

    document.getElementById('neuro-modal').classList.add('visivel');
}

function closeNoteModal() {
    document.getElementById('neuro-modal').classList.remove('visivel');
}

/**
 * Função responsável por injetar os botões no rodapé do modal.
 * ATUALIZAÇÃO: Reescreve o HTML do rodapé toda vez para garantir
 * que o layout esteja harmonioso e que o botão Reset não desapareça.
 */
function setupModalButtons() {
    // 1. Localiza o container do rodapé dentro do modal
    const modalFooter = document.querySelector('#neuro-modal .recalculo-modal-actions');
    
    if (!modalFooter) return; // Segurança caso o modal não tenha sido renderizado ainda

    // 2. FORÇA O NOVO LAYOUT: Sobrescreve o HTML interno com os botões alinhados lado a lado
    modalFooter.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: stretch;">
            <!-- Botão Salvar (Maior, ocupa 2/3) -->
            <button id="btn-save-neuro" class="button-confirm" style="background-color: #d35400; flex-grow: 2; border: none; box-shadow: 0 2px 4px rgba(211,84,0,0.3); display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; color: white; font-weight: bold; border-radius: 5px; cursor: pointer;">
                <span class="material-symbols-outlined">save</span> Salvar Conexão
            </button>

            <!-- Botão Reset (Menor, 1/3, mesma altura) -->
            <button id="btn-reset-neuro" style="background: #fff; border: 1px solid #e74c3c; color: #e74c3c; flex-grow: 1; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s; font-weight: 600;">
                <span class="material-symbols-outlined">delete_forever</span> Resetar
            </button>
        </div>

        <!-- Texto de aviso abaixo, centralizado -->
        <div style="text-align: center; margin-top: 8px;">
            <p style="font-size: 0.75em; color: #999; margin: 0; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 1.1em;">download</span> Backup automático ao resetar
            </p>
        </div>
    `;

    // 3. Adiciona os eventos de clique (Listeners) nos novos elementos criados
    const btnSave = document.getElementById('btn-save-neuro');
    const btnReset = document.getElementById('btn-reset-neuro');

    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            ui.toggleLoading(true);
            await saveNote();
            ui.toggleLoading(false);
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', handleResetNeuro);
    }
}

// --- Renderização da UI ---

// Helper para criar o botão de microfone
const createMicBtn = (targetId) => `
    <button type="button" id="mic-${targetId}" class="btn-neuro-mic" title="Ditar com IA">
        <span class="material-symbols-outlined">mic</span>
    </button>
`;

function renderModalUI() {
    const modalBody = document.getElementById('neuro-modal-body');
    const rangeGroupStyle = "display: flex; gap: 15px; margin-bottom: 20px;";
    const inputWrapperStyle = "flex: 1; display: flex; flex-direction: column;";
    const inputWithMicStyle = "display: flex; gap: 8px; align-items: flex-start; width: 100%;";
    
    // Fallback visual para valores nulos nos inputs
    const pStartVal = tempNoteData.pageStart !== null ? tempNoteData.pageStart : '';
    const pEndVal = tempNoteData.pageEnd !== null ? tempNoteData.pageEnd : '';
    
    modalBody.innerHTML = `
        <div class="neuro-input-group" style="margin-bottom: 10px;">
            <label>Contexto / Título do Capítulo</label>
            <div style="${inputWithMicStyle}">
                <input type="text" id="neuro-chapter" class="neuro-textarea-card" value="${tempNoteData.chapterTitle}" placeholder="Ex: A Natureza da Graça..." onchange="updateChapterTitle(this.value)" style="flex-grow: 1;">
                ${createMicBtn('neuro-chapter')}
            </div>
        </div>

        <div class="neuro-input-group" style="${rangeGroupStyle}">
            <div style="${inputWrapperStyle}">
                <label style="font-size: 0.85em; margin-bottom: 5px;">Pág. Inicial do Contexto</label>
                <input type="number" id="neuro-range-start" class="neuro-textarea-card" value="${pStartVal}" placeholder="0" onchange="updatePageRange('start', this.value)">
            </div>
            <div style="${inputWrapperStyle}">
                <label style="font-size: 0.85em; margin-bottom: 5px;">Pág. Final do Contexto</label>
                <input type="number" id="neuro-range-end" class="neuro-textarea-card" value="${pEndVal}" placeholder="0" onchange="updatePageRange('end', this.value)">
            </div>
        </div>
        
        <h3 class="neuro-section-title" style="margin-top:20px;">⚡ Insights Rápidos</h3>
        <div class="neuro-list-container">
            <div id="list-insights">${renderList('insights')}</div>
            <div class="neuro-add-form">
                <div class="neuro-add-row">
                    <input type="text" id="add-insight-page" placeholder="Pág." style="width: 80px;" class="neuro-textarea-card">
                    <div style="display:flex; gap:10px; align-items:center; background:#fff; padding:5px; border:1px solid #ccc; border-radius:5px;">
                        <input type="radio" id="type-exclamation" name="insight-type" value="exclamation" checked>
                        <label for="type-exclamation" style="cursor:pointer; color:#e67e22; font-weight:bold; margin-right:10px;">(!) Importante</label>
                        <input type="radio" id="type-question" name="insight-type" value="question">
                        <label for="type-question" style="cursor:pointer; color:#8e44ad; font-weight:bold;">(?) Dúvida</label>
                    </div>
                </div>
                <div style="${inputWithMicStyle}">
                    <textarea id="add-insight-text" placeholder="Trecho do livro ou insight..." class="neuro-textarea-card" rows="2" style="flex-grow: 1;"></textarea>
                    ${createMicBtn('add-insight-text')}
                </div>
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn-add-item" id="btn-add-insight">+ Adicionar Insight</button>
                </div>
            </div>
        </div>

        <h3 class="neuro-section-title">🧠 Método M.E.T.A.</h3>
        <div class="neuro-list-container">
            <div id="list-meta">${renderList('meta')}</div>
            <div class="neuro-add-form">
                <div class="neuro-add-row">
                    <input type="text" id="add-meta-page" placeholder="Pág." style="width: 80px;" class="neuro-textarea-card">
                    <select id="add-meta-type" class="neuro-textarea-card" style="flex-grow:1;">
                        <option value="map">M - Mapear (Conceitos)</option>
                        <option value="engage">E - Engajar (Dúvidas/Símbolos)</option>
                        <option value="translate">T - Traduzir (Explicação Simples)</option>
                        <option value="apply">A - Aplicar (Micro-ação)</option>
                    </select>
                </div>
                <div style="${inputWithMicStyle}">
                    <textarea id="add-meta-text" placeholder="Sua anotação..." class="neuro-textarea-card" rows="2" style="flex-grow: 1;"></textarea>
                    ${createMicBtn('add-meta-text')}
                </div>
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn-add-item" id="btn-add-meta">+ Adicionar Passo</button>
                </div>
            </div>
        </div>

        <h3 class="neuro-section-title">🔗 Gatilhos & Codificação Dupla</h3>
        <div class="neuro-list-container">
            <div id="list-triggers">${renderList('triggers')}</div>
            <div class="neuro-add-form">
                <div class="neuro-add-row">
                    <input type="text" id="add-trigger-page" placeholder="Pág." style="width: 80px;" class="neuro-textarea-card">
                    <select id="add-trigger-type" class="neuro-textarea-card" style="flex-grow:1;">
                        <option value="dual_coding">👁️ Codificação Dupla (Visual)</option>
                        <option value="prediction">⚡ Erro de Predição (Surpresa)</option>
                        <option value="connection">🔗 Conexão Relacional</option>
                        <option value="emotion">❤️ Emoção Teológica</option>
                    </select>
                </div>
                <div style="${inputWithMicStyle}">
                    <textarea id="add-trigger-text" placeholder="Descreva o gatilho, imagem mental ou diagrama..." class="neuro-textarea-card" rows="2" style="flex-grow: 1;"></textarea>
                    ${createMicBtn('add-trigger-text')}
                </div>
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn-add-item" id="btn-add-trigger">+ Adicionar Gatilho</button>
                </div>
            </div>
        </div>
    `;

    // Bind dos eventos de adicionar itens (manual)
    document.getElementById('btn-add-insight').onclick = () => addItem('insights');
    document.getElementById('btn-add-meta').onclick = () => addItem('meta');
    document.getElementById('btn-add-trigger').onclick = () => addItem('triggers');

    // Bind dos eventos de Ditado (Neuro-Voice)
    // Pequeno delay para garantir que o DOM foi injetado antes de buscar os elementos
    setTimeout(() => {
        const inputsToBind = ['neuro-chapter', 'add-insight-text', 'add-meta-text', 'add-trigger-text'];
        
        inputsToBind.forEach(id => {
            const inputEl = document.getElementById(id);
            const micBtn = document.getElementById(`mic-${id}`);
            if (inputEl && micBtn) {
                attachDictationToInput(inputEl, micBtn);
            }
        });
    }, 0);
}

window.updateChapterTitle = (val) => { tempNoteData.chapterTitle = val; };
window.updatePageRange = (field, val) => {
    tempNoteData[field === 'start' ? 'pageStart' : 'pageEnd'] = parseInt(val, 10);
};
window.removeNeuroItem = (category, index) => {
    tempNoteData[category].splice(index, 1);
    document.getElementById(`list-${category}`).innerHTML = renderList(category);
};

function addItem(category) {
    let page, type, text;
    if (category === 'insights') {
        page = document.getElementById('add-insight-page').value;
        const isQuestion = document.getElementById('type-question').checked;
        type = isQuestion ? 'question' : 'exclamation';
        text = document.getElementById('add-insight-text').value;
    } else if (category === 'meta') {
        page = document.getElementById('add-meta-page').value;
        type = document.getElementById('add-meta-type').value;
        text = document.getElementById('add-meta-text').value;
    } else if (category === 'triggers') {
        page = document.getElementById('add-trigger-page').value;
        type = document.getElementById('add-trigger-type').value;
        text = document.getElementById('add-trigger-text').value;
    }

    if (!text) {
        alert("Por favor, digite o conteúdo da anotação.");
        return;
    }

    tempNoteData[category].push({
        page: page || 'Geral',
        type: type,
        text: text,
        timestamp: Date.now()
    });

    document.getElementById(`list-${category}`).innerHTML = renderList(category);
    // Limpa o textarea após adicionar
    document.getElementById(`add-${category.slice(0, -1)}-text`).value = ''; 
    // Dispara evento de change para garantir limpeza de estados internos se necessário
    document.getElementById(`add-${category.slice(0, -1)}-text`).dispatchEvent(new Event('input'));
}

function renderList(category) {
    const list = tempNoteData[category];
    if (!list || list.length === 0) return '<p style="font-style:italic; color:#999; text-align:center;">Nenhuma anotação adicionada ainda.</p>';

    return list.map((item, index) => {
        const { label, icon, borderClass } = getDisplayProps(category, item.type);
        return `
        <div class="neuro-item-card ${borderClass}">
            <div class="neuro-item-content">
                <span class="neuro-item-meta">
                    ${icon} Pág: ${item.page} | ${label}
                </span>
                <div class="neuro-item-text">${item.text}</div>
            </div>
            <button class="btn-remove-item" onclick="removeNeuroItem('${category}', ${index})">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        `;
    }).join('');
}

function getDisplayProps(category, type) {
    const props = {
        'question': { label: 'Dúvida', icon: '❓', borderClass: 'border-question' },
        'exclamation': { label: 'Importante', icon: '❗', borderClass: 'border-exclamation' },
        'map': { label: 'Mapear', icon: '🗺️', borderClass: 'border-meta' },
        'engage': { label: 'Engajar', icon: '⚙️', borderClass: 'border-meta' },
        'translate': { label: 'Traduzir', icon: '🗣️', borderClass: 'border-meta' },
        'apply': { label: 'Aplicar', icon: '🚀', borderClass: 'border-meta' },
        'prediction': { label: 'Erro de Predição', icon: '⚡', borderClass: 'border-trigger' },
        'connection': { label: 'Conexão', icon: '🔗', borderClass: 'border-trigger' },
        'emotion': { label: 'Emoção', icon: '❤️', borderClass: 'border-trigger' },
        'dual_coding': { label: 'Codif. Dupla', icon: '👁️', borderClass: 'border-trigger' }
    };
    return props[type] || { label: type, icon: '📝', borderClass: '' };
}

// --- Lógica de Salvamento e Reset (Arquitetura Nova) ---

async function saveNote() {
    // Validação
    const pStart = parseInt(tempNoteData.pageStart, 10);
    const pEnd = parseInt(tempNoteData.pageEnd, 10);
    
    // Verifica se os valores são números válidos antes de comparar
    if (isNaN(pStart) || isNaN(pEnd)) {
        alert('Por favor, defina um intervalo de páginas válido para este contexto.');
        return;
    }

    if (pStart > pEnd) {
        alert('Erro: A Página Inicial não pode ser maior que a Página Final.');
        return;
    }

    const plano = state.getPlanoByIndex(currentPlanoIndex);
    
    // Objeto da nota atualizado
    const novaNota = {
        id: tempNoteData.id || crypto.randomUUID(), // Garante ID
        pageStart: pStart,
        pageEnd: pEnd,
        chapterTitle: tempNoteData.chapterTitle,
        insights: tempNoteData.insights,
        meta: tempNoteData.meta,
        triggers: tempNoteData.triggers,
        updatedAt: new Date().toISOString()
    };

    // Inicializa array global se não existir
    if (!plano.neuroAnnotations) plano.neuroAnnotations = [];

    // Lógica de Atualização vs Criação
    // Procura por ID existente ou sobreposição exata de intervalo (fallback)
    const indexExistente = plano.neuroAnnotations.findIndex(n => 
        (n.id && n.id === novaNota.id) ||
        (!n.id && n.pageStart === novaNota.pageStart && n.pageEnd === novaNota.pageEnd)
    );

    if (indexExistente >= 0) {
        plano.neuroAnnotations[indexExistente] = novaNota;
    } else {
        plano.neuroAnnotations.push(novaNota);
    }

    // ATUALIZADO: Só tenta limpar legado se tivermos um diaIndex válido
    if (currentDiaIndex !== null && plano.diasPlano && plano.diasPlano[currentDiaIndex]) {
        if (plano.diasPlano[currentDiaIndex].neuroNote) {
            plano.diasPlano[currentDiaIndex].neuroNote = null;
        }
    }

    state.updatePlano(currentPlanoIndex, plano);

    try {
        const currentUser = state.getCurrentUser();
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            
            const btnSave = document.getElementById('btn-save-neuro');
            btnSave.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Salvo!';
            btnSave.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                closeNoteModal();
                ui.renderApp(state.getPlanos(), currentUser);
                ui.highlightAndScrollToPlano(currentPlanoIndex);
            }, 1000);
        } else {
            alert('Erro: Usuário não logado.');
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert('Falha ao salvar. Verifique sua conexão.');
    }
}

// NOVO: Função de Reset
async function handleResetNeuro() {
    if (!confirm("ATENÇÃO: Isso irá apagar TODAS as anotações deste contexto para iniciar um novo ciclo. \n\nUm arquivo de backup (.md) será baixado automaticamente. Deseja continuar?")) {
        return;
    }

    ui.toggleLoading(true);

    try {
        const plano = state.getPlanoByIndex(currentPlanoIndex);
        
        // 1. Força Download
        downloadMarkdown(plano);

        // 2. Limpa dados globais
        // Filtra para remover a anotação atual da lista global
        if (plano.neuroAnnotations) {
            plano.neuroAnnotations = plano.neuroAnnotations.filter(n => n.id !== tempNoteData.id);
        }

        // 3. Limpa legado (dias individuais) se estiver no contexto de um dia
        if (currentDiaIndex !== null && plano.diasPlano && plano.diasPlano[currentDiaIndex]) {
            plano.diasPlano[currentDiaIndex].neuroNote = null;
        }

        // 4. Limpa estado local
        tempNoteData = {
            id: null,
            chapterTitle: '',
            pageStart: null,
            pageEnd: null,
            insights: [],
            meta: [],
            triggers: []
        };

        state.updatePlano(currentPlanoIndex, plano);
        const currentUser = state.getCurrentUser();
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        }

        alert("Ciclo resetado com sucesso! Backup baixado.");
        closeNoteModal();
        ui.renderApp(state.getPlanos(), currentUser);

    } catch (error) {
        console.error("Erro ao resetar:", error);
        alert("Erro ao tentar resetar. Nada foi apagado.");
    } finally {
        ui.toggleLoading(false);
    }
}

// --- Exportação Markdown ---

export function downloadMarkdown(plano) {
    if (!plano) return;

    let mdContent = `# 📘 Neuro-Anotações: ${plano.titulo}\n`;
    mdContent += `**Data de Exportação:** ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    mdContent += `> "Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente."\n\n---\n\n`;

    // Combina notas globais e notas legadas
    let allNotes = [...(plano.neuroAnnotations || [])];
    
    // Adiciona notas legadas se não estiverem no array global (para garantir backup completo)
    if (plano.diasPlano) {
        plano.diasPlano.forEach(dia => {
            if (dia.neuroNote && !allNotes.some(n => n.pageStart === dia.neuroNote.pageStart)) {
                allNotes.push(migrateLegacyData(dia.neuroNote));
            }
        });
    }

    if (allNotes.length === 0) {
        console.log("Nenhuma nota para exportar.");
        // Cria um arquivo mínimo para não falhar
        mdContent += "*Nenhuma anotação registrada neste ciclo.*";
    }

    // Ordena por página
    allNotes.sort((a, b) => (a.pageStart || 0) - (b.pageStart || 0));

    allNotes.forEach((note, idx) => {
        mdContent += `## 🔖 ${note.chapterTitle || `Sessão ${idx + 1}`}\n`;
        if (note.pageStart && note.pageEnd) {
            mdContent += `**Intervalo:** Pág. ${note.pageStart} - ${note.pageEnd}\n\n`;
        }

        if (note.insights && note.insights.length > 0) {
            mdContent += `### ⚡ Insights Rápidos\n`;
            note.insights.forEach(item => {
                const icon = item.type === 'question' ? '(?)' : '(!)';
                mdContent += `- **[Pág ${item.page}]** ${icon} ${item.text}\n`;
            });
            mdContent += `\n`;
        }

        if (note.meta && note.meta.length > 0) {
            mdContent += `### 🧠 Método M.E.T.A.\n`;
            note.meta.forEach(item => {
                const label = getDisplayProps('meta', item.type).label;
                mdContent += `- **${label} [Pág ${item.page}]:** ${item.text}\n`;
            });
            mdContent += `\n`;
        }

        if (note.triggers && note.triggers.length > 0) {
            mdContent += `### 🔗 Gatilhos & Codificação Dupla\n`;
            note.triggers.forEach(item => {
                const props = getDisplayProps('triggers', item.type);
                mdContent += `> **${props.icon} ${props.label} [Pág ${item.page}]:** ${item.text}\n\n`;
            });
        }
        mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NeuroNotes_${plano.titulo.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- Funções Auxiliares para exportação interna ---
export function extractNoteDataFromDOM() {
    return tempNoteData;
}
