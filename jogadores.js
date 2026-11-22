const PERFIS_FIXOS = [
  { nomePadrao: "Jogador 1", cor: "#111827", equipe: 1 }, // Preto Carvão (Defensor)
  { nomePadrao: "Jogador 2", cor: "#f8fafc", equipe: 2 }, // Branco Neve (Expansão)
  { nomePadrao: "Jogador 3", cor: "#ef4444", equipe: 1 }, // Vermelho Vivo (Defensor)
  { nomePadrao: "Jogador 4", cor: "#2563eb", equipe: 2 }  // Azul Royal (Expansão)
];

const gameSession = {
  equipe1: [],
  equipe2: [],
  idx1: 0,
  idx2: 0,
  equipeAtiva: 1
};

function configurarLobby() {
  const lista = document.getElementById('lista-jogadores');
  const btnAdd = document.getElementById('btn-add-jogador');
  const btnIniciar = document.getElementById('btn-iniciar');

  const atualizarRegras = () => {
    const linhas = lista.querySelectorAll('.jogador-row');
    linhas.forEach((row, index) => {
      const perfil = PERFIS_FIXOS[index];
      const badge = row.querySelector('.badge-equipe');
      badge.textContent = perfil.equipe === 1 ? '● Defensor' : '▲ Expansão';
      badge.className = `badge-equipe ${perfil.equipe === 1 ? 'badge-defensor' : 'badge-expansao'}`;
      row.querySelector('.cor-fixa').style.background = perfil.cor;
      row.dataset.cor = perfil.cor;
      row.dataset.equipe = perfil.equipe;

      const btnRem = row.querySelector('.btn-remove');
      btnRem.style.display = linhas.length > 2 ? 'inline-block' : 'none';
    });

    btnAdd.disabled = linhas.length >= 4;
    btnAdd.textContent = `+ Jogador (${linhas.length}/4)`;
  };

  const adicionarJogador = () => {
    const qtd = lista.querySelectorAll('.jogador-row').length;
    if (qtd >= 4) return;

    const perfil = PERFIS_FIXOS[qtd];
    const row = document.createElement('div');
    row.className = 'jogador-row';
    row.innerHTML = `
      <span class="badge-equipe"></span>
      <span class="cor-fixa"></span>
      <input type="text" class="input-nome" value="${perfil.nomePadrao}" placeholder="Nome" maxlength="18" />
      <button type="button" class="btn-remove" title="Remover">✕</button>
    `;

    row.querySelector('.btn-remove').onclick = () => {
      row.remove();
      atualizarRegras();
    };

    lista.appendChild(row);
    atualizarRegras();
  };

  lista.innerHTML = "";
  adicionarJogador();
  adicionarJogador();

  btnAdd.onclick = adicionarJogador;

  btnIniciar.onclick = () => {
    const linhas = lista.querySelectorAll('.jogador-row');
    if (linhas.length < 2) return;

    gameSession.equipe1 = [];
    gameSession.equipe2 = [];
    gameSession.idx1 = 0;
    gameSession.idx2 = 0;
    gameSession.equipeAtiva = 1;

    linhas.forEach((row, i) => {
      const nome = row.querySelector('.input-nome').value.trim() || `Jogador ${i + 1}`;
      const cor = row.dataset.cor;
      const equipe = Number(row.dataset.equipe);
      const jogador = { id: i + 1, nome, cor, equipe };

      if (equipe === 1) gameSession.equipe1.push(jogador);
      else gameSession.equipe2.push(jogador);
    });

    document.getElementById('modal-setup').classList.add('hidden');
    if (typeof initBoard === 'function') initBoard();
    if (typeof render === 'function') render();
  };
}

function getJogadorAtual() {
  if (gameSession.equipeAtiva === 1) {
    return gameSession.equipe1[gameSession.idx1 % gameSession.equipe1.length] || null;
  }
  return gameSession.equipe2[gameSession.idx2 % gameSession.equipe2.length] || null;
}

function avancarTurnoAlternado() {
  if (gameSession.equipeAtiva === 1) {
    gameSession.idx1++;
    gameSession.equipeAtiva = 2;
  } else {
    gameSession.idx2++;
    gameSession.equipeAtiva = 1;
  }
  return gameSession.equipeAtiva;
}

function atualizarPontuacaoEInterface(caps) {
  document.getElementById('c1').textContent = caps?.team1 || 0;
  document.getElementById('c2').textContent = caps?.team2 || 0;

  const atual = getJogadorAtual();
  if (atual) {
    const simbolo = atual.equipe === 1 ? "●" : "▲";
    const papel = atual.equipe === 1 ? "Defensor" : "Expansão";
    document.getElementById('turno').innerHTML = `
      <span class="cor-indicador" style="background: ${atual.cor};"></span>
      <span>${simbolo} Vez de ${atual.nome} (${papel})</span>
    `;
  }
}

configurarLobby();
