/* =========================================================
   ESTADO GENERAL
   ========================================================= */
const SUPABASE_URL = 'https://cyqeeastakkgftyptbrh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tbo1o31RlFyVoBuzOnPh4g_z_Wlm0gQ';
const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentStep = 1;
const TOTAL_STEPS = 3;
let diag = {};
let scores = {};
let service = {};
let opportunity = {};
let currentDiagnosticoId = null;

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

const fxRates = { MXN: 1, USD: 18.5, EUR: 20 };
function toMXN(amount, moneda){ return (amount || 0) * (fxRates[moneda] || 1); }
function fromMXN(amountMXN, moneda){ return (amountMXN || 0) / (fxRates[moneda] || 1); }

const localeByCurrency = { MXN: 'es-MX', USD: 'en-US', EUR: 'de-DE' };
function money(n, moneda){
  moneda = moneda || 'MXN';
  try{
    return new Intl.NumberFormat(localeByCurrency[moneda] || 'es-MX', {
      style:'currency', currency:moneda, maximumFractionDigits:0
    }).format(n || 0);
  } catch(e){
    return '$' + Math.round(n || 0).toLocaleString('es-MX');
  }
}

const tipoNegocioPorGiro = {
  'Comercio': 'producto',
  'Manufactura': 'producto',
  'Alimentos y bebidas': 'producto',
  'Servicios': 'servicio',
  'Tecnología': 'servicio',
  'Otro': 'mixto'
};
function tipoNegocio(giro){ return tipoNegocioPorGiro[giro] || 'mixto'; }

const problemaLabels = {
  ventas_bajas:   {default:'Pocos clientes o poca demanda'},
  diferenciacion: {default:'La oferta no se diferencia'},
  precio:         {default:'Incertidumbre sobre precio o modelo de ingresos'},
  marketing:      {default:'Falta de estrategia de crecimiento'},
  competencia:    {default:'Competencia muy fuerte'},
  canales:        {default:'Dificultad para llegar a nuevos clientes'}
};

const objetivosPorProblema = {
  ventas_bajas: {
    producto: [
      {value:'aumentar_clientes',   label:'Aumentar el número de clientes nuevos'},
      {value:'mejorar_conversion',  label:'Mejorar la conversión de prospectos a clientes'},
      {value:'subir_ticket',        label:'Subir el ticket promedio / valor de cada venta'},
      {value:'reactivar_clientes',  label:'Reactivar clientes inactivos'},
      {value:'mejorar_propuesta',   label:'Mejorar la propuesta de valor para atraer más demanda'}
    ],
    servicio: [
      {value:'aumentar_clientes',   label:'Aumentar el número de clientes nuevos'},
      {value:'mejorar_conversion',  label:'Mejorar la conversión de prospectos a clientes'},
      {value:'subir_ticket',        label:'Subir el valor promedio por servicio o paquete'},
      {value:'reactivar_clientes',  label:'Reactivar o fidelizar clientes que ya no contratan'},
      {value:'mejorar_propuesta',   label:'Mejorar la propuesta de valor del servicio'}
    ],
    mixto: [
      {value:'aumentar_clientes',   label:'Aumentar el número de clientes nuevos'},
      {value:'mejorar_conversion',  label:'Mejorar la conversión de prospectos a clientes'},
      {value:'subir_ticket',        label:'Subir el valor promedio por venta o servicio'},
      {value:'reactivar_clientes',  label:'Reactivar clientes inactivos'},
      {value:'mejorar_propuesta',   label:'Mejorar la propuesta de valor para atraer más demanda'}
    ]
  },
  diferenciacion: {
    producto: [
      {value:'diferenciarse',         label:'Diferenciar el producto con claridad'},
      {value:'fortalecer_propuesta',  label:'Fortalecer la propuesta de valor'},
      {value:'encontrar_nicho',       label:'Encontrar un nicho menos saturado'},
      {value:'competir_valor',        label:'Competir por valor y no solo por precio'},
      {value:'mejorar_propuesta',     label:'Ajustar atributos del producto al cliente ideal'}
    ],
    servicio: [
      {value:'diferenciarse',         label:'Diferenciar el servicio con claridad'},
      {value:'fortalecer_propuesta',  label:'Fortalecer la propuesta de valor del servicio'},
      {value:'encontrar_nicho',       label:'Encontrar un nicho menos saturado'},
      {value:'competir_valor',        label:'Competir por valor y no solo por precio'},
      {value:'mejorar_propuesta',     label:'Ajustar el alcance del servicio al cliente ideal'}
    ],
    mixto: [
      {value:'diferenciarse',         label:'Diferenciar la oferta con claridad'},
      {value:'fortalecer_propuesta',  label:'Fortalecer la propuesta de valor'},
      {value:'encontrar_nicho',       label:'Encontrar un nicho menos saturado'},
      {value:'competir_valor',        label:'Competir por valor y no solo por precio'},
      {value:'mejorar_propuesta',     label:'Ajustar la oferta al cliente ideal'}
    ]
  },
  precio: {
    producto: [
      {value:'subir_ticket',          label:'Subir el ticket promedio sin perder ventas'},
      {value:'competir_valor',        label:'Dejar de competir solo por precio bajo'},
      {value:'fortalecer_propuesta',  label:'Justificar mejor el precio actual'},
      {value:'mejorar_conversion',    label:'Mejorar conversión manteniendo el precio'},
      {value:'definir_estrategia',    label:'Definir una política de precios y modelo de ingresos clara'}
    ],
    servicio: [
      {value:'subir_ticket',          label:'Subir el valor promedio por servicio o paquete'},
      {value:'competir_valor',        label:'Dejar de competir solo por tarifa baja'},
      {value:'fortalecer_propuesta',  label:'Justificar mejor la tarifa actual'},
      {value:'mejorar_conversion',    label:'Mejorar conversión manteniendo la tarifa'},
      {value:'definir_estrategia',    label:'Definir una política de tarifas y modelo de ingresos clara'}
    ],
    mixto: [
      {value:'subir_ticket',          label:'Subir el valor promedio por venta o servicio'},
      {value:'competir_valor',        label:'Dejar de competir solo por precio bajo'},
      {value:'fortalecer_propuesta',  label:'Justificar mejor el precio actual'},
      {value:'mejorar_conversion',    label:'Mejorar conversión manteniendo el precio'},
      {value:'definir_estrategia',    label:'Definir una política de precios y modelo de ingresos clara'}
    ]
  },
  marketing: {
    producto: [
      {value:'definir_estrategia', label:'Definir una estrategia de crecimiento clara'},
      {value:'atraer_constante',   label:'Atraer clientes de forma más constante'},
      {value:'mejorar_presencia',  label:'Mejorar la presencia en canales clave'},
      {value:'medir_resultados',   label:'Medir resultados de captación y crecimiento'},
      {value:'plan_contenidos',    label:'Tener un plan de acciones de crecimiento'}
    ],
    servicio: [
      {value:'definir_estrategia', label:'Definir una estrategia de crecimiento clara'},
      {value:'atraer_constante',   label:'Atraer clientes de forma más constante'},
      {value:'mejorar_presencia',  label:'Mejorar la presencia en canales clave'},
      {value:'medir_resultados',   label:'Medir resultados de captación y crecimiento'},
      {value:'plan_contenidos',    label:'Tener un plan de acciones de crecimiento'}
    ],
    mixto: [
      {value:'definir_estrategia', label:'Definir una estrategia de crecimiento clara'},
      {value:'atraer_constante',   label:'Atraer clientes de forma más constante'},
      {value:'mejorar_presencia',  label:'Mejorar la presencia en canales clave'},
      {value:'medir_resultados',   label:'Medir resultados de captación y crecimiento'},
      {value:'plan_contenidos',    label:'Tener un plan de acciones de crecimiento'}
    ]
  },
  competencia: {
    producto: [
      {value:'diferenciarse',        label:'Diferenciarse claramente de la competencia'},
      {value:'fortalecer_propuesta', label:'Fortalecer la propuesta de valor'},
      {value:'fidelizar',            label:'Fidelizar mejor a los clientes actuales'},
      {value:'encontrar_nicho',      label:'Encontrar un nicho menos saturado'},
      {value:'competir_valor',       label:'Competir por valor y no solo por precio'}
    ],
    servicio: [
      {value:'diferenciarse',        label:'Diferenciarse claramente de la competencia'},
      {value:'fortalecer_propuesta', label:'Fortalecer la propuesta de valor del servicio'},
      {value:'fidelizar',            label:'Fidelizar mejor a los clientes actuales'},
      {value:'encontrar_nicho',      label:'Encontrar un nicho menos saturado'},
      {value:'competir_valor',       label:'Competir por valor y no solo por tarifa'}
    ],
    mixto: [
      {value:'diferenciarse',        label:'Diferenciarse claramente de la competencia'},
      {value:'fortalecer_propuesta', label:'Fortalecer la propuesta de valor'},
      {value:'fidelizar',            label:'Fidelizar mejor a los clientes actuales'},
      {value:'encontrar_nicho',      label:'Encontrar un nicho menos saturado'},
      {value:'competir_valor',       label:'Competir por valor y no solo por precio'}
    ]
  },
  canales: {
    producto: [
      {value:'atraer_constante',   label:'Abrir o fortalecer un canal de captación'},
      {value:'mejorar_presencia',  label:'Mejorar presencia donde el cliente busca'},
      {value:'mejorar_conversion', label:'Mejorar la conversión en el canal actual'},
      {value:'definir_estrategia', label:'Definir qué canal priorizar y por qué'},
      {value:'medir_resultados',   label:'Medir qué canal realmente trae clientes'}
    ],
    servicio: [
      {value:'atraer_constante',   label:'Abrir o fortalecer un canal de captación'},
      {value:'mejorar_presencia',  label:'Mejorar presencia donde el cliente busca'},
      {value:'mejorar_conversion', label:'Mejorar la conversión en el canal actual'},
      {value:'definir_estrategia', label:'Definir qué canal priorizar y por qué'},
      {value:'medir_resultados',   label:'Medir qué canal realmente trae clientes'}
    ],
    mixto: [
      {value:'atraer_constante',   label:'Abrir o fortalecer un canal de captación'},
      {value:'mejorar_presencia',  label:'Mejorar presencia donde el cliente busca'},
      {value:'mejorar_conversion', label:'Mejorar la conversión en el canal actual'},
      {value:'definir_estrategia', label:'Definir qué canal priorizar y por qué'},
      {value:'medir_resultados',   label:'Medir qué canal realmente trae clientes'}
    ]
  }
};

