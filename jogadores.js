const CORES = ["#111827","#f8fafc","#ef4444","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1","#14b8a6","#e11d48","#a855f7","#eab308"];

const OBJETIVOS_AMBIENTAIS = [
  { titulo: "1. Guardião das Nascentes", desc1: "● Proteja nascentes (+3 pts/nascente).", desc2: "▲ Controle hídrico (+3 pts/nascente).", edu: "Nascentes são berços dos rios; sem mata ciliar ao redor, os rios secam.", calc: (b, m) => ptsLista(b, m?.rios?.map(r => [r.nascente.x, r.nascente.y]), 3) },
  { titulo: "2. Corredor Fluvial Vivo", desc1: "● Defenda o curso dos rios (+2 pts/vértice).", desc2: "▲ Barragens e rotas (+2 pts/vértice).", edu: "Rios voadores e bacias hidrográficas conectam e irrigam todo o continente.", calc: (b, m) => ptsLista(b, m?.rios?.flatMap(r => r.vertices), 2) },
  { titulo: "3. Pulmão e Clima (Amazônia)", desc1: "● Preserve a Amazônia (+2 pts/peça).", desc2: "▲ Avanço na Amazônia (+2 pts/peça).", edu: "A Amazônia regula o regime de chuvas de grande parte da América do Sul.", calc: (b, m) => ptsBioma(b, m, ["amazônia", "amazonia"], 2) },
  { titulo: "4. Berço das Águas (Cerrado)", desc1: "● Defenda o Cerrado (+2 pts/peça).", desc2: "▲ Ocupação do Cerrado (+2 pts/peça).", edu: "O Cerrado abastece as principais bacias hidrográficas brasileiras com suas raízes profundas.", calc: (b, m) => ptsBioma(b, m, ["cerrado"], 2) },
  { titulo: "5. Santuário Alagado (Pantanal)", desc1: "● Proteja o Pantanal (+3 pts/peça).", desc2: "▲ Domínio do Pantanal (+3 pts/peça).", edu: "O Pantanal funciona como uma esponja natural que filtra águas e previne enchentes.", calc: (b, m) => ptsBioma(b, m, ["pantanal"], 3) },
  { titulo: "6. Corredor da Biodiversidade (Mata Atlântica)", desc1: "● Restaure a Mata Atlântica (+3 pts/peça).", desc2: "▲ Expansão Costeira (+3 pts/peça).", edu: "Um dos biomas mais ameaçados do planeta, vital para o abastecimento de água das cidades.", calc: (b, m) => ptsBioma(b, m, ["mata atlântica", "mata atlantica"], 3) },
  { titulo: "7. Resiliência do Semiárido (Caatinga)", desc1: "● Conserve a Caatinga (+3 pts/peça).", desc2: "▲ Exploração do Semiárido (+3 pts/peça).", edu: "Bioma único no mundo, adaptado à seca e altamente eficiente na captura de carbono.", calc: (b, m) => ptsBioma(b, m, ["caatinga"], 3) },
  { titulo: "8. Sentinela dos Campos (Pampa/Espinal)", desc1: "● Proteja os campos nativos (+2 pts/peça).", desc2: "▲ Avanço nos campos (+2 pts/peça).", edu: "Os campos sul-americanos evitam a erosão do solo e abrigam fauna campestre rara.", calc: (b, m) => ptsBioma(b, m, ["pampa", "espinal"], 2) },
  { titulo: "9. Muralha das Cordilheiras", desc1: "● Proteja Andes/Atacama/Valdiviana (+2 pts/peça).", desc2: "▲ Rota Transandina (+2 pts/peça).", edu: "O degelo controlado dos Andes alimenta grandes rios que descem rumo ao continente.", calc: (b, m) => ptsBioma(b, m, ["andes", "atacama", "valdiviana"], 2) },
  { titulo: "10. Mosaico Ecológico", desc1: "● Conecte biomas (+4 pts/bioma diferente).", desc2: "▲ Presença global (+4 pts/bioma diferente).", edu: "A conservação exige proteger todos os biomas de forma integrada, não apenas um.", calc: (b, m) => ptsDiversidade(b, m, 4) }
];

function ptsLista(board, coords = [], peso) {
  const pts = { 1: 0, 2: 0 }, vistos = new Set();
  for (const [x, y] of coords) {
    const k = `${x},${y}`, eq = board[y]?.[x]?.equipe;
    if (!vistos.has(k) && eq) { vistos.add(k); pts[eq] += peso; }
  }
  return pts;
}

function iterarTabuleiro(board, mapa, fn) {
  if (!mapa) return;
  for (let y = 1; y < board.length; y++)
    for (let x = 1; x < board[y].length; x++)
      if (board[y][x]) fn(board[y][x].equipe, getBiomaNoVertice(x, y));
}

