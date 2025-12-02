// --- START OF FILE modules/neuro-notes.js ---

// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (M.E.T.A.),
// persistência local/remota dessas anotações, insights granulares e exportação para Markdown.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

// --- Estado Local do Módulo ---
// Armazena temporariamente os insights enquanto o modal está aberto, antes de salvar.
let tempInsights = [];

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

// --- Estrutura de Dados ---

const createEmptyNote = () => ({
    chapterTitle: '',
    pageRange: { start: '', end: '' }, // Novo: Intervalo de Páginas
    dualCoding: '',                    // Novo: Codificação Dupla (Visual)
    insights: [],                      // Novo: Lista de Insights Granulares
    meta: {
        map: '',       
        engage: '',    
        translate: '', 
        apply: ''      
    },
    // Mantido triggers antigos para compatibilidade, mas o foco agora é a lista 'insights'
    triggers: { prediction: '', connection: '', emotion: '', visual: '' }, 
    lastEdited: null
});

// --- Gerenciamento do Modal (Injeção Dinâmica) ---

function ensureModalExists() {
    if (document.getElementById('neuro-modal')) return;

    const modalHTML = `
    <div id="neuro-modal" class="reavaliacao-modal-overlay">
        <div class="reavaliacao-modal-content neuro-theme" style="max-width: 800px; padding: 0;">
            <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #1a252f 0%, #2c3e50 100%); padding: 15px 20px; border-radius: 8px 8px 0 0; color: white;">
                <h2 style="color: white; font-family: 'Playfair Display', serif; margin:0; display:flex; align-items:center; gap:10px;">
                    <span class="material-symbols-outlined">psychology_alt</span> Neuro-Insights
                </h2>
                <button id="close-neuro-modal" class="reavaliacao-modal-close" style="color: white; opacity: 0.8;">×</button>
            </div>
            
            <div id="neuro-modal-body" class="neuro-modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <!-- Conteúdo injetado via JS -->
            </div>

            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0;">
                 <button id="btn-save-neuro" class="button-confirm" style="background-color: #d35400; width: 100%; border: none; box-shadow: 0 2px 4px rgba(211,84,0,0.3);">
                    <span class="material-symbols-outlined">save</span> Salvar Conexão Neural
                 </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Listener para fechar
    document.getElementById('close-neuro-modal').addEventListener('click', closeNoteModal);
}

export function openNoteModal(planoIndex, diaIndex) {
    ensureModalExists();
    const plano = state.getPlanoByIndex(planoIndex);
    const dia = plano.diasPlano[diaIndex];
    
    // Recupera dados existentes ou cria novos
    const noteData = dia.neuroNote || createEmptyNote();
    const tituloCapitulo = noteData.chapterTitle || `Leitura do dia ${new Date(dia.data).toLocaleDateString('pt-BR')}`;
    
    // Carrega insights salvos para a memória temporária do módulo
    tempInsights = noteData.insights ? [...noteData.insights] : [];

    const modalBody = document.getElementById('neuro-modal-body');
    
    // REDESIGN: Novo Layout com Subformulários e Codificação Dupla
    modalBody.innerHTML = `
        <!-- SEÇÃO 1: CONTEXTO E INTERVALO -->
        <div class="neuro-input-group" style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 2; min-width: 200px;">
                <label>Contexto / Título do Capítulo</label>
                <input type="text" id="neuro-chapter" class="neuro-textarea-card" value="${tituloCapitulo}" placeholder="Ex: A Natureza da Graça...">
            </div>
            <div style="flex: 1; min-width: 100px;">
                <label>Pág. Início</label>
                <input type="number" id="range-start" class="neuro-textarea-card" value="${noteData.pageRange?.start || ''}" placeholder="${dia.paginaInicioDia}">
            </div>
            <div style="flex: 1; min-width: 100px;">
                <label>Pág. Fim</label>
                <input type="number" id="range-end" class="neuro-textarea-card" value="${noteData.pageRange?.end || ''}" placeholder="${dia.paginaFimDia}">
            </div>
        </div>

        <!-- SEÇÃO 2: CODIFICAÇÃO DUPLA -->
        <h3 class="neuro-section-title" style="font-family:'Playfair Display',serif; color:#1a252f; border-bottom:2px solid #d35400; display:inline-block; margin-bottom:15px; margin-top:10px;">
            🧠 Codificação Dupla (Visual)
        </h3>
        <div class="dual-coding-container" style="background-color: #f0f4f8; border-left: 4px solid #3498db; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
            <label style="color: #2c3e50; font-weight: bold;">Descrição da Imagem Mental / Diagrama</label>
            <span class="neuro-hint" style="margin-bottom: 8px;">O cérebro processa imagens 60.000x mais rápido. Descreva o gráfico ou cena que resume este trecho.</span>
            <textarea id="dual-coding-text" class="neuro-textarea-card" rows="2" placeholder="Ex: Um castelo sendo construído sobre a rocha...">${noteData.dualCoding || ''}</textarea>
        </div>

        <!-- SEÇÃO 3: INSIGHTS GRANULARES -->
        <h3 class="neuro-section-title" style="font-family:'Playfair Display',serif; color:#1a252f; border-bottom:2px solid #d35400; display:inline-block; margin-bottom:15px;">
            ⚡ Insights Granulares
        </h3>
        
        <!-- Lista Dinâmica de Insights -->
        <div id="insights-list-display" class="insights-list" style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
            <!-- Itens serão renderizados aqui via JS -->
        </div>

        <!-- Subformulário de Adição -->
        <div class="insight-form-container" style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap: wrap;">
                <input type="number" id="insight-page" class="neuro-textarea-card" style="width: 80px;" placeholder="Pág.">
                <input type="text" id="insight-excerpt" class="neuro-textarea-card" style="flex:1; min-width: 200px;" placeholder="Trecho do livro ou resumo do insight...">
            </div>
            
            <div class="insight-type-selector" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <label class="type-option" style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="insight-type" value="exclamation" checked>
                    <span style="color: #e67e22; font-weight: bold;">(!) Ponto de Exclamação</span> <span style="font-size: 0.8em; color: #777;">(Surpresa/Conceito Chave)</span>
                </label>
                <label class="type-option" style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="insight-type" value="question">
                    <span style="color: #8e44ad; font-weight: bold;">(?) Ponto de Interrogação</span> <span style="font-size: 0.8em; color: #777;">(Dúvida/Crítica)</span>
                </label>
                <button id="btn-add-insight" type="button" class="button-confirm" style="margin-left:auto; padding: 6px 15px; font-size:0.9em; background-color: #27ae60; border: none; color: white; border-radius: 4px; cursor: pointer;">
                    + Adicionar
                </button>
            </div>
        </div>

        <!-- SEÇÃO 4: MÉTODO M.E.T.A. (Colapsável) -->
        <details style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            <summary style="cursor:pointer; margin-bottom: 15px; font-family: 'Playfair Display', serif; color: #7f8c8d; font-weight: bold;">
                Ver Método M.E.T.A. Completo (Expandir)
            </summary>
            
            <div class="meta-grid">
                <div class="neuro-input-group">
                    <label><strong>M</strong>apear</label>
                    <textarea id="meta-map" class="neuro-textarea-card" rows="2">${noteData.meta?.map || ''}</textarea>
                </div>
                <div class="neuro-input-group">
                    <label><strong>E</strong>ngajar</label>
                    <textarea id="meta-engage" class="neuro-textarea-card" rows="2">${noteData.meta?.engage || ''}</textarea>
                </div>
                <div class="neuro-input-group">
                    <label><strong>T</strong>raduzir</label>
                    <textarea id="meta-translate" class="neuro-textarea-card" rows="2">${noteData.meta?.translate || ''}</textarea>
                </div>
                <div class="neuro-input-group">
                    <label style="color:#d35400;"><strong>A</strong>plicar</label>
                    <textarea id="meta-apply" class="neuro-textarea-card" rows="2" style="border-left: 3px solid #d35400;">${noteData.meta?.apply || ''}</textarea>
                </div>
            </div>
            
            <!-- Campos Legados (Gatilhos) Escondidos visualmente mas preservados no DOM se necessário, 
                 mas aqui optamos por simplificar e focar nos novos insights -->
            <input type="hidden" id="trigger-prediction" value="${noteData.triggers?.prediction || ''}">
            <input type="hidden" id="trigger-connection" value="${noteData.triggers?.connection || ''}">
            <input type="hidden" id="trigger-emotion" value="${noteData.triggers?.emotion || ''}">

        </details>
    `;

    // Renderiza a lista inicial de insights
    renderInsightsList();

    // Configura Listeners Internos
    document.getElementById('btn-add-insight').addEventListener('click', handleAddInsight);

    // Configura o botão de salvar
    const btnSave = document.getElementById('btn-save-neuro');
    const newBtnSave = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    
    newBtnSave.addEventListener('click', async () => {
        ui.toggleLoading(true);
        await saveNote(planoIndex, diaIndex);
        ui.toggleLoading(false);
    });

    document.getElementById('neuro-modal').classList.add('visivel');
}

function closeNoteModal() {
    document.getElementById('neuro-modal').classList.remove('visivel');
    tempInsights = []; // Limpa memória
}

// --- Funções de Manipulação da Lista de Insights ---

function renderInsightsList() {
    const container = document.getElementById('insights-list-display');
    container.innerHTML = ''; // Limpa
    
    if (tempInsights.length === 0) {
        container.innerHTML = '<p style="font-style: italic; color: #999; text-align: center; font-size: 0.9em;">Nenhum insight adicionado ainda.</p>';
        return;
    }

    tempInsights.forEach((item, index) => {
        // Define ícones e cores baseados no tipo
        const isQuestion = item.type === 'question';
        const icon = isQuestion ? 'question_mark' : 'priority_high';
        const color = isQuestion ? '#8e44ad' : '#e67e22'; // Roxo ou Laranja
        const bgColor = isQuestion ? '#f4ecf7' : '#fdf6ec';

        const card = document.createElement('div');
        card.className = 'insight-card';
        // Estilos inline para garantir funcionamento imediato (embora CSS seja ideal)
        card.style.cssText = `display: flex; justify-content: space-between; align-items: flex-start; background: ${bgColor}; border: 1px solid ${color}40; padding: 10px; border-radius: 6px;`;

        card.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start; flex: 1;">
                <div class="insight-icon" style="color: ${color}; font-weight: bold; padding-top: 2px;">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="insight-content" style="flex: 1;">
                    <span class="insight-page" style="font-size: 0.75em; color: #7f8c8d; font-weight: bold; display: block; text-transform: uppercase; margin-bottom: 4px;">
                        Página ${item.page}
                    </span>
                    <div style="font-size: 0.95em; line-height: 1.4; color: #333;">${item.excerpt}</div>
                </div>
            </div>
            <button class="btn-remove-insight" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 4px;">
                <span class="material-symbols-outlined" style="font-size: 1.1em;">delete</span>
            </button>
        `;

        // Event Listener para remover este item específico
        const deleteBtn = card.querySelector('.btn-remove-insight');
        deleteBtn.addEventListener('click', () => {
            removeInsight(index);
        });

        container.appendChild(card);
    });
}