function labelFor(map, code, giro){
  const entry = map[code];
  if(!entry) return code;
  if(entry.default) return entry.default;
  return entry[tipoNegocio(giro)] || entry.producto;
}

function getObjetivoLabel(objetivoValue, problema, giro){
  if(!objetivoValue || !problema) return objetivoValue || '—';
  const tipo = tipoNegocio(giro);
  const lista = (objetivosPorProblema[problema] || {})[tipo]
             || (objetivosPorProblema[problema] || {}).mixto
             || [];
  const found = lista.find(o => o.value === objetivoValue);
  return found ? found.label : objetivoValue;
}

function updateObjetivoOptions(){
  const problema = document.getElementById('f-problema').value;
  const giro = document.getElementById('f-giro').value;
  const select = document.getElementById('f-objetivo');
  const prevValue = select.value;
  const tipo = tipoNegocio(giro);

  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = problema ? 'Selecciona una opción' : 'Selecciona primero el problema principal';
  select.appendChild(placeholder);

  if(!problema || !objetivosPorProblema[problema]) return;

  const lista = objetivosPorProblema[problema][tipo] || objetivosPorProblema[problema].mixto || [];
  lista.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    select.appendChild(o);
  });

  if(prevValue && lista.some(o => o.value === prevValue)){
    select.value = prevValue;
  }
}

function updateGiroDependentOptions(){
  const giro = document.getElementById('f-giro').value;
  const optVentasBajas = document.querySelector('#f-problema option[value="ventas_bajas"]');
  if(optVentasBajas) optVentasBajas.textContent = labelFor(problemaLabels, 'ventas_bajas', giro);
  updateObjetivoOptions();
}

/* =========================================================
   NAVEGACIÓN ENTRE VISTAS
   ========================================================= */
function goTo(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  window.scrollTo({top:0, behavior:'instant'});
  document.getElementById('topbar').style.display = (view === 'portada') ? 'none' : 'flex';
  document.querySelectorAll('.topnav .step-link').forEach(b => b.classList.remove('active'));
  const map = {form:'nav-diagnostico', results:'nav-resultados', simulator:'nav-simulador', cotizador:'nav-cotizacion', report:'nav-reporte'};
  if(map[view]) document.getElementById(map[view]).classList.add('active');
  if(view === 'simulator') renderSimulator();
  if(view === 'cotizador') renderCotizador();
}

function scrollToServices(){
  document.getElementById('services-strip').scrollIntoView({behavior:'smooth', block:'start'});
}

function unlockNav(){
  ['nav-diagnostico','nav-resultados','nav-simulador','nav-cotizacion','nav-reporte'].forEach(id => {
    document.getElementById(id).disabled = false;
  });
}

/* =========================================================
   FORMULARIO DE DIAGNÓSTICO (3 pasos)
   ========================================================= */
const stepTitles = {
  1: ['Paso 1 de 3', 'Datos generales de la empresa', 'Información básica para identificar el tipo de negocio.'],
  2: ['Paso 2 de 3', 'Ingresos, canales y mercado', 'Estos datos permiten evaluar modelo de ingresos, canales y presión del mercado.'],
  3: ['Paso 3 de 3', 'Diagnóstico cualitativo', 'Cuéntanos qué está pasando y hacia dónde quieres llevar tu modelo de negocio.']
};

function renderStepHeader(){
  const [count, title, sub] = stepTitles[currentStep];
  document.getElementById('form-step-count').textContent = count;
  document.getElementById('form-step-title').textContent = title;
  document.getElementById('form-step-sub').textContent = sub;
  document.getElementById('progress-fill').style.width = (currentStep/TOTAL_STEPS*100) + '%';
  document.getElementById('btn-back').style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  document.getElementById('btn-next').textContent = currentStep === TOTAL_STEPS ? 'Generar diagnóstico' : 'Continuar';
}

function showStep(n){
  document.querySelectorAll('.form-step').forEach(el => {
    el.style.display = (parseInt(el.dataset.step) === n) ? 'grid' : 'none';
  });
  renderStepHeader();
}

function validateStep(n){
  const stepEl = document.querySelector('.form-step[data-step="'+n+'"]');
  const inputs = stepEl.querySelectorAll('input[required], select[required]');
  for(const inp of inputs){
    if(!inp.value){ inp.reportValidity(); return false; }
  }
  return true;
}

function nextStep(){
  if(!validateStep(currentStep)) return;
  if(currentStep < TOTAL_STEPS){
    currentStep++;
    updateGiroDependentOptions();
    showStep(currentStep);
  } else {
    collectFormData();
    runDiagnosis();
  }
}

function prevStep(){
  if(currentStep > 1){
    currentStep--;
    showStep(currentStep);
  }
}

function collectFormData(){
  diag = {
    nombre: document.getElementById('f-nombre').value.trim(),
    giro: document.getElementById('f-giro').value,
    tamano: document.getElementById('f-tamano').value,
    antiguedad: parseFloat(document.getElementById('f-antiguedad').value) || 0,
    ubicacion: document.getElementById('f-ubicacion').value.trim(),
    empleados: parseInt(document.getElementById('f-empleados').value) || 0,
    moneda: document.getElementById('f-moneda').value || 'MXN',
    ventas: parseFloat(document.getElementById('f-ventas').value) || 0,
    marketing: parseFloat(document.getElementById('f-marketing').value) || 0,
    precio: document.getElementById('f-precio').value,
    plaza: document.getElementById('f-plaza').value,
    competencia: document.getElementById('f-competencia').value,
    problema: document.getElementById('f-problema').value,
    objetivo: document.getElementById('f-objetivo').value,
    trato: document.getElementById('f-trato').value,
    recomendable: document.getElementById('f-recomendable').value,
    refieren: document.getElementById('f-refieren').value,
    intencion: document.getElementById('f-intencion').value,
    nuevo: document.getElementById('f-nuevo').value,
    notas: document.getElementById('f-notas').value.trim()
  };
}

/* =========================================================
   MOTOR DE EVALUACIÓN — pilares del modelo de negocio
   Áreas: Propuesta de valor, Mercado/Clientes, Ingresos,
   Canales, Operación/Estrategia
   ========================================================= */
