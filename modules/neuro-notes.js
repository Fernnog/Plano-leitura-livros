// --- START OF FILE modules/neuro-notes.js ---

// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (M.E.T.A.),
// persistência local/remota dessas anotações e exportação para Markdown.
// ATUALIZADO: Suporte a múltiplos insights, granularidade por página, Codificação Dupla e Intervalo de Contexto.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

// --- Variável de Estado Local (Temporária enquanto o modal está aberto) ---
let tempNoteData = {
    chapterTitle: '',
    pageStart: null, // NOVO: Início do intervalo de contexto
    pageEnd: null,   // NOVO: Fim do intervalo de contexto
    insights: [], // Array para { page, type: 'question'|'exclamation', text }
    meta: [],     // Array para { page, type: 'map'|'engage'|'translate'|'apply', text }
    triggers: []  // Array para { page, type: 'prediction'|'dual_coding'|etc, text }
};

let currentPlanoIndex = null;
let currentDiaIndex = null;

// --- Inicialização e Event Delegation ---

// Auto-inicializa o listener para não depender de alterações no main.js
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    
    if (action === 'open-neuro') {
        const planoIndex = parseInt(target.dataset.planoIndex, 10);
        // Se o dia não for passado (ex: botão geral), tenta pegar o próximo não lido
        let diaIndex = target.dataset.diaIndex ? parseInt(target.dataset.diaIndex, 10) : -1;
        
        if (diaIndex === -1 || isNaN(diaIndex)) {
            // Fallback: tentar descobrir o próximo dia não lido
            const plano = state.getPlanoByIndex(planoIndex);
            diaIndex = plano.diasPlano.findIndex(d => !d.lido);
            if (diaIndex === -1) diaIndex = plano.diasPlano.length - 1; // Se tudo lido, pega o último
        }
        
        openNoteModal(planoIndex, diaIndex);
    } 
    else if (action === 'download-md') {
        const planoIndex = parseInt(target.dataset.planoIndex, 10);
        const plano = state.getPlanoByIndex(planoIndex);
        downloadMarkdown(plano);
    }
});

// --- Migração de Dados Legados ---
function migrateLegacyData(oldData) {
    const newData = {
        chapterTitle: oldData.chapterTitle || '',
        pageStart: oldData.pageStart || null, // Garante existência do campo
        pageEnd: oldData.pageEnd || null,     // Garante existência do campo
        insights: oldData.insights || [],
        meta: oldData.meta && Array.isArray(oldData.meta) ? oldData.meta : [],
        triggers: oldData.triggers && Array.isArray(oldData.triggers) ? oldData.triggers : []
    };

    // Migrar M.E.T.A antigo (objeto) para array se necessário
    if (oldData.meta && !Array.isArray(oldData.meta)) {
        if (oldData.meta.map) newData.meta.push({ page: 'Geral', type: 'map', text: oldData.meta.map });
        if (oldData.meta.engage) newData.meta.push({ page: 'Geral', type: 'engage', text: oldData.meta.engage });
        if (oldData.meta.translate) newData.meta.push({ page: 'Geral', type: 'translate', text: oldData.meta.translate });
        if (oldData.meta.apply) newData.meta.push({ page: 'Geral', type: 'apply', text: oldData.meta.apply });
    }

    // Migrar Gatilhos antigos (objeto) para array se necessário
    if (oldData.triggers && !Array.isArray(oldData.triggers)) {
        if (oldData.triggers.prediction) newData.triggers.push({ page: 'Geral', type: 'prediction', text: oldData.triggers.prediction });
        if (oldData.triggers.connection) newData.triggers.push({ page: 'Geral', type: 'connection', text: oldData.triggers.connection });
        if (oldData.triggers.emotion) newData.triggers.push({ page: 'Geral', type: 'emotion', text: oldData.triggers.emotion });
        // Visual antigo vira Codificação Dupla
        if (oldData.triggers.visual) newData.triggers.push({ page: 'Geral', type: 'dual_coding', text: oldData.triggers.visual });
    }

    return newData;
}

// --- Gerenciamento do Modal (Injeção Dinâmica) ---

function ensureModalExists() {
    if (document.getElementById('neuro-modal')) return;

    // Estrutura base do modal
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

            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0; flex-shrink: 0;">
                 <button id="btn-save-neuro" class="button-confirm" style="background-color: #d35400; width: 100%; border: none; box-shadow: 0 2px 4px rgba(211,84,0,0.3);">
                    <span class="material-symbols-outlined">save</span> Salvar Conexão Neural
                 </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-neuro-modal').addEventListener('click', closeNoteModal);
}

