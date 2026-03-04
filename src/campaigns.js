const { initClient } = require("./client");

const CAMPAIGN_FIELDS = [
  "id",
  "name",
  "status",
  "objective",
  "daily_budget",
  "lifetime_budget",
  "start_time",
  "stop_time",
  "created_time",
];

async function listCampaigns(filters = {}) {
  const { account } = initClient();

  const params = {};
  if (filters.status) {
    params.effective_status = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
  }

  const campaigns = await account.getCampaigns(CAMPAIGN_FIELDS, params);

  console.log(`\nEncontradas ${campaigns.length} campanha(s):\n`);
  for (const c of campaigns) {
    console.log(`  [${c.id}] ${c.name}`);
    console.log(`    Status: ${c.status} | Objetivo: ${c.objective}`);
    if (c.daily_budget) console.log(`    Budget diário: R$ ${(c.daily_budget / 100).toFixed(2)}`);
    if (c.lifetime_budget) console.log(`    Budget total: R$ ${(c.lifetime_budget / 100).toFixed(2)}`);
    console.log();
  }

  return campaigns;
}

async function createCampaign({ name, objective, dailyBudget, status = "PAUSED", specialAdCategories = [] }) {
  const { account, bizSdk } = initClient();
  const Campaign = bizSdk.Campaign;

  if (!name || !objective) {
    throw new Error("name e objective são obrigatórios");
  }

  const params = {
    name,
    objective,
    status,
    special_ad_categories: specialAdCategories,
  };

  if (dailyBudget) {
    params.daily_budget = Math.round(dailyBudget * 100); // centavos
  }

  const campaign = await account.createCampaign([], params);

  console.log(`\nCampanha criada com sucesso!`);
  console.log(`  ID: ${campaign.id}`);
  console.log(`  Nome: ${name}`);
  console.log(`  Objetivo: ${objective}`);
  console.log(`  Status: ${status}`);

  return campaign;
}

async function updateCampaign(campaignId, updates) {
  const { bizSdk } = initClient();
  const Campaign = bizSdk.Campaign;

  const campaign = new Campaign(campaignId);

  const params = {};
  if (updates.name) params.name = updates.name;
  if (updates.status) params.status = updates.status;
  if (updates.dailyBudget) params.daily_budget = Math.round(updates.dailyBudget * 100);

  await campaign.update([], params);

  console.log(`\nCampanha ${campaignId} atualizada com sucesso!`);
  return campaign;
}

// Objetivos disponíveis na API v20+
const OBJECTIVES = [
  "OUTCOME_AWARENESS",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_TRAFFIC",
  "OUTCOME_APP_PROMOTION",
];

module.exports = { listCampaigns, createCampaign, updateCampaign, OBJECTIVES };