function computeScores(d){
  let producto = 65, precio = 65, plaza = 65, promocion = 65, cliente = 65;

  const antig = clamp(d.antiguedad, 0, 20);
  producto += Math.round(antig * 0.8);
  cliente += Math.round(antig * 0.5);

  const ventasMXN = toMXN(d.ventas, d.moneda);
  const marketingMXN = toMXN(d.marketing, d.moneda);

  if(ventasMXN >= 500000) cliente += 18;
  else if(ventasMXN >= 200000) cliente += 10;
  else if(ventasMXN >= 50000) cliente += 4;
  else cliente -= 8;

  if(marketingMXN >= 20000) promocion += 22;
  else if(marketingMXN >= 5000) promocion += 10;
  else if(marketingMXN >= 1000) promocion -= 2;
  else promocion -= 18;

  const precioMap = {valor: 14, costos: 6, competencia: 0, intuicion: -16};
  precio += precioMap[d.precio] || 0;

  const plazaMap = {mixto: 12, digital: 8, redes: 6, fisico: 4, referidos: 2};
  plaza += plazaMap[d.plaza] || 0;
  if(d.plaza === 'referidos' && marketingMXN < 1000) plaza -= 4;

  if(d.competencia === 'Alta'){ cliente -= 16; producto -= 6; precio -= 4; }
  else if(d.competencia === 'Media'){ cliente -= 4; }
  else if(d.competencia === 'Baja'){ cliente += 12; }

  // Relación con clientes / recomendación
  const tratoMap = {cercano: 10, personal: 4, transaccional: -6, sin_seguimiento: -14};
  cliente += tratoMap[d.trato] || 0;
  const recMap = {muy: 8, si: 4, regular: -4, poco: -12};
  producto += recMap[d.recomendable] || 0;
  const refMap = {frecuente: 12, a_veces: 4, casi_nunca: -8, no_se: -2};
  cliente += refMap[d.refieren] || 0;
  if(d.nuevo === 'si'){ producto -= 4; cliente -= 4; }

  const problemaMap = {
    ventas_bajas: {cliente:-28, promocion:-12},
    diferenciacion: {producto:-26, cliente:-8},
    precio: {precio:-28, producto:-6},
    marketing: {promocion:-30},
    competencia: {cliente:-22, producto:-10, precio:-8},
    canales: {plaza:-26, promocion:-10}
  };
  const penal = problemaMap[d.problema] || {};
  producto += penal.producto || 0;
  precio += penal.precio || 0;
  plaza += penal.plaza || 0;
  promocion += penal.promocion || 0;
  cliente += penal.cliente || 0;

  if(['Tecnología','Alimentos y bebidas'].includes(d.giro)) producto += 8;

  const objProducto = ['mejorar_propuesta','diferenciarse','fortalecer_propuesta','encontrar_nicho','competir_valor'];
  const objPrecio = ['subir_ticket'];
  const objPlaza = ['atraer_constante'];
  const objPromo = ['definir_estrategia','mejorar_presencia','medir_resultados','plan_contenidos','mejorar_conversion'];
  const objCliente = ['aumentar_clientes','reactivar_clientes','fidelizar'];

  if(objProducto.includes(d.objetivo)) producto += 4;
  if(objPrecio.includes(d.objetivo)) precio += 4;
  if(objPlaza.includes(d.objetivo)) plaza += 3;
  if(objPromo.includes(d.objetivo)) promocion += 4;
  if(objCliente.includes(d.objetivo)) cliente += 3;

  // Renombramos las áreas al lenguaje de modelo de negocio
  const areas = {
    'Propuesta de valor': clamp(Math.round(producto), 0, 100),
    'Modelo de ingresos': clamp(Math.round(precio), 0, 100),
    'Canales': clamp(Math.round(plaza), 0, 100),
    'Crecimiento': clamp(Math.round(promocion), 0, 100),
    'Mercado / Clientes': clamp(Math.round(cliente), 0, 100)
  };
  const overall = Math.round(Object.values(areas).reduce((a,b)=>a+b,0) / 5);
  return {areas, overall};
}

function semaforo(n){
  if(n >= 75) return 'verde';
  if(n >= 50) return 'amarillo';
  return 'rojo';
}
function semaforoLabel(n){
  if(n >= 75) return 'Saludable';
  if(n >= 50) return 'Atención moderada';
  return 'Atención urgente';
}

const areaInfo = {
  'Propuesta de valor': {
    desc: 'Qué tan clara y diferenciada es tu oferta frente a lo que ya existe en el mercado.',
    tips: [
      'Deja por escrito qué te hace distinto y por qué el cliente te elegiría.',
      'Pide a clientes actuales qué valoran más de lo que ofreces y ajusta el mensaje.',
      'Compara tu oferta con dos o tres alternativas cercanas y anota el atributo que solo tú puedes defender.',
      'Prueba un mensaje corto de propuesta de valor con 5 prospectos antes de usarlo en todos los canales.',
      'Si vendes producto, enfócate en el resultado que entrega; si prestas servicio, en el problema que resuelves con claridad.'
    ]
  },
  'Modelo de ingresos': {
    desc: 'Qué tan ordenada y defendible es la forma en que fijas precios y capturas valor.',
    tips: [
      'Revisa si tu precio o tarifa refleja el valor que el cliente percibe, no solo tus costos.',
      'Prueba una sola mejora de empaquetado o de nivel de precio antes de cambiar todo el listado.',
      'Define al menos dos niveles de oferta (básico y completo) para dejar de competir solo por el precio más bajo.',
      'Calcula el margen real por venta o servicio después de descuentos y costos variables.',
      'Si no tienes política de precios escrita, documenta reglas simples: cuándo subes, cuándo bajas y por qué.'
    ]
  },
  'Canales': {
    desc: 'Qué tan claros y efectivos son los canales por los que el cliente te encuentra y te compra.',
    tips: [
      'Concentra el esfuerzo en el canal que hoy ya te trae mejores clientes.',
      'Antes de abrir un canal nuevo, mide si el principal está bien atendido.',
      'Mapea el recorrido del cliente desde que te conoce hasta que compra y elimina un punto de fricción.',
      'Si dependes de referidos, formaliza cómo pides la recomendación y a quién se la pides.',
      'Prueba un solo canal digital con un mensaje claro durante 30 días antes de dispersarte.'
    ]
  },
  'Crecimiento': {
    desc: 'La consistencia de cómo atraes demanda y haces crecer el negocio.',
    tips: [
      'Fija un presupuesto de captación aunque sea pequeño y mantenlo cada mes.',
      'Elige un mensaje principal y repítelo con claridad en tu canal más fuerte.',
      'Define una métrica simple de captación (leads, citas o ventas) y revísala cada semana.',
      'Sustituye acciones sueltas por un calendario mínimo de 4 semanas de acciones repetibles.',
      'Si el presupuesto es bajo, prioriza acciones de bajo costo: referidos, contenido propio o alianzas locales.'
    ]
  },
  'Mercado / Clientes': {
    desc: 'Qué tan bien conoces a tu cliente y qué tan fuerte es tu posición frente a la competencia.',
    tips: [
      'Describe a tu cliente ideal con más detalle que “todo el mundo”.',
      'Identifica a tus competidores cercanos y qué los hace elegibles.',
      'Lista las tres objeciones más frecuentes de tus clientes y prepara una respuesta clara para cada una.',
      'Habla con 3 clientes recientes y pregunta por qué te eligieron (y por qué casi no lo hicieron).',
      'Si la competencia es alta, elige un segmento más estrecho donde tu oferta se note más.'
    ]
  }
};

/** Elige 2 tips distintos por área según problema, objetivo y giro, para variar las recomendaciones. */
function pickTipsForArea(area, d){
  const all = (areaInfo[area] && areaInfo[area].tips) || [];
  if(all.length <= 2) return all.slice();

  const tipo = tipoNegocio(d.giro);
  const problema = d.problema || '';
  const objetivo = d.objetivo || '';
  const scores = [];

  all.forEach((tip, i) => {
    let s = i; // base estable
    const t = tip.toLowerCase();
    if(problema === 'diferenciacion' && (t.includes('distinto') || t.includes('compara') || t.includes('atributo'))) s += 20;
    if(problema === 'precio' && (t.includes('precio') || t.includes('margen') || t.includes('empaquetado') || t.includes('niveles'))) s += 20;
    if(problema === 'canales' && (t.includes('canal') || t.includes('recorrido') || t.includes('referidos'))) s += 20;
    if(problema === 'marketing' && (t.includes('presupuesto') || t.includes('calendario') || t.includes('métrica') || t.includes('mensaje'))) s += 20;
    if(problema === 'ventas_bajas' && (t.includes('cliente ideal') || t.includes('captación') || t.includes('prospectos'))) s += 18;
    if(problema === 'competencia' && (t.includes('competidor') || t.includes('segmento') || t.includes('objeciones'))) s += 18;
    if(objetivo && (t.includes('mensaje') || t.includes('prueba') || t.includes('documenta'))) s += 6;
    if(tipo === 'producto' && t.includes('producto')) s += 10;
    if(tipo === 'servicio' && t.includes('servicio')) s += 10;
    if(d.competencia === 'Alta' && (t.includes('competidor') || t.includes('segmento') || t.includes('niveles'))) s += 8;
    if((d.marketing || 0) < 1000 && t.includes('bajo costo')) s += 12;
    scores.push({i, s, tip});
  });

  scores.sort((a, b) => b.s - a.s || a.i - b.i);
  const chosen = [scores[0].tip];
  // segundo tip distinto y no adyacente si es posible
  for(let k = 1; k < scores.length; k++){
    if(scores[k].tip !== chosen[0]){
      chosen.push(scores[k].tip);
      break;
    }
  }
  if(chosen.length < 2 && all.length > 1) chosen.push(all.find(t => t !== chosen[0]) || all[1]);
  return chosen.slice(0, 2);
}

/* =========================================================
   RECOMENDACIÓN DE SERVICIO
   ========================================================= */
