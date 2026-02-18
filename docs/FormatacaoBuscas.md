# Guia de Formatação de Buscas - Rede União Maps

## Introdução

Este documento fornece orientações detalhadas sobre como formatar as buscas no sistema Rede União Maps para obter resultados mais precisos e eficientes. O sistema utiliza a API do Google Places para buscar informações de empresas e negócios.

## Como o Sistema Processa Consultas

### Estrutura da Busca
O sistema divide a consulta em duas partes principais:
1. **Ramo de Atividade (Nicho)**: O tipo de negócio que você deseja buscar
2. **Localização**: Onde deseja realizar a busca

### Processamento Interno
O sistema segue o seguinte fluxo:
1. Extrai o ramo de atividade usando `extractCategory()`
2. Extrai a localização usando `extractLocation()`
3. Combina ambos para formar a consulta final: `"ramo em localização"`

## Formatos de Busca Suportados

### 1. Formato Recomendado: Campos Separados
**Melhor abordagem**: Use os campos separados "O que buscar?" e "Onde buscar?"

**Exemplo:**
- Ramo: "Oficina Mecânica"
- Localização: "São Paulo"
- Consulta gerada: "Oficina Mecânica em São Paulo"

### 2. Consultas Compostas por Vírgula - Novo Comportamento
**Formato**: `termo1, termo2` (ambos tratados como categorias/serviços)

**Exemplo:**
- Consulta: `"mecanica, diesel"`
- Sistema interpreta: 
  - Busca por empresas que contenham "mecanica" E "diesel" como categorias/serviços
  - A localização é determinada separadamente pelo campo "Onde buscar?"

**ATENÇÃO**: Este formato agora busca empresas que tenham AMBOS os termos como categorias/serviços, não como categoria e localização.

### 3. Consultas Compostas por Espaços
**Formato**: `termo1 termo2 termo3`

**Exemplo:**
- Consulta: `"mecanica diesel"`
- Sistema interpreta: "mecanica diesel" como categoria completa
- Consulta final: `"mecanica diesel em [localizacao]"`
  
## Separação por Palavras-Chave

O sistema reconhece os seguintes separadores para distinguir entre categoria e localização:

### Separadores que definem a categoria (antes do separador):
- `-` (hífen)
- `–` (en dash)
- `|` (barra vertical)
- `em` (em português)
- `in` (em inglês)
- `no`, `na`, `de`, `near`, `perto de`

### Exemplos de Processamento:

#### Exemplo 1: "Oficina Mecânica em São Paulo"
- Categoria: "Oficina Mecânica"
- Localização: "São Paulo"

#### Exemplo 2: "Oficina Mecânica - São Paulo"
- Categoria: "Oficina Mecânica"
- Localização: "São Paulo"

#### Exemplo 3: "Oficina Mecânica, Diesel"
- Categorias: "Oficina Mecânica" E "Diesel" (busca empresas com ambos termos)
- Localização: (usando o campo de localização selecionado)

#### Exemplo 4: "Oficina Mecânica São Paulo"
- Categoria: "Oficina Mecânica São Paulo"
- Localização: (usando o campo de localização selecionado)

## Recomendações para Buscas Eficientes

### 1. Formato Ideal para Consultas Simples
```
Campo "O que buscar?": Oficina Mecânica
Campo "Onde buscar?": São Paulo
```

### 2. Formato para Consultas Compostas (Multi-Categorias)
**Recomendado**: Use vírgula para buscar por múltiplas categorias/serviços

**Exemplo**: Para buscar empresas que sejam "Oficina Mecânica" E trabalhem com "Diesel":
- Consulta: "Oficina Mecânica, Diesel"
- Localização: "São Paulo"

### 3. Formato para Consultas Complexas
Se você precisa de uma única consulta complexa:
```
Consulta: "oficina mecanica, diesel"
Localização: "São Paulo"
```

## Melhorias Recomendadas

### 1. Tratamento Correto de Vírgula
**Nova Implementação**: Consultas com vírgula são tratadas como busca por múltiplas categorias/serviços, não como categoria/localização.

### 2. Separação Clara de Funções
**Melhoria**: O campo de localização é usado exclusivamente para localização, evitando confusão com termos de busca.

### 3. Validação de Consulta
**Melhoria**: O sistema agora evita interpretar termos de busca como localização quando usados com vírgula.

## Exemplos Práticos de Consultas Otimizadas

### ✅ Recomendadas (Alta Precisão):
- `"Oficina Mecânica em São Paulo"` (usando campos separados)
- `"Oficina Mecânica, Diesel"` com localização definida separadamente
- `"Conserto de Celulares em Belo Horizonte"`

### ⚠️ Cuidado (Pode dar resultados inesperados):
- `"mecanica, sao paulo"` (agora busca por "mecanica" E "sao paulo" como categorias, com localização separada)

### ❌ Não Recomendadas:
- Nenhuma - o sistema agora lida corretamente com diferentes formatos

## Boas Práticas

1. **Prefira campos separados**: Use os campos "O que buscar?" e "Onde buscar?" para maior controle
2. **Use vírgula para múltiplas categorias**: Para buscar empresas com múltiplas especialidades
3. **Seja específico**: Use termos claros e específicos para o tipo de negócio
4. **Aproveite a busca composta**: Use vírgula para combinar categorias como "Oficina Mecânica, Diesel"

## Testes Recomendados

Antes de iniciar buscas em larga escala, teste com consultas como:
- `"mecanica, diesel"` com localização definida separadamente (deve buscar empresas com ambos termos)
- `"oficina mecanica"` (deve manter como categoria e usar localização selecionada)
- `"restaurante, pizza"` com localização definida (deve buscar restaurantes que sirvam pizza na localização especificada)

---

**Observação**: O sistema está configurado para processar consultas de forma inteligente, com o novo comportamento de vírgula para busca por múltiplas categorias/serviços, mantendo a localização definida separadamente.