function ptsBioma(board, mapa, alvos, peso) {
  const pts = { 1: 0, 2: 0 };
  iterarTabuleiro(board, mapa, (eq, b) => {
    if (alvos.some(a => b.toLowerCase().includes(a))) pts[eq] += peso;
  });
  return pts;
}

function ptsDiversidade(board, mapa, peso) {
  const s = { 1: new Set(), 2: new Set() };
  iterarTabuleiro(board, mapa, (eq, b) => { if (b && b !== "Oceano") s[eq].add(b); });
  return { 1: s[1].size * peso, 2: s[2].size * peso };
}

const session = { eq1: [], eq2: [], i1: 0, i2: 0, ativa: 1 };

function configurarLobby() {
  const lista = document.getElementById('lista-jogadores'), btnAdd = document.getElementById('btn-add-jogador');

  const atualizarUI = () => {
    const rows = lista.querySelectorAll('.jogador-row');
    rows.forEach((r, i) => {
      r.querySelector('.badge-equipe').textContent = i % 2 === 0 ? '● Defensor' : '▲ Expansão';
      r.querySelector('.btn-remove').style.display = rows.length > 2 ? 'inline-block' : 'none';
    });
    btnAdd.disabled = rows.length >= 16;
  };

  const addJogador = () => {
    const n = lista.querySelectorAll('.jogador-row').length;
    if (n >= 16) return;
    const row = document.createElement('div');
    row.className = 'jogador-row';
    row.innerHTML = `<span class="badge-equipe"></span><input type="text" class="in-nome" value="Jogador ${n + 1}" maxlength="20"><input type="color" class="in-cor" value="${CORES[n % CORES.length]}"><button type="button" class="btn-remove">✕</button>`;
    row.querySelector('.btn-remove').onclick = () => { row.remove(); atualizarUI(); };
    lista.appendChild(row);
    atualizarUI();
  };

  lista.innerHTML = "";
  addJogador(); addJogador();
  btnAdd.onclick = addJogador;

  document.getElementById('btn-iniciar').onclick = () => {
    const rows = lista.querySelectorAll('.jogador-row');
    const baralho = [...OBJETIVOS_AMBIENTAIS].sort(() => Math.random() - 0.5);
    Object.assign(session, { eq1: [], eq2: [], i1: 0, i2: 0, ativa: 1 });

    rows.forEach((r, i) => {
      const eq = i % 2 === 0 ? 1 : 2;
      const j = { id: i + 1, nome: r.querySelector('.in-nome').value.trim() || `Jogador ${i + 1}`, cor: r.querySelector('.in-cor').value, equipe: eq, obj: baralho[i % baralho.length], pts: 0 };
      (eq === 1 ? session.eq1 : session.eq2).push(j);
    });

    document.getElementById('modal-setup').classList.add('hidden');
    if (typeof initBoard === 'function') { initBoard(); render(); }
  };
}

const getJogadorAtual = () => session.ativa === 1 ? session.eq1[session.i1 % session.eq1.length] : session.eq2[session.i2 % session.eq2.length];

function avancarTurnoAlternado() {
  session.ativa === 1 ? session.i1++ : session.i2++;
  return (session.ativa = session.ativa === 1 ? 2 : 1);
}

function atualizarPontuacaoEInterface(board, mapa, caps) {
  const soma = (eq, cap) => eq.reduce((acc, j) => acc + (j.pts = j.obj.calc(board, mapa)[j.equipe]), cap);
  document.getElementById('c1').textContent = soma(session.eq1, caps[1]);
  document.getElementById('c2').textContent = soma(session.eq2, caps[2]);

  const j = getJogadorAtual();
  if (!j) return;
  document.getElementById('turno').innerHTML = `<span class="cor-indicador" style="background:${j.cor}"></span><span>${j.equipe === 1 ? "●" : "▲"} Vez de ${j.nome} (${j.equipe === 1 ? "Defensor" : "Expansão"})</span>`;
  document.getElementById('obj-titulo').textContent = `${j.obj.titulo} — ${j.nome}`;
  document.getElementById('obj-desc').innerHTML = `${j.equipe === 1 ? j.obj.desc1 : j.obj.desc2}<br><em>💡 Sabia? ${j.obj.edu}</em>`;
  document.getElementById('obj-pts').textContent = `Missão: +${j.pts} pts`;
}

function exibirPlacarGeral(caps) {
  const fmt = (eq, ic) => eq.map(j => `${ic} ${j.nome}: ${j.pts} pts (${j.obj.titulo})`).join('\n');
  alert(`=== PLACAR GERAL ===\nCapturas: ● Defensores (${caps[1]} pts) | ▲ Expansão (${caps[2]} pts)\n\n--- DEFENSORES ---\n${fmt(session.eq1, "●")}\n\n--- EXPANSÃO ---\n${fmt(session.eq2, "▲")}`);
}

window.addEventListener('DOMContentLoaded', configurarLobby);