const serviceCatalog = {
  'Plan de Propuesta de Valor y Modelo': 'Para cuando aún no está del todo claro qué ofreces, a quién y cómo generas valor de forma sostenible.',
  'Plan Estratégico de Negocio': 'Ordena objetivos, mercado, operación e ingresos en un solo plan accionable.',
  'Plan de Validación de Modelo': 'Prueba con poco riesgo si tu idea o modelo tiene demanda real antes de escalar.',
  'Plan de Optimización Comercial': 'Ajustes de precios, ingresos y canales para vender mejor con lo que ya tienes.',
  'Plan Integral de Modelo de Negocio': 'Cuando propuesta, mercado, ingresos y operación necesitan atención al mismo tiempo.'
};

/* Precios fijos por moneda (lista local, no conversión automática desde MXN). */
const cotizadorData = {
  'Plan de Propuesta de Valor y Modelo': {
    basico:   {precio: {MXN: 6000,  USD: 450,  EUR: 420},  semanas: 1, entregables: ['Sesión de diagnóstico de modelo (2 horas)', 'Definición de propuesta de valor', 'Documento resumen de 3-4 páginas']},
    estandar: {precio: {MXN: 12000, USD: 850,  EUR: 790},  semanas: 2, entregables: ['Todo lo del plan Básico', 'Validación de mensaje con clientes o prospectos', 'Ajustes al modelo según hallazgos']},
    premium:  {precio: {MXN: 20000, USD: 1400, EUR: 1300}, semanas: 3, entregables: ['Todo lo del plan Estándar', 'Mapa de atributos vs competencia', 'Acompañamiento 30 días para afinar el modelo']}
  },
  'Plan Estratégico de Negocio': {
    basico:   {precio: {MXN: 12000, USD: 850,  EUR: 790},  semanas: 2, entregables: ['Diagnóstico de pilares del modelo', 'Plan de negocio a 90 días']},
    estandar: {precio: {MXN: 25000, USD: 1750, EUR: 1650}, semanas: 4, entregables: ['Todo lo del plan Básico', 'Priorización de acciones por impacto', 'Indicadores simples de seguimiento']},
    premium:  {precio: {MXN: 45000, USD: 3100, EUR: 2900}, semanas: 6, entregables: ['Todo lo del plan Estándar', 'Calendario de ejecución', 'Revisión mensual durante 2 meses']}
  },
  'Plan de Validación de Modelo': {
    basico:   {precio: {MXN: 5000,  USD: 380,  EUR: 350},  semanas: 1, entregables: ['Hipótesis de valor a validar', 'Diseño de prueba mínima (MVP o piloto)']},
    estandar: {precio: {MXN: 15000, USD: 1050, EUR: 980},  semanas: 3, entregables: ['Todo lo del plan Básico', 'Ejecución de prueba con clientes reales', 'Criterios de decisión go / no-go']},
    premium:  {precio: {MXN: 30000, USD: 2100, EUR: 1950}, semanas: 5, entregables: ['Todo lo del plan Estándar', 'Acompañamiento en la validación 2 meses', 'Ajuste del modelo según resultados']}
  },
  'Plan de Optimización Comercial': {
    basico:   {precio: {MXN: 10000, USD: 720,  EUR: 670},  semanas: 2, entregables: ['Revisión de precios, ingresos y canal actual', 'Lista de ajustes prioritarios']},
    estandar: {precio: {MXN: 22000, USD: 1550, EUR: 1450}, semanas: 4, entregables: ['Todo lo del plan Básico', 'Prueba de un cambio de precio o canal', 'Criterios para decidir si se mantiene']},
    premium:  {precio: {MXN: 40000, USD: 2800, EUR: 2600}, semanas: 8, entregables: ['Todo lo del plan Estándar', 'Acompañamiento en la implementación', 'Revisión de resultados a 60 días']}
  },
  'Plan Integral de Modelo de Negocio': {
    basico:   {precio: {MXN: 25000, USD: 1750, EUR: 1650}, semanas: 4,  entregables: ['Diagnóstico completo del modelo', 'Plan de acción priorizado a 90 días']},
    estandar: {precio: {MXN: 50000, USD: 3500, EUR: 3250}, semanas: 8,  entregables: ['Todo lo del plan Básico', 'Plan de modelo integrado', 'Seguimiento mensual durante 3 meses']},
    premium:  {precio: {MXN: 90000, USD: 6200, EUR: 5800}, semanas: 12, entregables: ['Todo lo del plan Estándar', 'Acompañamiento continuo 6 meses', 'Ajustes mensuales según resultados']}
  }
};

function renderCotizador(){
  document.getElementById('cotizador-company-line').textContent =
    `${diag.nombre} · Plan recomendado: ${service.name}`;

  const tiers = cotizadorData[service.name];
  const defs = [
    {key:'basico',   name:'Básico',   featured:false},
    {key:'estandar', name:'Estándar', featured:true},
    {key:'premium',  name:'Premium',  featured:false}
  ];

  const tierEntrega = {
    basico:   'Entrega: documento digital + sesión remota de revisión',
    estandar: 'Entrega: documento digital + 2 sesiones remotas',
    premium:  'Entrega: documento digital + acompañamiento remoto durante el periodo del plan'
  };

  const moneda = diag.moneda || 'MXN';
  document.getElementById('tier-grid').innerHTML = defs.map(d => {
    const t = tiers[d.key];
    const precio = (t.precio && t.precio[moneda] != null) ? t.precio[moneda] : (t.precio && t.precio.MXN) || 0;
    return `
      <div class="tier-card ${d.featured ? 'featured' : ''}">
        ${d.featured ? '<div class="tier-badge">Más elegido</div>' : ''}
        <div class="tier-name">${d.name}</div>
        <div class="tier-price">${money(precio, moneda)}<span> / proyecto</span></div>
        <div class="tier-weeks">${t.semanas} semana${t.semanas === 1 ? '' : 's'} estimadas</div>
        <div class="tier-delivery">${tierEntrega[d.key]}</div>
        <ul>${t.entregables.map(e => `<li>${e}</li>`).join('')}</ul>
        <button class="btn-request" onclick="openModal('${d.name}')">Solicitar esta opción</button>
      </div>`;
  }).join('');
}

function recommendService(scores, d){
  const areas = scores.areas;
  const rojoCount = Object.values(areas).filter(v => semaforo(v) === 'rojo').length;
  const lowestArea = Object.entries(areas).sort((a,b) => a[1]-b[1])[0][0];

  let name;
  if(scores.overall < 45 || rojoCount >= 3){
    name = 'Plan Integral de Modelo de Negocio';
  } else if(lowestArea === 'Modelo de ingresos' || lowestArea === 'Canales'){
    name = 'Plan de Optimización Comercial';
  } else if(lowestArea === 'Crecimiento'){
    name = 'Plan Estratégico de Negocio';
  } else if(lowestArea === 'Propuesta de valor'){
    name = (d.antiguedad < 2) ? 'Plan de Propuesta de Valor y Modelo' : 'Plan Estratégico de Negocio';
  } else if(lowestArea === 'Mercado / Clientes'){
    name = (d.antiguedad < 2) ? 'Plan de Validación de Modelo' : 'Plan Estratégico de Negocio';
  } else {
    name = 'Plan Estratégico de Negocio';
  }
  return {name, desc: serviceCatalog[name], lowestArea};
}

/* =========================================================
   BUSINESS MODEL CANVAS (reglas, sin IA)
   ========================================================= */
