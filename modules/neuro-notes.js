// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (M.E.T.A.),
// persistência local/remota dessas anotações (Arquitetura Dissociada) e exportação.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

// --- Variável de Estado Local (Temporária enquanto o modal está aberto) ---
let tempNoteData = {
    id: null, // Identificador único da nota (Arquitetura Nova)
    chapterTitle: '',
    pageStart: null,
    pageEnd: null,
    insights: [],
    meta: [],
    triggers: []
};

let currentPlanoIndex = null;
let currentDiaIndex = null;

// --- Inicialização e Event Delegation ---

document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    
    if (action === 'open-neuro') {
        const planoIndex = parseInt(target.dataset.planoIndex, 10);
        let diaIndex = target.dataset.diaIndex ? parseInt(target.dataset.diaIndex, 10) : -1;
        
        if (diaIndex === -1 || isNaN(diaIndex)) {
            const plano = state.getPlanoByIndex(planoIndex);
            diaIndex = plano.diasPlano.findIndex(d => !d.lido);
            if (diaIndex === -1) diaIndex = plano.diasPlano.length - 1;
        }
        
        openNoteModal(planoIndex, diaIndex);
    } 
    else if (action === 'download-md') {
        const planoIndex = parseInt(target.dataset.planoIndex, 10);
        const plano = state.getPlanoByIndex(planoIndex);
        downloadMarkdown(plano);
    }
});

// --- Migração de Dados Legados (Helper Interno) ---
function migrateLegacyData(oldData) {
    const newData = {
        id: oldData.id || null, // Preserva ID se existir
        chapterTitle: oldData.chapterTitle || '',
        pageStart: oldData.pageStart || null,
        pageEnd: oldData.pageEnd || null,
        insights: oldData.insights || [],
        meta: oldData.meta && Array.isArray(oldData.meta) ? oldData.meta : [],
        triggers: oldData.triggers && Array.isArray(oldData.triggers) ? oldData.triggers : []
    };

    // Migrações legadas de objeto para array (código existente mantido)
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

            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;">
                 <button id="btn-save-neuro" class="button-confirm" style="background-color: #d35400; width: 100%; border: none; box-shadow: 0 2px 4px rgba(211,84,0,0.3);">
                    <span class="material-symbols-outlined">save</span> Salvar Conexão Neural
                 </button>
                 
                 <!-- BOTÃO DE RESET (PRIORIDADE 2) -->
                 <button id="btn-reset-neuro" style="background: none; border: 1px solid #e74c3c; color: #e74c3c; padding: 8px; border-radius: 4px; font-size: 0.9em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <span class="material-symbols-outlined">delete_forever</span>
                    Resetar Ciclo (Backup Automático + Limpar)
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
    
    // --- LÓGICA DE CARREGAMENTO DISSOCIADA (PRIORIDADE 1) ---
    // Tenta encontrar uma nota no array global 'neuroAnnotations' que corresponda a estas páginas
    let rawData = {};
    
    if (plano.neuroAnnotations && plano.neuroAnnotations.length > 0) {
        // Busca nota que intercepte as páginas do dia
        const notaEncontrada = plano.neuroAnnotations.find(n => 
            (n.pageStart <= dia.paginaFimDia && n.pageEnd >= dia.paginaInicioDia)
        );
        
        if (notaEncontrada) {
            rawData = notaEncontrada.data;
            rawData.id = notaEncontrada.id; // Garante que temos o ID para atualizar depois
            rawData.pageStart = notaEncontrada.pageStart;
            rawData.pageEnd = notaEncontrada.pageEnd;
        } else {
            // Fallback para legado direto no dia
            rawData = dia.neuroNote || {};
        }
    } else {
        rawData = dia.neuroNote || {};
    }

    tempNoteData = migrateLegacyData(rawData);

    if (!tempNoteData.chapterTitle) {
        tempNoteData.chapterTitle = `Leitura do dia ${new Date(dia.data).toLocaleDateString('pt-BR')}`;
    }

    // Inicializa intervalo com o dia atual se estiver vazio
    if (!tempNoteData.pageStart) tempNoteData.pageStart = dia.paginaInicioDia;
    if (!tempNoteData.pageEnd) tempNoteData.pageEnd = dia.paginaFimDia;

    renderModalUI();

    // Configura botões
    const btnSave = document.getElementById('btn-save-neuro');
    const newBtnSave = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    newBtnSave.addEventListener('click', async () => {
        ui.toggleLoading(true);
        await saveNote();
        ui.toggleLoading(false);
    });

    // Listener do Botão Reset
    const btnReset = document.getElementById('btn-reset-neuro');
    const newBtnReset = btnReset.cloneNode(true);
    btnReset.parentNode.replaceChild(newBtnReset, btnReset);
    newBtnReset.addEventListener('click', handleResetNeuro);

    document.getElementById('neuro-modal').classList.add('visivel');
}

