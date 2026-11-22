const LOCAL_JSON_URL = "./mapa-dados.json";
const $ = id => document.getElementById(id);
const dom = { svg: $('svg'), pecas: $('pecas'), ghost: $('ghost'), rios: $('camada-rios'), aviso: $('aviso'), btnModo: $('btn-modo') };
const state = { cols: 30, rows: 40, cell: 60, mapa: null, board: [], turn: 1, caps: { one: 0, two: 0 }, lastMove: null, landOnly: true };
const setAviso = txt => dom.aviso.textContent = txt;

function initBoard() {
  state.board = Array.from({ length: state.rows + 1 }, () => Array(state.cols + 1).fill(null));
  state.caps = { one: 0, two: 0 };
  state.turn = 1;
  state.lastMove = null;
}

function criarMapaReserva() {
  return {
    config: { colunas: 30, linhas: 40, tamanhoCelula: 60 },
    terrenos: { 1: { nome: "Continente", continente: true } },
    grid: Array.from({ length: 40 }, (_, y) => Array.from({ length: 30 }, (_, x) => (x >= 3 && x <= 28 && y >= 2 && y <= 35 ? 1 : 0))),
    rios: []
  };
}

async function carregarMapa() {
  try {
    const res = await fetch(LOCAL_JSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.mapa = await res.json();
    const cfg = state.mapa.config;
    if (cfg) Object.assign(state, { cols: cfg.colunas || 30, rows: cfg.linhas || 40, cell: cfg.tamanhoCelula || 60 });
    setAviso("Configure os jogadores para começar!");
  } catch (err) {
    console.warn("Usando mapa reserva (mapa-dados.json não encontrado):", err);
    state.mapa = criarMapaReserva();
    setAviso("Mapa carregado em modo offline. Configure os jogadores!");
  }

  initBoard();
  dom.rios.innerHTML = (state.mapa.rios || []).map(r =>
    `<path class="rio" d="${r.vertices.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')}"><title>${r.nome}</title></path>` +
    `<circle cx="${r.nascente.x}" cy="${r.nascente.y}" r="0.14" class="nascente"><title>Nascente: ${r.nome}</title></circle>`
  ).join('');
  render();
}

const celulasAdj = (vx, vy) => [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]].filter(([x, y]) => y >= 0 && y < state.rows && x >= 0 && x < state.cols);

function isLand(vx, vy) {
  return !!state.mapa && celulasAdj(vx, vy).some(([x, y]) => {
    const c = state.mapa.grid?.[y]?.[x] ?? 0;
    return state.mapa.terrenos?.[c]?.continente ?? c > 0;
  });
}

function getBiomaNoVertice(vx, vy) {
  if (!state.mapa) return "";
  for (const [x, y] of celulasAdj(vx, vy)) {
    const c = state.mapa.grid?.[y]?.[x] ?? 0;
    if (c > 0 && state.mapa.terrenos?.[c]) return state.mapa.terrenos[c].nome;
  }
  return "Oceano";
}

const neighbors = (vx, vy) => [[vx, vy - 1], [vx, vy + 1], [vx - 1, vy], [vx + 1, vy]].filter(([x, y]) => x >= 1 && x < state.cols && y >= 1 && y < state.rows && (!state.landOnly || isLand(x, y)));

function getGroup(sx, sy, board) {
  const eq = board[sy][sx]?.equipe, vis = new Set([`${sx},${sy}`]), libs = new Set(), stones = [], q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    stones.push([x, y]);
    for (const [nx, ny] of neighbors(x, y)) {
      const k = `${nx},${ny}`, cell = board[ny][nx];
      if (!cell) libs.add(k);
      else if (cell.equipe === eq && !vis.has(k)) { vis.add(k); q.push([nx, ny]); }
    }
  }
  return { stones, libs: libs.size };
}