const giroBase = {
  'Comercio': {
    segmentos: 'Consumidores finales que buscan un producto específico cerca de su zona, y compradores recurrentes que valoran el precio y la disponibilidad.',
    propuesta: 'Variedad de producto, buen precio y disponibilidad inmediata frente a comprar en línea o esperar un envío.',
    canales: 'Punto de venta físico, y redes sociales para mostrar catálogo y promociones.',
    relaciones: 'Atención personalizada en el punto de venta y programas de lealtad para compras recurrentes.',
    ingresos: 'Venta directa de producto, con posibles ingresos adicionales por servicios complementarios (instalación, garantía extendida, etc.).',
    recursos: 'Inventario, punto de venta, y una relación confiable con proveedores.',
    actividades: 'Compra y reposición de inventario, exhibición de producto, y atención al cliente en punto de venta.',
    socios: 'Proveedores y distribuidores de la mercancía, y posibles alianzas logísticas para entrega a domicilio.',
    costos: 'Compra de inventario, renta del local, sueldos del personal de piso, y logística de reposición.'
  },
  'Servicios': {
    segmentos: 'Personas o empresas que necesitan resolver un trámite o una necesidad específica y valoran la confianza y experiencia del proveedor.',
    propuesta: 'Conocimiento especializado, cumplimiento y confianza para resolver algo que el cliente no puede o no quiere resolver por su cuenta.',
    canales: 'Recomendación de boca en boca, presencia en línea (sitio, redes) y alianzas con otros negocios que refieran clientes.',
    relaciones: 'Trato directo y personalizado, generalmente con el mismo responsable durante todo el servicio.',
    ingresos: 'Cobro por servicio prestado (honorarios, tarifa fija o por hora), y posibles paquetes para clientes recurrentes.',
    recursos: 'El conocimiento y la reputación del equipo, además de la infraestructura mínima para atender al cliente.',
    actividades: 'Prestación del servicio, gestión de citas o trámites, y mantenimiento de la relación con el cliente.',
    socios: 'Otros profesionales o negocios que puedan referir clientes, y proveedores de herramientas o certificaciones necesarias para operar.',
    costos: 'Sueldos del equipo especializado, renta de oficina, y certificaciones o licencias necesarias para operar.'
  },
  'Manufactura': {
    segmentos: 'Empresas o distribuidores que compran en volumen el producto fabricado, más que consumidores finales individuales.',
    propuesta: 'Calidad consistente, capacidad de producción y precio competitivo frente a otros fabricantes o importadores.',
    canales: 'Venta directa a distribuidores o mayoristas, y participación en ferias o directorios del sector.',
    relaciones: 'Relación de largo plazo basada en cumplimiento de pedidos y condiciones comerciales.',
    ingresos: 'Venta del producto fabricado, generalmente por volumen o contrato, con posibles ingresos por maquila o personalización.',
    recursos: 'Maquinaria, materia prima, y personal capacitado en producción.',
    actividades: 'Producción, control de calidad, y gestión de inventario de materia prima y producto terminado.',
    socios: 'Proveedores de materia prima, y distribuidores o comercializadoras que lleven el producto al mercado final.',
    costos: 'Materia prima, mantenimiento de maquinaria, energía, y mano de obra de producción.'
  },
  'Tecnología': {
    segmentos: 'Usuarios o empresas que buscan resolver un problema con una herramienta digital, desde early adopters hasta clientes corporativos.',
    propuesta: 'Una solución digital que ahorra tiempo, reduce costos o resuelve algo que hoy se hace de forma manual o con herramientas menos eficientes.',
    canales: 'Sitio web propio, redes sociales, marketing de contenido, y posibles integraciones o alianzas con otras plataformas.',
    relaciones: 'Soporte al cliente, comunidad de usuarios, y actualizaciones continuas del producto.',
    ingresos: 'Suscripción recurrente, licencias, o cobro por uso, según el modelo del producto.',
    recursos: 'El equipo de desarrollo, la infraestructura tecnológica, y la propiedad intelectual del producto.',
    actividades: 'Desarrollo y mantenimiento del producto, soporte a usuarios, y mejora continua basada en retroalimentación.',
    socios: 'Proveedores de infraestructura tecnológica (hosting, pagos), y posibles integraciones con otras plataformas del sector.',
    costos: 'Sueldos del equipo de desarrollo, infraestructura tecnológica, y captación de usuarios.'
  },
  'Alimentos y bebidas': {
    segmentos: 'Consumidores locales que buscan una experiencia o producto alimenticio específico, para consumo inmediato o para llevar.',
    propuesta: 'Sabor, calidad y experiencia consistentes, en un formato (local, para llevar, delivery) que se ajuste a cómo el cliente quiere consumir.',
    canales: 'Punto de venta físico, plataformas de entrega a domicilio, y redes sociales para mostrar el producto.',
    relaciones: 'Experiencia directa en el punto de venta y programas de lealtad para visitas recurrentes.',
    ingresos: 'Venta directa de alimentos y bebidas, con posibles ingresos adicionales por eventos o catering.',
    recursos: 'La receta o concepto propio, el local, equipo de cocina, y personal capacitado.',
    actividades: 'Preparación de alimentos, control de calidad e higiene, y atención al cliente.',
    socios: 'Proveedores de insumos, y plataformas de entrega a domicilio.',
    costos: 'Insumos y materia prima, renta del local, personal de cocina y servicio, y servicios básicos (luz, gas, agua).'
  },
  'Otro': {
    segmentos: 'Los clientes que hoy le compran o contratan a la empresa, definidos por su necesidad principal más que por datos demográficos.',
    propuesta: 'Lo que la empresa resuelve mejor que las alternativas disponibles para ese cliente: precio, calidad, rapidez o confianza.',
    canales: 'Los medios por los que hoy el cliente conoce y contrata a la empresa (recomendación, redes sociales, punto de venta, etc.).',
    relaciones: 'El tipo de trato que recibe el cliente durante y después de la compra.',
    ingresos: 'La forma en que la empresa cobra por lo que ofrece (venta directa, servicio, suscripción, etc.).',
    recursos: 'Lo que la empresa necesita para operar día a día: personal, infraestructura, conocimiento o inventario.',
    actividades: 'Las tareas indispensables para entregar el producto o servicio al cliente.',
    socios: 'Proveedores o aliados sin los cuales la operación sería más difícil o cara.',
    costos: 'Los gastos principales para mantener la operación funcionando cada mes.'
  }
};

function generateCanvas(d){
  const g = giroBase[d.giro] || giroBase['Otro'];
  const out = {
    segmentos: [g.segmentos], propuesta: [g.propuesta], canales: [g.canales],
    relaciones: [g.relaciones], ingresos: [g.ingresos], recursos: [g.recursos],
    actividades: [g.actividades], socios: [g.socios], costos: [g.costos]
  };

  if(d.tamano === 'Micro'){
    out.recursos.push('Al ser una empresa micro, el recurso más crítico hoy es el tiempo y el conocimiento del propio dueño — conviene documentar procesos antes de crecer el equipo.');
  } else if(d.tamano === 'Grande'){
    out.recursos.push('Con infraestructura y equipo ya establecidos, el reto es aprovechar mejor esos recursos existentes en vez de sumar más.');
  } else {
    out.recursos.push('Con el tamaño actual del equipo, conviene formalizar procesos para que no dependan de una sola persona.');
  }

  const problemaAdj = {
    ventas_bajas: {block:'segmentos', text:'El diagnóstico detectó pocos clientes activos: conviene precisar mejor a quién le vendes antes de intentar llegar a más gente.'},
    diferenciacion: {block:'propuesta', text:'La falta de diferenciación sugiere reforzar la propuesta de valor con un diferenciador claro.'},
    precio: {block:'ingresos', text:'La incertidumbre sobre precios o modelo de ingresos exige revisar cómo se captura valor.'},
    marketing: {block:'canales', text:'Sin una estrategia de crecimiento definida, conviene concentrar el esfuerzo en 1 o 2 canales antes de dispersarse.'},
    competencia: {block:'propuesta', text:'Ante una competencia fuerte, la propuesta de valor necesita un diferenciador más claro que solo el precio.'},
    canales: {block:'canales', text:'La dificultad para llegar a nuevos clientes apunta a revisar y fortalecer los canales de captación.'}
  };
  if(problemaAdj[d.problema]) out[problemaAdj[d.problema].block].push(problemaAdj[d.problema].text);

  const objetivoAdj = {
    aumentar_clientes:    {block:'canales',     text:'El objetivo de aumentar clientes implica invertir en ampliar los canales de captación.'},
    mejorar_conversion:   {block:'canales',     text:'Mejorar la conversión exige revisar el proceso de venta o cotización y los puntos de fricción con el cliente.'},
    subir_ticket:         {block:'propuesta',   text:'Subir el valor promedio por venta o servicio suele requerir fortalecer la propuesta de valor o agregar complementos.'},
    reactivar_clientes:   {block:'relaciones',  text:'Reactivar o fidelizar clientes pone el foco en la relación post-venta y en programas de seguimiento.'},
    mejorar_propuesta:    {block:'propuesta',   text:'Mejorar la propuesta de valor es el centro del modelo: qué haces distinto y por qué el cliente te elige.'},
    definir_estrategia:   {block:'canales',     text:'Definir una estrategia de crecimiento clara ordena qué canales usar y con qué mensaje.'},
    atraer_constante:     {block:'canales',     text:'Atraer clientes de forma constante implica convertir los canales de captación en un sistema, no en acciones aisladas.'},
    mejorar_presencia:    {block:'canales',     text:'Mejorar la presencia donde el cliente busca refuerza los canales por los que te descubre.'},
    medir_resultados:     {block:'canales',     text:'Medir resultados de captación permite dejar de invertir a ciegas en canales que no convierten.'},
    plan_contenidos:      {block:'canales',     text:'Un plan de acciones de crecimiento da consistencia a los canales de comunicación con el mercado.'},
    diferenciarse:        {block:'propuesta',   text:'Diferenciarse de la competencia pasa por una propuesta de valor más clara y defendible.'},
    fortalecer_propuesta: {block:'propuesta',   text:'Fortalecer la propuesta de valor es la respuesta directa a un mercado con competencia fuerte.'},
    fidelizar:            {block:'relaciones',  text:'Fidelizar clientes actuales reduce la dependencia de captar siempre nuevos en un mercado competido.'},
    encontrar_nicho:      {block:'segmentos',   text:'Encontrar un nicho menos saturado implica precisar mejor a qué segmento te diriges.'},
    competir_valor:       {block:'propuesta',   text:'Competir por valor y no solo por precio exige que la propuesta de valor sea evidente para el cliente.'}
  };
  if(objetivoAdj[d.objetivo]) out[objetivoAdj[d.objetivo].block].push(objetivoAdj[d.objetivo].text);

  if(d.competencia === 'Alta'){
    out.relaciones.push('En un mercado de competencia alta, la relación con el cliente (no solo el precio) suele ser lo que retiene.');
  }

  if(toMXN(d.marketing, d.moneda) < 5000){
    out.canales.push('El presupuesto de captación actual es limitado; prioriza los canales de menor costo antes de diversificar.');
  }

  return out;
}

