
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
    ]
};

// Aliases for states to help detection
export const STATE_ALIASES: Record<string, string> = {
    "santa catarina": "SC",
    "sc": "SC",
    "parana": "PR",
    "paraná": "PR",
    "pr": "PR",
    "rio grande do sul": "RS",
    "rs": "RS"
};

export const getHubsForLocation = (locationName: string): CityHub[] | null => {
    const normalized = locationName.toLowerCase().trim();
    const stateCode = STATE_ALIASES[normalized];
    if (stateCode) {
        return STATE_HUBS[stateCode] || null;
    }
    return null;
};