function play(vx, vy) {
  const j = getJogadorAtual();
  if (!state.mapa || !j || vx < 1 || vx >= state.cols || vy < 1 || vy >= state.rows) return;
  if (state.landOnly && !isLand(vx, vy)) return setAviso("Jogue apenas nos vértices do continente.");
  if (state.board[vy][vx]) return setAviso("Vértice já ocupado.");

  const next = state.board.map(r => [...r]);
  next[vy][vx] = { equipe: state.turn, cor: j.cor, jogadorId: j.id };
  const opp = state.turn === 1 ? 2 : 1;
  let cap = 0;

  for (const [nx, ny] of neighbors(vx, vy)) {
    if (next[ny][nx]?.equipe === opp) {
      const g = getGroup(nx, ny, next);
      if (!g.libs) { g.stones.forEach(([gx, gy]) => next[gy][gx] = null); cap += g.stones.length; }
    }
  }
  if (!getGroup(vx, vy, next).libs) return setAviso("Jogada inválida (Suicídio): grupo sem liberdades.");

  if (j.equipe === 1) state.caps.one += cap;
  else state.caps.two += cap;

  Object.assign(state, { board: next, lastMove: { x: vx, y: vy }, turn: avancarTurnoAlternado() });
  setAviso(cap ? `Captura! +${cap} ponto(s) para a equipe.` : "");
  render();
}

const shapeSVG = (x, y, eq, cor, ex = "") => eq === 1
  ? `<circle cx="${x}" cy="${y}" r="0.36" fill="${cor}" class="peca ${ex}" />`
  : `<polygon points="${x},${y - 0.42} ${x - 0.38},${y + 0.32} ${x + 0.38},${y + 0.32}" fill="${cor}" class="peca ${ex}" />`;

function render() {
  let html = "";
  for (let y = 1; y < state.rows; y++)
    for (let x = 1; x < state.cols; x++)
      if (state.board[y][x]) html += shapeSVG(x, y, state.board[y][x].equipe, state.board[y][x].cor);

  if (state.lastMove) html += `<circle cx="${state.lastMove.x}" cy="${state.lastMove.y}" r="0.09" class="last" />`;
  dom.pecas.innerHTML = html;
  atualizarPontuacaoEInterface(state.board, state.mapa, state.caps);
}

function getVertex(e) {
  const pt = dom.svg.createSVGPoint();
  Object.assign(pt, { x: e.clientX, y: e.clientY });
  const p = pt.matrixTransform(dom.svg.getScreenCTM().inverse());
  return { vx: Math.round(p.x / state.cell), vy: Math.round(p.y / state.cell) };
}

dom.svg.onmousemove = e => {
  if (!state.mapa) return;
  const { vx, vy } = getVertex(e), j = getJogadorAtual();
  const inB = vx >= 1 && vx < state.cols && vy >= 1 && vy < state.rows;
  const ok = inB && !state.board[vy][vx] && (!state.landOnly || isLand(vx, vy));
  dom.ghost.innerHTML = ok && j ? shapeSVG(vx, vy, state.turn, j.cor, "ghost") : "";
  if (inB) setAviso(`Vértice (${vx}, ${vy}) — Bioma: ${getBiomaNoVertice(vx, vy)}`);
};
dom.svg.onmouseleave = () => dom.ghost.innerHTML = "";
dom.svg.onclick = e => { const { vx, vy } = getVertex(e); play(vx, vy); };

dom.btnModo.onclick = () => {
  state.landOnly = !state.landOnly;
  dom.btnModo.textContent = state.landOnly ? "Só Continente" : "Mapa Completo";
  dom.btnModo.classList.toggle('ativo', state.landOnly);
};
$('btn-pass').onclick = () => { state.turn = avancarTurnoAlternado(); setAviso("Turno passado."); render(); };
$('btn-placar').onclick = () => exibirPlacarGeral(state.caps);
$('btn-reset').onclick = () => $('modal-setup').classList.remove('hidden');

carregarMapa();