function closeNoteModal() {
    document.getElementById('neuro-modal').classList.remove('visivel');
}

// --- Renderização da UI ---

function renderModalUI() {
    const modalBody = document.getElementById('neuro-modal-body');
    const rangeGroupStyle = "display: flex; gap: 15px; margin-bottom: 20px;";
    const inputWrapperStyle = "flex: 1; display: flex; flex-direction: column;";
    
    modalBody.innerHTML = `
        <div class="neuro-input-group" style="margin-bottom: 10px;">
            <label>Contexto / Título do Capítulo</label>
            <input type="text" id="neuro-chapter" class="neuro-textarea-card" value="${tempNoteData.chapterTitle}" placeholder="Ex: A Natureza da Graça..." onchange="updateChapterTitle(this.value)">
        </div>

        <div class="neuro-input-group" style="${rangeGroupStyle}">
            <div style="${inputWrapperStyle}">
                <label style="font-size: 0.85em; margin-bottom: 5px;">Pág. Inicial</label>
                <input type="number" id="neuro-range-start" class="neuro-textarea-card" value="${tempNoteData.pageStart}" onchange="updatePageRange('start', this.value)">
            </div>
            <div style="${inputWrapperStyle}">
                <label style="font-size: 0.85em; margin-bottom: 5px;">Pág. Final</label>
                <input type="number" id="neuro-range-end" class="neuro-textarea-card" value="${tempNoteData.pageEnd}" onchange="updatePageRange('end', this.value)">
            </div>
        </div>
        
        <h3 class="neuro-section-title" style="margin-top:20px;">⚡ Insights Rápidos</h3>
        <div class="neuro-list-container">
            <div id="list-insights">${renderList('insights')}</div>
            <div class="neuro-add-form">
                <div class="neuro-add-row">
                    <input type="text" id="add-insight-page" placeholder="Pág." style="width: 80px;" class="neuro-textarea-card">
                    <div style="display:flex; gap:10px; align-items:center; background:#fff; padding:5px; border:1px solid #ccc; border-radius:5px;">
                        <input type="radio" id="type-exclamation" name="insight-type" value="exclamation" checked> <label for="type-exclamation" style="cursor:pointer; color:#e67e22; font-weight:bold; margin-right:10px;">(!)</label>
                        <input type="radio" id="type-question" name="insight-type" value="question"> <label for="type-question" style="cursor:pointer; color:#8e44ad; font-weight:bold;">(?)</label>
                    </div>
                </div>
                <textarea id="add-insight-text" placeholder="Trecho ou insight..." class="neuro-textarea-card" rows="2"></textarea>
                <div style="text-align:right; margin-top:5px;"><button class="btn-add-item" id="btn-add-insight">+ Insight</button></div>
            </div>
        </div>

        <h3 class="neuro-section-title">🧠 Método M.E.T.A.</h3>
        <div class="neuro-list-container">
            <div id="list-meta">${renderList('meta')}</div>
            <div class="neuro-add-form">
                <div class="neuro-add-row">
                    <input type="text" id="add-meta-page" placeholder="Pág." style="width: 80px;" class="neuro-textarea-card">
                    <select id="add-meta-type" class="neuro-textarea-card" style="flex-grow:1;">
                        <option value="map">M - Mapear</option>
                        <option value="engage">E - Engajar</option>
                        <option value="translate">T - Traduzir</option>
                        <option value="apply">A - Aplicar</option>
                    </select>
                </div>
                <textarea id="add-meta-text" placeholder="Sua anotação..." class="neuro-textarea-card" rows="2"></textarea>
                <div style="text-align:right; margin-top:5px;"><button class="btn-add-item" id="btn-add-meta">+ Passo</button></div>
            </div>
        </div>

        <h3 class="neuro-section-title">🔗 Gatilhos & Codif. Dupla</h3>
        <div class="neuro-list-container">
            <div id="list-triggers">${renderList('triggers')}</div>
            <div class="neuro-add-form">
                <div class="neuro-add-row">
                    <input type="text" id="add-trigger-page" placeholder="Pág." style="width: 80px;" class="neuro-textarea-card">
                    <select id="add-trigger-type" class="neuro-textarea-card" style="flex-grow:1;">
                        <option value="dual_coding">👁️ Codif. Dupla</option>
                        <option value="prediction">⚡ Erro Predição</option>
                        <option value="connection">🔗 Conexão</option>
                        <option value="emotion">❤️ Emoção</option>
                    </select>
                </div>
                <textarea id="add-trigger-text" placeholder="Descreva..." class="neuro-textarea-card" rows="2"></textarea>
                <div style="text-align:right; margin-top:5px;"><button class="btn-add-item" id="btn-add-trigger">+ Gatilho</button></div>
            </div>
        </div>
    `;

    document.getElementById('btn-add-insight').onclick = () => addItem('insights');
    document.getElementById('btn-add-meta').onclick = () => addItem('meta');
    document.getElementById('btn-add-trigger').onclick = () => addItem('triggers');
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
        alert("Digite o conteúdo.");
        return;
    }

    tempNoteData[category].push({
        page: page || 'Geral',
        type: type,
        text: text,
        timestamp: Date.now()
    });

    document.getElementById(`list-${category}`).innerHTML = renderList(category);
    document.getElementById(`add-${category.slice(0, -1)}-text`).value = ''; 
}

