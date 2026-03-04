# Meta Ads Manager

CLI para gerenciar anúncios no Facebook/Instagram via Meta Marketing API.

## Pré-requisitos

- Node.js 18+
- Conta de anúncios no Meta Business (Facebook)
- App registrado no [Meta for Developers](https://developers.facebook.com)

## Setup

### 1. Criar App no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um novo app do tipo **Business**
3. Adicione o produto **Marketing API**
4. Em **Configurações > Básico**, copie o **App ID** e **App Secret**

### 2. Gerar Access Token

1. No app, vá em **Ferramentas > Graph API Explorer**
2. Selecione seu app
3. Adicione as permissões: `ads_management`, `ads_read`, `pages_read_engagement`
4. Gere o token e copie

> Para tokens de longa duração (60 dias), troque o token de curta duração via:
> ```
> GET /oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_TOKEN}
> ```

### 3. Configurar o projeto

```bash
# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env

# Editar .env com seus dados
# META_ACCESS_TOKEN=seu_token
# META_AD_ACCOUNT_ID=act_XXXXXXXXXX
```

## Uso

```bash
# Ver todos os comandos disponíveis
node src/index.js

# Listar campanhas
node src/index.js campaigns list

# Criar campanha de vendas com R$50/dia
node src/index.js campaigns create --name "Minha Campanha" --objective OUTCOME_SALES --budget 50

# Criar conjunto de anúncios
node src/index.js adsets create --name "Público Brasil" --campaign <CAMPAIGN_ID> --budget 30

# Criar criativo
node src/index.js ads creative --name "Meu Criativo" --page <PAGE_ID> --link "https://meusite.com" --message "Confira!" --cta SHOP_NOW

# Criar anúncio
node src/index.js ads create --name "Meu Anúncio" --adset <ADSET_ID> --creative <CREATIVE_ID>

# Ativar campanha
node src/index.js campaigns update <CAMPAIGN_ID> --status ACTIVE
```

## Estrutura

```
src/
├── index.js      # CLI entry point
├── client.js     # Meta API client e autenticação
├── campaigns.js  # CRUD de campanhas
├── adsets.js     # CRUD de conjuntos de anúncios
└── ads.js        # CRUD de anúncios e criativos
```

## Objetivos de campanha disponíveis

| Objetivo | Descrição |
|---|---|
| `OUTCOME_AWARENESS` | Reconhecimento de marca |
| `OUTCOME_TRAFFIC` | Tráfego para site/app |
| `OUTCOME_ENGAGEMENT` | Engajamento com publicações |
| `OUTCOME_LEADS` | Geração de leads |
| `OUTCOME_SALES` | Conversões e vendas |
| `OUTCOME_APP_PROMOTION` | Instalações de app |

## Notas importantes

- Todos os anúncios são criados com status **PAUSED** por padrão (segurança)
- Budgets são informados em reais (R$) e convertidos automaticamente para centavos
- O targeting padrão é Brasil, 18-65 anos — personalize no código conforme necessário
- Para imagens, faça upload primeiro com `ads upload-image` e use o hash retornado
