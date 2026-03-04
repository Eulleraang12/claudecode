const { initClient } = require("./client");

const ADSET_FIELDS = [
  "id",
  "name",
  "status",
  "campaign_id",
  "daily_budget",
  "lifetime_budget",
  "billing_event",
  "optimization_goal",
  "targeting",
  "start_time",
  "end_time",
  "created_time",
];

async function listAdSets(campaignId) {
  const { account, bizSdk } = initClient();

  let adSets;
  if (campaignId) {
    const Campaign = bizSdk.Campaign;
    const campaign = new Campaign(campaignId);
    adSets = await campaign.getAdSets(ADSET_FIELDS);
  } else {
    adSets = await account.getAdSets(ADSET_FIELDS);
  }

  console.log(`\nEncontrados ${adSets.length} conjunto(s) de anúncios:\n`);
  for (const s of adSets) {
    console.log(`  [${s.id}] ${s.name}`);
    console.log(`    Campanha: ${s.campaign_id} | Status: ${s.status}`);
    console.log(`    Otimização: ${s.optimization_goal} | Billing: ${s.billing_event}`);
    if (s.daily_budget) console.log(`    Budget diário: R$ ${(s.daily_budget / 100).toFixed(2)}`);
    console.log();
  }

  return adSets;
}

async function createAdSet({
  name,
  campaignId,
  dailyBudget,
  billingEvent = "IMPRESSIONS",
  optimizationGoal = "REACH",
  targeting,
  startTime,
  endTime,
  status = "PAUSED",
}) {
  const { account } = initClient();

  if (!name || !campaignId) {
    throw new Error("name e campaignId são obrigatórios");
  }

  // Targeting padrão: Brasil, 18-65 anos
  const defaultTargeting = {
    geo_locations: {
      countries: ["BR"],
    },
    age_min: 18,
    age_max: 65,
  };

  const params = {
    name,
    campaign_id: campaignId,
    billing_event: billingEvent,
    optimization_goal: optimizationGoal,
    targeting: targeting || defaultTargeting,
    status,
  };

  if (dailyBudget) {
    params.daily_budget = Math.round(dailyBudget * 100);
  }

  if (startTime) params.start_time = startTime;
  if (endTime) params.end_time = endTime;

  const adSet = await account.createAdSet([], params);

  console.log(`\nConjunto de anúncios criado com sucesso!`);
  console.log(`  ID: ${adSet.id}`);
  console.log(`  Nome: ${name}`);
  console.log(`  Campanha: ${campaignId}`);
  console.log(`  Status: ${status}`);

  return adSet;
}

async function updateAdSet(adSetId, updates) {
  const { bizSdk } = initClient();
  const AdSet = bizSdk.AdSet;
  const adSet = new AdSet(adSetId);

  const params = {};
  if (updates.name) params.name = updates.name;
  if (updates.status) params.status = updates.status;
  if (updates.dailyBudget) params.daily_budget = Math.round(updates.dailyBudget * 100);
  if (updates.targeting) params.targeting = updates.targeting;

  await adSet.update([], params);

  console.log(`\nConjunto de anúncios ${adSetId} atualizado!`);
  return adSet;
}

module.exports = { listAdSets, createAdSet, updateAdSet };
