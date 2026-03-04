#!/usr/bin/env node

const { listCampaigns, createCampaign, updateCampaign, OBJECTIVES } = require("./campaigns");
const { listAdSets, createAdSet, updateAdSet } = require("./adsets");
const { listAds, createAdCreative, createAd, uploadImage, CALL_TO_ACTIONS } = require("./ads");

const [,, resource, action, ...rest] = process.argv;

function printUsage() {
  console.log(`
╔══════════════════════════════════════════════════╗
║           Meta Ads Manager CLI                   ║
╚══════════════════════════════════════════════════╝

Uso: node src/index.js <recurso> <ação> [opções]

RECURSOS E AÇÕES:

  campaigns list [--status ACTIVE|PAUSED]
    Lista todas as campanhas da conta

  campaigns create --name "Nome" --objective OUTCOME_SALES [--budget 50]
    Cria uma nova campanha (status PAUSED por padrão)
    Objetivos: ${OBJECTIVES.join(", ")}

  campaigns update <id> [--name "Novo Nome"] [--status ACTIVE|PAUSED]
    Atualiza uma campanha existente

  adsets list [--campaign <campaign_id>]
    Lista conjuntos de anúncios

  adsets create --name "Nome" --campaign <id> [--budget 20] [--goal REACH]
    Cria um conjunto de anúncios (targeting padrão: Brasil, 18-65)

  ads list [--adset <adset_id>]
    Lista anúncios

  ads creative --name "Nome" --page <page_id> --link "https://..." [--message "Texto"] [--image-url "https://..."] [--cta LEARN_MORE]
    Cria um criativo de anúncio
    CTAs: ${CALL_TO_ACTIONS.slice(0, 5).join(", ")}, ...

  ads create --name "Nome" --adset <adset_id> --creative <creative_id>
    Cria um anúncio

  ads upload-image <caminho_da_imagem>
    Faz upload de uma imagem para usar nos criativos

EXEMPLOS:

  # Listar campanhas ativas
  node src/index.js campaigns list --status ACTIVE

  # Criar campanha de vendas com R$50/dia
  node src/index.js campaigns create --name "Black Friday 2026" --objective OUTCOME_SALES --budget 50

  # Criar conjunto de anúncios
  node src/index.js adsets create --name "Público Brasil" --campaign 123456 --budget 30

  # Criar criativo com imagem
  node src/index.js ads creative --name "Banner BF" --page 123456 --link "https://meusite.com" --message "Aproveite!" --image-url "https://..." --cta SHOP_NOW

  # Criar anúncio
  node src/index.js ads create --name "Anúncio BF" --adset 123456 --creative 789012
`);
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace("--", "");
      parsed[key] = args[i + 1] || true;
      i++;
    } else {
      parsed._positional = parsed._positional || [];
      parsed._positional.push(args[i]);
    }
  }
  return parsed;
}

async function main() {
  if (!resource || !action) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(rest);

  try {
    switch (`${resource} ${action}`) {
      // ── Campanhas ────────────────────────────
      case "campaigns list":
        await listCampaigns(args.status ? { status: args.status } : {});
        break;

      case "campaigns create":
        await createCampaign({
          name: args.name,
          objective: args.objective,
          dailyBudget: args.budget ? parseFloat(args.budget) : undefined,
        });
        break;

      case "campaigns update": {
        const id = args._positional?.[0];
        if (!id) throw new Error("Informe o ID da campanha");
        await updateCampaign(id, {
          name: args.name,
          status: args.status,
          dailyBudget: args.budget ? parseFloat(args.budget) : undefined,
        });
        break;
      }

      // ── Conjuntos de Anúncios ────────────────
      case "adsets list":
        await listAdSets(args.campaign);
        break;

      case "adsets create":
        await createAdSet({
          name: args.name,
          campaignId: args.campaign,
          dailyBudget: args.budget ? parseFloat(args.budget) : undefined,
          optimizationGoal: args.goal || "REACH",
        });
        break;

      case "adsets update": {
        const id = args._positional?.[0];
        if (!id) throw new Error("Informe o ID do conjunto de anúncios");
        await updateAdSet(id, {
          name: args.name,
          status: args.status,
          dailyBudget: args.budget ? parseFloat(args.budget) : undefined,
        });
        break;
      }

      // ── Anúncios ─────────────────────────────
      case "ads list":
        await listAds(args.adset);
        break;

      case "ads creative":
        await createAdCreative({
          name: args.name,
          pageId: args.page,
          message: args.message,
          link: args.link,
          imageUrl: args["image-url"],
          callToAction: args.cta || "LEARN_MORE",
        });
        break;

      case "ads create":
        await createAd({
          name: args.name,
          adSetId: args.adset,
          creativeId: args.creative,
        });
        break;

      case "ads upload-image": {
        const path = args._positional?.[0];
        if (!path) throw new Error("Informe o caminho da imagem");
        await uploadImage(path);
        break;
      }

      default:
        console.error(`Comando desconhecido: ${resource} ${action}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\nErro: ${err.message}`);
    if (err.response?.data) {
      console.error("Detalhes da API:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