function runDiagnosis(){
  goTo('loading');
  const messages = [
    'Analizando la información de tu negocio…',
    'Evaluando propuesta de valor, ingresos y canales…',
    'Calculando puntuaciones por pilar del modelo…',
    'Preparando tu plan recomendado…'
  ];
  let i = 0;
  document.getElementById('loading-text').textContent = messages[0];
  const interval = setInterval(() => {
    i++;
    if(i < messages.length){
      document.getElementById('loading-text').textContent = messages[i];
    }
  }, 450);

  setTimeout(async () => {
    clearInterval(interval);
    scores = computeScores(diag);
    opportunity = Object.entries(scores.areas).sort((a,b) => a[1]-b[1])[0];
    service = recommendService(scores, diag);
    await saveDiagnosticoToSupabase();
    renderResults();
    unlockNav();
    goTo('results');
  }, 1900);
}

/* =========================================================
   RENDER: RESULTADOS
   ========================================================= */
function renderResults(){
  document.getElementById('results-company-line').textContent =
    diag.nombre + ' · ' + diag.giro + ' · ' + diag.ubicacion;

  document.getElementById('overall-num').innerHTML = scores.overall + '<span>/100</span>';
  const overallSem = semaforo(scores.overall);
  const pill = document.getElementById('overall-pill');
  pill.className = 'semaforo-pill ' + overallSem;
  document.getElementById('overall-pill-text').textContent = semaforoLabel(scores.overall);

  const meterList = document.getElementById('meter-list');
  meterList.innerHTML = '';
  Object.entries(scores.areas).forEach(([area, val]) => {
    const sem = semaforo(val);
    meterList.innerHTML += `
      <div class="meter-row">
        <div class="m-label">${area}<span class="m-desc">${areaInfo[area].desc}</span></div>
        <div class="meter-track"><div class="meter-fill ${sem}" style="width:${val}%"></div></div>
        <div class="m-num">${val}</div>
        <div class="m-tag ${sem}">${semaforoLabel(val)}</div>
      </div>`;
  });

  document.getElementById('opportunity-area').textContent = opportunity[0];
  document.getElementById('opportunity-text').textContent = areaInfo[opportunity[0]].desc;

  const recList = document.getElementById('rec-list');
  recList.innerHTML = '';
  const sortedAreas = Object.entries(scores.areas).sort((a,b) => a[1]-b[1]);
  sortedAreas.slice(0,2).forEach(([area]) => {
    pickTipsForArea(area, diag).forEach(tip => {
      recList.innerHTML += `<li>${tip}</li>`;
    });
  });

  const why = 'Tu principal oportunidad está en ' + opportunity[0] + '. Por eso el plan recomendado se enfoca en cerrar esa brecha con acciones concretas de modelo de negocio.';
  document.getElementById('service-name').textContent = service.name;
  document.getElementById('service-desc').textContent = why + ' ' + service.desc;
  const others = document.getElementById('other-services');
  others.innerHTML = '';
  Object.keys(serviceCatalog).filter(s => s !== service.name).forEach(s => {
    others.innerHTML += `<span>${s}</span>`;
  });

  const b = classifyBCG(diag, scores);
  document.getElementById('results-bcg-label').textContent = b.label;
  document.getElementById('results-bcg-desc').textContent = b.desc;
  const mvpEl = document.getElementById('results-bcg-mvp');
  if(b.mvp){
    mvpEl.style.display = 'block';
    mvpEl.textContent = b.mvp;
  } else {
    mvpEl.style.display = 'none';
    mvpEl.textContent = '';
  }
  renderResultsCanvas();
}

function renderResultsCanvas(){
  const grid = document.getElementById('results-canvas-grid');
  if(!grid) return;
  const c = generateCanvas(diag);
  const blocks = [
    {key:'socios', cls:'cb-socios', title:'Socios clave'},
    {key:'actividades', cls:'cb-actividades', title:'Actividades clave'},
    {key:'recursos', cls:'cb-recursos', title:'Recursos clave'},
    {key:'propuesta', cls:'cb-propuesta', title:'Propuesta de valor'},
    {key:'relaciones', cls:'cb-relaciones', title:'Relación con clientes'},
    {key:'canales', cls:'cb-canales', title:'Canales'},
    {key:'segmentos', cls:'cb-segmentos', title:'Segmentos de clientes'},
    {key:'costos', cls:'cb-costos', title:'Estructura de costos'},
    {key:'ingresos', cls:'cb-ingresos', title:'Fuentes de ingreso'}
  ];
  grid.innerHTML = blocks.map(b => `
    <div class="canvas-block ${b.cls}">
      <div class="cb-eyebrow">${b.title}</div>
      <p>${(c[b.key] || []).join(' ')}</p>
    </div>
  `).join('');
}

/* =========================================================
   SIMULADOR DE ESCENARIOS
   ========================================================= */
function renderSimulator(){
  const palanca = document.getElementById('sim-palanca').value;
  const intensidad = parseInt(document.getElementById('sim-intensidad').value, 10) || 2;
  const labels = {1:'Baja', 2:'Media', 3:'Alta'};
  document.getElementById('val-intensidad').textContent = labels[intensidad] || 'Media';

  const boost = {1: 6, 2: 12, 3: 18}[intensidad];
  const mapArea = {
    promocion: 'Crecimiento',
    precio: 'Modelo de ingresos',
    plaza: 'Canales',
    producto: 'Propuesta de valor',
    cliente: 'Mercado / Clientes'
  };
  const efectos = {
    promocion: 'Más claridad de mensaje y mayor constancia en la captación.',
    precio: 'Modelo de ingresos más defendible y menos dependencia de descuentos.',
    plaza: 'Mejor uso del canal principal y menos dispersión.',
    producto: 'Oferta más clara frente a la competencia.',
    cliente: 'Mejor foco en a quién le hablas y por qué te eligen.'
  };

  const area = mapArea[palanca];
  const diagP = Object.assign({}, diag);
  const scoresP = computeScores(diagP);
  scoresP.areas[area] = Math.min(100, (scoresP.areas[area] || 50) + boost);
  scoresP.overall = Math.round(Object.values(scoresP.areas).reduce((a,b)=>a+b,0) / 5);
  const delta = scoresP.overall - scores.overall;

  document.getElementById('sim-out-area').textContent = area;
  document.getElementById('sim-out-score').textContent = scores.overall + ' → ' + scoresP.overall + ' / 100';
  document.getElementById('sim-out-delta').textContent = (delta >= 0 ? '+' : '') + delta + ' pts';
  document.getElementById('sim-out-efecto').textContent = efectos[palanca] || '—';
}

/* =========================================================
   POSICIÓN DE LA OFERTA (BCG simplificado)
   ========================================================= */
function classifyBCG(d, scores){
  const antig = d.antiguedad || 0;
  const cliente = scores.areas['Mercado / Clientes'] || 50;
  const producto = scores.areas['Propuesta de valor'] || 50;
  const competenciaAlta = d.competencia === 'Alta';
  const esNuevo = antig < 2 || d.problema === 'ventas_bajas';

  if(cliente >= 70 && producto >= 65 && !competenciaAlta){
    return {
      key: 'estrella',
      label: 'Estrella',
      desc: 'Tu oferta tiene tracción y margen para seguir creciendo. Conviene proteger el posicionamiento y no descuidar la calidad de la entrega.'
    };
  }
  if(cliente >= 65 && antig >= 3 && scores.areas['Crecimiento'] < 60){
    return {
      key: 'vaca',
      label: 'Vaca',
      desc: 'Ya generas demanda de forma relativamente estable. El foco útil es cuidar márgenes y no gastar de más en captación improvisada.'
    };
  }
  if(esNuevo || (cliente < 55 && producto >= 50) || d.problema === 'competencia'){
    const tipo = tipoNegocio(d.giro);
    let mvp = '';
    if(tipo === 'producto'){
      mvp = 'Antes de producir a gran escala, valida con un lote pequeño: la cantidad mínima que te permita probar si hay demanda sin comprometer capital que no puedas recuperar.';
    } else if(tipo === 'servicio'){
      mvp = 'Antes de comprometer más capacidad del equipo, prueba el servicio con un grupo reducido de clientes y confirma que están dispuestos a pagar de forma recurrente.';
    } else {
      mvp = 'Valida con el menor compromiso posible: poco inventario o pocos clientes piloto, según lo que ofrezcas, antes de escalar.';
    }
    return {
      key: 'interrogante',
      label: 'Interrogante',
      desc: 'Hay potencial, pero todavía no está claro si la oferta va a consolidarse. Conviene probar con poco riesgo antes de invertir fuerte.',
      mvp
    };
  }
  return {
    key: 'perro',
    label: 'Perro',
    desc: 'La combinación de demanda y diferenciación se ve débil. Antes de empujar más presupuesto, revisa si la oferta o el segmento son los correctos.'
  };
}

