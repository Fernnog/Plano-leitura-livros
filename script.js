// script.js (Completo e Corrigido)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos do DOM
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const periodicidadeSelect = document.getElementById('periodicidade');
    const diasSemanaSelecao = document.getElementById('dias-semana-selecao');
    const definirPorDatasRadio = document.getElementById('definir-por-datas');
    const definirPorDiasRadio = document.getElementById('definir-por-dias');
    const periodoPorDatasDiv = document.getElementById('periodo-por-datas');
    const periodoPorDiasDiv = document.getElementById('periodo-por-dias');
    const novoPlanoBtn = document.getElementById('novo-plano');
    const inicioBtn = document.getElementById('inicio');
    const cadastroPlanoSection = document.getElementById('cadastro-plano');
    const planosLeituraSection = document.getElementById('planos-leitura');
    const exportarAgendaBtn = document.getElementById('exportar-agenda');
    const paginadorPlanosDiv = document.getElementById('paginador-planos');
    const inicioCadastroBtn = document.getElementById('inicio-cadastro');
    // Elementos de autenticação
    const authFormDiv = document.getElementById('auth-form');
    const showAuthButton = document.getElementById('show-auth-button');
    const cancelAuthButton = document.getElementById('cancel-auth-button');
    const loginEmailButton = document.getElementById('login-email-button');
    const signupEmailButton = document.getElementById('signup-email-button');
    const emailLoginInput = document.getElementById('email-login');
    const passwordLoginInput = document.getElementById('password-login');
    const logoutButton = document.getElementById('logout-button');
    const syncFirebaseButton = document.getElementById('sync-firebase');

    // Seleção dos campos de data para gerenciar o atributo required
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    const dataInicioDias = document.getElementById('data-inicio-dias');
    const numeroDias = document.getElementById('numero-dias');

    // Seleção do campo de link
    const linkDriveInput = document.getElementById('link-drive');

    // Seleção elementos Próximas Leituras
    const proximasLeiturasSection = document.getElementById('proximas-leituras-section');
    const listaProximasLeiturasDiv = document.getElementById('lista-proximas-leituras');
    const semProximasLeiturasP = document.getElementById('sem-proximas-leituras');

    // Variável de controle para impedir o reset do formulário durante a edição
    let preventFormReset = false;

    // Configurações do Firebase (Mantenha as suas credenciais aqui)
     const firebaseConfig = {
        apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE", // Substitua pela sua API Key real
        authDomain: "plano-leitura.firebaseapp.com",
        projectId: "plano-leitura",
        storageBucket: "plano-leitura.firebasestorage.app",
        messagingSenderId: "589137978493",
        appId: "1:589137978493:web:f7305bca602383fe14bd14"
    };

    // Inicializar o Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Variáveis globais
    let user = null;
    let planos = [];
    let planoEditandoIndex = -1;

    // Função para obter data atual normalizada (00:00:00)
    function getHojeNormalizado() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return hoje;
    }

    // --- *** NOVA FUNÇÃO: Determinar Status do Plano *** ---
    function determinarStatusPlano(plano) {
        if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date)) {
            return 'invalido'; // Status para dados incompletos (não será exibido, mas útil para depuração)
        }

        const hoje = getHojeNormalizado();
        const dataInicioPlano = new Date(plano.dataInicio);
        dataInicioPlano.setHours(0,0,0,0);
        const dataFimPlano = new Date(plano.dataFim);
        dataFimPlano.setHours(0,0,0,0);


        // 1. Verificar "Concluído" (Prioridade máxima)
        const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
        if (todosLidos) {
            return 'concluido';
        }

        // 2. Verificar "Próximo"
        if (dataInicioPlano > hoje) {
            return 'proximo';
        }

        // 3. Verificar "Atrasado"
        // (Verifica se existe algum dia passado não lido)
         const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
            if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 const dataDiaNormalizada = new Date(dia.data);
                 dataDiaNormalizada.setHours(0, 0, 0, 0);
                 // É um dia ANTERIOR a hoje e não está lido?
                 return dataDiaNormalizada < hoje && !dia.lido;
            }
            return false; // Dia inválido não conta como atraso
         });

         if (temDiaPassadoNaoLido) {
             return 'atrasado';
         }

        // 4. Se não é Concluído, Próximo ou Atrasado, e está dentro do período -> "Em dia"
        if (hoje >= dataInicioPlano && hoje <= dataFimPlano) {
            return 'em_dia';
        }

        // 5. Se passou da data fim, não está concluído e não tem dias passados não lidos (estado incomum)
        // Poderia ser um plano que terminou 'em dia' mas não foi marcado como concluído?
        // Vamos considerar "Em dia" se a data fim passou mas não há atrasos pendentes.
        if (hoje > dataFimPlano && !todosLidos && !temDiaPassadoNaoLido) {
            // console.warn("Plano passado, não concluído, mas sem dias atrasados:", plano);
            return 'em_dia'; // Ou talvez 'finalizado_incompleto'? Por ora, 'em_dia' parece razoável.
        }

        // Caso não se encaixe em nenhum dos status claros (raro)
        console.warn("Plano sem status definido:", plano);
        return ''; // Retorna string vazia para não gerar tag
    }
    // --- *** FIM da Nova Função *** ---


    // Função initApp
    function initApp() {
        initAuth();
    }

    // Função initAuth
    function initAuth() {
        onAuthStateChanged(auth, (currentUser) => {
            user = currentUser;
            console.log("Estado de Autenticação Mudou:", user ? user.uid : 'Nenhum usuário');
            if (user) {
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'none';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'block';
                syncFirebaseButton.style.display = 'none';
                carregarPlanosSalvos((planosCarregados) => {
                    planos = planosCarregados || [];
                    renderizarPlanos();
                });
            } else {
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                syncFirebaseButton.style.display = 'none';
                planos = [];
                renderizarPlanos();
            }
            atualizarVisibilidadeBotoesAcao();
        });
    }

    // Função atualizarVisibilidadeBotoesAcao
    function atualizarVisibilidadeBotoesAcao() {
        const estaNaTelaCadastro = cadastroPlanoSection.style.display !== 'none';

        if (estaNaTelaCadastro) {
            novoPlanoBtn.style.display = 'none';
            inicioBtn.style.display = user ? 'block' : 'none';
            exportarAgendaBtn.style.display = 'none';
            showAuthButton.style.display = 'none';
            logoutButton.style.display = 'none';
            proximasLeiturasSection.style.display = 'none';
        } else {
            novoPlanoBtn.style.display = user ? 'block' : 'none';
            inicioBtn.style.display = 'none';
            exportarAgendaBtn.style.display = user && planos.length > 0 ? 'block' : 'none';
            showAuthButton.style.display = user ? 'none' : 'block';
            logoutButton.style.display = user ? 'block' : 'none';
            // Visibilidade de próximas leituras é controlada em renderizarProximasLeituras()
        }

        if (!user && showAuthButton.style.display === 'none' && !estaNaTelaCadastro) {
           // Manter como está
        } else if (!user && !estaNaTelaCadastro){
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        } else if (user) {
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        }
    }

    // Funções loginWithEmailPassword, signupWithEmailPassword, logout
    function loginWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Login com email/senha bem-sucedido');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
            })
            .catch((error) => {
                console.error('Erro ao fazer login com email/senha:', error);
                alert('Erro ao fazer login: ' + error.message);
            });
    }
    function signupWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Cadastro com email/senha bem-sucedido:', userCredential.user);
                alert('Cadastro realizado com sucesso! Faça login.');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                 atualizarVisibilidadeBotoesAcao();
            })
            .catch((error) => {
                console.error('Erro ao fazer cadastro com email/senha:', error);
                alert('Erro ao cadastrar: ' + error.message);
            });
    }
    function logout() {
        console.log("Função logout() iniciada");
        signOut(auth)
            .then(() => {
                console.log('Logout bem-sucedido');
            })
            .catch((error) => {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // Função carregarPlanosSalvos
    async function carregarPlanosSalvos(callback) {
        if (!user) {
            console.log('Usuário não logado, retornando planos vazios.');
            if (callback) callback([]);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        try {
            const docSnap = await getDoc(docRef);
            let planosDoFirestore = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                planosDoFirestore = data.planos || [];
                planosDoFirestore = planosDoFirestore.map(plano => {
                    const dataInicio = plano.dataInicio ? new Date(plano.dataInicio) : null;
                    const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;
                    return {
                        ...plano,
                        linkDrive: plano.linkDrive || '',
                        dataInicio: (dataInicio && !isNaN(dataInicio)) ? dataInicio : null,
                        dataFim: (dataFim && !isNaN(dataFim)) ? dataFim : null,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                            ...dia,
                            data: (dia.data && !isNaN(new Date(dia.data))) ? new Date(dia.data) : null
                        })) : []
                    };
                }).filter(plano => plano.dataInicio && plano.dataFim); // Filtra planos com datas inválidas
            } else {
                console.log("Nenhum documento de usuário encontrado. Criando um novo.");
                await setDoc(docRef, { planos: [] });
            }
            console.log('Planos carregados do Firestore:', planosDoFirestore);
            if (callback) callback(planosDoFirestore);
        } catch (error) {
            console.error('Erro ao carregar planos do Firestore:', error);
            alert('Erro ao carregar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback([]);
        }
    }

    // Função salvarPlanos
    async function salvarPlanos(planosParaSalvar, callback) {
        if (!user) {
            console.error('Usuário não logado, não é possível salvar.');
            if (callback) callback(false);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        const planosParaFirestore = planosParaSalvar.map(plano => {
            const linkDrive = typeof plano.linkDrive === 'string' ? plano.linkDrive : '';
            return {
                ...plano,
                linkDrive: linkDrive,
                dataInicio: plano.dataInicio instanceof Date ? plano.dataInicio.toISOString() : null,
                dataFim: plano.dataFim instanceof Date ? plano.dataFim.toISOString() : null,
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    data: dia.data instanceof Date ? dia.data.toISOString() : null
                })) : []
            };
        });
        try {
            await setDoc(docRef, { planos: planosParaFirestore });
            console.log('Planos salvos no Firestore com sucesso!');
            if (callback) callback(true);
        } catch (error) {
            console.error('Erro ao salvar planos no Firestore:', error);
            alert('Erro ao salvar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback(false);
        }
    }

    // Função updateRequiredAttributes
    function updateRequiredAttributes() {
        if (definirPorDatasRadio.checked) {
            dataInicio.required = true;
            dataFim.required = true;
            dataInicioDias.required = false;
            numeroDias.required = false;
        } else {
            dataInicio.required = false;
            dataFim.required = false;
            dataInicioDias.required = true;
            numeroDias.required = true;
        }
        linkDriveInput.required = false;
    }
    updateRequiredAttributes();

    // Função renderizarProximasLeituras
    function renderizarProximasLeituras() {
        if (!user || !planos || planos.length === 0) {
            proximasLeiturasSection.style.display = 'none';
            return;
        }
        const hoje = getHojeNormalizado();
        const todasLeiturasFuturas = [];
        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data);
                        dataDiaNormalizada.setHours(0,0,0,0);
                        if (dataDiaNormalizada >= hoje && !dia.lido)
                        {
                            todasLeiturasFuturas.push({
                                data: dia.data,
                                titulo: plano.titulo,
                                paginasTexto: `Pgs ${dia.paginaInicioDia}-${dia.paginaFimDia} (${dia.paginas})`,
                            });
                        }
                    }
                });
            }
        });
        todasLeiturasFuturas.sort((a, b) => a.data - b.data);
        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3);
        listaProximasLeiturasDiv.innerHTML = '';
        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block';
            semProximasLeiturasP.style.display = 'none';
            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', {
                    weekday: 'short', month: 'short', day: 'numeric'
                });
                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="proxima-leitura-titulo">${leitura.titulo}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>
                `;
                listaProximasLeiturasDiv.appendChild(itemDiv);
            });
        } else {
            proximasLeiturasSection.style.display = 'block';
            semProximasLeiturasP.style.display = 'block';
        }
    }


    // *** FUNÇÃO renderizarPlanos (Com correção) ***
    function renderizarPlanos() {
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        proximasLeiturasSection.style.display = 'none';

        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao();
            renderizarProximasLeituras();
            return;
        }

        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility();
            renderizarProximasLeituras();
            return;
        }

        // Renderiza Paginador (se necessário)
        if (planos.length > 1) {
            planos.forEach((plano, index) => {
                const linkPaginador = document.createElement('a');
                linkPaginador.href = `#plano-${index}`;
                linkPaginador.textContent = index + 1;
                linkPaginador.title = plano.titulo;
                paginadorPlanosDiv.appendChild(linkPaginador);
            });
        }

        // Renderiza Planos
        planos.forEach((plano, index) => {
            const progressoPercentual = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;

            // --- Cálculo e HTML da Tag de Status ---
            const status = determinarStatusPlano(plano);
            let statusText = '';
            let statusClass = '';
            switch (status) {
                case 'proximo': statusText = 'Próximo'; statusClass = 'status-proximo'; break;
                case 'em_dia': statusText = 'Em dia'; statusClass = 'status-em-dia'; break;
                case 'atrasado': statusText = 'Atrasado'; statusClass = 'status-atrasado'; break;
                case 'concluido': statusText = 'Concluído'; statusClass = 'status-concluido'; break;
            }
            const statusTagHTML = statusText ? `<span class="status-tag ${statusClass}">${statusText}</span>` : '';

            // Aviso de atraso APENAS se status for 'atrasado'
            const diasAtrasados = (status === 'atrasado') ? verificarAtraso(plano) : 0;
            const avisoAtrasoHTML = (status === 'atrasado' && diasAtrasados > 0) ? `
                <div class="aviso-atraso" id="aviso-atraso-${index}">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <div class="acoes-dados">
                        <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                    </div>
                </div>` : '';

            // HTML para o Link do Drive
            let linkDriveHTML = '';
             if (plano.linkDrive) {
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <a href="${plano.linkDrive}" target="_blank" class="button-link-drive" title="Abrir documento de anotações">
                         <span class="material-symbols-outlined">open_in_new</span> Abrir Notas
                     </a>
                     <button onclick="editarLinkDrive(${index})" class="button-link-drive-edit" title="Editar link de anotações">
                         <span class="material-symbols-outlined">edit</span> Editar Link
                     </button>
                 </div>`;
             } else {
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <button onclick="editarLinkDrive(${index})" class="button-link-drive-add" title="Adicionar link de anotações">
                         <span class="material-symbols-outlined">add_link</span> Adicionar Link
                     </button>
                 </div>`;
             }

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            if (statusClass) {
                planoDiv.classList.add(statusClass.replace('status-','card-'));
            }
            planoDiv.id = `plano-${index}`;
            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3><span class="plano-numero">${index + 1}. </span>${plano.titulo}</h3>
                    ${statusTagHTML}
                    <div class="plano-acoes-principais">
                        <button class="acoes-dados button" onclick="editarPlano(${index})" title="Editar detalhes do plano">
                           <span class="material-symbols-outlined">edit_note</span> Editar
                        </button>
                        <button class="acoes-dados button" onclick="excluirPlano(${index})" title="Excluir este plano">
                            <span class="material-symbols-outlined">delete</span> Excluir
                        </button>
                    </div>
                </div>
                ${avisoAtrasoHTML}
                ${linkDriveHTML}
                <p>Páginas: ${plano.paginaInicio} - ${plano.paginaFim} (${plano.totalPaginas} pgs)</p>
                <div class="progresso-container" title="${progressoPercentual.toFixed(0)}% concluído">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <details class="dias-leitura-details">
                    <summary>Ver/Marcar Dias de Leitura (${plano.diasPlano ? plano.diasPlano.length : 0} dias)</summary>
                    <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
                </details>
            `;
            listaPlanos.appendChild(planoDiv);
        });

        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility();
        renderizarProximasLeituras();
    }


    // Função verificarAtraso
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) {
            return 0;
        }
        return plano.diasPlano.reduce((count, dia) => {
             if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                const dataDiaNormalizada = new Date(dia.data);
                dataDiaNormalizada.setHours(0, 0, 0, 0);
                if (dataDiaNormalizada < hoje && !dia.lido) {
                    return count + 1;
                }
            }
            return count;
        }, 0);
    }


    // Função renderizarDiasLeitura
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        if (!diasPlano || diasPlano.length === 0) {
            return '<p>Nenhum dia de leitura definido para este plano.</p>';
        }
        return diasPlano.map((dia, diaIndex) => {
            const dataFormatada = (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()))
                ? dia.data.toLocaleDateString('pt-BR')
                : 'Data inválida';
            const alternadoClass = diaIndex % 2 === 0 ? 'alternado' : '';
            const lidoClass = dia.lido ? 'lido' : '';
            const idCheckbox = `dia-${planoIndex}-${diaIndex}`;
            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        <input type="checkbox" id="${idCheckbox}" ${dia.lido ? 'checked' : ''} onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)" title="${dia.lido ? 'Desmarcar' : 'Marcar'} dia como lido">
                        <label for="${idCheckbox}">${dataFormatada} - Páginas ${dia.paginaInicioDia} a ${dia.paginaFimDia} (${dia.paginas} pgs)</label>
                    </div>`;
        }).join('');
    }


    // Função marcarDiaLido
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano && planos[planoIndex].diasPlano[diaIndex]) {
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex);
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Progresso salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar progresso no Firebase.');
                }
                renderizarPlanos();
            });
        } else {
            console.error("Índice de plano ou dia inválido para marcar como lido.");
        }
    };


    // Função atualizarPaginasLidas
    function atualizarPaginasLidas(planoIndex) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                return sum + (dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
            }, 0);
        } else {
            console.error("Plano inválido para atualizar páginas lidas.");
            if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0;
        }
    }


    // Função editarPlano
    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para edição:", index); return;
        }
        planoEditandoIndex = index;
        preventFormReset = true;
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao();
        inicioCadastroBtn.style.display = 'block';
        preventFormReset = false;
        const plano = planos[index];
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || '';
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';
        if (plano.definicaoPeriodo === 'dias') {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            document.getElementById('data-inicio-dias').valueAsDate = plano.dataInicio instanceof Date ? plano.dataInicio : null;
            const numDias = plano.diasPlano ? plano.diasPlano.length : '';
            document.getElementById('numero-dias').value = numDias;
        } else {
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            document.getElementById('data-inicio').valueAsDate = plano.dataInicio instanceof Date ? plano.dataInicio : null;
            document.getElementById('data-fim').valueAsDate = plano.dataFim instanceof Date ? plano.dataFim : null;
        }
        periodicidadeSelect.value = plano.periodicidade || 'diario';
        diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        } else {
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
        updateRequiredAttributes();
        cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' });
    };

    // Função editarLinkDrive
    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || '';
        const novoLink = prompt(`Editar Link de Anotações para "${plano.titulo}":\n(Deixe em branco para remover)`, linkAtual);
        if (novoLink !== null) {
            planos[index].linkDrive = novoLink.trim();
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Link atualizado e salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar atualização do link no Firebase.');
                }
                renderizarPlanos();
            });
        }
    };

    // Funções mostrarOpcoesRecalculo, fecharAvisoRecalculo, solicitarNovaDataFim, solicitarPaginasPorDia
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano atrasado. Como deseja recalcular?</p>
            <div class="acoes-dados recalculo-opcoes">
                <button onclick="solicitarNovaDataFim(${index})" title="Define uma nova data para terminar a leitura, recalculando as páginas por dia restante">Nova Data Fim</button>
                <button onclick="solicitarPaginasPorDia(${index})" title="Define quantas páginas ler por dia a partir de agora, recalculando a data de fim">Páginas/Dia</button>
                <button onclick="fecharAvisoRecalculo(${index})" title="Cancelar recálculo">Cancelar</button>
            </div>`;
    };
    window.fecharAvisoRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        const plano = planos[index];
        const diasAtrasados = verificarAtraso(plano);
        if(determinarStatusPlano(plano) === 'atrasado' && diasAtrasados > 0) { // Reconfirma se ainda está atrasado
            avisoAtrasoDiv.innerHTML = `
                <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                <div class="acoes-dados">
                    <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                </div>`;
        } else {
            avisoAtrasoDiv.remove(); // Remove o aviso se não está mais atrasado
        }
    };
    window.solicitarNovaDataFim = function(index) {
        const hojeStr = new Date().toISOString().split('T')[0];
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite (YYYY-MM-DD, após ${hojeStr}):`);
        if (novaDataFimInput) {
            try {
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00');
                if (isNaN(novaDataFim.getTime())) {
                    alert("Data inválida. Use o formato YYYY-MM-DD."); mostrarOpcoesRecalculo(index); return;
                }
                const hoje = getHojeNormalizado();
                if (novaDataFim <= hoje) {
                     alert("A nova data de fim deve ser posterior à data de hoje."); mostrarOpcoesRecalculo(index); return;
                }
                recalcularPlanoNovaData(index, novaDataFim);
            } catch (e) {
                 alert("Erro ao processar a data. Use o formato YYYY-MM-DD."); mostrarOpcoesRecalculo(index);
            }
        } else {
             mostrarOpcoesRecalculo(index);
        }
    };
     window.solicitarPaginasPorDia = function(index) {
        const paginasPorDiaInput = prompt("Recalcular definindo Páginas por Dia:\n\nDigite o número de páginas que você quer ler por dia a partir de agora:");
        if (paginasPorDiaInput) {
            const paginasPorDia = parseInt(paginasPorDiaInput);
            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (maior que zero)."); mostrarOpcoesRecalculo(index); return;
            }
             const plano = planos[index];
             const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
             if (paginasRestantes <= 0) {
                 alert("Não há páginas restantes para ler neste plano."); fecharAvisoRecalculo(index); return;
             }
            recalcularPlanoPaginasPorDia(index, paginasPorDia);
        } else {
             mostrarOpcoesRecalculo(index);
        }
    };


    // Função calcularNovaDataFimPorPaginasDia
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
         if (paginasRestantes <= 0 || paginasPorDia <= 0) { return null; }
        let proximoDiaLeitura = getHojeNormalizado();
        const diasSemanaPlano = Array.isArray(plano.diasSemana) ? plano.diasSemana : [];
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return plano.periodicidade === 'diario' || (plano.periodicidade === 'semanal' && diasSemanaPlano.includes(diaSem));
        };
         while (!isDiaValido(proximoDiaLeitura)) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
         }
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);
        let dataFimCalculada = new Date(proximoDiaLeitura);
        let diasLeituraContados = 0;
        let safetyCounter = 0;
        while(diasLeituraContados < diasLeituraNecessarios && safetyCounter < 10000) { // Safety break
             if (isDiaValido(dataFimCalculada)) { diasLeituraContados++; }
             if (diasLeituraContados < diasLeituraNecessarios) {
                 dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             }
             safetyCounter++;
             if(safetyCounter >= 10000) {console.error("Loop break em calcularNovaDataFimPorPaginasDia"); return null;}
        }
        return dataFimCalculada;
    }

    // Função recalcularPlanoPaginasPorDia
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        const plano = planos[index];
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);
        if (!novaDataFim) {
             alert("Não foi possível calcular a nova data de fim."); mostrarOpcoesRecalculo(index); return;
         }
        recalcularPlanoNovaData(index, novaDataFim);
    };

    // Função excluirPlano
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice inválido:", index); return;
        }
        const plano = planos[index];
        if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
            planos.splice(index, 1);
            salvarPlanos(planos, (salvoComSucesso) => {
                if (!salvoComSucesso) console.error('Falha ao salvar exclusão no Firebase.');
                renderizarPlanos();
            });
        }
    };

    // Função exportarAgendaBtn listener e exportarParaAgenda
    exportarAgendaBtn.addEventListener('click', () => {
        if (!user || planos.length === 0) {
            alert("Você precisa estar logado e ter planos cadastrados para exportar."); return;
        }
        let promptMessage = "Digite o número do plano para exportar:\n\n";
        planos.forEach((plano, index) => { promptMessage += `${index + 1}. ${plano.titulo}\n`; });
        const planoIndexInput = prompt(promptMessage);
        if (planoIndexInput === null) { return; }
        const planoIndex = parseInt(planoIndexInput) - 1;
        if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length) {
            alert("Número de plano inválido."); return;
        }
        if (!planos[planoIndex].diasPlano || planos[planoIndex].diasPlano.length === 0) {
             alert(`O plano "${planos[planoIndex].titulo}" não possui dias definidos.`); return;
         }
        exportarParaAgenda(planos[planoIndex]);
    });
    function exportarParaAgenda(plano) {
        const horarioInicio = prompt(`Exportar "${plano.titulo}":\n\nHorário início (HH:MM):`, "09:00");
        if (!horarioInicio) return;
        const horarioFim = prompt(`Horário fim (HH:MM):`, "09:30");
        if (!horarioFim) return;
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM."); return;
        }
        try {
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            downloadICSFile(eventosICS, plano.titulo);
        } catch (error) {
             console.error("Erro ao gerar ICS:", error);
             alert("Erro ao gerar arquivo da agenda.");
        }
    }

    // Função gerarICS
    function gerarICS(plano, horarioInicio, horarioFim) {
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || !plano.dataInicio || !plano.dataFim || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date)) {
            throw new Error("Dados do plano incompletos ou inválidos.");
        }
        if (!plano.id) plano.id = crypto.randomUUID();
        const uidEvento = `${plano.id}@gerenciador-planos-leitura`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
        const formatICSDate = (date, time) => {
            const [year, month, day] = [date.getFullYear(), (date.getMonth() + 1).toString().padStart(2, '0'), date.getDate().toString().padStart(2, '0')];
            const [hour, minute] = time.split(':');
            return `${year}${month}${day}T${hour}${minute}00`;
        };
         const formatICSDateUTC = (date) => {
            const year = date.getUTCFullYear();
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = date.getUTCDate().toString().padStart(2, '0');
            return `${year}${month}${day}T235959Z`;
        };
        let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             if (dia.data instanceof Date && !isNaN(dia.data)) {
                 primeiroDiaLeituraValido = dia.data;
                 break;
             }
        }
        if(!primeiroDiaLeituraValido) throw new Error("Nenhum dia de leitura válido encontrado.");

        icsString += `BEGIN:VEVENT\r\nUID:${uidEvento}\r\nDTSTAMP:${dtstamp}\r\n`;
        icsString += `DTSTART:${formatICSDate(primeiroDiaLeituraValido, horarioInicio)}\r\n`; // Horário Local/Flutuante
        icsString += `DTEND:${formatICSDate(primeiroDiaLeituraValido, horarioFim)}\r\n`; // Horário Local/Flutuante
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY';
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY;BYDAY=';
            const diasSemanaICS = plano.diasSemana.map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += diasSemanaICS;
        } else {
             console.warn("Periodicidade inválida para RRULE. Usando DAILY.");
             rrule += 'DAILY';
        }
         const dataFimParaUntil = new Date(plano.dataFim);
         rrule += `;UNTIL=${formatICSDateUTC(dataFimParaUntil)}`;
         icsString += `${rrule}\r\n`;
        let description = `Plano: ${plano.titulo}.\\nPáginas: ${plano.paginaInicio}-${plano.paginaFim}.\\nPeríodo: ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}.\\nVer app p/ detalhes diários.\\nApp: https://fernnog.github.io/Plano-leitura-livros/`;
        icsString += `SUMMARY:Leitura: ${plano.titulo}\r\n`;
        icsString += `DESCRIPTION:${description.replace(/\n/g, '\\n')}\r\n`;
        icsString += `LOCATION:Local de Leitura\r\nSTATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\n`;
        icsString += `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Lembrete: ${plano.titulo}\r\nTRIGGER:-PT15M\r\nEND:VALARM\r\n`;
        icsString += `END:VEVENT\r\nEND:VCALENDAR\r\n`;
        return icsString;
    }


    // Função downloadICSFile
    function downloadICSFile(icsContent, planoTitulo) {
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Função togglePaginatorVisibility
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return;
        const lista = document.getElementById('lista-planos');
        if (!lista || planos.length <= 1) {
            paginador.classList.add('hidden');
            return;
        }
        const footer = document.querySelector('footer');
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (listaRect.bottom > footerRect.top || footerRect.top > windowHeight) {
            paginador.classList.remove('hidden');
         } else {
            paginador.classList.add('hidden');
         }
    }
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);

    // Função distribuirPaginasPlano
    function distribuirPaginasPlano(plano) {
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || !plano.paginaInicio || !plano.paginaFim) {
            console.warn("Dados insuficientes para distribuir páginas:", plano); return;
        }
        const totalPaginas = (plano.paginaFim - plano.paginaInicio + 1);
        const diasDeLeitura = plano.diasPlano;
        const numeroDeDias = diasDeLeitura.length;
        if (totalPaginas <= 0) {
             console.warn("Total de páginas inválido (<= 0).", plano);
             diasDeLeitura.forEach(dia => {
                 dia.paginaInicioDia = plano.paginaInicio; dia.paginaFimDia = plano.paginaInicio -1; dia.paginas = 0; dia.lido = false;
             });
             plano.paginasLidas = 0; plano.totalPaginas = 0; return;
        }
        plano.totalPaginas = totalPaginas;
        const paginasPorDiaBase = Math.floor(totalPaginas / numeroDeDias);
        const paginasRestantes = totalPaginas % numeroDeDias;
        let paginaAtual = plano.paginaInicio;
        let diasLidosOriginalmente = {};
        diasDeLeitura.forEach((dia, index) => {
            diasLidosOriginalmente[index] = dia.lido; dia.lido = false;
         });
        diasDeLeitura.forEach((dia, index) => {
            let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;
            // Garantir que a página fim não ultrapasse a página fim do livro
             if (dia.paginaFimDia > plano.paginaFim) {
                 dia.paginaFimDia = plano.paginaFim;
             }
             // Recalcula páginas do dia APENAS se inicio <= fim
             dia.paginas = (dia.paginaFimDia >= dia.paginaInicioDia) ? (dia.paginaFimDia - dia.paginaInicioDia + 1) : 0;

             if (diasLidosOriginalmente[index]) { dia.lido = true; } else { dia.lido = false; }
            paginaAtual = dia.paginaFimDia + 1;
        });
        // Garante que a última página final seja a página fim do livro (ajuste final)
        if (diasDeLeitura.length > 0) {
            const ultimoDia = diasDeLeitura[numeroDeDias - 1];
             if (ultimoDia.paginaFimDia < plano.paginaFim && paginaAtual <= plano.paginaFim) {
                 console.warn(`Ajustando pag fim do último dia de ${ultimoDia.paginaFimDia} para ${plano.paginaFim}`)
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             } else if (ultimoDia.paginaFimDia > plano.paginaFim) {
                 // Isso não deveria acontecer com a lógica acima, mas por segurança
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             }
        }
        atualizarPaginasLidas(planos.indexOf(plano)); // Recalcula lidas com base nos dias marcados
    }


    // Função recalcularPlanoNovaData
    function recalcularPlanoNovaData(index, novaDataFim) {
        const planoOriginal = planos[index];
        const paginasLidas = planoOriginal.paginasLidas || 0;
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        const paginasRestantes = (planoOriginal.totalPaginas || 0) - paginasLidas;
        if (paginasRestantes <= 0) {
            alert("Todas as páginas já foram lidas."); fecharAvisoRecalculo(index); return;
        }
        let dataInicioRecalculo = getHojeNormalizado();
        const diasSemanaPlano = Array.isArray(planoOriginal.diasSemana) ? planoOriginal.diasSemana : [];
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return planoOriginal.periodicidade === 'diario' || (planoOriginal.periodicidade === 'semanal' && diasSemanaPlano.includes(diaSem));
         };
         while (!isDiaValido(dataInicioRecalculo)) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
         }
         if (novaDataFim < dataInicioRecalculo) {
             alert("Nova data fim deve ser >= " + dataInicioRecalculo.toLocaleDateString('pt-BR') + "."); mostrarOpcoesRecalculo(index); return;
         }
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo);
        while (dataAtual <= novaDataFim) {
            if (isDiaValido(dataAtual)) {
                novosDiasLeitura.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        if (novosDiasLeitura.length === 0) {
            alert("Não há dias de leitura válidos entre "+ dataInicioRecalculo.toLocaleDateString('pt-BR') +" e "+ novaDataFim.toLocaleDateString('pt-BR') +"."); mostrarOpcoesRecalculo(index); return;
        }
        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias);
        const paginasExtras = paginasRestantes % numNovosDias;
        let paginaAtualRecalculo = paginaInicioRecalculo;

        novosDiasLeitura.forEach((dia, idx) => {
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0);
            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;
             // Garante que não ultrapasse a página final do livro
             if(dia.paginaFimDia > planoOriginal.paginaFim) {
                 dia.paginaFimDia = planoOriginal.paginaFim;
             }
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1); // Recalcula páginas
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });
         // Ajuste final para garantir que a última página seja a página fim do livro
         const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
         if (ultimoDiaNovo.paginaFimDia < planoOriginal.paginaFim && paginaAtualRecalculo <= planoOriginal.paginaFim) {
            console.warn(`Ajustando pág final recalculada de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         } else if (ultimoDiaNovo.paginaFimDia > planoOriginal.paginaFim) {
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }


        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido);
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura].sort((a, b) => a.data - b.data);
        planos[index].dataFim = novaDataFim;
        atualizarPaginasLidas(index); // Reconfirma páginas lidas (não deve mudar, mas é seguro)
        salvarPlanos(planos, (salvoComSucesso) => {
            renderizarPlanos();
        });
    }

    // Funções geradoras de dias (gerarDiasPlanoPorDatas, gerarDiasPlanoPorDias, calcularDataFimReal)
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            console.error("Datas inválidas para gerar dias:", dataInicio, dataFim); return dias;
        }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);
        while (dataAtual <= dataFimNormalizada) {
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        return dias;
    }
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para gerar dias por número:", dataInicio, numeroDias); return dias;
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasAdicionados = 0;
        let safetyCounter = 0;
        while (diasAdicionados < numeroDias && safetyCounter < (numeroDias * 7 + 365)) { // Ajuste safety break
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
                diasAdicionados++;
            }
            // Sempre avança para o próximo dia, mesmo se não adicionou
             dataAtual.setDate(dataAtual.getDate() + 1);
             safetyCounter++;
             if (safetyCounter >= (numeroDias * 7 + 365)) { // Limite mais generoso
                 console.error("Loop infinito provável em gerarDiasPlanoPorDias. Interrompido.");
                 break;
             }
        }
        // Verifica se o número de dias gerados corresponde ao solicitado
        if (diasAdicionados < numeroDias) {
             console.warn(`Não foi possível gerar os ${numeroDias} dias solicitados. Apenas ${diasAdicionados} foram gerados com a periodicidade selecionada.`);
             // Poderia lançar um erro ou retornar os dias gerados, dependendo do comportamento desejado.
             // Retornando os dias gerados por enquanto.
         }

        return dias;
    }
    function calcularDataFimReal(dataInicio, numeroDias, periodicidade, diasSemana) {
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para calcular data fim real:", dataInicio, numeroDias); return null;
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasContados = 0;
        let dataFim = null;
        let safetyCounter = 0;
        while (diasContados < numeroDias && safetyCounter < (numeroDias * 7 + 365)) { // Ajuste safety break
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                diasContados++;
                 if (diasContados === numeroDias) {
                     dataFim = new Date(dataAtual);
                 }
            }
             // Só avança se ainda não encontrou todos os dias
             if (diasContados < numeroDias) {
                dataAtual.setDate(dataAtual.getDate() + 1);
             }
             safetyCounter++;
              if (safetyCounter >= (numeroDias * 7 + 365)) {
                 console.error("Loop infinito provável em calcularDataFimReal. Interrompido.");
                 return null;
             }
        }
        // Retorna a data do último dia encontrado ou null se não encontrou o suficiente
        return dataFim;
    }


    // --- Listeners de Eventos da Interface ---

    // Botões de Autenticação
    showAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'block'; showAuthButton.style.display = 'none'; cancelAuthButton.style.display = 'block'; logoutButton.style.display = 'none'; emailLoginInput.focus(); atualizarVisibilidadeBotoesAcao();
    });
    cancelAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'none'; showAuthButton.style.display = 'block'; cancelAuthButton.style.display = 'none'; atualizarVisibilidadeBotoesAcao();
    });
    loginEmailButton.addEventListener('click', loginWithEmailPassword);
    signupEmailButton.addEventListener('click', signupWithEmailPassword);
    logoutButton.addEventListener('click', logout);

    // Botões de Navegação Principal
    novoPlanoBtn.addEventListener('click', function() {
        if (!user) { alert("Faça login ou cadastre-se para criar um novo plano."); showAuthButton.click(); return; }
        cadastroPlanoSection.style.display = 'block'; planosLeituraSection.style.display = 'none'; inicioCadastroBtn.style.display = 'block'; proximasLeiturasSection.style.display = 'none';
        if (!preventFormReset) {
            formPlano.reset(); planoEditandoIndex = -1; formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
             definirPorDatasRadio.checked = true; periodoPorDatasDiv.style.display = 'block'; periodoPorDiasDiv.style.display = 'none'; periodicidadeSelect.value = 'diario'; diasSemanaSelecao.style.display = 'none';
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        updateRequiredAttributes(); atualizarVisibilidadeBotoesAcao(); document.getElementById('titulo-livro').focus();
    });
    inicioBtn.addEventListener('click', function() {
        planosLeituraSection.style.display = 'block'; cadastroPlanoSection.style.display = 'none'; inicioCadastroBtn.style.display = 'none'; planoEditandoIndex = -1; formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; atualizarVisibilidadeBotoesAcao();
        renderizarPlanos(); // Renderiza ao voltar para o início
    });
     inicioCadastroBtn.addEventListener('click', function() { inicioBtn.click(); });

    // Controles do Formulário
    definirPorDatasRadio.addEventListener('change', function() {
        if (this.checked) { periodoPorDatasDiv.style.display = 'block'; periodoPorDiasDiv.style.display = 'none'; updateRequiredAttributes(); }
    });
    definirPorDiasRadio.addEventListener('change', function() {
        if (this.checked) { periodoPorDatasDiv.style.display = 'none'; periodoPorDiasDiv.style.display = 'block'; updateRequiredAttributes(); }
    });
    periodicidadeSelect.addEventListener('change', function() {
        diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
        if (this.value === 'diario') { document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false); }
    });

    // Submissão do formulário
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!user) { alert("Erro: Usuário não logado."); return; }

        const titulo = document.getElementById('titulo-livro').value.trim();
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        const linkDrive = document.getElementById('link-drive').value.trim();
        const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
        const periodicidade = periodicidadeSelect.value;

        if (!titulo) { alert('Título obrigatório.'); return; }
        if (isNaN(paginaInicio) || paginaInicio < 1) { alert('Página início inválida.'); return; }
        if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('Página fim inválida.'); return; }

        let dataInicio, dataFim, numeroDiasInput;
        let diasPlano = [];
        let diasSemana = [];
         if (periodicidade === 'semanal') {
             document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => { diasSemana.push(parseInt(cb.value)); });
             if (diasSemana.length === 0) { alert('Selecione dias da semana para periodicidade semanal.'); return; }
         }

        if (definicaoPeriodo === 'datas') {
            const dataInicioInput = document.getElementById('data-inicio').value;
            const dataFimInput = document.getElementById('data-fim').value;
            if (!dataInicioInput || !dataFimInput) { alert('Datas de início e fim obrigatórias.'); return; }
            dataInicio = new Date(dataInicioInput + 'T00:00:00');
            dataFim = new Date(dataFimInput + 'T00:00:00');
            if (isNaN(dataInicio) || isNaN(dataFim)) { alert('Formato de data inválido.'); return; }
            if (dataFim < dataInicio) { alert('Data fim anterior à data início.'); return; }
            diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);
        } else { // definicaoPeriodo === 'dias'
            const dataInicioDiasInput = document.getElementById('data-inicio-dias').value;
            numeroDiasInput = parseInt(document.getElementById('numero-dias').value);
            if (!dataInicioDiasInput) { alert('Data de início obrigatória.'); return; }
            if (isNaN(numeroDiasInput) || numeroDiasInput < 1) { alert('Número de dias inválido.'); return; }
            dataInicio = new Date(dataInicioDiasInput + 'T00:00:00');
             if (isNaN(dataInicio)) { alert('Formato data início inválido.'); return; }

            // Gera os dias de leitura *primeiro*
            diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);

            // Verifica se foram gerados dias suficientes
            if (diasPlano.length < numeroDiasInput) {
                 alert(`Atenção: Não foi possível gerar os ${numeroDiasInput} dias de leitura solicitados com a periodicidade semanal escolhida. Foram gerados ${diasPlano.length} dias. Verifique o período e os dias da semana.`);
                 // Decide se continua ou retorna
                 // return; // Para aqui se for erro crítico
                 // Ou continua com os dias gerados, mas avisa o usuário
                 if (diasPlano.length === 0) return; // Não continua se nenhum dia foi gerado
            }

             // Calcula a data de fim real com base nos dias efetivamente gerados
             if (diasPlano.length > 0) {
                dataFim = diasPlano[diasPlano.length - 1].data;
             } else {
                 alert("Não foi possível gerar nenhum dia de leitura válido."); return;
             }
             // Garante que dataFim é um objeto Date válido
             if (!dataFim || !(dataFim instanceof Date) || isNaN(dataFim)) {
                 console.error("Data fim calculada inválida:", dataFim);
                 alert("Erro ao calcular data final."); return;
             }
        }

        if (diasPlano.length === 0) {
            alert("Nenhum dia de leitura gerado. Verifique datas e periodicidade."); return;
        }

        const planoData = {
            id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(),
            titulo: titulo, linkDrive: linkDrive, paginaInicio: paginaInicio, paginaFim: paginaFim,
            totalPaginas: paginaFim - paginaInicio + 1, definicaoPeriodo: definicaoPeriodo,
            dataInicio: dataInicio, dataFim: dataFim, periodicidade: periodicidade,
            diasSemana: diasSemana, diasPlano: diasPlano, paginasLidas: 0
        };

        if (planoEditandoIndex !== -1) {
             const diasLidosAntigosMap = new Map();
             planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                 if (diaAntigo.lido && diaAntigo.data instanceof Date) {
                     // Usa toISOString().split('T')[0] para comparar apenas a data YYYY-MM-DD
                     diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true);
                 }
             });
             planoData.diasPlano.forEach(diaNovo => {
                 if (diaNovo.data instanceof Date) {
                     const dataStr = diaNovo.data.toISOString().split('T')[0];
                     if (diasLidosAntigosMap.has(dataStr)) { diaNovo.lido = true; }
                 }
             });
             // Recalcula paginas lidas com base nos dias marcados como lidos (incluindo os restaurados)
             planoData.paginasLidas = planoData.diasPlano.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }

        // Distribui as páginas pelos dias gerados (APÓS definir/restaurar estado 'lido')
        distribuirPaginasPlano(planoData);

        if (planoEditandoIndex !== -1) {
            planos[planoEditandoIndex] = planoData;
        } else {
            planos.unshift(planoData);
        }

        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log(`Plano ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'}.`);
                planoEditandoIndex = -1;
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
            } else {
                alert("Houve um erro ao salvar. Tente novamente.");
            }
             inicioBtn.click(); // Volta para a listagem
        });
    });

    // --- Inicialização ---
    initApp();

}); // Fim do DOMContentLoaded