function handleAddInsight() {
    const pageInput = document.getElementById('insight-page');
    const excerptInput = document.getElementById('insight-excerpt');
    const typeInput = document.querySelector('input[name="insight-type"]:checked');

    const page = pageInput.value.trim();
    const excerpt = excerptInput.value.trim();
    const type = typeInput.value;

    if (!page) {
        alert("Por favor, informe o número da página.");
        pageInput.focus();
        return;
    }
    if (!excerpt) {
        alert("Por favor, digite o trecho ou o insight.");
        excerptInput.focus();
        return;
    }

    // Adiciona ao array temporário
    tempInsights.push({ 
        page, 
        excerpt, 
        type,
        timestamp: new Date().toISOString()
    });

    // Ordena por número de página para manter organizado
    tempInsights.sort((a, b) => parseInt(a.page) - parseInt(b.page));

    renderInsightsList();

    // Limpa campos (mantém foco no trecho para digitação rápida, mas limpa texto)
    excerptInput.value = '';
    // pageInput.value = ''; // Opcional: muitos preferem manter a pág se forem adicionar vários na mesma
    excerptInput.focus();
}

function removeInsight(index) {
    tempInsights.splice(index, 1);
    renderInsightsList();
}

// --- Funções Auxiliares de Extração de Dados ---

