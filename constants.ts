import { Product, CushionSize, Variation, StoreName, Brand, WaterResistanceLevel } from './types';

// StoreName is now defined in types.ts to break a circular dependency.

export const STORE_NAMES = [StoreName.TECA, StoreName.IONE];

// Fabric information is now structured by brand
const MARCA_PROPRIA_FABRIC_INFO: Record<string, string> = {
    'Jacquard': 'Tecido cuja trama cria padrões complexos, resultando em um visual sofisticado e texturizado. Ideal para peças de destaque na decoração.',
    '100% Algodão': 'Tecido de fibra natural, clássico e versátil. Conhecido por ser leve, respirável e ter um toque suave. Ideal para almofadas de uso diário e decoração casual.',
    'Suede Animal': 'É o mesmo tecido do Suede Liso, mas com estampas, como "animal print". Usado para adicionar personalidade e um toque ousado ao ambiente.',
    'Suede Pena': 'Uma variação do Suede com um acabamento que o torna ainda mais macio e sedoso. Ideal para almofadas onde o conforto ao toque é a prioridade máxima.',
    'Suede Liso': 'Tecido sintético que imita a camurça, com toque aveludado. Muito durável, resistente a manchas e com excelente custo-benefício. Perfeito para estofados e almofadas de uso intenso.',
    'Veludo': 'Tecido clássico e luxuoso com brilho característico. Tem um toque denso, macio e sofisticado. Ideal para decorações clássicas ou glamourosas.',
    'Sarja': 'Tecido de algodão com trama diagonal, o que o torna mais encorpado e resistente. Possui um visual moderno e despojado, ideal para capas que precisam ser lavadas com frequência.',
    'Camurça': 'Produto de origem natural com toque aveludado rústico. É nobre, mas mancha com facilidade, sendo raro em almofadas de uso diário.',
    'Linho': 'Tecido de fibra natural com elegância rústica. É texturizado, fresco e resistente. Seu amassado é considerado parte do charme. Ideal para decoração chique ou minimalista.',
    'Tricô': 'Refere-se à técnica de trama tricotada, que pode ser feita de algodão, lã ou fio acrílico. Seu toque é texturizado e aconchegante, com um visual clássico de "feito à mão", ideal para mantas e almofadas em decorações comfy ou escandinavas.',
    'Macramê': 'Técnica de tecelagem manual com nós, geralmente em barbante de algodão. Caracteriza-se pela textura 3D, relevo único e franjas, trazendo um toque artesanal, natural e orgânico ao ambiente.',
    'Oxford': 'Tecido 100% Poliéster com uma trama característica em "cesta" (basketweave), conferindo um visual robusto e levemente texturizado. Seu toque é firme, seco e resistente, sendo uma opção funcional para almofadas, toalhas de mesa e cortinas.',
    'Gorgorinho (Gorgurão)': 'É um tecido canelado com nervuras marcadas, geralmente na horizontal, resultando em uma textura firme e característica. Composto tradicionalmente por 60% algodão e 40% poliéster, é firme, seco, encorpado e estruturado. O poliéster confere durabilidade e resistência a amassados, enquanto o algodão adiciona robustez. Seu toque é levemente áspero, denotando alta resistência.',
};

