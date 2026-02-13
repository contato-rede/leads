
export interface CityHub {
    name: string;
    lat: number;
    lng: number;
}

export const STATE_HUBS: Record<string, CityHub[]> = {
    "SC": [
        { name: "Joinville", lat: -26.3045, lng: -48.8464 },
        { name: "Florianópolis", lat: -27.5954, lng: -48.5480 },
        { name: "Blumenau", lat: -26.9165, lng: -49.0711 },
        { name: "São José", lat: -27.6146, lng: -48.6258 },
        { name: "Itajaí", lat: -26.9078, lng: -48.6619 },
        { name: "Chapecó", lat: -27.1004, lng: -52.6152 },
        { name: "Criciúma", lat: -28.6775, lng: -49.3703 },
        { name: "Jaraguá do Sul", lat: -26.4842, lng: -49.0844 },
        { name: "Lages", lat: -27.8160, lng: -50.3261 },
        { name: "Palhoça", lat: -27.6436, lng: -48.6657 },
        { name: "Balneário Camboriú", lat: -26.9926, lng: -48.6346 },
        { name: "Brusque", lat: -27.0969, lng: -48.9103 },
        { name: "Tubarão", lat: -28.4731, lng: -48.9331 },
        { name: "Concórdia", lat: -27.2346, lng: -52.0289 },
        { name: "Rio do Sul", lat: -27.2144, lng: -49.6358 },
        { name: "Caçador", lat: -26.7744, lng: -51.0153 }
    ],
    "PR": [
        { name: "Curitiba", lat: -25.4290, lng: -49.2671 },
        { name: "Londrina", lat: -23.3103, lng: -51.1628 },
        { name: "Maringá", lat: -23.4210, lng: -51.9331 },
        { name: "Ponta Grossa", lat: -25.0950, lng: -50.1614 },
        { name: "Cascavel", lat: -24.9578, lng: -53.4595 },
        { name: "São José dos Pinhais", lat: -25.5348, lng: -49.2045 },
        { name: "Foz do Iguaçu", lat: -25.5149, lng: -54.5822 },
        { name: "Guarapuava", lat: -25.3935, lng: -51.4656 },
        { name: "Paranaguá", lat: -25.5204, lng: -48.5095 },
        { name: "Toledo", lat: -24.7172, lng: -53.7431 }
    ],
    "RS": [
        { name: "Porto Alegre", lat: -30.0346, lng: -51.2177 },
        { name: "Caxias do Sul", lat: -29.1678, lng: -51.1794 },
        { name: "Canoas", lat: -29.9189, lng: -51.1811 },
        { name: "Pelotas", lat: -31.7654, lng: -52.3376 },
        { name: "Santa Maria", lat: -29.6842, lng: -53.8069 },
        { name: "Passo Fundo", lat: -28.2628, lng: -52.4067 },
        { name: "Novo Hamburgo", lat: -29.6842, lng: -51.1302 },
        { name: "Rio Grande", lat: -32.0353, lng: -52.0986 },
        { name: "Erechim", lat: -27.6342, lng: -52.2739 }
    ],
    "SP": [
        { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
        { name: "Campinas", lat: -22.9099, lng: -47.0626 },
        { name: "Guarulhos", lat: -23.4463, lng: -46.5333 },
        { name: "São Bernardo do Campo", lat: -23.6944, lng: -46.5654 },
        { name: "São José dos Campos", lat: -23.2237, lng: -45.9009 },
        { name: "Santo André", lat: -23.6666, lng: -46.5333 },
        { name: "Ribeirão Preto", lat: -21.1704, lng: -47.8103 },
        { name: "Osasco", lat: -23.5329, lng: -46.7917 },
        { name: "Sorocaba", lat: -23.5015, lng: -47.4521 },
        { name: "Santos", lat: -23.9608, lng: -46.3336 }
    ],
    "RJ": [
        { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 },
        { name: "São Gonçalo", lat: -22.8269, lng: -43.0539 },
        { name: "Duque de Caxias", lat: -22.7858, lng: -43.3117 },
        { name: "Nova Iguaçu", lat: -22.7564, lng: -43.4607 },
        { name: "Niterói", lat: -22.8858, lng: -43.1153 },
        { name: "Campos dos Goytacazes", lat: -21.7642, lng: -41.3247 },
        { name: "Belford Roxo", lat: -22.7642, lng: -43.3995 },
        { name: "São João de Meriti", lat: -22.8036, lng: -43.3722 },
        { name: "Petrópolis", lat: -22.5047, lng: -43.1758 }
    ],
    "MG": [
        { name: "Belo Horizonte", lat: -19.9167, lng: -43.9345 },
        { name: "Uberlândia", lat: -18.9113, lng: -48.2622 },
        { name: "Contagem", lat: -19.9317, lng: -44.0539 },
        { name: "Juiz de Fora", lat: -21.7620, lng: -43.3503 },
        { name: "Betim", lat: -19.9678, lng: -44.1983 },
        { name: "Montes Claros", lat: -16.7269, lng: -43.8658 },
        { name: "Ribeirão das Neves", lat: -19.7675, lng: -44.0867 },
        { name: "Uberaba", lat: -19.7472, lng: -47.9392 },
        { name: "Governador Valadares", lat: -18.8503, lng: -41.9492 }
    ]
};

export const ALL_STATES = [
    { code: "SC", name: "Santa Catarina" },
    { code: "PR", name: "Paraná" },
    { code: "RS", name: "Rio Grande do Sul" },
    { code: "SP", name: "São Paulo" },
    { code: "RJ", name: "Rio de Janeiro" },
    { code: "MG", name: "Minas Gerais" }
];

// Aliases for states to help detection
export const STATE_ALIASES: Record<string, string> = {
    "santa catarina": "SC",
    "sc": "SC",
    "parana": "PR",
    "paraná": "PR",
    "pr": "PR",
    "rio grande do sul": "RS",
    "rs": "RS",
    "sao paulo": "SP",
    "são paulo": "SP",
    "sp": "SP",
    "rio de janeiro": "RJ",
    "rj": "RJ",
    "minas gerais": "MG",
    "mg": "MG"
};

export const getHubsForLocation = (locationName: string): CityHub[] | null => {
    const normalized = locationName.toLowerCase().trim();
    const stateCode = STATE_ALIASES[normalized];
    if (stateCode) {
        return STATE_HUBS[stateCode] || null;
    }
    return null;
};
