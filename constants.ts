
import { Product, CushionSize, Variation, StoreName, Brand, WaterResistanceLevel } from './types';

// StoreName is now defined in types.ts to break a circular dependency.

export const STORE_NAMES = [StoreName.TECA, StoreName.IONE];

// Fabric information is now structured by brand
const MARCA_PROPRIA_FABRIC_INFO: Record<string, string> = {
    'Jacquard': 'Tecido cuja trama cria padrões complexos, resultando em um visual sofisticado e texturizado. Ideal para peças de destaque na decoração.',
    '100% Algodão': 'Tecido de fibra natural, clássico e versátil. Conhecido por ser leve, respirável e ter um toque suave. Ideal para almofadas de uso diário e decoração casual.',
    'Gorgurinho': 'Tecido misto de algodão e poliéster, caracterizado por sua textura canelada e resistência. É versátil, durável e ideal para almofadas decorativas com ótimo custo-benefício.',
    'Suede Animal': 'É o mesmo tecido do Suede Liso, mas com estampas, como "animal print". Usado para adicionar personalidade e um toque ousado ao ambiente.',
    'Suede Pena': 'Uma variação do Suede com um acabamento que o torna ainda mais macio e sedoso. Ideal para almofadas onde o conforto ao toque é a prioridade máxima.',
    'Suede Liso': 'Tecido sintético que imita a camurça, com toque aveludado. Muito durável, resistente a manchas e com excelente custo-benefício. Perfeito para estofados e almofadas de uso intenso.',
    'Veludo': 'Tecido clássico e luxuoso com brilho característico. Tem um toque denso, macio e sofisticado. Ideal para decorações clássicas ou glamourosas.',
    'Sarja': 'Tecido de algodão com trama diagonal, o que o torna mais encorpado e resistente. Possui um visual moderno e despojado, ideal para capas que precisam ser lavadas com frequência.',
    'Camurça': 'Produto de origem natural com toque aveludado rústico. É nobre, mas mancha com facilidade, sendo raro em almofadas de uso diário.',
    'Linho': 'Tecido de fibra natural com elegância rústica. Es texturizado, fresco e resistente. Seu amassado é considerado parte do charme. Ideal para decoração chique ou minimalista.',
    'Tricô': 'Refere-se à técnica de trama tricotada, que pode ser feita de algodão, lã ou fio acrílico. Seu toque é texturizado e aconchegante, com um visual clássico de "feito à mão", ideal para mantas e almofadas em decorações comfy ou escandinavas.',
    'Macramê': 'Técnica de tecelagem manual com nós, geralmente em barbante de algodão. Caracteriza-se pela textura 3D, relevo único e franjas, trazendo um toque artesanal, natural e orgânico ao ambiente.',
    'Oxford': 'Tecido 100% Poliéster com uma trama característica em "cesta" (basketweave), conferindo um visual robusto e levemente texturizado. Seu toque é firme, seco e resistente, sendo uma option funcional para almofadas, toalhas de mesa e cortinas.',
};

const DOHLER_FABRIC_INFO: Record<string, string> = {
  'Jacquard': 'É um tipo de trama que cria padrões e desenhos complexos diretamente no tecido. Na Döhler, é frequentemente associado a toalhas (de banho, rosto e piso) de alta qualidade, 100% algodão e com gramatura elevada. O resultado é um tecido mais felpudo, com excelente absorção, toque macio e um visual sofisticado e texturizado.',
  'Waterhavana': 'Trata-se de uma linha dentro da coleção Havana. É um tecido 100% algodão com estampas digitais e um acabamento impermeabilizante (ou semi-impermeável, com película protetora). É indicado para revestimento de estofados, cadeiras e almofadas, podendo ser usado em áreas internas e externas (desde que protegido do sol e chuva diretos).',
  'Tricoline': 'Um tecido clássico e muito versátil, 100% algodão, conhecido por sua textura fina, leveza e resistência. É macio ao toque e fácil de manusear, sendo amplamente utilizado em artesanato, patchwork, confecção de roupas (como camisas e vestidos) e decoração.',
  'Belize': 'Esta é uma linha de tecidos para decoração, geralmente com composição mista (ex: 67% algodão e 33% poliéster). É conhecido por seu tratamento impermeabilizante e anti-manchas, o que o torna ideal para estofados, cadeiras, almofadas e revestimento de paredes em áreas internas.',
  'Belize Waterblock': 'Versão premium da linha Belize com tecnologia Waterblock. 100% impermeável e altamente resistente, ideal para almofadas de áreas internas e externas, oferecendo proteção total contra líquidos e manchas sem perder a estética.',
  'Atoalhados': 'Refere-se aos tecidos felpudos, 100% algodão, usados principalmente para a confecção de toalhas de banho, roupões e artigos similares. Caracteriza-se pela sua alta capacidade de absorção e toque macio.',
  'Havana': 'Uma linha de tecidos decorativos, 100% algodão, que se destaca pelas estampas digitais de alta definição. Possui uma película protetora que repele líquidos, facilitando a limpeza (semi-impermeável). É muito usado para toalhas de mesa, jogos americanos, almofadas e revestimento de móveis em áreas internas.',
  'Decokasa': 'Linha de tecidos para decoração, descrita como leve e durável. Possui estampas em alta definição e um acabamento protetor (em alguns casos, impermeável) que facilita a manutenção diária. É indicado para estofados, almofadas e também para aplicação em paredes.'
};