export function openNoteModal(planoIndex, diaIndex) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    currentDiaIndex = diaIndex;

    const plano = state.getPlanoByIndex(planoIndex);
    const dia = plano.diasPlano[diaIndex];
    
    // Recupera dados existentes e aplica migração se necessário
    const rawData = dia.neuroNote || {};
    tempNoteData = migrateLegacyData(rawData);

    // Se título do capítulo estiver vazio, sugere um padrão
    if (!tempNoteData.chapterTitle) {
        tempNoteData.chapterTitle = `Leitura do dia ${new Date(dia.data).toLocaleDateString('pt-BR')}`;
    }

    // NOVO: Inicializa o intervalo de páginas com o dia atual se estiver vazio
    if (!tempNoteData.pageStart) tempNoteData.pageStart = dia.paginaInicioDia;
    if (!tempNoteData.pageEnd) tempNoteData.pageEnd = dia.paginaFimDia;

    renderModalUI();

    // Configura o botão de salvar
    const btnSave = document.getElementById('btn-save-neuro');
    const newBtnSave = btnSave.cloneNode(true); // Remove listeners antigos
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    
    newBtnSave.addEventListener('click', async () => {
        ui.toggleLoading(true);
        await saveNote();
        ui.toggleLoading(false);
    });

    document.getElementById('neuro-modal').classList.add('visivel');
}

function closeNoteModal() {
    document.getElementById('neuro-modal').classList.remove('visivel');
}

// --- Renderização da UI e Manipulação de Listas ---

function renderModalUI() {
    const modalBody = document.getElementById('neuro-modal-body');
    
    // Estilos inline temporários para o novo grupo de range (Idealmente mover para style.css)
    const rangeGroupStyle = "display: flex; gap: 15px; margin-bottom: 20px;";
    const inputWrapperStyle = "flex: 1; display: flex; flex-direction: column;";
    
    modalBody.innerHTML = `
        <!-- Cabeçalho: Contexto -->
        <div class="neuro-input-group" style="margin-bottom: 10px;">
            <label>Contexto / Título do Capítulo</label>
            <input type="text" id="neuro-chapter" class="neuro-textarea-card" value="${tempNoteData.chapterTitle}" placeholder="Ex: A Natureza da Graça..." onchange="updateChapterTitle(this.value)">
        </div>

        <!-- NOVO: Intervalo de Páginas do Contexto -->
        <div class="neuro-input-group" style="${rangeGroupStyle}">
            <div style="${inputWrapperStyle}">
                <label style="font-size: 0.85em; margin-bottom: 5px;">Pág. Inicial do Contexto</label>
                <input type="number" id="neuro-range-start" class="neuro-textarea-card" value="${tempNoteData.pageStart}" onchange="updatePageRange('start', this.value)">
            </div>
            <div style="${inputWrapperStyle}">
                <label style="font-size: 0.85em; margin-bottom: 5px;">Pág. Final do Contexto</label>
                <input type="number" id="neuro-range-end" class="neuro-textarea-card" value="${tempNoteData.pageEnd}" onchange="updatePageRange('end', this.value)">
            </div>
        </div>
        
        <!-- SEÇÃO 1: INSIGHTS RÁPIDOS (? e !) -->
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
                <textarea id="add-insight-text" placeholder="Trecho do livro ou insight..." class="neuro-textarea-card" rows="2"></textarea>
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn-add-item" id="btn-add-insight">+ Adicionar Insight</button>
                </div>
            </div>
        </div>

        <!-- SEÇÃO 2: MÉTODO M.E.T.A. -->
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
                <textarea id="add-meta-text" placeholder="Sua anotação..." class="neuro-textarea-card" rows="2"></textarea>
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn-add-item" id="btn-add-meta">+ Adicionar Passo</button>
                </div>
            </div>
        </div>

        <!-- SEÇÃO 3: GATILHOS & CODIFICAÇÃO DUPLA -->
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
                <textarea id="add-trigger-text" placeholder="Descreva o gatilho, imagem mental ou diagrama..." class="neuro-textarea-card" rows="2"></textarea>
                <div style="text-align:right; margin-top:5px;">
                    <button class="btn-add-item" id="btn-add-trigger">+ Adicionar Gatilho</button>
                </div>
            </div>
        </div>
    `;

    // Re-attach listeners aos botões de adicionar
    document.getElementById('btn-add-insight').onclick = () => addItem('insights');
    document.getElementById('btn-add-meta').onclick = () => addItem('meta');
    document.getElementById('btn-add-trigger').onclick = () => addItem('triggers');
}

// Helpers globais para inputs
window.updateChapterTitle = (val) => { tempNoteData.chapterTitle = val; };
window.updatePageRange = (field, val) => {
    tempNoteData[field === 'start' ? 'pageStart' : 'pageEnd'] = parseInt(val, 10);
};

// Funções de Lista
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

    // Adiciona ao array temporário
    tempNoteData[category].push({
        page: page || 'Geral', // Se página vazia, marca como Geral
        type: type,
        text: text,
        timestamp: Date.now()
    });

    // Re-renderiza APENAS a lista afetada para não resetar outros inputs
    document.getElementById(`list-${category}`).innerHTML = renderList(category);

    // Limpa campos
    document.getElementById(`add-${category.slice(0, -1)}-text`).value = ''; 
}

