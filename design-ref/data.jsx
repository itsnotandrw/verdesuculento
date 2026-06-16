// Catálogo VERDE. — Vivero & Agricultura Moderna (Colombia)
// Variedades = "colors", Presentación = "sizes" (bolsa / maceta)

const CATALOG = [
  // ============ FRUTALES EXÓTICOS ============
  {
    id: 'fr-01',
    name: 'Mangostino',
    category: 'frutales',
    price: 38000,
    tagline: 'La reina de las frutas tropicales.',
    description: 'Garcinia mangostana. Árbol tropical de crecimiento lento que produce frutos de cáscara morada y pulpa blanca dulce. Aclimatado a climas cálidos húmedos colombianos. Plántula injertada de vivero certificado.',
    colors: [
      { name: 'Estándar', hex: '#5a2858' },
      { name: 'Premium injertado', hex: '#3a1a3a' },
    ],
    sizes: ['Bolsa 5L', 'Bolsa 10L', 'Maceta 20L'],
    badge: 'Exótico',
    accent: 'green',
    specs: { clima: 'Tropical húmedo', sol: 'Semisombra', riego: 'Frecuente', produccion: '5 — 8 años', altura: '6 — 12 m', dificultad: 'Avanzado' },
  },
  {
    id: 'fr-02',
    name: 'Rambután',
    category: 'frutales',
    price: 32000,
    tagline: 'Pelo rojo por fuera. Lichi por dentro.',
    description: 'Nephelium lappaceum. Frutal de origen asiático perfectamente adaptado al trópico colombiano. Produce racimos de frutos rojos cubiertos de espinas suaves. Pulpa translúcida, dulce y aromática.',
    colors: [
      { name: 'Rojo intenso', hex: '#a82d1f' },
      { name: 'Amarillo dorado', hex: '#c98a2c' },
    ],
    sizes: ['Bolsa 5L', 'Bolsa 10L'],
    accent: 'red',
    specs: { clima: 'Tropical', sol: 'Pleno', riego: 'Moderado', produccion: '4 — 6 años', altura: '8 — 15 m', dificultad: 'Intermedio' },
  },
  {
    id: 'fr-03',
    name: 'Aguacate Hass',
    category: 'frutales',
    price: 28000,
    tagline: 'La variedad reina del mercado.',
    description: 'Persea americana var. Hass. Árbol de gran rendimiento con frutos de piel rugosa que oscurece al madurar. Pulpa cremosa con alto contenido de grasas buenas. Patrón de raíz certificado contra Phytophthora.',
    colors: [
      { name: 'Hass injertado', hex: '#2f3a1f' },
      { name: 'Patrón Lorena', hex: '#3a4a2a' },
    ],
    sizes: ['Bolsa 5L', 'Bolsa 10L', 'Maceta 20L'],
    badge: 'Bestseller',
    accent: 'green',
    specs: { clima: 'Templado', sol: 'Pleno', riego: 'Moderado', produccion: '3 — 4 años', altura: '5 — 9 m', dificultad: 'Fácil' },
  },
  {
    id: 'fr-04',
    name: 'Acerola',
    category: 'frutales',
    price: 22000,
    tagline: 'Más vitamina C que la naranja.',
    description: 'Malpighia emarginata. Pequeño arbusto frutal que produce bayas rojas brillantes con un contenido excepcional de vitamina C. Ideal para huertos urbanos y patios pequeños.',
    colors: [
      { name: 'Rojo cereza', hex: '#c4302c' },
    ],
    sizes: ['Bolsa 3L', 'Bolsa 5L'],
    accent: 'red',
    specs: { clima: 'Tropical', sol: 'Pleno', riego: 'Moderado', produccion: '1 — 2 años', altura: '2 — 4 m', dificultad: 'Fácil' },
  },

  // ============ CÍTRICOS ============
  {
    id: 'ct-01',
    name: 'Limón Tahití',
    category: 'citricos',
    price: 25000,
    tagline: 'Cosecha continua durante todo el año.',
    description: 'Citrus latifolia. El cítrico más rentable del trópico. Sin semillas, jugoso, perfumado. Patrón de mandarina cleopatra para máxima resistencia. Empezará a producir entre los 18 y 24 meses.',
    colors: [
      { name: 'Patrón Cleopatra', hex: '#7a9a3a' },
      { name: 'Patrón Volkameriano', hex: '#8aa83a' },
    ],
    sizes: ['Bolsa 5L', 'Bolsa 10L', 'Maceta 20L'],
    badge: 'Bestseller',
    accent: 'green',
    specs: { clima: 'Cálido a templado', sol: 'Pleno', riego: 'Moderado', produccion: '1.5 — 2 años', altura: '3 — 5 m', dificultad: 'Fácil' },
  },
  {
    id: 'ct-02',
    name: 'Naranja Valencia',
    category: 'citricos',
    price: 27000,
    tagline: 'Jugosa, dulce, perfecta para jugo.',
    description: 'Citrus sinensis var. Valencia. La variedad de naranja más cultivada del mundo. Frutos grandes, dulces, con altísimo contenido de jugo. Cosecha tardía: enero a abril.',
    colors: [
      { name: 'Valencia estándar', hex: '#e07e1f' },
    ],
    sizes: ['Bolsa 5L', 'Bolsa 10L'],
    accent: 'orange',
    specs: { clima: 'Subtropical', sol: 'Pleno', riego: 'Moderado', produccion: '2 — 3 años', altura: '4 — 6 m', dificultad: 'Fácil' },
  },
  {
    id: 'ct-03',
    name: 'Mandarina Arrayana',
    category: 'citricos',
    price: 24000,
    tagline: 'La mandarina criolla colombiana.',
    description: 'Variedad criolla altamente adaptada al territorio. Frutos pequeños, dulces, fáciles de pelar. Resistente a las enfermedades comunes del trópico húmedo.',
    colors: [
      { name: 'Arrayana criolla', hex: '#d65a2a' },
    ],
    sizes: ['Bolsa 5L', 'Bolsa 10L'],
    accent: 'orange',
    specs: { clima: 'Cálido', sol: 'Pleno', riego: 'Moderado', produccion: '2 años', altura: '3 — 5 m', dificultad: 'Fácil' },
  },

  // ============ BERRIES ============
  {
    id: 'br-01',
    name: 'Arándano Blueberry',
    category: 'berries',
    price: 45000,
    tagline: 'Superfruto cultivado en altura.',
    description: 'Vaccinium corymbosum. Variedades Biloxi y Emerald, adaptadas al trópico de altura colombiano (1.800 — 2.800 msnm). Producen bayas azules cargadas de antioxidantes. Requieren sustrato ácido.',
    colors: [
      { name: 'Biloxi', hex: '#3a4a8a' },
      { name: 'Emerald', hex: '#2a3a7a' },
      { name: 'Sharpblue', hex: '#4a5a9a' },
    ],
    sizes: ['Bolsa 3L', 'Bolsa 5L', 'Maceta 10L'],
    badge: 'Nuevo',
    accent: 'blue',
    specs: { clima: 'Frío de altura', sol: 'Pleno', riego: 'Frecuente', produccion: '12 — 18 meses', altura: '1.5 m', dificultad: 'Intermedio' },
  },
  {
    id: 'br-02',
    name: 'Mora de Castilla',
    category: 'berries',
    price: 18000,
    tagline: 'Sin espinas, alta producción.',
    description: 'Rubus glaucus. Variedad mejorada sin espinas con racimos largos de frutos grandes. Cultivada en zonas de clima frío entre los 1.800 y 3.000 msnm. Producción durante 6 a 8 años.',
    colors: [
      { name: 'Sin espinas', hex: '#3a1a3a' },
      { name: 'Tradicional', hex: '#2a0a2a' },
    ],
    sizes: ['Bolsa 3L', 'Bolsa 5L'],
    accent: 'purple',
    specs: { clima: 'Frío', sol: 'Pleno', riego: 'Moderado', produccion: '8 — 12 meses', altura: '1.5 — 2 m', dificultad: 'Fácil' },
  },
  {
    id: 'br-03',
    name: 'Fresa Albión',
    category: 'berries',
    price: 8000,
    tagline: 'Cosecha en 90 días.',
    description: 'Fragaria × ananassa var. Albión. Plántulas certificadas de día neutro: producen todo el año. Ideal para huertas urbanas y mesas hidropónicas. Frutos firmes, brillantes, muy aromáticos.',
    colors: [
      { name: 'Albión', hex: '#b8302a' },
      { name: 'Monterey', hex: '#a8201a' },
    ],
    sizes: ['Bandeja 12u', 'Bandeja 24u', 'Bandeja 50u'],
    accent: 'red',
    specs: { clima: 'Frío a templado', sol: 'Pleno', riego: 'Frecuente', produccion: '3 meses', altura: '20 — 30 cm', dificultad: 'Fácil' },
  },

  // ============ ORNAMENTALES ============
  {
    id: 'or-01',
    name: 'Heliconia Rostrata',
    category: 'ornamentales',
    price: 35000,
    tagline: 'La pinza de loro colgante.',
    description: 'Inflorescencia péndula de colores escarlata y amarillo. Planta tropical icónica del paisajismo colombiano. Atrae colibríes. Crece formando macollas espectaculares.',
    colors: [
      { name: 'Roja clásica', hex: '#c8221a' },
      { name: 'Amarilla brillante', hex: '#d8a420' },
    ],
    sizes: ['Maceta 5L', 'Maceta 10L'],
    badge: 'Destacado',
    accent: 'red',
    specs: { clima: 'Tropical', sol: 'Semisombra', riego: 'Frecuente', produccion: '6 — 8 meses', altura: '1.5 — 3 m', dificultad: 'Fácil' },
  },
  {
    id: 'or-02',
    name: 'Anturio Andreanum',
    category: 'ornamentales',
    price: 28000,
    tagline: 'Flor de cera de larga duración.',
    description: 'Anthurium andreanum. Espata brillante que dura semanas en pie. Cultivado en condiciones controladas de sombra y humedad. Variedades en rojo, blanco y rosa.',
    colors: [
      { name: 'Rojo', hex: '#b8201a' },
      { name: 'Blanco', hex: '#f5f0e8' },
      { name: 'Rosa', hex: '#d68aa0' },
    ],
    sizes: ['Maceta 3L', 'Maceta 5L'],
    accent: 'red',
    specs: { clima: 'Tropical', sol: 'Sombra', riego: 'Frecuente', produccion: 'Continua', altura: '40 — 60 cm', dificultad: 'Intermedio' },
  },
  {
    id: 'or-03',
    name: 'Bromelia Vriesea',
    category: 'ornamentales',
    price: 32000,
    tagline: 'Inflorescencia en forma de espada.',
    description: 'Vriesea splendens. Bromelia epífita con hojas listadas y inflorescencia roja que dura meses. Ideal para interiores luminosos sin sol directo.',
    colors: [
      { name: 'Splendens', hex: '#c8201a' },
      { name: 'Carinata', hex: '#d84a1a' },
    ],
    sizes: ['Maceta 2L', 'Maceta 5L'],
    accent: 'orange',
    specs: { clima: 'Tropical', sol: 'Sombra', riego: 'Bajo', produccion: 'Anual', altura: '40 — 80 cm', dificultad: 'Fácil' },
  },

  // ============ SUCULENTAS ============
  {
    id: 'su-01',
    name: 'Echeveria Elegans',
    category: 'suculentas',
    price: 12000,
    tagline: 'La roseta perfecta.',
    description: 'Echeveria elegans. Roseta compacta de hojas carnosas color verde azulado con bordes rosados. Especie estrella del coleccionismo de suculentas. Reproducción muy fácil por hijuelos.',
    colors: [
      { name: 'Verde glauco', hex: '#7a9a8a' },
      { name: 'Lila polvo', hex: '#a89aa8' },
    ],
    sizes: ['Maceta 6cm', 'Maceta 10cm', 'Maceta 15cm'],
    badge: 'Bestseller',
    accent: 'green',
    specs: { clima: 'Cualquiera', sol: 'Pleno', riego: 'Bajo', produccion: 'Decorativa', altura: '10 — 15 cm', dificultad: 'Fácil' },
  },
  {
    id: 'su-02',
    name: 'Sedum Burrito',
    category: 'suculentas',
    price: 14000,
    tagline: 'La cola de burro colgante.',
    description: 'Sedum morganianum. Tallos colgantes formados por pequeñas hojas en forma de gota color verde jade. Perfecta para macetas colgantes y arreglos verticales.',
    colors: [
      { name: 'Jade', hex: '#8aaa6a' },
    ],
    sizes: ['Maceta 8cm', 'Colgante 15cm'],
    accent: 'green',
    specs: { clima: 'Cualquiera', sol: 'Pleno', riego: 'Bajo', produccion: 'Decorativa', altura: '30 — 80 cm colgante', dificultad: 'Fácil' },
  },
  {
    id: 'su-03',
    name: 'Haworthia Cooperi',
    category: 'suculentas',
    price: 18000,
    tagline: 'Ventanas translúcidas para la luz.',
    description: 'Haworthia cooperi. Suculenta sudafricana con hojas casi transparentes que permiten ver su interior. Tolerante a la sombra. Perfecta para escritorios y ambientes interiores.',
    colors: [
      { name: 'Translúcida', hex: '#a8c89a' },
      { name: 'Variegada', hex: '#c8d8a8' },
    ],
    sizes: ['Maceta 6cm', 'Maceta 10cm'],
    accent: 'green',
    specs: { clima: 'Interior', sol: 'Sombra parcial', riego: 'Bajo', produccion: 'Decorativa', altura: '5 — 10 cm', dificultad: 'Fácil' },
  },

  // ============ SEMILLAS ============
  {
    id: 'se-01',
    name: 'Café Castillo',
    category: 'semillas',
    price: 35000,
    tagline: 'Semilla certificada Cenicafé.',
    description: 'Coffea arabica var. Castillo. La variedad insignia colombiana, resistente a la roya. Sobre de 500 semillas seleccionadas y desinfectadas. Germinación garantizada superior al 85%.',
    colors: [
      { name: 'Castillo General', hex: '#5a3a1a' },
      { name: 'Castillo Naranjal', hex: '#7a4a2a' },
    ],
    sizes: ['500 semillas', '1000 semillas', 'Libra'],
    accent: 'brown',
    specs: { clima: 'Cafetero 1.200—1.800 msnm', sol: 'Semisombra', riego: 'Moderado', produccion: '2.5 años', altura: '2 — 3 m', dificultad: 'Intermedio' },
  },
  {
    id: 'se-02',
    name: 'Cacao Híbrido CCN-51',
    category: 'semillas',
    price: 28000,
    tagline: 'Alto rendimiento, fino aroma.',
    description: 'Theobroma cacao CCN-51 e ICS-95. Semillas de árboles madres certificados. Variedades de alto rendimiento adaptadas al trópico húmedo colombiano.',
    colors: [
      { name: 'CCN-51', hex: '#4a2a1a' },
      { name: 'ICS-95', hex: '#6a3a2a' },
    ],
    sizes: ['100 semillas', '500 semillas'],
    accent: 'brown',
    specs: { clima: 'Tropical húmedo', sol: 'Semisombra', riego: 'Frecuente', produccion: '3 años', altura: '4 — 6 m', dificultad: 'Intermedio' },
  },

  // ============ FERTILIZANTES ============
  {
    id: 'ft-01',
    name: 'Humus de Lombriz',
    category: 'fertilizantes',
    price: 22000,
    tagline: 'El abono orgánico premium.',
    description: 'Fertilizante orgánico producido por la lombriz roja californiana. Rico en nutrientes asimilables, microorganismos benéficos y materia orgánica estable. Apto para cultivos orgánicos.',
    colors: [
      { name: 'Granel', hex: '#3a2a1a' },
      { name: 'Tamizado fino', hex: '#5a3a2a' },
    ],
    sizes: ['Bolsa 2kg', 'Bolsa 5kg', 'Bulto 25kg'],
    accent: 'brown',
    specs: { clima: 'Todos', sol: 'N/A', riego: 'N/A', produccion: 'Aplicación', altura: 'N/A', dificultad: 'Fácil' },
  },

  // ============ SUSTRATOS ============
  {
    id: 'st-01',
    name: 'Fibra de Coco',
    category: 'sustratos',
    price: 18000,
    tagline: 'Sustrato hidrofílico universal.',
    description: 'Fibra de coco lavada y compactada en bloques expandibles. Excelente retención de humedad y drenaje. Ideal para semilleros, suculentas, ornamentales y cultivos hidropónicos.',
    colors: [
      { name: 'Bloque comprimido', hex: '#8a5a3a' },
      { name: 'Suelto premium', hex: '#a87a4a' },
    ],
    sizes: ['Bloque 5kg', 'Bolsa 25L', 'Bulto 70L'],
    accent: 'brown',
    specs: { clima: 'Todos', sol: 'N/A', riego: 'N/A', produccion: 'Aplicación', altura: 'N/A', dificultad: 'Fácil' },
  },
];