function renderBCG(){
  const b = classifyBCG(diag, scores);
  document.getElementById('bcg-label').textContent = b.label;
  document.getElementById('bcg-desc').textContent = b.desc;
  const mvpEl = document.getElementById('bcg-mvp');
  if(b.mvp){
    mvpEl.style.display = 'block';
    mvpEl.textContent = b.mvp;
  } else {
    mvpEl.style.display = 'none';
    mvpEl.textContent = '';
  }
}

function renderReport(){
  document.getElementById('report-date').textContent = new Date().toLocaleDateString('es-MX', {year:'numeric', month:'long', day:'numeric'});
  document.getElementById('report-company-name').textContent = diag.nombre;
  document.getElementById('report-company-sub').textContent = diag.giro + ' · ' + diag.tamano + ' · ' + diag.ubicacion;

  const precioLabels = {
    competencia: 'Según la competencia',
    costos: 'Según costos + margen',
    valor: 'Según valor percibido',
    intuicion: 'Sin método claro'
  };
  const plazaLabels = {
    fisico: 'Punto de venta físico',
    digital: 'Sitio web / tienda en línea',
    redes: 'Redes sociales',
    referidos: 'Referidos / boca a boca',
    mixto: 'Varios canales'
  };
  document.getElementById('report-grid').innerHTML = `
    <div><dt>Antigüedad</dt><dd>${diag.antiguedad} años</dd></div>
    <div><dt>Empleados</dt><dd>${diag.empleados}</dd></div>
    <div><dt>Ingresos mensuales aprox.</dt><dd>${money(diag.ventas, diag.moneda)}</dd></div>
    <div><dt>Presupuesto de crecimiento</dt><dd>${money(diag.marketing, diag.moneda)}</dd></div>
    <div><dt>Definición de precios</dt><dd>${precioLabels[diag.precio] || diag.precio || '—'}</dd></div>
    <div><dt>Canal principal</dt><dd>${plazaLabels[diag.plaza] || diag.plaza || '—'}</dd></div>
    <div><dt>Competencia percibida</dt><dd>${diag.competencia}</dd></div>
    <div><dt>Problema principal</dt><dd>${labelFor(problemaLabels, diag.problema, diag.giro)}</dd></div>
    <div><dt>Objetivo principal</dt><dd>${getObjetivoLabel(diag.objetivo, diag.problema, diag.giro)}</dd></div>
  `;

  const reportScores = document.getElementById('report-scores');
  reportScores.innerHTML = '';
  Object.entries(scores.areas).forEach(([area, val]) => {
    reportScores.innerHTML += `
      <div class="rs-item">
        <div class="rs-num">${val}</div>
        <div class="rs-label">${area}</div>
      </div>`;
  });
  reportScores.innerHTML += `
    <div class="rs-item">
      <div class="rs-num">${scores.overall}</div>
      <div class="rs-label">General</div>
    </div>`;

  renderBCG();

  document.getElementById('report-service-name').textContent = service.name;
  document.getElementById('report-service-desc').textContent = service.desc;

  document.getElementById('modal-company').textContent = diag.nombre;
}

const originalGoTo = goTo;
goTo = function(view){
  if(view === 'report') renderReport();
  originalGoTo(view);
};

let pendingPlanName = '';

function isSupabaseConfigured(){
  return Boolean(supabaseClient);
}

async function saveDiagnosticoToSupabase(){
  currentDiagnosticoId = null;
  if(!isSupabaseConfigured()){
    console.warn('Supabase no está configurado. Completa SUPABASE_URL y SUPABASE_ANON_KEY en script.js.');
    return null;
  }

  const bcg = classifyBCG(diag, scores);
  const diagnosticoId = crypto.randomUUID();
  const {error} = await supabaseClient
    .from('diagnosticos')
    .insert({
      id: diagnosticoId,
      nombre_empresa: diag.nombre,
      giro: diag.giro,
      tamano: diag.tamano,
      antiguedad: diag.antiguedad,
      ubicacion: diag.ubicacion,
      empleados: diag.empleados,
      moneda: diag.moneda,
      ventas: diag.ventas,
      marketing: diag.marketing,
      precio_metodo: diag.precio,
      canal_principal: diag.plaza,
      competencia: diag.competencia,
      problema: diag.problema,
      objetivo: diag.objetivo,
      puntaje_general: scores.overall,
      puntajes_areas: scores.areas,
      bcg_posicion: bcg.label,
      plan_recomendado: service.name
    });

  if(error){
    console.error('No se pudo guardar el diagnóstico en Supabase:', error);
    return null;
  }

  currentDiagnosticoId = diagnosticoId;
  return diagnosticoId;
}

async function saveSolicitudToSupabase(entry){
  if(!isSupabaseConfigured()) return;

  const {error} = await supabaseClient
    .from('solicitudes')
    .insert({
      diagnostico_id: currentDiagnosticoId,
      nombre_contacto: entry.nombre,
      correo: entry.correo,
      telefono: entry.telefono,
      plan: entry.plan,
      nota: entry.nota
    });

  if(error) console.error('No se pudo guardar la solicitud en Supabase:', error);
}

/* Destino del correo que el cliente enviará desde su propia cuenta */
const GM360_MAIL = 'gm360.mx@gmail.com';
const STORAGE_KEY = 'gm360_solicitudes';

function openModal(plan){
  pendingPlanName = plan || (service && service.name) || '';
  document.getElementById('modal-plan-wrap').style.display = pendingPlanName ? 'inline' : 'none';
  document.getElementById('modal-plan').textContent = pendingPlanName;
  document.getElementById('modal-company').textContent = (diag && diag.nombre) || 'tu empresa';
  document.getElementById('modal-form-wrap').style.display = 'block';
  document.getElementById('modal-success-wrap').style.display = 'none';
  const form = document.getElementById('request-form');
  if(form) form.reset();
  document.getElementById('modal').classList.add('active');
}
function closeModal(){ document.getElementById('modal').classList.remove('active'); }

function openLegalModal(){ document.getElementById('legal-modal').classList.add('active'); }
function closeLegalModal(){ document.getElementById('legal-modal').classList.remove('active'); }

function restartApp(){
  currentStep = 1;
  diag = {};
  scores = {};
  service = {};
  opportunity = {};
  pendingPlanName = '';
  const form = document.getElementById('diagnostico-form');
  if(form) form.reset();
  showStep(1);
  ['nav-diagnostico','nav-resultados','nav-simulador','nav-cotizacion','nav-reporte'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.disabled = true; el.classList.remove('active'); }
  });
  goTo('portada');
}

/* ---------- Almacén de solicitudes (localStorage) ---------- */
function loadRequests(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch(e){
    return [];
  }
}
function saveRequests(list){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch(e){
    console.warn('No se pudo guardar la solicitud en localStorage', e);
  }
}
function addRequest(entry){
  const list = loadRequests();
  list.unshift(entry);
  saveRequests(list);
}

/**
 * Flujo principal:
 * 1) Valida y guarda la solicitud en localStorage (panel interno).
 * 2) Abre el correo del cliente (mailto) con el mensaje listo hacia GM360.
 * No usa FormSubmit ni envío automático a Gmail.
 */
async function submitClientRequest(e){
  if(e) e.preventDefault();

  const nombre = document.getElementById('r-nombre').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const telefono = document.getElementById('r-telefono').value.trim();
  const nota = document.getElementById('r-mensaje').value.trim();
  const empresa = (diag && diag.nombre) || 'Sin nombre';
  const plan = pendingPlanName || (service && service.name) || 'Plan';
  const score = (scores && scores.overall != null) ? String(scores.overall) : '-';

  if(!nombre || !email){
    alert('Indica tu nombre y correo para continuar.');
    return false;
  }

  const entry = {
    id: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    fecha: new Date().toISOString(),
    fechaLocal: new Date().toLocaleString('es-MX'),
    empresa: empresa,
    plan: plan,
    puntuacion: score,
    nombre: nombre,
    correo: email,
    telefono: telefono || '',
    nota: nota || '',
    giro: (diag && diag.giro) || '',
    ubicacion: (diag && diag.ubicacion) || '',
    moneda: (diag && diag.moneda) || 'MXN',
    problema: (diag && diag.problema) || '',
    objetivo: (diag && diag.objetivo) || ''
  };
  addRequest(entry);
  await saveSolicitudToSupabase(entry);

  const body =
    'Hola GM360,\n\n' +
    'Quiero solicitar el siguiente plan a partir del diagnóstico de modelo de negocio.\n\n' +
    'Empresa: ' + empresa + '\n' +
    'Plan: ' + plan + '\n' +
    'Puntuación del diagnóstico: ' + score + '\n' +
    'Nombre: ' + nombre + '\n' +
    'Correo: ' + email + '\n' +
    (telefono ? ('Teléfono: ' + telefono + '\n') : '') +
    (nota ? ('Nota: ' + nota + '\n') : '') +
    '\n— Enviado desde el diagnóstico GM360';

  const mailto =
    'mailto:' + encodeURIComponent(GM360_MAIL) +
    '?subject=' + encodeURIComponent('Solicitud de plan — ' + empresa) +
    '&body=' + encodeURIComponent(body);

  // Abrir el cliente de correo del usuario
  window.location.href = mailto;

  document.getElementById('modal-company-ok').textContent = empresa;
  document.getElementById('modal-form-wrap').style.display = 'none';
  document.getElementById('modal-success-wrap').style.display = 'block';
  return false;
}

