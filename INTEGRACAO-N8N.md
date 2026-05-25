# Integração com n8n

Este sistema recebe notas fiscais processadas pela sua automação no n8n e exibe o estoque na tela web.

## Fluxo completo

```
Email → n8n (filtro remetente) → PDF/XML → IA gera JSON → HTTP POST → /api/webhook → Tela de estoque
```

## 1. Subir o sistema localmente

Crie `.env.local` com as variáveis do Upstash (mesmas da Vercel):

```
KV_REST_API_URL=https://xxxx.upstash.io
KV_REST_API_TOKEN=seu_token_de_escrita
```

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

> O sistema usa **apenas Redis** — não há gravação em arquivos locais.

## 2. Configurar no n8n

Após o nó de IA que gera o JSON, adicione um nó **HTTP Request**:

| Campo | Valor |
|-------|-------|
| Method | POST |
| URL | `http://SEU_SERVIDOR:3000/api/webhook` |
| Authentication | None (ou Header se usar API_KEY) |
| Body Content Type | JSON |
| Body | Saída do nó de IA (mapeada abaixo) |

### Formato JSON esperado

```json
{
  "numeroNota": "NF-2024-001234",
  "valorNota": 4850.75,
  "produtos": [
    {
      "nome": "Luva cirúrgica",
      "quantidade": 45,
      "valorUnitario": 2.5,
      "capacidadeMaxima": 500
    }
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| numeroNota | string | Sim | Número da nota fiscal |
| valorNota | number | Sim | Valor total da nota |
| produtos | array | Sim | Lista de produtos |
| produtos[].nome | string | Sim | Nome do produto |
| produtos[].quantidade | number | Sim | Quantidade em estoque |
| produtos[].valorUnitario | number | Sim | Preço unitário |
| produtos[].capacidadeMaxima | number | Não | Ignorado — o backend usa regras fixas |

> **Alerta "Baixo" (somente no backend):** referência fixa de **25 unidades**; estoque baixo quando a quantidade fica **abaixo de 10%** disso (menos de 2,5 → na prática quantidade ≤ 2). Esses valores **não aparecem na tela**.

### Aliases aceitos (flexível para a IA)

O webhook também aceita nomes alternativos:

- `numero_nota`, `nota` → numeroNota
- `valor_nota`, `valor` → valorNota
- `produto`, `descricao` → nome
- `qtd`, `quantidadeUnitaria` → quantidade
- `valor_unitario`, `preco`, `valorUnit` → valorUnitario
- `capacidade` → capacidadeMaxima

## 3. Prompt sugerido para o nó de IA no n8n

Peça para a IA retornar **apenas JSON válido** neste formato:

```
Analise a nota fiscal e retorne APENAS um JSON válido (sem markdown) no formato:
{
  "numeroNota": "número da NF",
  "valorNota": valor_total_numerico,
  "produtos": [
    {
      "nome": "nome do produto",
      "quantidade": quantidade_em_estoque,
      "valorUnitario": preco_unitario,
      "capacidadeMaxima": capacidade_maxima_do_produto
    }
  ]
}
```

## 4. Mapear campos no HTTP Request (n8n)

Use expressões do n8n para montar o body, por exemplo:

```json
{
  "numeroNota": "{{ $json.numeroNota }}",
  "valorNota": {{ $json.valorNota }},
  "produtos": {{ $json.produtos }}
}
```

Ou envie o JSON inteiro da IA diretamente se já estiver no formato correto.

## 5. Segurança (opcional)

Crie um arquivo `.env` na raiz do projeto:

```
API_KEY=sua-chave-secreta-123
```

No n8n, adicione um header:

| Header | Valor |
|--------|-------|
| X-API-Key | sua-chave-secreta-123 |

## 6. Deploy na Vercel (recomendado para n8n.cloud)

O n8n **bloqueia `localhost`** por segurança (proteção SSRF). Se você usa n8n.cloud ou não quer alterar variáveis de ambiente, faça deploy na Vercel.

### Passo a passo

1. Crie conta em [vercel.com](https://vercel.com) e instale o CLI (opcional):
   ```bash
   npm i -g vercel
   ```

2. Na pasta do projeto:
   ```bash
   vercel
   ```
   Siga o assistente (linkar ao GitHub ou deploy direto).

3. No painel da Vercel → seu projeto **estoque-pop** → **Storage** → **Upstash Redis** → **Connect**.
   - Isso cria `KV_REST_API_URL` e `KV_REST_API_TOKEN` automaticamente.
   - Use o token de **escrita** (`KV_REST_API_TOKEN`), não o `READ_ONLY`.

4. **Redeploy** o projeto após conectar o Redis (Deployments → ⋯ → Redeploy).

5. Use **duas URLs diferentes**:

   | O quê | URL |
   |-------|-----|
   | **Tela do estoque** (abrir no navegador) | `https://NOME-QUE-A-VERCEL-GERAR.vercel.app` |
   | **API do n8n** (só no HTTP Request POST) | `https://NOME-QUE-A-VERCEL-GERAR.vercel.app/api/webhook` |

   > **NÃO use** `seu-projeto.vercel.app` — isso era só exemplo de texto e abre um site de outra pessoa.

   ⚠️ Se você abrir `/api/webhook` no navegador, verá JSON — isso **não** é a tela do estoque.

### Variáveis opcionais na Vercel

| Variável | Valor |
|----------|-------|
| API_KEY | chave secreta (header `X-API-Key` no n8n) |

### Erro "endereço IP restrito" no n8n

Significa que você tentou `http://localhost:3000`. Use a URL pública da Vercel em vez de localhost.

### Alternativa: n8n self-hosted local

Se o n8n roda na sua máquina e você **insiste** em usar localhost, adicione no `.env` do n8n:
```
N8N_SSRF_ALLOWED_IP_RANGES=127.0.0.1/32
```
Reinicie o n8n. Na nuvem (n8n.cloud) isso **não** é possível — use Vercel.

## 7. Testar manualmente

Com o servidor rodando:

```bash
curl -X POST http://localhost:3000/api/webhook ^
  -H "Content-Type: application/json" ^
  -d @exemplo-nota.json
```

Depois abra http://localhost:3000 — a nota deve aparecer na lista.

## Diagrama do workflow n8n

```
[Gmail Trigger]
    ↓
[IF - remetente específico?]
    ↓ sim
[IF - tem anexo PDF/XML?]
    ↓ sim
[Extrair texto do PDF/XML]
    ↓
[OpenAI / IA - gerar JSON da nota]
    ↓
[HTTP Request - POST /api/webhook]
    ↓
[Estoque atualizado na tela]
```
