// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (M.E.T.A.),
// persistência local/remota dessas anotações e exportação para Markdown.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

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
    meta: {
        map: '',       // M: Mapear
        engage: '',    // E: Engajar
        translate: '', // T: Traduzir
        apply: ''      // A: Aplicar
    },
    triggers: {
        prediction: '', // Erro de Predição
        connection: '', // Conexão Relacional
        emotion: '',    // Emoção Teológica
        visual: ''      // Síntese Visual
    },
    lastEdited: null
});

// --- Gerenciamento do Modal (Injeção Dinâmica) ---

function ensureModalExists() {
    if (document.getElementById('neuro-modal')) return;

    const modalHTML = `
    <div id="neuro-modal" class="reavaliacao-modal-overlay" style="z-index: 2000;">
        <div class="reavaliacao-modal-content neuro-theme" style="max-width: 800px; background: #fdfbf7;">
            <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
                <h2 style="color: white; font-family: 'Playfair Display', serif; margin:0; display:flex; align-items:center; gap:10px;">
                    <span class="material-symbols-outlined">psychology_alt</span> Neuro-Insights
                </h2>
                <button id="close-neuro-modal" class="reavaliacao-modal-close" style="color: white;">×</button>
            </div>
            
            <div id="neuro-modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <!-- Conteúdo injetado via JS -->
            </div>

            <div class="recalculo-modal-actions" style="padding: 20px; border-top: 1px solid #eee; background: white; border-radius: 0 0 8px 8px;">
                 <button id="btn-save-neuro" class="button-confirm" style="background-color: #d35400; width: 100%;">
                    <span class="material-symbols-outlined">save</span> Salvar Conexão Neural
                 </button>
            </div>
        </div>
    </div>
    <style>
        /* Estilos Micro-Injetados para garantir fidelidade ao design solicitado */
        .neuro-section-title { font-family: 'Playfair Display', serif; color: #1a252f; border-bottom: 2px solid #d35400; display: inline-block; margin-top: 20px; margin-bottom: 15px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .neuro-input-group label { display: block; font-weight: bold; color: #2c3e50; margin-bottom: 5px; font-size: 0.9em; }
        .neuro-input-group textarea, .neuro-input-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Inter', sans-serif; background: #fff; transition: border 0.3s; }
        .neuro-input-group textarea:focus { border-color: #d35400; outline: none; background: #fffaf0; }
        .neuro-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #1a252f; }
        .neuro-card.accent { border-left-color: #d35400; }
        .neuro-hint { font-size: 0.8em; color: #7f8c8d; font-style: italic; margin-top: 4px; display: block; }
        @media (max-width: 600px) { .meta-grid { grid-template-columns: 1fr; } }
    </style>
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

    const modalBody = document.getElementById('neuro-modal-body');
    
    modalBody.innerHTML = `
        <div class="neuro-input-group" style="margin-bottom: 20px;">
            <label>Contexto / Título do Capítulo</label>
            <input type="text" id="neuro-chapter" value="${tituloCapitulo}" placeholder="Ex: A Natureza da Graça...">
        </div>
        
        <h3 class="neuro-section-title">1. Método M.E.T.A.</h3>
        <div class="meta-grid">
            <div class="neuro-input-group neuro-card">
                <label><strong>M</strong>apear (Conceitos Chave)</label>
                <textarea id="meta-map" rows="3" placeholder="Palavras-chave escaneadas...">${noteData.meta.map}</textarea>
            </div>
            <div class="neuro-input-group neuro-card">
                <label><strong>E</strong>ngajar (Dúvidas/Símbolos)</label>
                <textarea id="meta-engage" rows="3" placeholder="O que me fez parar para pensar?">${noteData.meta.engage}</textarea>
            </div>
            <div class="neuro-input-group neuro-card">
                <label><strong>T</strong>raduzir (Síntese em 1 frase)</label>
                <textarea id="meta-translate" rows="3" placeholder="Explicando para uma criança de 10 anos...">${noteData.meta.translate}</textarea>
            </div>
            <div class="neuro-input-group neuro-card accent">
                <label><strong>A</strong>plicar (Micro-ação)</label>
                <textarea id="meta-apply" rows="3" placeholder="O que farei diferente hoje?">${noteData.meta.apply}</textarea>
            </div>
        </div>

        <h3 class="neuro-section-title">2. Gatilhos de Memória</h3>
        <div class="neuro-input-group" style="margin-bottom: 15px;">
            <label>⚡ Erro de Predição (Surpresa Dopaminérgica)</label>
            <span class="neuro-hint">"Eu achava que X, mas o texto provou Y."</span>
            <textarea id="trigger-prediction" rows="2">${noteData.triggers.prediction}</textarea>
        </div>
        <div class="neuro-input-group" style="margin-bottom: 15px;">
            <label>🔗 Conexão Relacional</label>
            <span class="neuro-hint">Conecte com algo que você já sabe (outros livros, filmes, versículos).</span>
            <textarea id="trigger-connection" rows="2">${noteData.triggers.connection}</textarea>
        </div>
        <div class="neuro-input-group">
            <label>❤️ Emoção Teológica</label>
            <span class="neuro-hint">O que você sentiu? (Temor, Paz, Gratidão, Desconforto)</span>
            <textarea id="trigger-emotion" rows="2">${noteData.triggers.emotion}</textarea>
        </div>
    `;

    // Configura o botão de salvar com Closure para manter as referências de index
    const btnSave = document.getElementById('btn-save-neuro');
    // Remove listeners antigos clonando o nó
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
}

// --- Lógica de Salvamento ---

async function saveNote(planoIndex, diaIndex) {
    const noteData = {
        chapterTitle: document.getElementById('neuro-chapter').value,
        meta: {
            map: document.getElementById('meta-map').value,
            engage: document.getElementById('meta-engage').value,
            translate: document.getElementById('meta-translate').value,
            apply: document.getElementById('meta-apply').value
        },
        triggers: {
            prediction: document.getElementById('trigger-prediction').value,
            connection: document.getElementById('trigger-connection').value,
            emotion: document.getElementById('trigger-emotion').value,
            visual: '' // Mantido para expansão futura
        },
        lastEdited: new Date().toISOString()
    };

    // 1. Atualiza State
    const plano = state.getPlanoByIndex(planoIndex);
    plano.diasPlano[diaIndex].neuroNote = noteData;
    state.updatePlano(planoIndex, plano);

    // 2. Persistência no Firestore
    try {
        const currentUser = state.getCurrentUser();
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
            alert('Neuro-conexão salva e sinapses reforçadas!');
            closeNoteModal();
            // Atualiza UI para mostrar o ícone de cérebro
            ui.renderApp(state.getPlanos(), currentUser);
            // Mantém o scroll no plano
            ui.highlightAndScrollToPlano(planoIndex);
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
            
            mdContent += `## 🔖 ${note.chapterTitle || `Sessão ${idx + 1}`}\n`;
            mdContent += `**Data:** ${dataLegivel} | **Páginas:** ${dia.paginaInicioDia}-${dia.paginaFimDia}\n\n`;

            mdContent += `### 🧠 Método M.E.T.A.\n`;
            if(note.meta.map) mdContent += `- **Mapear:** ${note.meta.map}\n`;
            if(note.meta.engage) mdContent += `- **Engajar:** ${note.meta.engage}\n`;
            if(note.meta.translate) mdContent += `- **Traduzir:** ${note.meta.translate}\n`;
            if(note.meta.apply) mdContent += `- **Aplicar:** ${note.meta.apply}\n`;
            mdContent += `\n`;

            mdContent += `### ⚡ Gatilhos de Memória\n`;
            if(note.triggers.prediction) mdContent += `> **Erro de Predição:** ${note.triggers.prediction}\n\n`;
            if(note.triggers.connection) mdContent += `> **Conexão:** ${note.triggers.connection}\n\n`;
            if(note.triggers.emotion) mdContent += `> **Emoção:** ${note.triggers.emotion}\n\n`;
            
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