function renderList(category) {
    const list = tempNoteData[category];
    if (!list || list.length === 0) return '<p style="font-style:italic; color:#999; text-align:center;">Vazio.</p>';

    return list.map((item, index) => {
        const { label, icon, borderClass } = getDisplayProps(category, item.type);
        return `
        <div class="neuro-item-card ${borderClass}">
            <div class="neuro-item-content">
                <span class="neuro-item-meta">${icon} Pág: ${item.page} | ${label}</span>
                <div class="neuro-item-text">${item.text}</div>
            </div>
            <button class="btn-remove-item" onclick="removeNeuroItem('${category}', ${index})">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>`;
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
        'prediction': { label: 'Erro Predição', icon: '⚡', borderClass: 'border-trigger' },
        'connection': { label: 'Conexão', icon: '🔗', borderClass: 'border-trigger' },
        'emotion': { label: 'Emoção', icon: '❤️', borderClass: 'border-trigger' },
        'dual_coding': { label: 'Codif. Dupla', icon: '👁️', borderClass: 'border-trigger' }
    };
    return props[type] || { label: type, icon: '📝', borderClass: '' };
}

// --- Lógica de Salvamento e Reset ---

async function saveNote() {
    const pStart = parseInt(tempNoteData.pageStart, 10);
    const pEnd = parseInt(tempNoteData.pageEnd, 10);
    if (!isNaN(pStart) && !isNaN(pEnd) && pStart > pEnd) {
        alert('A página inicial não pode ser maior que a final.');
        return;
    }

    const plano = state.getPlanoByIndex(currentPlanoIndex);
    const currentUser = state.getCurrentUser();

    if (!currentUser) {
        alert('Erro: Usuário não logado.');
        return;
    }

    // --- NOVA ESTRUTURA DE SALVAMENTO (DISSOCIAÇÃO) ---
    // Prepara o objeto da anotação
    const novaNota = {
        id: tempNoteData.id || crypto.randomUUID(), // Gera ID se for nova
        pageStart: pStart,
        pageEnd: pEnd,
        data: JSON.parse(JSON.stringify(tempNoteData)), // Conteúdo
        updatedAt: new Date().toISOString()
    };

    if (!plano.neuroAnnotations) plano.neuroAnnotations = [];

    // Verifica se já existe nota com este ID ou sobreposição exata para substituir
    const indexExistente = plano.neuroAnnotations.findIndex(n => 
        (tempNoteData.id && n.id === tempNoteData.id) ||
        (n.pageStart === pStart && n.pageEnd === pEnd) // Fallback para identificar por páginas
    );

    if (indexExistente >= 0) {
        plano.neuroAnnotations[indexExistente] = novaNota;
    } else {
        plano.neuroAnnotations.push(novaNota);
    }

    // ATUALIZAÇÃO LEGADA (CACHE UI):
    // Mantém o 'dia.neuroNote' atualizado para que os ícones da UI continuem aparecendo
    // até que o arquivo ui.js seja atualizado para ler de 'neuroAnnotations'.
    if (plano.diasPlano[currentDiaIndex]) {
        plano.diasPlano[currentDiaIndex].neuroNote = novaNota.data;
    }

    state.updatePlano(currentPlanoIndex, plano);

    try {
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        
        const btnSave = document.getElementById('btn-save-neuro');
        btnSave.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Salvo!';
        btnSave.style.backgroundColor = '#27ae60';
        
        setTimeout(() => {
            closeNoteModal();
            ui.renderApp(state.getPlanos(), currentUser);
            ui.highlightAndScrollToPlano(currentPlanoIndex);
        }, 1000);
    } catch (error) {
        console.error("Erro ao salvar neuro-note:", error);
        alert('Falha ao salvar. Verifique sua conexão.');
    }
}

async function handleResetNeuro() {
    if (!confirm("⚠️ ATENÇÃO: Você está prestes a apagar TODAS as anotações deste plano para iniciar um novo ciclo de leitura.\n\nUm arquivo de backup será baixado automaticamente. Continuar?")) {
        return;
    }

    ui.toggleLoading(true);
    try {
        const plano = state.getPlanoByIndex(currentPlanoIndex);
        const currentUser = state.getCurrentUser();

        // 1. Baixar Backup (Obrigatório)
        downloadMarkdown(plano);

        // 2. Limpar a nova estrutura de dados (Global)
        plano.neuroAnnotations = [];
        
        // 3. Limpar estrutura legada (Dias)
        plano.diasPlano.forEach(d => {
            d.neuroNote = null;
        });

        // Atualizar estado e banco
        state.updatePlano(currentPlanoIndex, plano);
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        }

        alert("Ciclo resetado com sucesso! Suas anotações antigas estão no arquivo baixado.");
        closeNoteModal();
        ui.renderApp(state.getPlanos(), currentUser);

    } catch (error) {
        console.error("Erro no reset:", error);
        alert("Ocorreu um erro ao resetar o ciclo. Nenhum dado foi apagado.");
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

    // Combina anotações novas (neuroAnnotations) e antigas (diasPlano fallback)
    let allNotes = [];
    
    if (plano.neuroAnnotations && plano.neuroAnnotations.length > 0) {
        // Usa a estrutura nova
        allNotes = plano.neuroAnnotations.map(n => ({
            ...n.data,
            pageStart: n.pageStart,
            pageEnd: n.pageEnd
        }));
    } else {
        // Fallback legado
        plano.diasPlano.forEach(dia => {
            if (dia.neuroNote) {
                allNotes.push({ ...dia.neuroNote, pageStart: dia.paginaInicioDia, pageEnd: dia.paginaFimDia });
            }
        });
    }

    // Ordena por página inicial
    allNotes.sort((a, b) => (a.pageStart || 0) - (b.pageStart || 0));

    if (allNotes.length === 0) {
        // Se chamado via botão de reset mas não tiver notas, apenas avisa ou gera vazio
        console.warn("Sem notas para exportar.");
    }

    allNotes.forEach((note, idx) => {
        // Garante formato correto com migração
        const cleanNote = migrateLegacyData(note);
        
        mdContent += `## 🔖 ${cleanNote.chapterTitle || `Sessão ${idx + 1}`}\n`;
        
        if (cleanNote.pageStart && cleanNote.pageEnd) {
            mdContent += `**Intervalo de Contexto:** Pág. ${cleanNote.pageStart} - ${cleanNote.pageEnd}\n\n`;
        }

        // 1. Insights Rápidos
        if (cleanNote.insights && cleanNote.insights.length > 0) {
            mdContent += `### ⚡ Insights Rápidos\n`;
            cleanNote.insights.forEach(item => {
                const icon = item.type === 'question' ? '(?)' : '(!)';
                mdContent += `- **[Pág ${item.page}]** ${icon} ${item.text}\n`;
            });
            mdContent += `\n`;
        }

        // 2. M.E.T.A.
        if (cleanNote.meta && cleanNote.meta.length > 0) {
            mdContent += `### 🧠 Método M.E.T.A.\n`;
            cleanNote.meta.forEach(item => {
                const label = getDisplayProps('meta', item.type).label;
                mdContent += `- **${label} [Pág ${item.page}]:** ${item.text}\n`;
            });
            mdContent += `\n`;
        }

        // 3. Gatilhos
        if (cleanNote.triggers && cleanNote.triggers.length > 0) {
            mdContent += `### 🔗 Gatilhos & Codificação Dupla\n`;
            cleanNote.triggers.forEach(item => {
                const props = getDisplayProps('triggers', item.type);
                mdContent += `> **${props.icon} ${props.label} [Pág ${item.page}]:** ${item.text}\n\n`;
            });
        }
        
        mdContent += `---\n\n`;
    });

    // Trigger Download
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NeuroNotes_${plano.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Helper para expor extração de dados (usado pelo main.js se necessário, embora saveNote faça o trabalho)
export function extractNoteDataFromDOM() {
    return tempNoteData;
}