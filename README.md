# Rede Uniao Maps 2.5

Extração de leads com Google Places API. Campanhas, filtro por busca e exportação CSV/Excel.

## Rodar localmente

**Requisito:** Node.js

1. Instalar dependências: `npm install`
2. (Opcional) Coloque sua chave em [.env.local](.env.local) ou use o campo na interface.
3. Subir o app: `npm run dev`

## Subir no GitHub e deixar online (grátis)

### 1. Criar o repositório no GitHub

- Acesse [github.com/new](https://github.com/new).
- Nome do repositório: por exemplo `leads` (ou o que preferir).
- Crie o repositório **vazio** (sem README, .gitignore ou licença).

### 2. Enviar o código

No terminal, na pasta do projeto:

```bash
git init
git add .
git commit -m "Rede Uniao Maps 2.5 - leads com Google Places"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/leads.git
git push -u origin main
```

Substitua `SEU_USUARIO` e `leads` pelo seu usuário e nome do repositório.

### 3. Ativar o GitHub Pages

- No repositório no GitHub: **Settings** → **Pages**.
- Em **Build and deployment** → **Source**: escolha **GitHub Actions**.
- O workflow já está em `.github/workflows/deploy.yml`: a cada push na branch `main` o site é buildado e publicado.

### 4. Acessar o site

Após o primeiro push (e o workflow terminar), o site fica em:

**https://SEU_USUARIO.github.io/leads/**

(O nome `leads` é o nome do seu repositório.)

A chave da API é digitada pelo usuário no próprio navegador; nada é enviado para o GitHub.