const CATEGORIES = [
  { id: 'frutales', name: 'Frutales', count: 4, blurb: 'Árboles que dan frutos por décadas.' },
  { id: 'citricos', name: 'Cítricos', count: 3, blurb: 'Limones, naranjas, mandarinas injertados.' },
  { id: 'berries', name: 'Berries', count: 3, blurb: 'Arándanos, moras, fresas certificadas.' },
  { id: 'ornamentales', name: 'Ornamentales', count: 3, blurb: 'Plantas que pintan el paisaje.' },
  { id: 'suculentas', name: 'Suculentas', count: 3, blurb: 'Coleccionables de bajo mantenimiento.' },
  { id: 'semillas', name: 'Semillas', count: 2, blurb: 'Material genético seleccionado.' },
  { id: 'fertilizantes', name: 'Fertilizantes', count: 1, blurb: 'Nutrición orgánica para tu cultivo.' },
  { id: 'sustratos', name: 'Sustratos', count: 1, blurb: 'La base de todo cultivo sano.' },
];

// Envíos en Colombia
const SHIPPING_RATES = [
  { dept: 'Cundinamarca', city: 'Bogotá', cost: 10000, days: '2 — 3' },
  { dept: 'Antioquia', city: 'Medellín', cost: 15000, days: '2 — 4' },
  { dept: 'Valle del Cauca', city: 'Cali', cost: 15000, days: '2 — 4' },
  { dept: 'Atlántico', city: 'Barranquilla', cost: 18000, days: '3 — 5' },
  { dept: 'Santander', city: 'Bucaramanga', cost: 15000, days: '2 — 4' },
  { dept: 'Bolívar', city: 'Cartagena', cost: 20000, days: '3 — 5' },
  { dept: 'Risaralda', city: 'Pereira', cost: 14000, days: '2 — 3' },
  { dept: 'Caldas', city: 'Manizales', cost: 14000, days: '2 — 3' },
  { dept: 'Tolima', city: 'Ibagué', cost: 13000, days: '2 — 3' },
  { dept: 'Quindío', city: 'Armenia', cost: 14000, days: '2 — 3' },
];

