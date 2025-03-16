import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js"; // Corrected import
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, set, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";


// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE", // ***REPLACE WITH YOUR ACTUAL API KEY FROM FIREBASE***
  authDomain: "plano-leitura.firebaseapp.com",      // ***REPLACE WITH YOUR ACTUAL AUTH DOMAIN FROM FIREBASE***
  projectId: "plano-leitura",                       // ***REPLACE WITH YOUR ACTUAL PROJECT ID FROM FIREBASE***
  storageBucket: "plano-leitura.firebasestorage.app", // ***REPLACE WITH YOUR ACTUAL STORAGE BUCKET FROM FIREBASE***
  messagingSenderId: "589137978493",                 // ***REPLACE WITH YOUR ACTUAL MESSAGING SENDER ID FROM FIREBASE***
  appId: "1:589137978493:web:f7305bca602383fe14bd14",   // ***REPLACE WITH YOUR ACTUAL APP ID FROM FIREBASE***
  measurementId: "G-7F8V2JZHX2"                      // ***REPLACE WITH YOUR ACTUAL MEASUREMENT ID FROM FIREBASE***
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);


document.addEventListener('DOMContentLoaded', () => {
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const periodicidadeSelect = document.getElementById('periodicidade');
    const diasSemanaSelecao = document.getElementById('dias-semana-selecao');

    // Elementos de Autenticação
    const authArea = document.getElementById('auth-area');
    const userInfoDiv = document.getElementById('user-info');
    const authFormDiv = document.getElementById('auth-form');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');
    const forgotPasswordButton = document.getElementById('forgot-password-button');
    const authToggleButton = document.getElementById('auth-toggle-button');


    let planos = []; // Planos agora serão carregados do Firebase
    let currentUserId = null; // Rastrear o ID do usuário logado

    periodicidadeSelect.addEventListener('change', function() {
        if (this.value === 'dias-semana') {
            diasSemanaSelecao.style.display = 'block';
        } else {
            diasSemanaSelecao.style.display = 'none';
        }
    });


    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();

        if (!currentUserId) {
            alert("Você precisa estar logado para criar um plano de leitura.");
            return;
        }

        const tituloLivro = document.getElementById('titulo-livro').value;
        const totalPaginas = parseInt(document.getElementById('total-paginas').value);
        const dataInicio = new Date(document.getElementById('data-inicio').value);
        const dataFim = new Date(document.getElementById('data-fim').value);
        const periodicidade = document.getElementById('periodicidade').value;
        let diasSelecionados = [];

        if (periodicidade === 'dias-semana') {
            diasSelecionados = Array.from(document.querySelectorAll('input[name="dia-semana"]:checked'))
                                     .map(checkbox => checkbox.value);
            if (diasSelecionados.length === 0) {
                alert("Selecione pelo menos um dia da semana para a periodicidade.");
                return;
            }
        }

        if (dataFim <= dataInicio) {
            alert("A data de fim deve ser posterior à data de início.");
            return;
        }

        const plano = criarPlanoLeitura(tituloLivro, totalPaginas, dataInicio, dataFim, periodicidade, diasSelecionados);
        if (plano) {
            salvarPlanoNoFirebase(plano); // Salva no Firebase
            formPlano.reset();
            diasSemanaSelecao.style.display = 'none';
        }
    });

    function criarPlanoLeitura(titulo, totalPaginas, dataInicio, dataFim, periodicidade, diasSemana) {
        const diasPlano = [];
        let dataAtual = new Date(dataInicio);

        while (dataAtual <= dataFim) {
            let diaSemanaAtual = dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' });
            diaSemanaAtual = diaSemanaAtual.split('-')[0];

            let diaValido = false;
            if (periodicidade === 'diario') {
                diaValido = true;
            } else if (periodicidade === 'seg-qua-sex') {
                diaValido = ['segunda', 'quarta', 'sexta'].includes(diaSemanaAtual);
            } else if (periodicidade === 'dias-semana') {
                diaValido = diasSemana.includes(diaSemanaAtual);
            }

            if (diaValido) {
                diasPlano.push({
                    data: new Date(dataAtual),
                    paginas: 0,
                    lido: false
                });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        const totalDiasLeitura = diasPlano.length;
        if (totalDiasLeitura === 0) {
            alert("Não há dias de leitura válidos no período selecionado com a periodicidade escolhida.");
            return null;
        }
        const paginasPorDia = Math.ceil(totalPaginas / totalDiasLeitura);

        diasPlano.forEach(dia => dia.paginas = paginasPorDia);

        return {
            titulo,
            totalPaginas,
            dataInicio: dataInicio.toISOString(), // Salvar datas como string ISO para Firebase
            dataFim: dataFim.toISOString(),
            periodicidade,
            diasPlano: diasPlano.map(dia => ({ data: dia.data.toISOString(), paginas: dia.paginas, lido: dia.lido })), // Salvar datas como string ISO
            paginasLidas: 0
        };
    }


    function renderizarPlanos() {
        listaPlanos.innerHTML = '';

        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda.</p>';
            return;
        }

        planos.forEach((plano, index) => {
            if (!plano) return;

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            planoDiv.dataset.planoIndex = index;

            const progressoPercentual = (plano.paginasLidas / plano.totalPaginas) * 100;

            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3>${plano.titulo}</h3>
                    <div>
                        <button onclick="editarPlano('${plano.id}')">Editar</button>
                        <button onclick="excluirPlano('${plano.id}')">Excluir</button>
                    </div>
                </div>
                <div class="progresso-container">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <div class="dias-leitura">
                    ${renderizarDiasLeitura(plano.diasPlano, plano.id)}
                </div>
            `;
            listaPlanos.appendChild(planoDiv);
        });
    }

    function renderizarDiasLeitura(diasPlano, planoId) {
        let diasHTML = '';
        diasPlano.forEach((dia, diaIndex) => {
            const dataFormatada = new Date(dia.data).toLocaleDateString('pt-BR'); // Converter de volta para Date para formatar
            diasHTML += `
                <div class="dia-leitura">
                    <span>${dataFormatada} - ${dia.paginas} páginas</span>
                    <input type="checkbox" id="dia-${planoId}-${diaIndex}" ${dia.lido ? 'checked' : ''}
                           onchange="marcarDiaLido('${planoId}', ${diaIndex}, this.checked)">
                    <label for="dia-${planoId}-${diaIndex}">Lido</label>
                </div>
            `;
        });
        return diasHTML;
    }

    window.marcarDiaLido = function(planoId, diaIndex, lido) {
        if (!currentUserId) return;

        const planoRef = ref(db, `users/${currentUserId}/planos/${planoId}`);
        onValue(planoRef, (snapshot) => {
            let plano = snapshot.exists() ? snapshot.val() : null;
            if (plano) {
                plano.diasPlano[diaIndex].lido = lido;
                atualizarPaginasLidas(plano);
                update(planoRef, plano).then(() => {
                    // Dados atualizados no Firebase, renderizarPlanos será chamado automaticamente pelo listener onAuthStateChanged
                }).catch((error) => {
                    console.error("Erro ao atualizar dia lido no Firebase:", error);
                    alert("Erro ao atualizar o progresso da leitura.");
                });
            }
        }, {
            onlyOnce: true // Garante que onValue seja chamado apenas uma vez para esta operação
        });
    };


    function atualizarPaginasLidas(plano) {
        let paginasLidas = 0;
        plano.diasPlano.forEach(dia => {
            if (dia.lido) {
                paginasLidas += plano.diasPlano[0].paginas;
            }
        });
        plano.paginasLidas = paginasLidas;
    }


    window.editarPlano = function(planoId) {
        // TODO: Implementar a lógica de edição do plano
        alert(`Funcionalidade de editar plano ${planoId} será implementada em breve.`);
    };

    window.excluirPlano = function(planoId) {
        if (!currentUserId) return;
        if (confirm(`Deseja excluir o plano de leitura?`)) {
            remove(ref(db, `users/${currentUserId}/planos/${planoId}`))
                .then(() => {
                    // Plano excluído do Firebase, renderizarPlanos será chamado automaticamente pelo listener onAuthStateChanged
                })
                .catch((error) => {
                    console.error("Erro ao excluir plano do Firebase:", error);
                    alert("Erro ao excluir o plano de leitura.");
                });
        }
    };


    function salvarPlanoNoFirebase(plano) {
        if (!currentUserId) return;

        const planosRef = ref(db, `users/${currentUserId}/planos`);
        const newPlanoRef = push(planosRef); // Cria um novo nó com ID único
        plano.id = newPlanoRef.key; // Adiciona o ID gerado ao objeto plano
        set(newPlanoRef, plano)
            .then(() => {
                // Plano salvo no Firebase, renderizarPlanos será chamado automaticamente pelo listener onAuthStateChanged
            })
            .catch((error) => {
                console.error("Erro ao salvar plano no Firebase:", error);
                alert("Erro ao salvar o plano de leitura.");
            });
    }


    function carregarPlanosDoFirebase(userId) {
        const planosRef = ref(db, `users/${userId}/planos`);

        onValue(planosRef, (snapshot) => {
            planos = []; // Limpa os planos locais antes de carregar do Firebase
            const data = snapshot.val();
            if (data) {
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        planos.push({...data[key], id: key}); // Adiciona o ID do Firebase ao objeto plano
                    }
                }
            }
            renderizarPlanos();
        });
    }


    // --- Autenticação Firebase ---

    authToggleButton.addEventListener('click', () => {
        authFormDiv.style.display = authFormDiv.style.display === 'none' ? 'block' : 'none';
        authToggleButton.style.display = 'none'; // Esconde o botão "Login" quando o formulário aparece
        userInfoDiv.style.display = 'none'; // Garante que a info do usuário esteja escondida
    });

    loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        console.log("Login button clicked"); // Debugging line
        console.log("Email:", email);         // Debugging line
        console.log("Password:", password);   // Debugging line

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Usuário logado com sucesso
                console.log("Usuário logado:", userCredential.user);
                authFormDiv.style.display = 'none'; // Esconde o formulário de login
                authToggleButton.style.display = 'none'; // Esconde o botão "Login"
                userInfoDiv.style.display = 'block'; // Mostra info do usuário
            })
            .catch((error) => {
                console.error("Erro ao logar:", error);
                alert("Erro ao fazer login: " + error.message);
            });
    });

    signupButton.addEventListener('click', (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Usuário cadastrado com sucesso
                console.log("Usuário cadastrado:", userCredential.user);
                authFormDiv.style.display = 'none'; // Esconde o formulário de login
                authToggleButton.style.display = 'none'; // Esconde o botão "Login"
                userInfoDiv.style.display = 'block'; // Mostra info do usuário
            })
            .catch((error) => {
                console.error("Erro ao cadastrar:", error);
                alert("Erro ao cadastrar usuário: " + error.message);
            });
    });

    forgotPasswordButton.addEventListener('click', (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;

        sendPasswordResetEmail(auth, email)
            .then(() => {
                alert("Link de redefinição de senha enviado para o seu email.");
            })
            .catch((error) => {
                console.error("Erro ao enviar email de redefinição de senha:", error);
                alert("Erro ao enviar email de redefinição de senha: " + error.message);
            });
    });

    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            // Logout bem-sucedido
            console.log("Usuário deslogado.");
        }).catch((error) => {
            console.error("Erro ao deslogar:", error);
            alert("Erro ao fazer logout.");
        });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            currentUserId = user.uid;
            userEmailSpan.textContent = user.email;
            userInfoDiv.style.display = 'block';
            authFormDiv.style.display = 'none';
            authToggleButton.style.display = 'none'; // Esconde o botão "Login"
            carregarPlanosDoFirebase(user.uid); // Carrega planos do Firebase
        } else {
            // Usuário não está logado
            currentUserId = null;
            planos = []; // Limpa os planos locais
            renderizarPlanos(); // Renderiza a lista vazia
            userInfoDiv.style.display = 'none';
            authFormDiv.style.display = 'none'; // Garante que o formulário esteja escondido inicialmente
            authToggleButton.style.display = 'block'; // Mostra o botão "Login"
        }
    });


});
