const config = {
  MicrosoftAppId: process.env.BOT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.BOT_TENANT_ID,
  MicrosoftAppPassword: process.env.BOT_PASSWORD,
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
};

module.exports = config;
