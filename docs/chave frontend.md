Mudança para Chaves Individuais Realizada
Implementei a alteração para que o sistema use a chave fornecida pelo usuário (no navegador) em vez da chave fixa no servidor.

O que mudou:
- O sistema agora depende exclusivamente da chave armazenada no localStorage do navegador do usuário
- O proxy ainda espera receber a chave do frontend via parâmetro de query
- A variável de ambiente GOOGLE_PLACES_API_KEY não é mais utilizada no código

⚠️ AÇÃO NECESSÁRIA (IMPORTANTE)
Para garantir que sua chave pessoal não fique fixa para outros usuários:

1. Vá no Painel da Vercel > Settings > Environment Variables.
2. REMOVA a variável GOOGLE_PLACES_API_KEY se ainda estiver lá.
3. Faça um Redeploy na Vercel (ou push no git).
4. Agora, quando alguém acessar o site:

Ao acessar o site:
- Se não tiver chave configurada, o site vai pedir ("Configurar Chave" no topo).
- A chave que o usuário inserir ficará salva apenas no navegador dele (LocalStorage).
- O servidor apenas repassa a chamada com a chave recebida do cliente.

Melhorias implementadas:
- Removida a dependência da variável de ambiente no código-fonte
- Simplificada a lógica de inicialização da chave
- Garantida a privacidade da chave de cada usuário