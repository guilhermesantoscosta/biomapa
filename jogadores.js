### Arquivo 2: `jogadores.js`
Copie e salve este código exatamente como **`jogadores.js`** (na mesma pasta do `index.html`):

```javascript
// 8 cores de alto contraste para até 8 jogadores (sem confundir com os biomas do mapa)
const CORES_JOGADORES = [
  "#111827", // 1. Preto Carvão
  "#f8fafc", // 2. Branco Neve
  "#ef4444", // 3. Vermelho Vivo
  "#2563eb", // 4. Azul Royal
  "#9333ea", // 5. Roxo Intenso
  "#f97316", // 6. Laranja Vibrante
  "#ec4899", // 7. Rosa Choque
  "#06b6d4"  // 8. Ciano Elétrico
];

const MAX_JOGADORES = 8;

const OBJETIVOS_AMBIENTAIS = [
  {
    id: "nascentes",
    titulo: "1. Guardião das Nascentes",
    desc1: "● Proteja as nascentes: +3 pts por cada nascente ocupada por Círculos.",
    desc2: "▲ Controle hídrico: +3 pts por cada nascente tomada por Triângulos.",
    educativo: "Nascentes são berços dos rios; sem mata ciliar ao redor, os rios secam.",
    calcular: (board, mapa) => contarPontosNascentes(board, mapa, 3)
  },
  {
    id: "rios",
    titulo: "2. Corredor Fluvial Vivo",
    desc1: "● Defenda o curso dos rios: +2 pts por vértice de rio protegido por Círculos.",
    desc2: "▲ Barragens e rotas: +2 pts por vértice de rio ocupado por Triângulos.",
    educativo: "Rios voadores e bacias hidrográficas conectam e irrigam todo o continente.",
    calcular: (board, mapa) => contarPontosRios(board, mapa, 2)
  },
  {
    id: "amazonia",
    titulo: "3. Pulmão e Clima (Amazônia)",
    desc1: "● Preserve a Amazônia: +2 pts por peça Círculo na floresta amazônica.",
    desc2: "▲ Avanço na Amazônia: +2 pts por peça Triângulo na floresta amazônica.",
    educativo: "A Amazônia regula o regime de chuvas de grande parte da América do Sul.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Amazônia", "Amazonia"], 2)
  },
  {
    id: "cerrado",
    titulo: "4. Berço das Águas (Cerrado)",
    desc1: "● Defenda o Cerrado: +2 pts por peça Círculo na savana mais rica do mundo.",
    desc2: "▲ Ocupação do Cerrado: +2 pts por peça Triângulo neste bioma.",
    educativo: "O Cerrado abastece as principais bacias hidrográficas brasileiras com suas raízes profundas.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Cerrado"], 2)
  },
  {
    id: "pantanal",
    titulo: "5. Santuário Alagado (Pantanal)",
    desc1: "● Proteja o Pantanal: +3 pts por peça Círculo na maior planície alagável.",
    desc2: "▲ Domínio do Pantanal: +3 pts por peça Triângulo nesta área úmida.",
    educativo: "O Pantanal funciona como uma esponja natural que filtra águas e previne enchentes.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Pantanal"], 3)
  },
  {
    id: "mata_atlantica",
    titulo: "6. Corredor da Biodiversidade (Mata Atlântica)",
    desc1: "● Restaure a Mata Atlântica: +3 pts por peça Círculo na faixa costeira.",
    desc2: "▲ Expansão Costeira: +3 pts por peça Triângulo na Mata Atlântica.",
    educativo: "Um dos biomas mais ameaçados do planeta, vital para o abastecimento de água das cidades.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Mata Atlântica", "Mata Atlantica"], 3)
  },
  {
    id: "caatinga",
    titulo: "7. Resiliência do Semiárido (Caatinga)",
    desc1: "● Conserve a Caatinga: +3 pts por peça Círculo neste bioma exclusivamente brasileiro.",
    desc2: "▲ Exploração do Semiárido: +3 pts por peça Triângulo na Caatinga.",
    educativo: "Bioma único no mundo, adaptado à seca e altamente eficiente na captura de carbono.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Caatinga"], 3)
  },
  {
    id: "campos_sul",
    titulo: "8. Sentinela dos Campos (Pampa e Espinal)",
    desc1: "● Proteja os campos nativos: +2 pts por peça Círculo no Pampa ou Espinal.",
    desc2: "▲ Avanço nos campos: +2 pts por peça Triângulo no Pampa ou Espinal.",
    educativo: "Os campos sul-americanos evitam a erosão do solo e abrigam fauna campestre rara.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Pampa", "Espinal"], 2)
  },
  {
    id: "cordilheira",
    titulo: "9. Muralha das Cordilheiras (Andes, Atacama e Valdiviana)",
    desc1: "● Proteja as geleiras e encostas: +2 pts por peça Círculo nos Andes, Atacama ou Valdiviana.",
    desc2: "▲ Rota Transandina: +2 pts por peça Triângulo nesses biomas.",
    educativo: "O degelo controlado dos Andes alimenta grandes rios que descem rumo ao continente.",
    calcular: (board, mapa) => contarPontosBioma(board, mapa, ["Andes", "Atacama", "Valdiviana", "Floresta Valdiviana"], 2)
  },
  {
    id: "diversidade",
    titulo: "10. Mosaico Ecológico (Biodiversidade)",
    desc1: "● Conecte biomas: +4 pts para cada bioma diferente onde houver pelo menos 1 Círculo.",
    desc2: "▲ Presença global: +4 pts para cada bioma diferente onde houver pelo menos 1 Triângulo.",
    educativo: "A conservação exige proteger todos os biomas de forma integrada, não apenas um.",
    calcular: (board, mapa) => contarBiomasDistintos(board, mapa, 4)
  }
];

function contarPontosNascentes(board, mapa, peso) {
  let pts = { team1: 0, team2: 0 };
  if (!mapa || !Array.isArray(mapa.rios)) return pts;
  for (const rio of mapa.rios) {
    const { x, y } = rio.nascente;
    const celula = board[y]?.[x];
    if (celula && celula.equipe === 1) pts.team1 += peso;
    if (celula && celula.equipe === 2) pts.team2 += peso;
  }
  return pts;
}

function contarPontosRios(board, mapa, peso) {
  let pts = { team1: 0, team2: 0 };
  if (!mapa || !Array.isArray(mapa.rios)) return pts;
  const verticesContados = new Set();
  for (const rio of mapa.rios) {
    for (const [x, y] of rio.vertices) {
      const key = `${x},${y}`;
      if (verticesContados.has(key)) continue;
      verticesContados.add(key);
      const celula = board[y]?.[x];
      if (celula && celula.equipe === 1) pts.team1 += peso;
      if (celula && celula.equipe === 2) pts.team2 += peso;
    }
  }
  return pts;
}

function contarPontosBioma(board, mapa, nomesAlvo, peso) {
  let pts = { team1: 0, team2: 0 };
  if (!mapa || typeof getBiomaNoVertice !== 'function') return pts;
  for (let y = 1; y < board.length; y++) {
    for (let x = 1; x < board[y].length; x++) {
      const celula = board[y][x];
      if (!celula) continue;
      const bioma = getBiomaNoVertice(x, y);
      if (nomesAlvo.some(n => bioma.toLowerCase().includes(n.toLowerCase()))) {
        if (celula.equipe === 1) pts.team1 += peso;
        if (celula.equipe === 2) pts.team2 += peso;
      }
    }
  }
  return pts;
}

function contarBiomasDistintos(board, mapa, peso) {
  const set1 = new Set();
  const set2 = new Set();
  if (!mapa || typeof getBiomaNoVertice !== 'function') return { team1: 0, team2: 0 };
  for (let y = 1; y < board.length; y++) {
    for (let x = 1; x < board[y].length; x++) {
      const celula = board[y][x];
      if (!celula) continue;
      const bioma = getBiomaNoVertice(x, y);
      if (bioma && bioma !== "Oceano") {
        if (celula.equipe === 1) set1.add(bioma);
        if (celula.equipe === 2) set2.add(bioma);
      }
    }
  }
  return { team1: set1.size * peso, team2: set2.size * peso };
}

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

  const obterProximaCorDisponivel = () => {
    const coresEmUso = Array.from(lista.querySelectorAll('.input-cor')).map(el => el.value.toLowerCase());
    const livre = CORES_JOGADORES.find(c => !coresEmUso.includes(c.toLowerCase()));
    return livre || CORES_JOGADORES[coresEmUso.length % CORES_JOGADORES.length];
  };

  const atualizarIndicesERegras = () => {
    const linhas = lista.querySelectorAll('.jogador-row');
    linhas.forEach((row, index) => {
      const isCirculo = index % 2 === 0;
      row.querySelector('.badge-equipe').textContent = isCirculo ? '● Defensor' : '▲ Expansão';
      const btnRem = row.querySelector('.btn-remove');
      btnRem.style.display = linhas.length > 2 ? 'inline-block' : 'none';
    });
    btnAdd.disabled = linhas.length >= MAX_JOGADORES;
  };

  const adicionarLinhaJogador = (nomePadrao = "", corPadrao = "") => {
    const qtdAtual = lista.querySelectorAll('.jogador-row').length;
    if (qtdAtual >= MAX_JOGADORES) return;

    const cor = (typeof corPadrao === 'string' && corPadrao.startsWith('#'))
      ? corPadrao
      : obterProximaCorDisponivel();
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

  lista.innerHTML = "";
  adicionarLinhaJogador("Jogador 1", CORES_JOGADORES);
  adicionarLinhaJogador("Jogador 2", CORES_JOGADORES);

  btnAdd.onclick = () => adicionarLinhaJogador();

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
      const objetivo = baralho[i];
      const equipe = i % 2 === 0 ? 1 : 2;
const jogador = { id: i + 1, nome, cor, equipe, objetivo, pontos: 0 };
if (equipe === 1) gameSession.equipe1.push(jogador);
else gameSession.equipe2.push(jogador);
});
document.getElementById('modal-setup').classList.add('hidden');
if (typeof initBoard === 'function') initBoard();
if (typeof render === 'function') render();
};
}
function getJogadorAtual() {
if (gameSession.equipe1.length === 0 && gameSession.equipe2.length === 0) return null;
if (gameSession.equipeAtiva === 1) {
return gameSession.equipe1[gameSession.idx1 % gameSession.equipe1.length];
} else {
return gameSession.equipe2[gameSession.idx2 % gameSession.equipe2.length];
}
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
function atualizarPontuacaoEInterface(board, mapa, caps) {
let totalEquipe1 = caps?.team1 || 0;
let totalEquipe2 = caps?.team2 || 0;
for (const j of gameSession.equipe1) {
const res = j.objetivo.calcular(board, mapa);
j.pontos = res.team1;
totalEquipe1 += j.pontos;
}
for (const j of gameSession.equipe2) {
const res = j.objetivo.calcular(board, mapa);
j.pontos = res.team2;
totalEquipe2 += j.pontos;
}
document.getElementById('c1').textContent = totalEquipe1;
document.getElementById('c2').textContent = totalEquipe2;
const atual = getJogadorAtual();
if (atual) {
const simbolo = atual.equipe === 1 ? "●" : "▲";
const papel = atual.equipe === 1 ? "Defensor" : "Expansão";
document.getElementById('turno').innerHTML = <span class="cor-indicador" style="background: ${atual.cor};"></span> <span>${simbolo} Vez de ${atual.nome} (${papel})</span>;
document.getElementById('obj-titulo').textContent = ${atual.objetivo.titulo} — ${atual.nome};
document.getElementById('obj-desc').innerHTML = ${atual.equipe === 1 ? atual.objetivo.desc1 : atual.objetivo.desc2}<br> <em>💡 Sabia? ${atual.objetivo.educativo}</em>;
document.getElementById('obj-pts').textContent = Missão: +${atual.pontos} pts;
}
}
function exibirPlacarGeral(caps) {
const linhas = [
=== PLACAR GERAL ===,
Capturas: ● Defensores (${caps?.team1 || 0} pts) | ▲ Expansão (${caps?.team2 || 0} pts)\n,
--- EQUIPE CÍRCULO (DEFENSORES) ---,
...gameSession.equipe1.map(j => ● ${j.nome}: ${j.pontos} pts (${j.objetivo.titulo})),
\n--- EQUIPE TRIÂNGULO (EXPANSÃO) ---,
...gameSession.equipe2.map(j => ▲ ${j.nome}: ${j.pontos} pts (${j.objetivo.titulo}))
];
alert(linhas.join('\n'));
}
configurarLobby();