/* ---------- Panel de administración ---------- */
function openAdminModal(){
  document.getElementById('admin-login-wrap').style.display = 'block';
  document.getElementById('admin-list-wrap').style.display = 'none';
  const email = document.getElementById('admin-email');
  if(email) email.value = '';
  const pass = document.getElementById('admin-pass');
  if(pass) pass.value = '';
  document.getElementById('admin-modal').classList.add('active');
}
function closeAdminModal(){
  document.getElementById('admin-modal').classList.remove('active');
}
async function adminLogin(){
  if(!isSupabaseConfigured()){
    alert('Supabase no está configurado.');
    return;
  }
  const email = (document.getElementById('admin-email').value || '').trim();
  const pass = (document.getElementById('admin-pass').value || '').trim();
  if(!email || !pass){
    alert('Indica el correo y la contraseña del administrador.');
    return;
  }

  const {error} = await supabaseClient.auth.signInWithPassword({email, password:pass});
  if(error){
    alert('No se pudo iniciar sesión: ' + error.message);
    return;
  }

  document.getElementById('admin-login-wrap').style.display = 'none';
  document.getElementById('admin-list-wrap').style.display = 'block';
  await loadAdminData();
}
async function adminLogout(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  openAdminModal();
}
async function loadAdminData(){
  const empty = document.getElementById('admin-empty');
  const box = document.getElementById('admin-list');
  box.innerHTML = '<p style="font-size:14px; color:var(--slate);">Cargando registros…</p>';

  const [{data:diagnosticos, error:diagnosticosError}, {data:solicitudes, error:solicitudesError}] = await Promise.all([
    supabaseClient.from('diagnosticos').select('*').order('created_at', {ascending:false}),
    supabaseClient.from('solicitudes').select('*').order('created_at', {ascending:false})
  ]);

  if(diagnosticosError || solicitudesError){
    console.error('No se pudieron cargar los registros:', diagnosticosError || solicitudesError);
    box.innerHTML = '<p style="font-size:14px; color:var(--red);">No se pudieron cargar los registros. Revisa tu sesión y las políticas RLS.</p>';
    empty.style.display = 'none';
    return;
  }

  if(!diagnosticos.length){
    empty.style.display = 'block';
    box.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  box.innerHTML = diagnosticos.map(d => {
    const request = (solicitudes || []).find(s => s.diagnostico_id === d.id);
    const fecha = new Date(d.created_at).toLocaleString('es-MX');
    return `
    <div style="border:1px solid var(--line); border-radius:8px; padding:14px 16px; background:#fff;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
        <strong style="font-size:15px;">${escapeHtml(d.nombre_empresa)}</strong>
        <span style="font-size:12px; color:var(--slate);">${escapeHtml(fecha)}</span>
      </div>
      <div style="font-size:13.5px; color:var(--ink-soft); line-height:1.55;">
        <div><strong>Giro / ubicación:</strong> ${escapeHtml(d.giro || '—')} · ${escapeHtml(d.ubicacion || '—')}</div>
        <div><strong>Puntuación:</strong> ${escapeHtml(String(d.puntaje_general ?? '—'))} · <strong>Plan:</strong> ${escapeHtml(d.plan_recomendado || '—')}</div>
        <div><strong>Posición:</strong> ${escapeHtml(d.bcg_posicion || '—')}</div>
        ${request ? '<div style="margin-top:6px;"><strong>Contacto:</strong> ' + escapeHtml(request.nombre_contacto || '—') + ' · ' + escapeHtml(request.correo || '—') + (request.telefono ? ' · ' + escapeHtml(request.telefono) : '') + '</div>' : '<div style="margin-top:6px; color:var(--slate);">Sin solicitud de contacto</div>'}
        ${request && request.nota ? '<div style="margin-top:6px;"><strong>Nota:</strong> ' + escapeHtml(request.nota) + '</div>' : ''}
      </div>
    </div>
  `;
  }).join('');
}
function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function deleteRequest(id){
  if(!confirm('¿Eliminar esta solicitud?')) return;
  const next = loadRequests().filter(r => r.id !== id);
  saveRequests(next);
  renderAdminList();
}
function clearAllRequests(){
  if(!confirm('¿Vaciar todas las solicitudes de este navegador?')) return;
  saveRequests([]);
  renderAdminList();
}
function exportRequests(){
  const list = loadRequests();
  if(!list.length){
    alert('No hay solicitudes para exportar.');
    return;
  }
  const fechaDoc = new Date().toLocaleString('es-MX', {year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'});
  const rows = list.map((r, i) => `
    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(r.empresa || 'Sin empresa')}</h2>
        <span class="meta">#${i + 1} · ${escapeHtml(r.fechaLocal || r.fecha || '')}</span>
      </div>
      <table>
        <tr><th>Plan</th><td>${escapeHtml(r.plan || '—')}</td></tr>
        <tr><th>Puntuación</th><td>${escapeHtml(String(r.puntuacion ?? '—'))}</td></tr>
        <tr><th>Contacto</th><td>${escapeHtml(r.nombre || '—')}</td></tr>
        <tr><th>Correo</th><td>${escapeHtml(r.correo || '—')}</td></tr>
        <tr><th>Teléfono</th><td>${escapeHtml(r.telefono || '—')}</td></tr>
        <tr><th>Giro</th><td>${escapeHtml(r.giro || '—')}</td></tr>
        <tr><th>Ubicación</th><td>${escapeHtml(r.ubicacion || '—')}</td></tr>
        <tr><th>Nota</th><td>${escapeHtml(r.nota || '—')}</td></tr>
      </table>
    </section>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>GM360 — Solicitudes</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #16233F;
    margin: 0;
    padding: 24px;
    line-height: 1.45;
    background: #fff;
  }
  .header {
    border-bottom: 2px solid #16233F;
    padding-bottom: 14px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }
  .brand { font-size: 20px; font-weight: 700; }
  .sub { font-size: 12px; color: #5B6472; margin-top: 4px; font-family: system-ui, sans-serif; }
  .doc-meta { text-align: right; font-size: 12px; color: #5B6472; font-family: system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  .intro { font-size: 13px; color: #5B6472; margin: 0 0 20px; font-family: system-ui, sans-serif; }
  .card {
    border: 1px solid #DDD6C7;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: baseline;
    margin-bottom: 10px;
    border-bottom: 1px solid #EFEBE2;
    padding-bottom: 8px;
  }
  .card-head h2 { font-size: 16px; margin: 0; }
  .meta { font-size: 11px; color: #5B6472; font-family: system-ui, sans-serif; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; font-family: system-ui, sans-serif; }
  th {
    text-align: left;
    width: 120px;
    color: #5B6472;
    font-weight: 600;
    padding: 4px 8px 4px 0;
    vertical-align: top;
  }
  td { padding: 4px 0; color: #16233F; vertical-align: top; }
  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #DDD6C7;
    font-size: 11px;
    color: #5B6472;
    font-family: system-ui, sans-serif;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
  .toolbar {
    margin-bottom: 18px;
    display: flex;
    gap: 10px;
    font-family: system-ui, sans-serif;
  }
  .toolbar button {
    background: #16233F;
    color: #F6F4EF;
    border: none;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
  }
  .toolbar button.secondary {
    background: transparent;
    color: #16233F;
    border: 1px solid #DDD6C7;
  }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Guardar / imprimir PDF</button>
    <button class="secondary" onclick="window.close()">Cerrar</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">GM360</div>
      <div class="sub">Planes y modelos de negocio</div>
    </div>
    <div class="doc-meta">
      <div>Listado de solicitudes</div>
      <div>${escapeHtml(fechaDoc)}</div>
      <div>${list.length} registro${list.length === 1 ? '' : 's'}</div>
    </div>
  </div>
  <h1>Solicitudes registradas</h1>
  <p class="intro">Documento generado desde el panel interno. Úsalo como respaldo o para compartir con el equipo.</p>
  ${rows}
  <div class="footer">GM360 · Panel interno de solicitudes · Generado automáticamente</div>
  <script>
    // En algunos navegadores conviene esperar un instante antes de imprimir
    setTimeout(function(){ try { window.print(); } catch(e){} }, 350);
  <\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if(!w){
    alert('El navegador bloqueó la ventana emergente. Permite pop-ups para exportar el PDF.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* Acceso rápido por hash: #admin */
if(location.hash === '#admin'){
  setTimeout(openAdminModal, 300);
}
