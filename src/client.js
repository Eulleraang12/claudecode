const bizSdk = require("facebook-nodejs-business-sdk");
require("dotenv").config();

const REQUIRED_ENV_VARS = [
  "META_ACCESS_TOKEN",
  "META_AD_ACCOUNT_ID",
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(
      `Variáveis de ambiente faltando: ${missing.join(", ")}\n` +
        "Copie .env.example para .env e preencha os valores."
    );
    process.exit(1);
  }
}

function initClient() {
  validateEnv();

  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const api = bizSdk.FacebookAdsApi.init(accessToken);

  // Descomente para debug das requisições:
  // api.setDebug(true);

  const AdAccount = bizSdk.AdAccount;
  const account = new AdAccount(accountId);

  return { api, account, bizSdk };
}

module.exports = { initClient };