const DOHLER_FABRIC_INFO: Record<string, string> = {
  'Jacquard': 'É um tipo de trama que cria padrões e desenhos complexos diretamente no tecido. Na Döhler, é frequentemente associado a toalhas (de banho, rosto e piso) de alta qualidade, 100% algodão e com gramatura elevada. O resultado é um tecido mais felpudo, com excelente absorção, toque macio e um visual sofisticado e texturizado.',
  'Waterhavana': 'Trata-se de uma linha dentro da coleção Havana. É um tecido 100% algodão com estampas digitais e um acabamento impermeabilizante (ou semi-impermeável, com película protetora). É indicado para revestimento de estofados, cadeiras e almofadas, podendo ser usado em áreas internas e externas (desde que protegido do sol e chuva diretos).',
  'Tricoline': 'Um tecido clássico e muito versátil, 100% algodão, conhecido por sua textura fina, leveza e resistência. É macio ao toque e fácil de manusear, sendo amplamente utilizado em artesanato, patchwork, confecção de roupas (como camisas e vestidos) e decoração.',
  'Belize': 'Esta é uma linha de tecidos para decoração, geralmente com composição mista (ex: 67% algodão e 33% poliéster). É conhecido por seu tratamento impermeabilizante (frequentemente sob a chancela Waterblock) e anti-manchas, o que o torna ideal para estofados, cadeiras, almofadas e revestimento de paredes em áreas internas.',
  'Belize Waterblock': 'Uma evolução da linha Belize, este tecido combina a estética e o toque do Belize com a tecnologia Waterblock®, oferecendo 100% de impermeabilidade, proteção anti-manchas e alta durabilidade. Ideal para estofados e almofadas que exigem máxima proteção contra líquidos em áreas internas.',
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

export const SEMI_WATERPROOF_ICON_URL = 'https://i.postimg.cc/LsMLB14R/Gemini-Generated-Image-fxdnhcfxdnhcfxdn.png';
export const WATERBLOCK_ICON_URL = 'https://i.postimg.cc/qRr75sWg/Gemini-Generated-Image-sl2hr5sl2hr5sl2h.png';

export const WATER_RESISTANCE_INFO: Record<WaterResistanceLevel, { label: string; icon: string; description: string; shortLabel: string; showcaseIndicator?: string; } | null> = {
  [WaterResistanceLevel.NONE]: null,
  [WaterResistanceLevel.SEMI]: {
    label: 'Proteção Impermeável para Ambiente Interno',
    icon: SEMI_WATERPROOF_ICON_URL,
    description: 'Este tecido possui um tratamento que repele líquidos, facilitando a limpeza e manutenção diária. Ideal para áreas internas.',
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

const rawProductsData = [
  { id: '1658690251010-AcuoQ', name: 'Rosa bebê suede pena (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1655401251353-AcuoQ', name: 'Capa livros vermelhos', price: 29, inventory: 2, category: 'Marca Própria' },
  { id: '1593993365116-AcuoQ', name: 'Mandala Vermelha capa', price: 29, inventory: 2, category: 'Capas Mandalas' },
  { id: '1623518431696-AcuoQ', name: 'Rosas Tiffany', price: 29, inventory: 2, category: 'Capas Florais' },
  { id: '1658694623191-AcuoQ', name: 'Lombar Marrom mesclado nobuck (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1595875543094-AcuoQ', name: 'Folhas Laranja capa', price: 29, inventory: 5, category: 'Capas Florais' },
  { id: '1595197242411-AcuoQ', name: 'Geométrico Preto capa', price: 29, inventory: 1, category: 'Capas Geométricas' },
  { id: '1595874440331-AcuoQ', name: 'Florais Rosê capa', price: 29, inventory: 1, category: 'Capas Florais' },
  { id: '1605478000669-AcuoQ', name: 'Neon belga Marrom borda escura', price: 50, inventory: 0, category: 'Capas Jacquard 43x43' },
  { id: '1661117376185-AcuoQ', name: 'Grafismo inca bege fundo escuro', price: 69, inventory: 0, category: 'Marca Própria' },
  { id: '1639237424541-AcuoQ', name: 'Cinza grafite nobuck', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1606509148070-AcuoQ', name: 'Ondas Bege capa', price: 50, inventory: 0, category: 'Capas Jacquard 43x43' },
  { id: '1658694188857-AcuoQ', name: 'Azul bebê (Lombar)', price: 25, inventory: 1, category: 'Marca Própria' },
  { id: '1595874769013-AcuoQ', name: 'Flores Fundo Caqui capa', price: 29, inventory: 0, category: 'Capas Florais' },
  { id: '1658689970226-AcuoQ', name: 'Lilás Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1659902747692-AcuoQ', name: 'Mandala verde lombar', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1632184092335-AcuoQ', name: 'Papagaio Belize', price: 29, inventory: 3, category: 'Marca Própria' },
  { id: '1658690209966-AcuoQ', name: 'Cinza Rosado Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1593390714284-AcuoQ', name: 'Laranja Gorgurinho', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1609006868302-AcuoQ', name: 'Costela de Adão Verde capa', price: 29, inventory: 5, category: 'Capas Florais' },
  { id: '1595870831173-AcuoQ', name: 'Kayanne fundo azul capa', price: 29, inventory: 1, category: 'Capas Florais' },
  { id: '1593992135232-AcuoQ', name: 'Arabesquinho Bege capa', price: 29, inventory: 9, category: 'Capas Mandalas' },
  { id: '1661634012449-AcuoQ', name: 'Manta linho 200x140', price: 150, inventory: 0, category: 'Marca Própria' },
  { id: '1652037818540-AcuoQ', name: 'Listrado Multi vermelho LOMBAR', price: 25, inventory: 3, category: 'Marca Própria' },
  { id: '1664899144234-AcuoQ', name: 'Azul petróleo suede pávìa', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1606511210249-AcuoQ', name: 'Chevron Bege fundo claro capa', price: 50, inventory: 11, category: 'Capas Jacquard 43x43' },
  { id: '1639243223802-AcuoQ', name: 'Cinza grafite suede animale', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1595023260718-AcuoQ', name: 'Raminhos Bege capa', price: 29, inventory: 0, category: 'Capas Florais' },
  { id: '1659213682897-AcuoQ', name: 'Terracota suede lombar', price: 25, inventory: 4, category: 'Marca Própria' },
  { id: '1593388481769-AcuoQ', name: 'Azul Tiffany Belize', price: 29, inventory: 3, category: 'Capas Cores lisas' },
  { id: '1652037954589-AcuoQ', name: 'Traços Vermelho LOMBAR', price: 25, inventory: 1, category: 'Marca Própria' },
  { id: '1593992531020-AcuoQ', name: 'Arabesquinho Marrom capa', price: 29, inventory: 3, category: 'Capas Mandalas' },
  { id: '1640649138823-AcuoQ', name: 'Chevron Verde fundo claro', price: 50, inventory: 9, category: 'Capas Jacquard 43x43' },
  { id: '1594685701163-AcuoQ', name: 'Pontilhados Preto e Cinza Capa', price: 29, inventory: 2, category: 'Capas Grafismos' },
  { id: '1595869735074-AcuoQ', name: 'Grafismo Amarelo capa', price: 29, inventory: 1, category: 'Capas Grafismos' },
  { id: '1658694485971-AcuoQ', name: 'Laranja Gorgurinho (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1635701602653-AcuoQ', name: 'Floral fundo azul marinho', price: 28, inventory: 0, category: 'Marca Própria' },
  { id: '1623953021174-AcuoQ', name: 'Arabesquinho amarelo capa', price: 29, inventory: 3, category: 'Capas Mandalas' },
  { id: '1595023380832-AcuoQ', name: 'Colmeia Vermelha capa', price: 29, inventory: 1, category: 'Capas Geométricas' },
  { id: '1606510472169-AcuoQ', name: 'Chevron Bege fundo escuro capa', price: 50, inventory: 12, category: 'Capas Jacquard 43x43' },
  { id: '1594684648657-AcuoQ', name: 'Costelinha de Adão marrom Capa', price: 29, inventory: 2, category: 'Capas Florais' },
  { id: '1595871237069-AcuoQ', name: 'Chevron Azul Tiffany capa', price: 29, inventory: 6, category: 'Capas Chevron' },
  { id: '1596235550899-AcuoQ', name: 'Ondas vermelhas capa', price: 29, inventory: 4, category: 'Capas Geométricas' },
  { id: '1661716679906-AcuoQ', name: 'Manta arabesca bege', price: 130, inventory: 0, category: 'Marca Própria' },
  { id: '1668350380651-AcuoQ', name: 'Terracota suede animale', price: 39, inventory: 0, category: 'Marca Própria' },
  { id: '1593993025536-AcuoQ', name: 'Mandala Laranja', price: 29, inventory: 3, category: 'Capas Mandalas' },
  { id: '1595722707916-AcuoQ', name: 'Listrado Fino Preto capa', price: 29, inventory: 5, category: 'Capas Listradas' },
  { id: '1595690712914-AcuoQ', name: 'Triângulo Rosê capa', price: 29, inventory: 4, category: 'Capas Geométricas' },
  { id: '1595870731226-AcuoQ', name: 'Kayanne fundo Bege capa', price: 29, inventory: 6, category: 'Capas Florais' },
  { id: '1658690295251-AcuoQ', name: 'Vermelho Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1658695055874-AcuoQ', name: 'Preto Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1600026638988-AcuoQ', name: 'Listrado verde capa', price: 29, inventory: 3, category: 'Capas Listradas' },
  { id: '1658690076331-AcuoQ', name: 'Caramelo nobuck (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1658690105568-AcuoQ', name: 'Cinza veludo (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1664898429381-AcuoQ', name: 'Terra Belize', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1664896972231-AcuoQ', name: 'Folhagem antúlio laranja com amarelo', price: 29, inventory: 0, category: 'Capas Florais' },
  { id: '1658690118506-AcuoQ', name: 'Marrom Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1659214401103-AcuoQ', name: 'Rosê veludo lombar', price: 25, inventory: 2, category: 'Marca Própria' },
  { id: '1612962421248-AcuoQ', name: 'Vinho Gorgurinho', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1635633256198-AcuoQ', name: 'Verde oliva gorgurinho', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1658690302066-AcuoQ', name: 'Amarelo Suede Pena (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1628872484575-AcuoQ', name: 'Caqui Gorgurinho', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1661117416813-AcuoQ', name: 'Manta arabesca bege', price: 130, inventory: 0, category: 'Marca Própria' },
  { id: '1596238941894-AcuoQ', name: 'Listrado Vermelho Capa', price: 29, inventory: 6, category: 'Capas Listradas' },
  { id: '1612565859301-AcuoQ', name: 'Marsala Nobuck', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1593387033520-AcuoQ', name: 'Azul Marinho Belize', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1658689428360-AcuoQ', name: 'Bege Astúrias cor 100 (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1613081184450-AcuoQ', name: 'Cinza cimento suede amassado', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1659213857538-AcuoQ', name: 'Marrom mesclado Nobuck', price: 25, inventory: 6, category: 'Marca Própria' },
  { id: '1650745536176-AcuoQ', name: 'Mosaico azul', price: 29, inventory: 3, category: 'Capas Mandalas' },
  { id: '1659819321237-AcuoQ', name: 'Losangos salmão', price: 29, inventory: 1, category: 'Capas Geométricas' },
  { id: '1605477516481-AcuoQ', name: 'Neon Belga Bege borda escura', price: 50, inventory: 2, category: 'Capas Jacquard 43x43' },
  { id: '1605478218512-AcuoQ', name: 'Arabesco Bege escuro borda', price: 50, inventory: 0, category: 'Capas Jacquard 43x43' },
  { id: '1639234980213-AcuoQ', name: 'Bege Astúrias cor 100', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1661716610814-AcuoQ', name: 'Assento pedrita cinza 39x39', price: 49.9, inventory: 0, category: 'Marca Própria' },
  { id: '1593992495062-AcuoQ', name: 'Arabesquinho Vermelho capa', price: 29, inventory: 1, category: 'Arabescos e Mandalas' },
  { id: '1658696351167-AcuoQ', name: 'Assento quadrado 39x39', price: 29.9, inventory: 0, category: 'Marca Própria' },
  { id: '1594685345465-AcuoQ', name: 'Triângulo Vermelho e Marrom capa', price: 29, inventory: 1, category: 'Capas Geométricas' },
  { id: '1639572707024-AcuoQ', name: 'Neon belga verde borda escura', price: 50, inventory: 0, category: 'Capas Jacquard 43x43' },
  { id: '1628877449651-AcuoQ', name: 'Folhagem Antúlio vermelho Belize', price: 29, inventory: 4, category: 'Capas Florais' },
  { id: '1664899006048-AcuoQ', name: 'Vinho suede animale', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1595030809756-AcuoQ', name: 'Geométrico Bege capa', price: 29, inventory: 0, category: 'Capas Geométricas' },
  { id: '1593907272464-AcuoQ', name: 'Mostarda Gorgurinho', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1595028035012-AcuoQ', name: 'X Amarelo capa', price: 29, inventory: 1, category: 'Capas Geométricas' },
  { id: '1635604942128-AcuoQ', name: 'Azul bebê', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1650733193246-AcuoQ', name: 'Tulipa vermelha LOMBAR', price: 25, inventory: 3, category: 'Marca Própria' },
  { id: '1658690159835-AcuoQ', name: 'Vermelho suede Pena (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1658694589883-AcuoQ', name: 'Vinho Astúrias cor 106 (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1593390092436-AcuoQ', name: 'Verde maçã capa', price: 29, inventory: 4, category: 'Capas Cores lisas' },
  { id: '1667056054720-AcuoQ', name: 'Pedritas azul marinho com laranja lombar', price: 35, inventory: 0, category: 'Marca Própria' },
  { id: '1659213124175-AcuoQ', name: 'Geométrica moderna Laranja multi', price: 29, inventory: 3, category: 'Capas Geométricas' },
  { id: '1612650300189-AcuoQ', name: 'Amarelo Suede Pena', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1639241559706-AcuoQ', name: 'Cinza linho', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1668353822328-AcuoQ', name: 'Lombar linho azul pretoleo', price: 35, inventory: 0, category: 'Marca Própria' },
  { id: '1659214144753-AcuoQ', name: 'Marrom Pavia 11 Suede', price: 25, inventory: 5, category: 'Marca Própria' },
  { id: '1605478128270-AcuoQ', name: 'Arabesco Marrom escuro borda', price: 50, inventory: 0, category: 'Capas Jacquard 43x43' },
  { id: '1595872729408-AcuoQ', name: 'Chevron Preto capa', price: 29, inventory: 6, category: 'Capas Chevron' },
  { id: '1659886724179-AcuoQ', name: 'Capa preto suede lombar', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1594685625118-AcuoQ', name: 'Pontilhados Amarelo Capa', price: 29, inventory: 4, category: 'Capas Grafismos' },
  { id: '1593993196277-AcuoQ', name: 'Mandala Mostarda capa', price: 29, inventory: 2, category: 'Arabescos e Mandalas' },
  { id: '1668353735360-AcuoQ', name: 'Marsala gorgurinho 40x40', price: 39, inventory: 0, category: 'Dolher' },
  { id: '1658694357258-AcuoQ', name: 'Cinza Suede Amassado (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1658690167715-AcuoQ', name: 'Vinho Nobuck veludo (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1628872726568-AcuoQ', name: 'Verde Bandeira Gorgurinho', price: 29, inventory: 3, category: 'Capas Cores lisas' },
  { id: '1595713621309-AcuoQ', name: 'Listrado Multi Rosa bebê', price: 29, inventory: 1, category: 'Capas Listradas' },
  { id: '1652038011689-AcuoQ', name: 'Mandala fundo caqui LOMBAR', price: 25, inventory: 3, category: 'Marca Própria' },
  { id: '1658690135336-AcuoQ', name: 'Ouro (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1659188330314-AcuoQ', name: 'Losangos salmão (Lombar)', price: 25, inventory: 3, category: 'Marca Própria' },
  { id: '1594685563305-AcuoQ', name: 'Pontilhados Vermelho Capa', price: 29, inventory: 2, category: 'Capas Grafismos' },
  { id: '1659819905624-AcuoQ', name: 'Assento redondo flores amarelas 36x36', price: 29.9, inventory: 0, category: 'Marca Própria' },
  { id: '1639238458147-AcuoQ', name: 'Off white suede pávia', price: 29, inventory: 5, category: 'Capas Cores lisas' },
  { id: '1650745588811-AcuoQ', name: 'Mosaico vermelha', price: 29, inventory: 3, category: 'Capas Mandalas' },
  { id: '1651493859183-AcuoQ', name: 'Grafismo inca bege fundo', price: 50, inventory: 2, category: 'Capas Jacquard 43x43' },
  { id: '1595031044282-AcuoQ', name: 'Geométrico Azul Tiffany capa', price: 29, inventory: 5, category: 'Capas Geométricas' },
  { id: '1595872802116-AcuoQ', name: 'Chevron Cinza capa', price: 29, inventory: 4, category: 'Capas Chevron' },
  { id: '1661113824046-AcuoQ', name: 'Lombar florais Rosê', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1595698128291-AcuoQ', name: 'Listrado Multi Tiffany capa', price: 29, inventory: 2, category: 'Capas Listradas' },
  { id: '1639241477385-AcuoQ', name: 'Ouro', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1595722519206-AcuoQ', name: 'Listrado Fino Vermelho capa', price: 29, inventory: 5, category: 'Capas Listradas' },
  { id: '1658694992186-AcuoQ', name: 'Off white Suede Pavia (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1664899247447-AcuoQ', name: 'Verde exército suede pávia', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1664898316521-AcuoQ', name: 'Massala gorgurinho', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1635632728401-AcuoQ', name: 'Paris bicicleta', price: 29, inventory: 0, category: 'Capas Florais' },
  { id: '1594685195263-AcuoQ', name: 'Listrado Multi Azul e Laranja', price: 29, inventory: 3, category: 'Capas Listradas' },
  { id: '1595871168148-AcuoQ', name: 'Chevron Bege capa', price: 29, inventory: 2, category: 'Capas Chevron' },
  { id: '1596160201734-AcuoQ', name: 'Hibiscos Laranja capa', price: 29, inventory: 2, category: 'Capas Florais' },
  { id: '1595022899333-AcuoQ', name: 'Raminhos preto e branco capa', price: 29, inventory: 1, category: 'Capas Florais' },
  { id: '1658694326898-AcuoQ', name: 'Caramelo suede amassado (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1605477639388-AcuoQ', name: 'Neon Belga Bege borda clara', price: 50, inventory: 5, category: 'Capas Jacquard 43x43' },
  { id: '1594683852529-AcuoQ', name: 'Mesclado Vermelho Belize', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1632529304485-AcuoQ', name: 'Kayanne Rosas amarelas Belize', price: 29, inventory: 4, category: 'Capas Florais' },
  { id: '1668350443250-AcuoQ', name: 'Terracota suede animale', price: 39, inventory: 0, category: 'Marca Própria' },
  { id: '1658689977101-AcuoQ', name: 'Mesclado Vermelho Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1639238240464-AcuoQ', name: 'Off white Suede amassado', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1659214271538-AcuoQ', name: 'Roxo suede amassado', price: 25, inventory: 3, category: 'Marca Própria' },
  { id: '1594684064089-AcuoQ', name: 'Mesclado Vermelho V Belize', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1595690879462-AcuoQ', name: 'Triângulo Tyffany capa', price: 29, inventory: 2, category: 'Capas Geométricas' },
  { id: '1624042406889-AcuoQ', name: 'Verde desbotado Belize', price: 29, inventory: 7, category: 'Capas Cores lisas' },
  { id: '1612650678028-AcuoQ', name: 'Losango milano laranja capa', price: 29, inventory: 3, category: 'Capas Geométricas' },
  { id: '1595714022288-AcuoQ', name: 'Losangolo Vermelho Capa', price: 29, inventory: 2, category: 'Capas Geométricas' },
  { id: '1639238412903-AcuoQ', name: 'Bege suede Pena', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1664899903071-AcuoQ', name: 'Caqui suede pávio', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1595876578066-AcuoQ', name: 'Calçadão Copacabana capa', price: 29, inventory: 1, category: 'Capas Geométricas' },
  { id: '1639231772567-AcuoQ', name: 'Vermelho suede Pena', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1595872979756-AcuoQ', name: 'Flores Fundo Branco capa', price: 29, inventory: 4, category: 'Capas Florais' },
  { id: '1594683335661-AcuoQ', name: 'Mandala Amarelo e Vermelho Capa', price: 29, inventory: 2, category: 'Capas Mandalas' },
  { id: '1613060650243-AcuoQ', name: 'Ondas Tiffany Belize', price: 29, inventory: 4, category: 'Capas Geométricas' },
  { id: '1595869816529-AcuoQ', name: 'Grafismo Azul Tiffany capa', price: 29, inventory: 4, category: 'Capas Grafismos' },
  { id: '1608677463689-AcuoQ', name: 'Mesclado dourado Nobuck', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1659819930105-AcuoQ', name: 'Assento pedritas cinzas 36x36', price: 29.9, inventory: 0, category: 'Marca Própria' },
  { id: '1595874018278-AcuoQ', name: 'Rosas pretas capa', price: 29, inventory: 1, category: 'Capas Florais' },
  { id: '1593992378840-AcuoQ', name: 'Arabesco Vermelho capa', price: 29, inventory: 2, category: 'Capas Mandalas' },
  { id: '1658693949852-AcuoQ', name: 'Amarelo Belize (Lombar)', price: 25, inventory: 3, category: 'Marca Própria' },
  { id: '1623952959334-AcuoQ', name: 'Ondas bege capa', price: 29, inventory: 4, category: 'Capas Geométricas' },
  { id: '1609006790018-AcuoQ', name: 'Costela de Adão Marron capa', price: 29, inventory: 2, category: 'Capas Florais' },
  { id: '1593386874663-AcuoQ', name: 'Preto Belize', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1658690272624-AcuoQ', name: 'Rosa chiclete veludo (Lombar)', price: 25, inventory: 4, category: 'Marca Própria' },
  { id: '1595698777156-AcuoQ', name: 'Listrado Multi Rosê capa', price: 29, inventory: 4, category: 'Capas Listradas' },
  { id: '1639232218018-AcuoQ', name: 'Cinza veludo', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1594683115883-AcuoQ', name: 'Mandala Azul com laranja Capa', price: 29, inventory: 2, category: 'Capas Mandalas' },
  { id: '1593907072210-AcuoQ', name: 'Roxo Gorgurinho', price: 29, inventory: 2, category: 'Capas Cores lisas' },
  { id: '1595869612898-AcuoQ', name: 'Grafismo Vermelho capa', price: 29, inventory: 0, category: 'Capas Grafismos' },
  { id: '1660425245106-AcuoQ', name: 'Assento redondo 36x36', price: 29.9, inventory: 0, category: 'Marca Própria' },
  { id: '1595874085511-AcuoQ', name: 'Rosas Vermelhas capa', price: 29, inventory: 4, category: 'Capas Florais' },
  { id: '1639241010913-AcuoQ', name: 'Verde oliva Sarja', price: 29, inventory: 1, category: 'Capas Cores lisas' },
  { id: '1658689588310-AcuoQ', name: 'Vermelho Suede Amassado (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1595792042302-AcuoQ', name: 'Chevron Azul Marinho capa', price: 29, inventory: 6, category: 'Capas Chevron' },
  { id: '1595722222071-AcuoQ', name: 'Listrado Grosso preto capa', price: 29, inventory: 3, category: 'Capas Listradas' },
  { id: '1639573141174-AcuoQ', name: 'Neon belga verde clara borda', price: 50, inventory: 0, category: 'Capas Jacquard 43x43' },
  { id: '1596290151308-AcuoQ', name: 'Vermelho Suede Amassado', price: 29, inventory: 0, category: 'Capas Cores lisas' },
  { id: '1593385108909-AcuoQ', name: 'Amarelo Belize', price: 29, inventory: 4, category: 'Capas Cores lisas' },
  { id: '1595871066477-AcuoQ', name: 'Insetos capa', price: 29, inventory: 0, category: 'Marca Própria' },
  { id: '1595874260500-AcuoQ', name: 'Flores Marrocos Azul Tiffany capa', price: 29, inventory: 4, category: 'Capas Florais' },
  { id: '1661117357207-AcuoQ', name: 'Grafismo inca bege claro', price: 69, inventory: 0, category: 'Marca Própria' },
  { id: '1661117326880-AcuoQ', name: 'Jacard chave grega', price: 69, inventory: 0, category: 'Marca Própria' },
  { id: '1658690112871-AcuoQ', name: 'Creme Oxford capa (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1604787607166-AcuoQ', name: 'Flor aquarela', price: 29, inventory: 3, category: 'Capas Florais' },
  { id: '1658694725735-AcuoQ', name: 'Mesclado Caqui Belize (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1655066808511-AcuoQ', name: 'Margarida laranja', price: 29, inventory: 2, category: 'Capas Florais' },
  { id: '1635608937912-AcuoQ', name: 'Mesclado Bege Belize', price: 29, inventory: 3, category: 'Capas Cores lisas' },
  { id: '1658693849039-AcuoQ', name: 'Palha Suede Amassado (Lombar)', price: 25, inventory: 0, category: 'Marca Própria' },
  { id: '1639238737672-AcuoQ', name: 'Caramelo suede amassado', price: 29, inventory: 2, category: 'Capas Cores lisas' },
];

/**
 * Transforms the legacy `rawProductsData` into the new `Product` structure.
 * This is used for the initial state when a user is not logged in or has no cloud data.
 */
export const INITIAL_PRODUCTS: Product[] = rawProductsData.map((p, index) => {
    const nameLower = p.name.toLowerCase();
    const isSuede = nameLower.includes('suede');
    const isBelize = nameLower.includes('belize');
    let fabricType = 'Suede Liso'; // Default
    if (isSuede) fabricType = 'Suede Liso'; // Simple mapping for legacy data
    if (isBelize) fabricType = 'Linho'; // Heuristic mapping

    const isLombar = nameLower.includes('lombar');
    const defaultVariationSize = isLombar ? CushionSize.LUMBAR : CushionSize.SQUARE_45;

    // A simple heuristic to guess the price of the cover vs the full cushion
    let priceCover: number;
    if (p.price <= 25) {
        priceCover = p.price - 5;
    } else if (p.price <= 50) {
        priceCover = p.price - 10;
    } else {
        priceCover = p.price - 20;
    }
    priceCover = Math.max(10, priceCover); // Ensure price is not too low

    let brand: Brand;
    if (p.category.toLowerCase() === 'dolher') {
        brand = Brand.DOLHER;
    } else {
        brand = Brand.MARCA_PROPRIA;
    }
    
    const fabricInfo = BRAND_FABRIC_MAP[brand];
    const defaultFabricType = Object.keys(fabricInfo).includes(fabricType) ? fabricType : Object.keys(fabricInfo)[0];

    const allColors = [...PREDEFINED_COLORS].sort((a, b) => b.name.length - a.name.length);
    let mainColor = allColors.find(c => p.name.toLowerCase().includes(c.name.toLowerCase())) || { name: 'Indefinida', hex: '#808080' };


    return {
        id: p.id,
        name: p.name,
        baseImageUrl: '', // IMAGE_BANK_URLS[index % IMAGE_BANK_URLS.length],
        unitsSold: Math.floor(Math.random() * 75) + 5, // Random units sold: 5-79
        category: p.category,
        subCategory: '',
        fabricType: defaultFabricType,
        description: fabricInfo[defaultFabricType] || '',
        waterResistance: WaterResistanceLevel.NONE, // Default value
        brand: brand,
        backgroundImages: {},
        isMultiColor: false,
        colors: [mainColor],
        variations: [
            {
                size: defaultVariationSize,
                imageUrl: '', // To be generated by AI if needed
                priceCover: priceCover,
                priceFull: p.price,
                stock: {
                    [StoreName.TECA]: Math.floor(p.inventory / 2),
                    [StoreName.IONE]: Math.ceil(p.inventory / 2),
                },
            },
        ],
    };
});