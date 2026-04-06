(function () {
  'use strict';

  // ── KaTeX ──────────────────────────────────────────────────────────────────
  const K = window.katex;
  function kr(id, tex) {
    K.render(tex, document.getElementById(id), { throwOnError: false, displayMode: true });
  }
  kr('eq-bpr', '\\hat{\\theta}_{BPR} = \\underset{\\theta}{\\arg\\min}\\; \\ell_{\\text{BPR}}(\\theta)');
  kr('eq-spo', '\\hat{\\theta}_{SPO+} = \\underset{\\theta}{\\arg\\min}\\; \\ell_{\\text{SPO+}}(\\theta)');

  // ── Data: Massachusetts PG ───────────────────────────────────────────────
  const MA_PG_REGRET = [
    [0.00, 0.0963], [0.02, 0.2169], [0.04, 0.0000], [0.06, 0.4653], [0.08, 0.4680],
    [0.10, 0.5788], [0.12, 0.6697], [0.14, 0.6697], [0.16, 0.6697], [0.18, 0.7057],
    [0.20, 0.7453], [0.22, 0.8173], [0.24, 0.8173], [0.26, 0.8173], [0.28, 0.8173],
    [0.30, 0.8740], [0.32, 0.8740], [0.34, 0.8740], [0.36, 0.8560], [0.38, 0.8740],
    [0.40, 0.8740], [0.42, 0.8740], [0.44, 0.8740], [0.46, 0.9460], [0.48, 0.9460],
    [0.50, 0.9460], [0.52, 0.9460], [0.54, 0.9460], [0.56, 0.9460], [0.58, 0.9460],
    [0.60, 0.9100], [0.62, 0.9280], [0.64, 0.9460], [0.66, 0.9460], [0.68, 0.9100],
    [0.70, 1.0000], [0.72, 0.9280], [0.74, 0.8731], [0.76, 0.7993], [0.78, 0.7795],
    [0.80, 0.8533], [0.82, 0.7984], [0.84, 0.8920], [0.86, 0.8542], [0.88, 0.8866],
    [0.90, 0.9091], [0.92, 0.7975], [0.94, 0.7786], [0.96, 0.7426], [0.98, 0.8731],
    [1.00, 0.8326]
  ];

  const MA_PG_LOSS = [
    [0.00, 0.1793], [0.02, 0.4805], [0.04, 0.6160], [0.06, 0.7900], [0.08, 0.5226],
    [0.10, 0.5724], [0.12, 1.0000], [0.14, 0.3705], [0.16, 0.6714], [0.18, 0.6405],
    [0.20, 0.7530], [0.22, 0.1801], [0.24, 0.6178], [0.26, 0.4277], [0.28, 0.5745],
    [0.30, 0.7445], [0.32, 0.5364], [0.34, 0.8836], [0.36, 0.5081], [0.38, 0.5997],
    [0.40, 0.3665], [0.42, 0.7459], [0.44, 0.5614], [0.46, 0.5940], [0.48, 0.5310],
    [0.50, 0.5389], [0.52, 0.3990], [0.54, 0.4307], [0.56, 0.5403], [0.58, 0.3653],
    [0.60, 0.5619], [0.62, 0.7082], [0.64, 0.5014], [0.66, 0.2684], [0.68, 0.6299],
    [0.70, 0.3681], [0.72, 0.5889], [0.74, 0.4589], [0.76, 0.0000], [0.78, 0.5047],
    [0.80, 0.5503], [0.82, 0.2989], [0.84, 0.3216], [0.86, 0.5004], [0.88, 0.4212],
    [0.90, 0.5031], [0.92, 0.6254], [0.94, 0.1932], [0.96, 0.9038], [0.98, 0.7201],
    [1.00, 0.3898]
  ];

  // ── Data: Aransas Cranes SPO+ ─────────────────────────────────────────────
  const ASURV_SPO_REGRET = [
    [0.00, 0.0403], [0.02, 0.0451], [0.04, 0.0451], [0.06, 0.0211], [0.08, 0.0211],
    [0.10, 0.0211], [0.12, 0.0451], [0.14, 0.0211], [0.16, 0.0097], [0.18, 0.0565],
    [0.20, 0.0347], [0.22, 0.0221], [0.24, 0.0221], [0.26, 0.0420], [0.28, 0.0438],
    [0.30, 0.0677], [0.32, 0.0677], [0.34, 0.0461], [0.36, 0.0554], [0.38, 0.0754],
    [0.40, 0.0988], [0.42, 0.0440], [0.44, 0.0988], [0.46, 0.0434], [0.48, 0.0086],
    [0.50, 0.0354], [0.52, 0.0000], [0.54, 0.0000], [0.56, 0.0240], [0.58, 0.1028],
    [0.60, 0.0942], [0.62, 0.0874], [0.64, 0.1227], [0.66, 0.0698], [0.68, 0.0661],
    [0.70, 0.0904], [0.72, 0.0854], [0.74, 0.1046], [0.76, 0.0797], [0.78, 0.1221],
    [0.80, 0.1227], [0.82, 0.1444], [0.84, 0.1871], [0.86, 0.1527], [0.88, 0.2394],
    [0.90, 0.3415], [0.92, 0.4217], [0.94, 0.5662], [0.96, 0.7652], [0.98, 0.8096],
    [1.00, 1.0000]
  ];

  const ASURV_SPO_LOSS = [
    [0.00, 0.9971], [0.02, 0.9989], [0.04, 1.0000], [0.06, 0.9977], [0.08, 0.9964],
    [0.10, 0.9975], [0.12, 0.9915], [0.14, 0.9945], [0.16, 0.9911], [0.18, 0.9890],
    [0.20, 0.9844], [0.22, 0.9834], [0.24, 0.9808], [0.26, 0.9768], [0.28, 0.9773],
    [0.30, 0.9625], [0.32, 0.9614], [0.34, 0.9518], [0.36, 0.9450], [0.38, 0.9400],
    [0.40, 0.9267], [0.42, 0.9247], [0.44, 0.9110], [0.46, 0.9037], [0.48, 0.8927],
    [0.50, 0.8898], [0.52, 0.8766], [0.54, 0.8601], [0.56, 0.8524], [0.58, 0.8408],
    [0.60, 0.8282], [0.62, 0.8041], [0.64, 0.7986], [0.66, 0.7765], [0.68, 0.7544],
    [0.70, 0.7322], [0.72, 0.7223], [0.74, 0.6706], [0.76, 0.6411], [0.78, 0.6140],
    [0.80, 0.5220], [0.82, 0.4903], [0.84, 0.4464], [0.86, 0.3723], [0.88, 0.3564],
    [0.90, 0.2918], [0.92, 0.2601], [0.94, 0.1087], [0.96, 0.1557], [0.98, 0.1133],
    [1.00, 0.0000]
  ];

  // ── Colors ─────────────────────────────────────────────────────────────────
  const TEAL = '#50c8a8', PURPLE = '#7c6af7', CORAL = '#ff7c57';
  const BG = '#11111e', MUTED = '#888899', LABEL = '#c8c8de';
  const GRID = '#22223a', FONT = 'Inter, system-ui, sans-serif';

  // ── Data: Cook County SPO+ ─────────────────────────────────────────────────
  const COOK_SPO_REGRET = [
    [0.00, 0.0971], [0.02, 0.0451], [0.04, 0.0000], [0.06, 0.0175], [0.08, 0.0520],
    [0.10, 0.0520], [0.12, 0.1150], [0.14, 0.0611], [0.16, 0.0349], [0.18, 0.0789],
    [0.20, 0.1070], [0.22, 0.0698], [0.24, 0.0516], [0.26, 0.1316], [0.28, 0.1074],
    [0.30, 0.0800], [0.32, 0.0804], [0.34, 0.1415], [0.36, 0.0349], [0.38, 0.0539],
    [0.40, 0.1241], [0.42, 0.1244], [0.44, 0.1248], [0.46, 0.1863], [0.48, 0.1426],
    [0.50, 0.0706], [0.52, 0.0618], [0.54, 0.1066], [0.56, 0.1161], [0.58, 0.0713],
    [0.60, 0.0892], [0.62, 0.0812], [0.64, 0.0542], [0.66, 0.0622], [0.68, 0.0998],
    [0.70, 0.0645], [0.72, 0.0459], [0.74, 0.0736], [0.76, 0.0725], [0.78, 0.0736],
    [0.80, 0.1096], [0.82, 0.1085], [0.84, 0.1700], [0.86, 0.1703], [0.88, 0.2511],
    [0.90, 0.3403], [0.92, 0.3562], [0.94, 0.6430], [0.96, 0.6620], [0.98, 0.7242],
    [1.00, 1.0000]
  ];

  const COOK_SPO_LOSS = [
    [0.00, 1.0000], [0.02, 0.9879], [0.04, 0.9766], [0.06, 0.9625], [0.08, 0.9506],
    [0.10, 0.9366], [0.12, 0.9259], [0.14, 0.9086], [0.16, 0.9000], [0.18, 0.8781],
    [0.20, 0.8630], [0.22, 0.8489], [0.24, 0.8345], [0.26, 0.8165], [0.28, 0.7989],
    [0.30, 0.7805], [0.32, 0.7626], [0.34, 0.7386], [0.36, 0.7243], [0.38, 0.6971],
    [0.40, 0.6749], [0.42, 0.6530], [0.44, 0.6311], [0.46, 0.6061], [0.48, 0.5842],
    [0.50, 0.5592], [0.52, 0.5305], [0.54, 0.5024], [0.56, 0.4804], [0.58, 0.4511],
    [0.60, 0.4230], [0.62, 0.3959], [0.64, 0.3613], [0.66, 0.3341], [0.68, 0.3045],
    [0.70, 0.2764], [0.72, 0.2436], [0.74, 0.2233], [0.76, 0.1956], [0.78, 0.1689],
    [0.80, 0.1522], [0.82, 0.1192], [0.84, 0.1061], [0.86, 0.0810], [0.88, 0.0581],
    [0.90, 0.0377], [0.92, 0.0214], [0.94, 0.0101], [0.96, 0.0121], [0.98, 0.0000],
    [1.00, 0.0194]
  ];

  // ── Data: Cook County PG ───────────────────────────────────────────────────
  const COOK_PG_REGRET = [
    [0.00, 0.3593], [0.02, 0.2443], [0.04, 0.4408], [0.06, 0.4144], [0.08, 0.2192],
    [0.10, 0.3306], [0.12, 0.2515], [0.14, 0.4216], [0.16, 0.3641], [0.18, 0.2767],
    [0.20, 0.1389], [0.22, 0.2503], [0.24, 0.1677], [0.26, 0.1066], [0.28, 0.1916],
    [0.30, 0.1365], [0.32, 0.1928], [0.34, 0.2228], [0.36, 0.0491], [0.38, 0.1365],
    [0.40, 0.1928], [0.42, 0.1928], [0.44, 0.1916], [0.46, 0.1354], [0.48, 0.1916],
    [0.50, 0.2767], [0.52, 0.1354], [0.54, 0.0000], [0.56, 0.1940], [0.58, 0.3629],
    [0.60, 0.2204], [0.62, 0.1641], [0.64, 0.2503], [0.66, 0.4455], [0.68, 0.3354],
    [0.70, 0.2767], [0.72, 0.5593], [0.74, 0.3940], [0.76, 0.7365], [0.78, 0.5030],
    [0.80, 0.6192], [0.82, 0.6515], [0.84, 0.9365], [0.86, 0.8539], [0.88, 0.7928],
    [0.90, 0.8862], [0.92, 0.9389], [0.94, 0.8826], [0.96, 0.9976], [0.98, 1.0000],
    [1.00, 0.9952]
  ];

  const COOK_PG_LOSS = [
    [0.00, 0.9935], [0.02, 0.9702], [0.04, 0.9778], [0.06, 1.0000], [0.08, 0.9572],
    [0.10, 0.8850], [0.12, 0.8755], [0.14, 0.9408], [0.16, 0.8087], [0.18, 0.8827],
    [0.20, 0.7976], [0.22, 0.8085], [0.24, 0.7880], [0.26, 0.7504], [0.28, 0.7026],
    [0.30, 0.7795], [0.32, 0.7160], [0.34, 0.6933], [0.36, 0.7082], [0.38, 0.6308],
    [0.40, 0.5977], [0.42, 0.5930], [0.44, 0.5600], [0.46, 0.5238], [0.48, 0.5372],
    [0.50, 0.5345], [0.52, 0.4913], [0.54, 0.4670], [0.56, 0.4322], [0.58, 0.4556],
    [0.60, 0.4100], [0.62, 0.3425], [0.64, 0.3540], [0.66, 0.3707], [0.68, 0.3152],
    [0.70, 0.2557], [0.72, 0.2586], [0.74, 0.2683], [0.76, 0.2598], [0.78, 0.2097],
    [0.80, 0.2477], [0.82, 0.1738], [0.84, 0.1854], [0.86, 0.1349], [0.88, 0.0760],
    [0.90, 0.1262], [0.92, 0.0145], [0.94, 0.0680], [0.96, 0.0275], [0.98, 0.0000],
    [1.00, 0.0528]
  ];

  // ── Data: Massachusetts SPO+ ──────────────────────────────────────────────
  const MA_SPO_REGRET = [
    [0.00, 0.2231], [0.02, 0.4029], [0.04, 0.4132], [0.06, 0.8512], [0.08, 0.8182],
    [0.10, 0.0000], [0.12, 0.6446], [0.14, 0.7748], [0.16, 0.6467], [0.18, 0.3533],
    [0.20, 0.2273], [0.22, 0.6095], [0.24, 0.5351], [0.26, 0.3595], [0.28, 0.2748],
    [0.30, 0.2314], [0.32, 0.5744], [0.34, 0.6219], [0.36, 0.4050], [0.38, 0.7045],
    [0.40, 1.0000], [0.42, 0.5826], [0.44, 0.6219], [0.46, 0.6653], [0.48, 0.5806],
    [0.50, 0.6653], [0.52, 0.7066], [0.54, 0.7066], [0.56, 0.6653], [0.58, 0.7479],
    [0.60, 0.8719], [0.62, 0.7500], [0.64, 0.7479], [0.66, 0.7045], [0.68, 0.5826],
    [0.70, 0.7025], [0.72, 0.6178], [0.74, 0.7066], [0.76, 0.6612], [0.78, 0.4938],
    [0.80, 0.6612], [0.82, 0.6198], [0.84, 0.6178], [0.86, 0.4938], [0.88, 0.5764],
    [0.90, 0.5764], [0.92, 0.6178], [0.94, 0.6198], [0.96, 0.6198], [0.98, 0.6591],
    [1.00, 0.6198]
  ];

  const MA_SPO_LOSS = [
    [0.00, 1.0000], [0.02, 0.9677], [0.04, 0.9298], [0.06, 0.8930], [0.08, 0.8615],
    [0.10, 0.8131], [0.12, 0.7846], [0.14, 0.7507], [0.16, 0.7124], [0.18, 0.6723],
    [0.20, 0.6417], [0.22, 0.6059], [0.24, 0.5616], [0.26, 0.5222], [0.28, 0.4812],
    [0.30, 0.4453], [0.32, 0.4024], [0.34, 0.3664], [0.36, 0.3335], [0.38, 0.2766],
    [0.40, 0.2538], [0.42, 0.2173], [0.44, 0.1883], [0.46, 0.1406], [0.48, 0.1294],
    [0.50, 0.0920], [0.52, 0.0809], [0.54, 0.0659], [0.56, 0.0593], [0.58, 0.0546],
    [0.60, 0.0532], [0.62, 0.0247], [0.64, 0.0251], [0.66, 0.0252], [0.68, 0.0197],
    [0.70, 0.0137], [0.72, 0.0053], [0.74, 0.0032], [0.76, 0.0011], [0.78, 0.0093],
    [0.80, 0.0023], [0.82, 0.0039], [0.84, 0.0038], [0.86, 0.0034], [0.88, 0.0000],
    [0.90, 0.0129], [0.92, 0.0082], [0.94, 0.0124], [0.96, 0.0082], [0.98, 0.0196],
    [1.00, 0.0220]
  ];

  // ── Data: Aransas Cranes PG ───────────────────────────────────────────────
  const ASURV_PG_REGRET = [
    [0.00, 0.1451], [0.02, 0.1011], [0.04, 0.0000], [0.06, 0.1528], [0.08, 0.0438],
    [0.10, 0.1165], [0.12, 0.1165], [0.14, 0.1165], [0.16, 0.1405], [0.18, 0.1223],
    [0.20, 0.1570], [0.22, 0.0614], [0.24, 0.0961], [0.26, 0.1204], [0.28, 0.0841],
    [0.30, 0.0841], [0.32, 0.1081], [0.34, 0.1418], [0.36, 0.1875], [0.38, 0.1798],
    [0.40, 0.1798], [0.42, 0.3865], [0.44, 0.4894], [0.46, 0.3314], [0.48, 0.2894],
    [0.50, 0.2912], [0.52, 0.3094], [0.54, 0.3334], [0.56, 0.5851], [0.58, 0.7802],
    [0.60, 0.7628], [0.62, 0.7628], [0.64, 0.8237], [0.66, 0.8743], [0.68, 0.8743],
    [0.70, 0.8743], [0.72, 0.8743], [0.74, 0.8743], [0.76, 0.9183], [0.78, 0.9520],
    [0.80, 0.9520], [0.82, 1.0000], [0.84, 0.9520], [0.86, 1.0000], [0.88, 0.9275],
    [0.90, 0.9275], [0.92, 0.9275], [0.94, 0.9275], [0.96, 0.9275], [0.98, 0.9275],
    [1.00, 0.9275]
  ];

  const ASURV_PG_LOSS = [
    [0.00, 0.4664], [0.02, 0.0000], [0.04, 0.9545], [0.06, 0.4678], [0.08, 0.1457],
    [0.10, 0.8175], [0.12, 0.4182], [0.14, 0.6135], [0.16, 1.0000], [0.18, 0.6235],
    [0.20, 0.5129], [0.22, 0.6112], [0.24, 0.3659], [0.26, 0.3171], [0.28, 0.1360],
    [0.30, 0.5626], [0.32, 0.5436], [0.34, 0.5010], [0.36, 0.4675], [0.38, 0.5552],
    [0.40, 0.2760], [0.42, 0.3882], [0.44, 0.8057], [0.46, 0.3665], [0.48, 0.6299],
    [0.50, 0.1415], [0.52, 0.7131], [0.54, 0.6132], [0.56, 0.3519], [0.58, 0.7522],
    [0.60, 0.4327], [0.62, 0.5379], [0.64, 0.4012], [0.66, 0.0438], [0.68, 0.7139],
    [0.70, 0.7293], [0.72, 0.5274], [0.74, 0.4408], [0.76, 0.6094], [0.78, 0.6350],
    [0.80, 0.3678], [0.82, 0.6610], [0.84, 0.5539], [0.86, 0.6006], [0.88, 0.5039],
    [0.90, 0.5700], [0.92, 0.5866], [0.94, 0.7467], [0.96, 0.2991], [0.98, 0.3599],
    [1.00, 0.4935]
  ];

  // ── SVG ────────────────────────────────────────────────────────────────────
  const W = 1600, H = 900;
  const svg = d3.select('#main-svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', BG);

  const gA = svg.append('g');
  const gB = svg.append('g').attr('opacity', 0);
  const gC = svg.append('g').attr('opacity', 0);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function lerpColor(c1, c2, t) {
    const h = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
    const [r1,g1,b1] = h(c1), [r2,g2,b2] = h(c2);
    return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
  }

  function makeLineGen(xSc, ySc) {
    return d3.line().x(d => xSc(d[0])).y(d => ySc(d[1])).curve(d3.curveLinear);
  }

  function appendThetaLabel(parent, x, y, sub, color, fontSize) {
    const lbl = parent.append('text')
      .attr('x', x).attr('y', y).attr('text-anchor', 'middle')
      .attr('fill', color).attr('font-size', fontSize)
      .attr('font-family', FONT).attr('font-weight', '700');
    lbl.append('tspan').text('θ');
    lbl.append('tspan')
      .attr('dy', Math.round(fontSize * 0.28))
      .attr('font-size', Math.round(fontSize * 0.72))
      .text(sub);
    return lbl;
  }

  function drawXAxisFormula(g, pw, ph, yOff, fs, lossType, lossColor) {
    const DY = Math.round(fs * 0.25);
    const xl = g.append('text')
      .attr('x', pw / 2).attr('y', ph + yOff)
      .attr('text-anchor', 'middle')
      .attr('font-size', fs).attr('font-weight', '600').attr('font-family', FONT);
    xl.append('tspan').attr('fill', MUTED).text('θ(α) = (1−α)·θ');
    xl.append('tspan').attr('dy', DY).attr('font-size', Math.round(fs * 0.68))
      .attr('fill', TEAL).attr('font-weight', '700').text('BPR');
    xl.append('tspan').attr('dy', -DY).attr('font-size', fs)
      .attr('fill', MUTED).text('  +  α·θ');
    xl.append('tspan').attr('dy', DY).attr('font-size', Math.round(fs * 0.68))
      .attr('fill', lossColor).attr('font-weight', '700').text(lossType);
    xl.append('tspan').attr('dy', -DY).attr('font-size', fs).text('');
  }

  // Build a panel's axes/grid/labels; returns { g, xSc, ySc, lineGen }
  // ml = left margin of this panel (for y-axis label offset)
  // isLeft = whether to draw the y-axis label
  function buildPanelGroup(parentG, ox, oy, pw, ph, ml, lyt, title, lossType, lossColor, isLeft) {
    const g = parentG.append('g').attr('transform', `translate(${ox},${oy})`);
    const xSc = d3.scaleLinear().domain([0, 1]).range([0, pw]);
    const ySc = d3.scaleLinear().domain([-0.02, 1.05]).range([ph, 0]);
    const lineGen = makeLineGen(xSc, ySc);

    const xTks = [0, 0.25, 0.5, 0.75, 1.0];
    const yTks = [0, 0.25, 0.5, 0.75, 1.0];

    // Grid
    g.append('g').selectAll('line').data(xTks).join('line')
      .attr('x1', d => xSc(d)).attr('x2', d => xSc(d))
      .attr('y1', 0).attr('y2', ph).attr('stroke', GRID).attr('stroke-width', 1);
    g.append('g').selectAll('line').data(yTks).join('line')
      .attr('x1', 0).attr('x2', pw)
      .attr('y1', d => ySc(d)).attr('y2', d => ySc(d))
      .attr('stroke', GRID).attr('stroke-width', 1);

    // X tick labels
    g.append('g').selectAll('text').data(xTks).join('text')
      .attr('x', d => xSc(d)).attr('y', ph + lyt.TICK_Y)
      .attr('text-anchor', 'middle')
      .attr('fill', MUTED).attr('font-size', lyt.FS_TICK).attr('font-family', FONT)
      .text(d => d.toFixed(2));

    // Y tick labels
    g.append('g').selectAll('text').data(yTks).join('text')
      .attr('x', -10).attr('y', d => ySc(d) + 4)
      .attr('text-anchor', 'end')
      .attr('fill', MUTED).attr('font-size', lyt.FS_TICK).attr('font-family', FONT)
      .text(d => d.toFixed(2));

    // Y axis label (left panels only)
    if (isLeft) {
      g.append('text')
        .attr('transform', `translate(${-(ml - 22)},${ph / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .attr('fill', LABEL).attr('font-size', lyt.FS_AXIS).attr('font-weight', '600')
        .attr('font-family', FONT).text('Normalized Loss');
    }

    // Title
    g.append('text')
      .attr('x', pw / 2).attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', LABEL).attr('font-size', lyt.FS_TITLE).attr('font-weight', '600')
      .attr('font-family', FONT).text(title);

    // X axis formula
    drawXAxisFormula(g, pw, ph, lyt.Y_FORMULA, lyt.FS_FORMULA, lossType, lossColor);

    return { g, xSc, ySc, lineGen };
  }

  // Draw both lines fully with labels (for pre-drawn panels)
  function drawPredrawn(panelG, xSc, ySc, lineGen, ph, lyt, regretData, lossData, lossColor, lossLabel) {
    const linesG  = panelG.append('g');
    const labelsG = panelG.append('g');

    // Regret line (teal)
    linesG.append('path').attr('d', lineGen(regretData))
      .attr('fill', 'none').attr('stroke', TEAL).attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round');

    // Loss line
    linesG.append('path').attr('d', lineGen(lossData))
      .attr('fill', 'none').attr('stroke', lossColor).attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round');

    // θ_BPR / θ_LOSS labels (skipped when lyt.SHOW_THETA === false)
    if (lyt.SHOW_THETA !== false) {
      appendThetaLabel(labelsG, xSc(0), ph + lyt.Y_STATIC, 'BPR', TEAL, lyt.FS_THETA);
      const sub = lossLabel.replace(' loss', '').replace(' Loss', '');
      appendThetaLabel(labelsG, xSc(1), ph + lyt.Y_STATIC, sub, lossColor, lyt.FS_THETA);
    }

    // Dots at endpoints
    labelsG.append('circle')
      .attr('cx', xSc(0)).attr('cy', ySc(regretData[0][1]))
      .attr('r', lyt.DOT_R).attr('fill', TEAL).attr('stroke', BG).attr('stroke-width', 1.5);
    labelsG.append('circle')
      .attr('cx', xSc(1)).attr('cy', ySc(lossData[lossData.length - 1][1]))
      .attr('r', lyt.DOT_R).attr('fill', lossColor).attr('stroke', BG).attr('stroke-width', 1.5);

    // Inline labels with background rects
    function mkLbl(x, y, anchor, fill, text) {
      const lbl = labelsG.append('g');
      const txt = lbl.append('text')
        .attr('x', x).attr('y', y).attr('text-anchor', anchor)
        .attr('fill', fill).attr('font-size', lyt.FS_LABEL).attr('font-family', FONT)
        .text(text);
      const b = txt.node().getBBox();
      lbl.insert('rect', 'text')
        .attr('x', b.x - 4).attr('y', b.y - 2)
        .attr('width', b.width + 8).attr('height', b.height + 4)
        .attr('fill', BG).attr('rx', 3);
    }

    const rEnd = regretData[regretData.length - 1];
    mkLbl(xSc(rEnd[0]) - 8, ySc(rEnd[1]) + lyt.LABEL_DY, 'end', TEAL, 'Regret');

    const lStart = lossData[0];
    mkLbl(xSc(lStart[0]) + 8, ySc(lStart[1]) + lyt.LABEL_DY, 'start', lossColor, lossLabel);
  }

  // ── Generic animated BPR regret sweep ─────────────────────────────────────
  // panel: { linesG, labelsG, slidersG, xSc, ySc, lineGen, PH }
  function runBPRAnim(panel, regretData, lossColor, lyt, onDone) {
    const { linesG, labelsG, slidersG, xSc, ySc, lineGen, PH } = panel;
    const ANIM_DUR = 3200;

    const staticTheta = appendThetaLabel(labelsG, xSc(0), PH + lyt.Y_STATIC, 'BPR', TEAL, lyt.FS_THETA)
      .attr('opacity', 0);
    staticTheta.transition().duration(500).attr('opacity', 1);

    const dot = labelsG.append('circle')
      .attr('cx', xSc(0)).attr('cy', ySc(regretData[0][1]))
      .attr('r', 0).attr('fill', TEAL).attr('stroke', BG).attr('stroke-width', 2);
    dot.transition().duration(500).attr('r', lyt.DOT_R);

    setTimeout(() => {
      const regretPath = linesG.append('path')
        .attr('fill', 'none').attr('stroke', TEAL)
        .attr('stroke-width', 3.5).attr('stroke-linecap', 'round');

      const sliderLine = slidersG.append('line')
        .attr('x1', xSc(0)).attr('x2', xSc(0)).attr('y1', 0).attr('y2', PH)
        .attr('stroke', TEAL).attr('stroke-width', 2).attr('stroke-dasharray', '6,4')
        .attr('opacity', 0);

      const sliderLbl = slidersG.append('text')
        .attr('x', xSc(0)).attr('y', PH + lyt.Y_SLIDER)
        .attr('text-anchor', 'middle').attr('fill', TEAL)
        .attr('font-size', lyt.FS_SLIDER).attr('font-family', FONT).attr('opacity', 0);
      sliderLbl.append('tspan').text('θ');

      sliderLine.transition().duration(350).attr('opacity', 0.8);
      sliderLbl.transition().duration(350).attr('opacity', 1);

      setTimeout(() => {
        sliderLine.transition().duration(ANIM_DUR).ease(d3.easeLinear)
          .tween('bpr-slide', function () {
            return function (t) {
              const alpha = t;
              const col = lerpColor(TEAL, lossColor, t);
              sliderLine.attr('x1', xSc(alpha)).attr('x2', xSc(alpha)).attr('stroke', col);
              sliderLbl.attr('x', xSc(alpha)).attr('fill', col);
              const pts = regretData.filter(d => d[0] <= alpha + 0.001);
              if (pts.length >= 2) regretPath.attr('d', lineGen(pts));
            };
          })
          .on('end', function () {
            sliderLine.transition().duration(400).attr('opacity', 0).remove();
            sliderLbl.transition().duration(400).attr('opacity', 0).remove();

            const endPt = regretData[regretData.length - 1];
            const rLbl = labelsG.append('g').attr('opacity', 0);
            const rTxt = rLbl.append('text')
              .attr('x', xSc(endPt[0]) - 8).attr('y', ySc(endPt[1]) + lyt.LABEL_DY)
              .attr('text-anchor', 'end').attr('fill', TEAL)
              .attr('font-size', lyt.FS_LABEL).attr('font-family', FONT).text('Regret');
            const rb = rTxt.node().getBBox();
            rLbl.insert('rect', 'text')
              .attr('x', rb.x - 5).attr('y', rb.y - 3)
              .attr('width', rb.width + 10).attr('height', rb.height + 6)
              .attr('fill', BG).attr('rx', 3);
            rLbl.transition().duration(400).attr('opacity', 1);

            setTimeout(onDone, 500);
          });
      }, 400);
    }, 700);
  }

  // ── Generic animated loss sweep (right → left) ────────────────────────────
  function runLossAnim(panel, lossData, lossColor, lossLabel, lyt, onDone) {
    const { linesG, labelsG, slidersG, xSc, ySc, lineGen, PH } = panel;
    const ANIM_DUR = 3200;
    const sub = lossLabel.replace(' loss', '').replace(' Loss', '');

    const staticTheta = appendThetaLabel(labelsG, xSc(1), PH + lyt.Y_STATIC, sub, lossColor, lyt.FS_THETA)
      .attr('opacity', 0);
    staticTheta.transition().duration(500).attr('opacity', 1);

    const endPt = lossData[lossData.length - 1];
    const dot = labelsG.append('circle')
      .attr('cx', xSc(1)).attr('cy', ySc(endPt[1]))
      .attr('r', 0).attr('fill', lossColor).attr('stroke', BG).attr('stroke-width', 2);
    dot.transition().duration(500).attr('r', lyt.DOT_R);

    setTimeout(() => {
      const lossPath = linesG.append('path')
        .attr('fill', 'none').attr('stroke', lossColor)
        .attr('stroke-width', 3.5).attr('stroke-linecap', 'round');

      const sliderLine = slidersG.append('line')
        .attr('x1', xSc(1)).attr('x2', xSc(1)).attr('y1', 0).attr('y2', PH)
        .attr('stroke', lossColor).attr('stroke-width', 2).attr('stroke-dasharray', '6,4')
        .attr('opacity', 0);

      const sliderLbl = slidersG.append('text')
        .attr('x', xSc(1)).attr('y', PH + lyt.Y_SLIDER)
        .attr('text-anchor', 'middle').attr('fill', lossColor)
        .attr('font-size', lyt.FS_SLIDER).attr('font-family', FONT).attr('opacity', 0);
      sliderLbl.append('tspan').text('θ');

      sliderLine.transition().duration(350).attr('opacity', 0.8);
      sliderLbl.transition().duration(350).attr('opacity', 1);

      setTimeout(() => {
        sliderLine.transition().duration(ANIM_DUR).ease(d3.easeLinear)
          .tween('loss-slide', function () {
            return function (t) {
              const alpha = 1 - t;
              const col = lerpColor(lossColor, TEAL, t);
              sliderLine.attr('x1', xSc(alpha)).attr('x2', xSc(alpha)).attr('stroke', col);
              sliderLbl.attr('x', xSc(alpha)).attr('fill', col);
              const pts = lossData.filter(d => d[0] >= alpha - 0.001);
              if (pts.length >= 2) lossPath.attr('d', lineGen(pts));
            };
          })
          .on('end', function () {
            sliderLine.transition().duration(400).attr('opacity', 0).remove();
            sliderLbl.transition().duration(400).attr('opacity', 0).remove();

            const startPt = lossData[0];
            const lLbl = labelsG.append('g').attr('opacity', 0);
            const lTxt = lLbl.append('text')
              .attr('x', xSc(startPt[0]) + 8).attr('y', ySc(startPt[1]) + lyt.LABEL_DY)
              .attr('text-anchor', 'start').attr('fill', lossColor)
              .attr('font-size', lyt.FS_LABEL).attr('font-family', FONT).text(lossLabel);
            const lb = lTxt.node().getBBox();
            lLbl.insert('rect', 'text')
              .attr('x', lb.x - 5).attr('y', lb.y - 3)
              .attr('width', lb.width + 10).attr('height', lb.height + 6)
              .attr('fill', BG).attr('rx', 3);
            lLbl.transition().duration(400).attr('opacity', 1);

            setTimeout(onDone, 500);
          });
      }, 400);
    }, 700);
  }

  // ── Phase A: full-screen Cook BPR→SPO+ ────────────────────────────────────
  const LP = 310, RP = 310, TB = 72;
  const ML_A = 90, MR_A = 40, MT_A = 40, MB_A = 200;
  const OX_A = LP + ML_A;                        // 400
  const OY_A = TB + MT_A;                        // 112
  const PW_A = W - LP - RP - ML_A - MR_A;       // 850
  const PH_A = H - TB - MT_A - MB_A;            // 588

  // Dividers
  gA.append('line').attr('x1', LP).attr('x2', LP).attr('y1', TB).attr('y2', H)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);
  gA.append('line').attr('x1', W - RP).attr('x2', W - RP).attr('y1', TB).attr('y2', H)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);
  gA.append('line').attr('x1', LP).attr('x2', W - RP).attr('y1', TB).attr('y2', TB)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);

  // Top-bar title
  gA.append('text')
    .attr('x', (LP + W - RP) / 2).attr('y', TB / 2)
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
    .attr('fill', LABEL).attr('font-size', 20).attr('font-weight', '600')
    .attr('font-family', FONT)
    .text('Cook County IL Fatal Overdoses');

  // Plot group
  const gAplot = gA.append('g').attr('transform', `translate(${OX_A},${OY_A})`);
  const xSc_A = d3.scaleLinear().domain([0, 1]).range([0, PW_A]);
  const ySc_A = d3.scaleLinear().domain([-0.02, 1.05]).range([PH_A, 0]);
  const lineGen_A = makeLineGen(xSc_A, ySc_A);

  const xTicks = [0, 0.25, 0.5, 0.75, 1.0];
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  gAplot.append('g').selectAll('line').data(xTicks).join('line')
    .attr('x1', d => xSc_A(d)).attr('x2', d => xSc_A(d))
    .attr('y1', 0).attr('y2', PH_A).attr('stroke', GRID).attr('stroke-width', 1);
  gAplot.append('g').selectAll('line').data(yTicks).join('line')
    .attr('x1', 0).attr('x2', PW_A)
    .attr('y1', d => ySc_A(d)).attr('y2', d => ySc_A(d))
    .attr('stroke', GRID).attr('stroke-width', 1);

  gAplot.append('g').selectAll('text').data(xTicks).join('text')
    .attr('x', d => xSc_A(d)).attr('y', PH_A + 28)
    .attr('text-anchor', 'middle')
    .attr('fill', MUTED).attr('font-size', 17).attr('font-family', FONT)
    .text(d => d.toFixed(2));

  gAplot.append('g').selectAll('text').data(yTicks).join('text')
    .attr('x', -14).attr('y', d => ySc_A(d) + 5)
    .attr('text-anchor', 'end')
    .attr('fill', MUTED).attr('font-size', 17).attr('font-family', FONT)
    .text(d => d.toFixed(2));

  gAplot.append('text')
    .attr('transform', `translate(${-ML_A + 24},${PH_A / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', LABEL).attr('font-size', 20).attr('font-weight', '600')
    .attr('font-family', FONT).text('Normalized Loss');

  drawXAxisFormula(gAplot, PW_A, PH_A, 78, 28, 'SPO+', PURPLE);

  // Phase A animation layers
  const linesG_A   = gAplot.append('g');
  const labelsG_A  = gAplot.append('g');
  const slidersG_A = gAplot.append('g');

  const panelA = {
    linesG: linesG_A, labelsG: labelsG_A, slidersG: slidersG_A,
    xSc: xSc_A, ySc: ySc_A, lineGen: lineGen_A, PH: PH_A
  };

  const LYT_A = {
    FS_THETA: 22, FS_SLIDER: 19, Y_SLIDER: 118,
    FS_LABEL: 17, Y_STATIC: 160, DOT_R: 8, LABEL_DY: 22
  };

  // ── Phase B: half-screen (Cook SPO+ | Cook PG) ─────────────────────────────
  const ML_B = 75, MR_B = 25, MT_B = 55, MB_B = 185;
  const PW_B = 800 - ML_B - MR_B;   // 700
  const PH_B = H - MT_B - MB_B;     // 660

  const LYT_B = {
    FS_TITLE: 17, FS_TICK: 15, TICK_Y: 28, FS_AXIS: 17,
    FS_FORMULA: 22, Y_FORMULA: 75,
    FS_THETA: 19, FS_SLIDER: 17, Y_SLIDER: 112,
    FS_LABEL: 15, Y_STATIC: 148, DOT_R: 7, LABEL_DY: 18
  };

  // Vertical divider
  gB.append('line').attr('x1', 800).attr('x2', 800).attr('y1', 0).attr('y2', H)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);

  // Cook SPO+ panel (left, pre-drawn)
  const bSpo = buildPanelGroup(gB, ML_B, MT_B, PW_B, PH_B, ML_B, LYT_B,
    'Cook County — SPO+', 'SPO+', PURPLE, true);
  drawPredrawn(bSpo.g, bSpo.xSc, bSpo.ySc, bSpo.lineGen, PH_B, LYT_B,
    COOK_SPO_REGRET, COOK_SPO_LOSS, PURPLE, 'SPO+ loss');

  // Cook PG panel (right, animated in phases 6/7)
  const bPg = buildPanelGroup(gB, 800 + ML_B, MT_B, PW_B, PH_B, ML_B, LYT_B,
    'Cook County — PG', 'PG', CORAL, false);
  const bPgLinesG   = bPg.g.append('g');
  const bPgLabelsG  = bPg.g.append('g');
  const bPgSlidersG = bPg.g.append('g');

  const panelBPg = {
    linesG: bPgLinesG, labelsG: bPgLabelsG, slidersG: bPgSlidersG,
    xSc: bPg.xSc, ySc: bPg.ySc, lineGen: bPg.lineGen, PH: PH_B
  };

  // ── Phase C: 6-panel layout (2 cols × 3 rows) ─────────────────────────────
  // Left col = SPO+, Right col = PG; rows = Cook / MA / Aransas
  const ROW_H = 300;   // 900 / 3
  const ML_C = 50, MR_C = 12, MT_C = 20, MB_C = 62;
  const PW_C = 800 - ML_C - MR_C;    // 738
  const PH_C = ROW_H - MT_C - MB_C;  // 218

  const LYT_C = {
    FS_TITLE: 13, FS_TICK: 11, TICK_Y: 14, FS_AXIS: 12,
    FS_FORMULA: 13, Y_FORMULA: 42,
    FS_THETA: 13, FS_SLIDER: 13, Y_SLIDER: 68,
    FS_LABEL: 11, Y_STATIC: 68, DOT_R: 4, LABEL_DY: 12,
    SHOW_THETA: false
  };

  // Dividers
  gC.append('line').attr('x1', 0).attr('x2', W).attr('y1', ROW_H).attr('y2', ROW_H)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);
  gC.append('line').attr('x1', 0).attr('x2', W).attr('y1', ROW_H * 2).attr('y2', ROW_H * 2)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);
  gC.append('line').attr('x1', 800).attr('x2', 800).attr('y1', 0).attr('y2', H)
    .attr('stroke', '#2a2a3e').attr('stroke-width', 1);

  function buildQuadrant(parentG, ox, oy, title, lossType, lossColor, lossLabel, regretData, lossData, isLeft) {
    const p = buildPanelGroup(parentG, ox, oy, PW_C, PH_C, ML_C, LYT_C,
      title, lossType, lossColor, isLeft);
    drawPredrawn(p.g, p.xSc, p.ySc, p.lineGen, PH_C, LYT_C,
      regretData, lossData, lossColor, lossLabel);
  }

  // Row 1 — Cook County
  buildQuadrant(gC, ML_C,       MT_C,           'Cook County — SPO+',   'SPO+', PURPLE, 'SPO+ loss', COOK_SPO_REGRET,  COOK_SPO_LOSS,  true);
  buildQuadrant(gC, 800 + ML_C, MT_C,           'Cook County — PG',     'PG',   CORAL,  'PG loss',   COOK_PG_REGRET,   COOK_PG_LOSS,   false);
  // Row 2 — Massachusetts
  buildQuadrant(gC, ML_C,       ROW_H + MT_C,   'Massachusetts — SPO+', 'SPO+', PURPLE, 'SPO+ loss', MA_SPO_REGRET,    MA_SPO_LOSS,    true);
  buildQuadrant(gC, 800 + ML_C, ROW_H + MT_C,   'Massachusetts — PG',   'PG',   CORAL,  'PG loss',   MA_PG_REGRET,     MA_PG_LOSS,     false);
  // Row 3 — Aransas Cranes
  buildQuadrant(gC, ML_C,       ROW_H*2 + MT_C, 'Aransas Cranes — SPO+','SPO+', PURPLE, 'SPO+ loss', ASURV_SPO_REGRET, ASURV_SPO_LOSS, true);
  buildQuadrant(gC, 800 + ML_C, ROW_H*2 + MT_C, 'Aransas Cranes — PG',  'PG',   CORAL,  'PG loss',   ASURV_PG_REGRET,  ASURV_PG_LOSS,  false);

  // ── Phase controller ───────────────────────────────────────────────────────
  const MAX_PHASE = 8;
  let currentPhase = 0;
  let transitioning = false;

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    if (currentPhase === 1) {
      document.getElementById('left-panel').classList.add('visible');
      setTimeout(() => { transitioning = false; }, 650);

    } else if (currentPhase === 2) {
      document.getElementById('right-panel').classList.add('visible');
      setTimeout(() => { transitioning = false; }, 650);

    } else if (currentPhase === 3) {
      runBPRAnim(panelA, COOK_SPO_REGRET, PURPLE, LYT_A, () => { transitioning = false; });

    } else if (currentPhase === 4) {
      runLossAnim(panelA, COOK_SPO_LOSS, PURPLE, 'SPO+ loss', LYT_A, () => { transitioning = false; });

    } else if (currentPhase === 5) {
      // Hide HTML side panels, crossfade gA → gB
      document.getElementById('left-panel').classList.remove('visible');
      document.getElementById('right-panel').classList.remove('visible');
      gA.transition().duration(600).attr('opacity', 0);
      gB.transition().duration(600).delay(200).attr('opacity', 1)
        .on('end', () => { transitioning = false; });

    } else if (currentPhase === 6) {
      runBPRAnim(panelBPg, COOK_PG_REGRET, CORAL, LYT_B, () => { transitioning = false; });

    } else if (currentPhase === 7) {
      runLossAnim(panelBPg, COOK_PG_LOSS, CORAL, 'PG loss', LYT_B, () => { transitioning = false; });

    } else if (currentPhase === 8) {
      // Crossfade gB → gC (4-panel)
      gB.transition().duration(600).attr('opacity', 0);
      gC.transition().duration(600).delay(200).attr('opacity', 1)
        .on('end', () => {
          document.getElementById('hud').classList.add('hidden');
          removeListeners();
          transitioning = false;
        });
    }
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  function onClick() { advancePhase(); }
  function onKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') advancePhase();
  }
  function removeListeners() {
    document.getElementById('main-svg').removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown);
  }

  document.getElementById('main-svg').addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  try { window.parent.Reveal.on('fragmentshown', advancePhase); } catch (_) {}

})();
