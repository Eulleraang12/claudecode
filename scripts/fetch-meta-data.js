#!/usr/bin/env node
/**
 * Script para buscar dados de campanhas da Meta Graph API.
 *
 * Uso: META_ACCESS_TOKEN=seu_token node scripts/fetch-meta-data.js
 *
 * Este script busca todas as campanhas, ad sets e ads com métricas
 * detalhadas e salva os dados brutos em JSON.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const BASE_URL = 'https://graph.facebook.com/v21.0';

if (!ACCESS_TOKEN) {
  console.error('Erro: META_ACCESS_TOKEN não definido.');
  console.error('Uso: META_ACCESS_TOKEN=seu_token node scripts/fetch-meta-data.js');
  process.exit(1);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Erro ao parsear JSON: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllPages(url) {
  const results = [];
  let nextUrl = url;
  while (nextUrl) {
    const response = await fetchJSON(nextUrl);
    if (response.error) {
      throw new Error(`API Error: ${JSON.stringify(response.error)}`);
    }
    if (response.data) results.push(...response.data);
    nextUrl = response.paging?.next || null;
  }
  return results;
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('Buscando ad accounts...');
  const accounts = await fetchJSON(
    `${BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${ACCESS_TOKEN}`
  );

  if (accounts.error) {
    console.error('Erro na API:', accounts.error.message);
    process.exit(1);
  }

  fs.writeFileSync(path.join(outputDir, 'accounts.json'), JSON.stringify(accounts, null, 2));
  console.log(`Encontradas ${accounts.data?.length || 0} contas.`);

  for (const account of (accounts.data || [])) {
    const accountId = account.id;
    console.log(`\nProcessando conta: ${account.name} (${accountId})`);

    // Buscar campanhas com insights
    console.log('  Buscando campanhas...');
    const campaigns = await fetchAllPages(
      `${BASE_URL}/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time&limit=100&access_token=${ACCESS_TOKEN}`
    );
    fs.writeFileSync(path.join(outputDir, `campaigns_${accountId}.json`), JSON.stringify(campaigns, null, 2));
    console.log(`  ${campaigns.length} campanhas encontradas.`);

    // Buscar insights de campanhas (lifetime)
    console.log('  Buscando insights de campanhas (lifetime)...');
    const campaignInsights = await fetchAllPages(
      `${BASE_URL}/${accountId}/insights?level=campaign&fields=campaign_id,campaign_name,impressions,reach,clicks,cpc,cpm,ctr,cpp,spend,actions,cost_per_action_type,frequency,unique_clicks,inline_link_clicks,inline_link_click_ctr,website_ctr,conversions,cost_per_conversion&date_preset=maximum&limit=100&access_token=${ACCESS_TOKEN}`
    );
    fs.writeFileSync(path.join(outputDir, `campaign_insights_${accountId}.json`), JSON.stringify(campaignInsights, null, 2));
    console.log(`  ${campaignInsights.length} registros de insights.`);

    // Buscar insights por dia
    console.log('  Buscando insights diários...');
    const dailyInsights = await fetchAllPages(
      `${BASE_URL}/${accountId}/insights?level=campaign&time_increment=1&fields=campaign_id,campaign_name,impressions,reach,clicks,cpc,cpm,ctr,spend,actions,cost_per_action_type&date_preset=maximum&limit=500&access_token=${ACCESS_TOKEN}`
    );
    fs.writeFileSync(path.join(outputDir, `daily_insights_${accountId}.json`), JSON.stringify(dailyInsights, null, 2));
    console.log(`  ${dailyInsights.length} registros diários.`);

    // Buscar ad sets
    console.log('  Buscando ad sets...');
    const adsets = await fetchAllPages(
      `${BASE_URL}/${accountId}/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_strategy&limit=100&access_token=${ACCESS_TOKEN}`
    );
    fs.writeFileSync(path.join(outputDir, `adsets_${accountId}.json`), JSON.stringify(adsets, null, 2));
    console.log(`  ${adsets.length} ad sets encontrados.`);

    // Buscar ads
    console.log('  Buscando ads...');
    const ads = await fetchAllPages(
      `${BASE_URL}/${accountId}/ads?fields=id,name,status,adset_id,campaign_id,creative&limit=100&access_token=${ACCESS_TOKEN}`
    );
    fs.writeFileSync(path.join(outputDir, `ads_${accountId}.json`), JSON.stringify(ads, null, 2));
    console.log(`  ${ads.length} ads encontrados.`);
  }

  console.log('\nDados salvos em:', outputDir);
  console.log('Execute "npm run dev" para ver a dashboard.');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