const TESTIMONIALS = [
  {
    name: 'Carolina M.',
    role: 'Finca La Esperanza · Antioquia',
    text: 'Compré 80 plántulas de aguacate Hass para mi finca. Llegaron en perfecto estado, embaladas con cuidado, y la asesoría del equipo agronómico no tuvo precio.',
  },
  {
    name: 'Andrés P.',
    role: 'Huerto urbano · Bogotá',
    text: 'Llevo dos años comprando aquí para mi terraza. Los arándanos ya están dando fruto. La calidad genética hace toda la diferencia.',
  },
  {
    name: 'Lina R.',
    role: 'Diseñadora de paisajes',
    text: 'Trabajo con VERDE. en todos mis proyectos. La variedad de ornamentales es la mejor del país y los tiempos de entrega siempre se cumplen.',
  },
];

const ARTICLES = [
  {
    slug: 'cultivar-arandanos',
    title: 'Cómo cultivar arándanos en el trópico de altura',
    category: 'Guía de cultivo',
    minutes: 6,
    excerpt: 'El arándano es uno de los cultivos más rentables del trópico colombiano de altura. Te explicamos qué variedad elegir, cómo preparar el sustrato y cuándo esperar la primera cosecha.',
    image: '#3a4a8a',
  },
  {
    slug: 'limon-tahiti',
    title: 'Sembrar limón Tahití: del injerto a la primera cosecha',
    category: 'Frutales',
    minutes: 8,
    excerpt: 'El cítrico más rentable del trópico colombiano. Patrones recomendados, distancias de siembra, manejo de fertilización y los errores comunes que matan la producción.',
    image: '#7a9a3a',
  },
  {
    slug: 'riego-suculentas',
    title: 'Guía de riego para suculentas: menos es más',
    category: 'Suculentas',
    minutes: 4,
    excerpt: 'La causa número uno de muerte en suculentas es el exceso de agua. Te enseñamos a leer las hojas, identificar la frecuencia correcta y reconocer una raíz sana.',
    image: '#7a9a8a',
  },
  {
    slug: 'fertilizar-frutales',
    title: 'Fertilización orgánica de árboles frutales',
    category: 'Manejo agronómico',
    minutes: 7,
    excerpt: 'Compost, humus de lombriz, biofertilizantes. Cómo construir un plan de fertilización orgánica que respete el suelo y maximice la producción.',
    image: '#5a3a1a',
  },
];

window.CATALOG = CATALOG;
window.CATEGORIES = CATEGORIES;
window.SHIPPING_RATES = SHIPPING_RATES;
window.TESTIMONIALS = TESTIMONIALS;
window.ARTICLES = ARTICLES;
