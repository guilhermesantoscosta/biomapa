function configurarLobby() {
  const lista = document.getElementById('lista-jogadores');
  const btnAdd = document.getElementById('btn-add-jogador');
  const btnIniciar = document.getElementById('btn-iniciar');

  if (!lista || !btnAdd || !btnIniciar) return;

  const atualizarIndicesERegras = () => {
    const linhas = lista.querySelectorAll('.jogador-row');
    linhas.forEach((row, index) => {
      const isCirculo = index % 2 === 0;
      row.querySelector('.badge-equipe').textContent = isCirculo ? '● Defensor' : '▲ Expansão';
      const btnRem = row.querySelector('.btn-remove');
      btnRem.style.display = linhas.length > 2 ? 'inline-block' : 'none';
    });
    btnAdd.disabled = linhas.length >= 16;
  };

  const adicionarLinhaJogador = (nomePadrao = "", corPadrao = "") => {
    const qtdAtual = lista.querySelectorAll('.jogador-row').length;
    if (qtdAtual >= 16) return;

    const cor = (typeof corPadrao === 'string' && corPadrao.startsWith('#')) 
      ? corPadrao 
      : CORES_PADRAO[qtdAtual % CORES_PADRAO.length];
    const nome = nomePadrao || `Jogador ${qtdAtual + 1}`;

    const row = document.createElement('div');
    row.className = 'jogador-row';
    row.innerHTML = `
      <span class="badge-equipe"></span>
      <input type="text" class="input-nome" value="${nome}" placeholder="Nome do jogador" maxlength="20" />
      <input type="color" class="input-cor" value="${cor}" title="Escolha a cor da peça" />
      <button type="button" class="btn-remove" title="Remover jogador">✕</button>
    `;

    row.querySelector('.btn-remove').onclick = () => {
      row.remove();
      atualizarIndicesERegras();
    };

    lista.appendChild(row);
    atualizarIndicesERegras();
  };

  // Inicia com 2 jogadores padrão (agora passando uma cor válida de cada vez)
  lista.innerHTML = "";
  adicionarLinhaJogador("Jogador 1", "#111827");
  adicionarLinhaJogador("Jogador 2", "#f8fafc");

  btnAdd.onclick = (e) => {
    e.preventDefault();
    adicionarLinhaJogador();
  };

  btnIniciar.onclick = () => {
    const linhas = lista.querySelectorAll('.jogador-row');
    if (linhas.length < 2) return;

    const baralho = [...OBJETIVOS_AMBIENTAIS].sort(() => Math.random() - 0.5);

    gameSession.equipe1 = [];
    gameSession.equipe2 = [];
    gameSession.idx1 = 0;
    gameSession.idx2 = 0;
    gameSession.equipeAtiva = 1;

    linhas.forEach((row, i) => {
      const nome = row.querySelector('.input-nome').value.trim() || `Jogador ${i + 1}`;
      const cor = row.querySelector('.input-cor').value;
      const objetivo = baralho[i % baralho.length];
      const equipe = i % 2 === 0 ? 1 : 2;

      const jogador = { id: i + 1, nome, cor, equipe, objetivo, pontos: 0 };
      if (equipe === 1) gameSession.equipe1.push(jogador);
      else gameSession.equipe2.push(jogador);
    });

    document.getElementById('modal-setup').classList.add('hidden');
    if (typeof initBoard === 'function') {
      initBoard();
      render();
    }
  };
}