const KARSTEN_FABRIC_INFO: Record<string, string> = {
  'Acquablock® Externo': 'É o tecido definitivo para áreas externas, projetado para ter máxima resistência ao tempo. Totalmente impermeável, possui proteção UV, é anti-mofo e resistente a manchas. Ideal para almofadas e estofados para jardins, áreas de piscina, varandas descobertas e móveis que ficam diretamente expostos ao sol e à chuva.',
  'Acquablock® Interno': 'Versão adaptada para áreas internas ou externas cobertas, com foco em proteção e toque macio. É impermeável (repele líquidos) e anti-mancha. Não possui a mesma proteção UV que a linha externa. Ideal para sofás, cadeiras de jantar, poltronas, especialmente em casas com crianças ou animais de estimação.',
  'Karsten Marble': 'Coleção focada na decoração de interiores com design sofisticado e proteção anti-mancha. Utiliza tecelagem Jacquard e estampas digitais de alta definição. Repele líquidos (não é totalmente impermeável), priorizando a estética e o toque agradável. Composição geralmente mista (ex: 70% algodão, 30% poliéster).',
};

export const BRAND_FABRIC_MAP: Record<string, Record<string, string>> = {
    [Brand.MARCA_PROPRIA]: MARCA_PROPRIA_FABRIC_INFO,
    [Brand.KARSTEN]: KARSTEN_FABRIC_INFO,
    [Brand.DOLHER]: DOHLER_FABRIC_INFO,
};


export const BRANDS = [Brand.MARCA_PROPRIA, Brand.DOLHER, Brand.KARSTEN];

export const BRAND_LOGOS: Record<string, string> = {
    [Brand.DOLHER]: 'https://i.postimg.cc/G3k2G58y/image.png',
    [Brand.KARSTEN]: 'https://i.postimg.cc/DzBQvzFf/image.png',
    [Brand.MARCA_PROPRIA]: 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png', // Using Teca logo as placeholder
};


export const STORE_IMAGE_URLS = {
  teca: 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png',
  ione: 'https://i.postimg.cc/R0Sn8Tw2/Logo-lojas-teca-20251017-210317-0001.png',
};

export const SIZE_SCALES: Record<CushionSize, { w: string; h: string }> = {
    [CushionSize.SQUARE_40]: { w: '80px', h: '80px' },
    [CushionSize.SQUARE_45]: { w: '95px', h: '95px' },
    [CushionSize.SQUARE_50]: { w: '110px', h: '110px' },
    [CushionSize.SQUARE_60]: { w: '135px', h: '135px' },
    [CushionSize.LUMBAR]: { w: '120px', h: '70px' },
};

// Realistic CSS Patterns for Sofa Fabrics (Using texture images)
// Order: Tecido (Fabric), Couro (Leather), then others.
export const SOFA_FABRICS = [
    { 
        name: 'Linho', 
        pattern: 'url("https://www.transparenttextures.com/patterns/linen.png")' 
    },
    { 
        name: 'Couro', 
        pattern: 'url("https://www.transparenttextures.com/patterns/leather.png")' 
    },
    { 
        name: 'Algodão', 
        pattern: 'url("https://www.transparenttextures.com/patterns/woven-light.png")' 
    },
    { 
        name: 'Jacquard', 
        pattern: 'url("https://www.transparenttextures.com/patterns/diamond-upholstery.png")' 
    },
    { 
        name: 'Suede', 
        pattern: 'url("https://www.transparenttextures.com/patterns/felt.png")' 
    },
    { 
        name: 'Veludo', 
        pattern: 'url("https://www.transparenttextures.com/patterns/nasty-fabric.png")' 
    }
];