// Expõe a função de remover globalmente (necessário para o onclick no HTML string)
window.removeNeuroItem = (category, index) => {
    tempNoteData[category].splice(index, 1);
    document.getElementById(`list-${category}`).innerHTML = renderList(category);
};

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
    // Definições visuais para cada tipo
    const props = {
        // Insights
        'question': { label: 'Dúvida', icon: '❓', borderClass: 'border-question' },
        'exclamation': { label: 'Importante', icon: '❗', borderClass: 'border-exclamation' },
        
        // META
        'map': { label: 'Mapear', icon: '🗺️', borderClass: 'border-meta' },
        'engage': { label: 'Engajar', icon: '⚙️', borderClass: 'border-meta' },
        'translate': { label: 'Traduzir', icon: '🗣️', borderClass: 'border-meta' },
        'apply': { label: 'Aplicar', icon: '🚀', borderClass: 'border-meta' },

        // Triggers
        'prediction': { label: 'Erro de Predição', icon: '⚡', borderClass: 'border-trigger' },
        'connection': { label: 'Conexão', icon: '🔗', borderClass: 'border-trigger' },
        'emotion': { label: 'Emoção', icon: '❤️', borderClass: 'border-trigger' },
        'dual_coding': { label: 'Codif. Dupla', icon: '👁️', borderClass: 'border-trigger' }
    };

    return props[type] || { label: type, icon: '📝', borderClass: '' };
}

// --- Lógica de Salvamento ---

async function saveNote() {
    // 0. Validação de Intervalo (Prioridade 3)
    const pStart = parseInt(tempNoteData.pageStart, 10);
    const pEnd = parseInt(tempNoteData.pageEnd, 10);

    if (!isNaN(pStart) && !isNaN(pEnd) && pStart > pEnd) {
        alert('Erro de Consistência: A Página Inicial do contexto não pode ser maior que a Página Final.');
        return; // Interrompe o salvamento
    }

    // Atualiza timestamp
    tempNoteData.lastEdited = new Date().toISOString();

    // 1. Atualiza State
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    plano.diasPlano[currentDiaIndex].neuroNote = JSON.parse(JSON.stringify(tempNoteData)); // Deep copy
    state.updatePlano(currentPlanoIndex, plano);

    // 2. Persistência no Firestore
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
            alert('Erro: Usuário não logado. Não foi possível salvar.');
        }
    } catch (error) {
        console.error("Erro ao salvar neuro-note:", error);
        alert('Falha ao salvar. Verifique sua conexão.');
    }
}

// --- Exportação Markdown ---

export function downloadMarkdown(plano) {
    if (!plano) return;

    let mdContent = `# 📘 Neuro-Anotações: ${plano.titulo}\n`;
    mdContent += `**Data de Exportação:** ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    mdContent += `> "Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente."\n\n---\n\n`;

    let hasNotes = false;

    plano.diasPlano.forEach((dia, idx) => {
        if (dia.neuroNote) {
            hasNotes = true;
            // Migra na hora da exportação se necessário para garantir formato
            const note = migrateLegacyData(dia.neuroNote);
            const dataLegivel = new Date(dia.data).toLocaleDateString('pt-BR');
            
            mdContent += `## 🔖 ${note.chapterTitle || `Sessão ${idx + 1}`}\n`;
            
            // Adiciona intervalo de contexto se existir
            if (note.pageStart && note.pageEnd) {
                mdContent += `**Intervalo de Contexto:** Pág. ${note.pageStart} - ${note.pageEnd}\n`;
            }
            
            mdContent += `**Data Leitura:** ${dataLegivel} | **Páginas Meta:** ${dia.paginaInicioDia}-${dia.paginaFimDia}\n\n`;

            // 1. Insights Rápidos
            if (note.insights && note.insights.length > 0) {
                mdContent += `### ⚡ Insights Rápidos\n`;
                note.insights.forEach(item => {
                    const icon = item.type === 'question' ? '(?)' : '(!)';
                    mdContent += `- **[Pág ${item.page}]** ${icon} ${item.text}\n`;
                });
                mdContent += `\n`;
            }

            // 2. M.E.T.A.
            if (note.meta && note.meta.length > 0) {
                mdContent += `### 🧠 Método M.E.T.A.\n`;
                note.meta.forEach(item => {
                    const label = getDisplayProps('meta', item.type).label;
                    mdContent += `- **${label} [Pág ${item.page}]:** ${item.text}\n`;
                });
                mdContent += `\n`;
            }

            // 3. Gatilhos & Codificação Dupla
            if (note.triggers && note.triggers.length > 0) {
                mdContent += `### 🔗 Gatilhos & Codificação Dupla\n`;
                note.triggers.forEach(item => {
                    const props = getDisplayProps('triggers', item.type);
                    mdContent += `> **${props.icon} ${props.label} [Pág ${item.page}]:** ${item.text}\n\n`;
                });
            }
            
            mdContent += `---\n\n`;
        }
    });

    if (!hasNotes) {
        alert("Este plano ainda não possui Neuro-Anotações para exportar.");
        return;
    }

    // Trigger Download
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NeuroNotes_${plano.titulo.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
// --- END OF FILE modules/neuro-notes.js ---