// Exportada para uso externo se necessário, ou usada internamente por saveNote
export function extractNoteDataFromDOM() {
    return {
        chapterTitle: document.getElementById('neuro-chapter').value,
        pageRange: {
            start: document.getElementById('range-start').value,
            end: document.getElementById('range-end').value
        },
        dualCoding: document.getElementById('dual-coding-text').value,
        insights: tempInsights, // O array atualizado
        meta: {
            map: document.getElementById('meta-map')?.value || '',
            engage: document.getElementById('meta-engage')?.value || '',
            translate: document.getElementById('meta-translate')?.value || '',
            apply: document.getElementById('meta-apply')?.value || ''
        },
        triggers: {
            prediction: document.getElementById('trigger-prediction')?.value || '',
            connection: document.getElementById('trigger-connection')?.value || '',
            emotion: document.getElementById('trigger-emotion')?.value || ''
        },
        lastEdited: new Date().toISOString()
    };
}

// --- Lógica de Salvamento ---

async function saveNote(planoIndex, diaIndex) {
    const noteData = extractNoteDataFromDOM();

    // 1. Atualiza State
    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano.diasPlano[diaIndex].neuroNote) {
        plano.diasPlano[diaIndex].neuroNote = {};
    }
    plano.diasPlano[diaIndex].neuroNote = noteData;
    state.updatePlano(planoIndex, plano);

    // 2. Persistência no Firestore
    try {
        const currentUser = state.getCurrentUser();
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            
            // UX: Feedback visual no botão
            const btnSave = document.getElementById('btn-save-neuro');
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Salvo!';
            btnSave.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                closeNoteModal();
                btnSave.innerHTML = originalText;
                btnSave.style.backgroundColor = '#d35400';
                
                ui.renderApp(state.getPlanos(), currentUser);
                ui.highlightAndScrollToPlano(planoIndex);
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
            const note = dia.neuroNote;
            const dataLegivel = new Date(dia.data).toLocaleDateString('pt-BR');
            
            // Título do Capítulo e Metadados
            mdContent += `## 🔖 ${note.chapterTitle || `Sessão ${idx + 1}`}\n`;
            
            // Informações de Intervalo
            let rangeInfo = `${dia.paginaInicioDia}-${dia.paginaFimDia}`;
            if (note.pageRange?.start && note.pageRange?.end) {
                rangeInfo = `${note.pageRange.start} a ${note.pageRange.end}`;
            }
            mdContent += `**Data:** ${dataLegivel} | **Foco nas Páginas:** ${rangeInfo}\n\n`;

            // Codificação Dupla
            if (note.dualCoding) {
                mdContent += `### 🧠 Imagem Mental (Codificação Dupla)\n`;
                mdContent += `> ${note.dualCoding}\n\n`;
            }

            // Insights Granulares
            if (note.insights && note.insights.length > 0) {
                mdContent += `### ⚡ Insights do Texto\n`;
                note.insights.forEach(item => {
                    const symbol = item.type === 'question' ? '(?)' : '(!)';
                    mdContent += `*   **Pág. ${item.page} ${symbol}:** ${item.excerpt}\n`;
                });
                mdContent += `\n`;
            }

            // Método M.E.T.A (se houver conteúdo)
            const hasMeta = note.meta && (note.meta.map || note.meta.engage || note.meta.translate || note.meta.apply);
            if (hasMeta) {
                mdContent += `### 🛠️ Ciclo M.E.T.A.\n`;
                if(note.meta.map) mdContent += `- **Mapear:** ${note.meta.map}\n`;
                if(note.meta.engage) mdContent += `- **Engajar:** ${note.meta.engage}\n`;
                if(note.meta.translate) mdContent += `- **Traduzir:** ${note.meta.translate}\n`;
                if(note.meta.apply) mdContent += `- **Aplicar:** ${note.meta.apply}\n`;
                mdContent += `\n`;
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