export const SEMI_WATERPROOF_ICON_URL = 'https://i.postimg.cc/LsMLB14R/Gemini-Generated-Image-fxdnhcfxdnhcfxdn.png';
export const WATERBLOCK_ICON_URL = 'https://i.postimg.cc/qRr75sWg/Gemini-Generated-Image-sl2hr5sl2hr5sl2h.png';

export const WATER_RESISTANCE_INFO: Record<WaterResistanceLevel, { label: string; icon: string; description: string; shortLabel: string; showcaseIndicator?: string; } | null> = {
  [WaterResistanceLevel.NONE]: null,
  [WaterResistanceLevel.SEMI]: {
    label: 'Proteção Impermeável para Ambiente Interno',
    icon: SEMI_WATERPROOF_ICON_URL,
    description: 'Este tecido possui um treatment que repele líquidos, facilitando a limpeza e manutenção diária. Ideal para áreas internas.',
    shortLabel: 'Proteção Interna 💧',
    showcaseIndicator: '💧 Interna'
  },
  [WaterResistanceLevel.FULL]: {
    label: 'Waterblock (100% Impermeável)',
    icon: WATERBLOCK_ICON_URL,
    description: 'Proteção máxima contra líquidos. 100% impermeável.',
    shortLabel: 'Waterblock 💧',
    showcaseIndicator: '💧 Externa'
  },
};

export const VARIATION_DEFAULTS: Record<CushionSize, { priceCover: number; priceFull: number }> = {
    [CushionSize.SQUARE_40]: { priceCover: 20, priceFull: 35 },
    [CushionSize.SQUARE_45]: { priceCover: 35, priceFull: 45 },
    [CushionSize.SQUARE_50]: { priceCover: 40, priceFull: 50 },
    [CushionSize.SQUARE_60]: { priceCover: 60, priceFull: 80 },
    [CushionSize.LUMBAR]: { priceCover: 20, priceFull: 25 },
};

export const PREDEFINED_COLORS: { name: string; hex: string }[] = [
    { name: 'Branco', hex: '#FFFFFF' },
    { name: 'Preto', hex: '#000000' },
    { name: 'Cinza', hex: '#808080' },
    { name: 'Vermelho', hex: '#FF0000' },
    { name: 'Vinho', hex: '#722F37' },
    { name: 'Azul', hex: '#0000FF' },
    { name: 'Azul Marinho', hex: '#000080' },
    { name: 'Azul Claro', hex: '#ADD8E6' },
    { name: 'Verde', hex: '#008000' },
    { name: 'Verde Musgo', hex: '#8A9A5B' },
    { name: 'Verde Claro', hex: '#90EE90' },
    { name: 'Amarelo', hex: '#FFFF00' },
    { name: 'Mostarda', hex: '#FFDB58' },
    { name: 'Laranja', hex: '#FFA500' },
    { name: 'Terracota', hex: '#E2725B' },
    { name: 'Roxo', hex: '#800080' },
    { name: 'Rosa', hex: '#FFC0CB' },
    { name: 'Marrom', hex: '#A52A2A' },
    { name: 'Bege', hex: '#F5F5DC' },
];

export const SOFA_COLORS_STORAGE_KEY = 'pillow-oasis-sofa-colors';

export const PREDEFINED_SOFA_COLORS: { name: string; hex: string }[] = [
    { name: 'Branco', hex: '#FFFFFF' },
    { name: 'Bege', hex: '#F5F5DC' },
    { name: 'Cinza', hex: '#808080' },
    { name: 'Marrom Escuro', hex: '#3D2B1F' },
    { name: 'Preto', hex: '#000000' },
    { name: 'Azul Marinho', hex: '#000080' },
];

// Legacy data - kept for reference if needed, but not exported or used directly in new logic
const rawProductsData = []; 

export const INITIAL_PRODUCTS: Product[] = [];
