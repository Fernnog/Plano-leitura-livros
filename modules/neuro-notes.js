// --- START OF FILE modules/neuro-notes.js ---

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

    // REDESIGN: Removida a tag <style> e os estilos inline.
    // O modal agora usa classes CSS definidas no style.css.
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

    // Listener para fechar (MANTIDO para garantir funcionamento mesmo se main.js não for atualizado imediatamente)
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
    
    // REDESIGN: Novo Layout com Grid System e Classes
    modalBody.innerHTML = `
        <div class="neuro-input-group">
            <label>Contexto / Título do Capítulo</label>
            <input type="text" id="neuro-chapter" class="neuro-textarea-card" value="${tituloCapitulo}" placeholder="Ex: A Natureza da Graça...">
        </div>
        
        <h3 class="neuro-section-title" style="font-family:'Playfair Display',serif; color:#1a252f; border-bottom:2px solid #d35400; display:inline-block; margin-bottom:15px; margin-top:10px;">1. Método M.E.T.A.</h3>
        
        <div class="meta-grid">
            <div class="neuro-input-group">
                <label><strong>M</strong>apear (Conceitos Chave)</label>
                <textarea id="meta-map" class="neuro-textarea-card" rows="3" placeholder="Palavras-chave escaneadas...">${noteData.meta.map}</textarea>
            </div>
            <div class="neuro-input-group">
                <label><strong>E</strong>ngajar (Dúvidas/Símbolos)</label>
                <textarea id="meta-engage" class="neuro-textarea-card" rows="3" placeholder="O que me fez parar para pensar?">${noteData.meta.engage}</textarea>
            </div>
            <div class="neuro-input-group">
                <label><strong>T</strong>raduzir (Síntese em 1 frase)</label>
                <textarea id="meta-translate" class="neuro-textarea-card" rows="3" placeholder="Explicando para uma criança de 10 anos...">${noteData.meta.translate}</textarea>
            </div>
            <div class="neuro-input-group">
                <label style="color:#d35400;"><strong>A</strong>plicar (Micro-ação)</label>
                <textarea id="meta-apply" class="neuro-textarea-card" rows="3" style="border-left: 3px solid #d35400;" placeholder="O que farei diferente hoje?">${noteData.meta.apply}</textarea>
            </div>
        </div>

        <h3 class="neuro-section-title" style="font-family:'Playfair Display',serif; color:#1a252f; border-bottom:2px solid #d35400; display:inline-block; margin-bottom:15px;">2. Gatilhos de Memória</h3>
        
        <div class="neuro-input-group">
            <label>⚡ Erro de Predição (Surpresa)</label>
            <span class="neuro-hint">"Eu achava que X, mas o texto provou Y."</span>
            <textarea id="trigger-prediction" class="neuro-textarea-card" rows="2">${noteData.triggers.prediction}</textarea>
        </div>
        <div class="neuro-input-group">
            <label>🔗 Conexão Relacional</label>
            <span class="neuro-hint">Conecte com algo que você já sabe (outros livros, filmes, versículos).</span>
            <textarea id="trigger-connection" class="neuro-textarea-card" rows="2">${noteData.triggers.connection}</textarea>
        </div>
        <div class="neuro-input-group">
            <label>❤️ Emoção Teológica</label>
            <span class="neuro-hint">O que você sentiu? (Temor, Paz, Gratidão, Desconforto)</span>
            <textarea id="trigger-emotion" class="neuro-textarea-card" rows="2">${noteData.triggers.emotion}</textarea>
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
            
            // UX IMPROVEMENT: Feedback visual no botão em vez de alert
            const btnSave = document.getElementById('btn-save-neuro');
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Salvo!';
            btnSave.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                closeNoteModal();
                // Restaura botão para próxima vez
                btnSave.innerHTML = originalText;
                btnSave.style.backgroundColor = '#d35400';
                
                // Atualiza UI para mostrar o ícone de cérebro
                ui.renderApp(state.getPlanos(), currentUser);
                // Mantém o scroll no plano
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
// --- END OF FILE modules/neuro-notes.js ---