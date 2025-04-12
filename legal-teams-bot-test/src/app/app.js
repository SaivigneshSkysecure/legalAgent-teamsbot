const { MemoryStorage } = require("botbuilder");
const path = require("path");
const fs = require("fs");
const os = require("os");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const { Client } = require("@microsoft/microsoft-graph-client");
const { ClientSecretCredential } = require("@azure/identity");
require("isomorphic-fetch");
const config = require("../config");

const {
  Application,
  ActionPlanner,
  OpenAIModel,
  PromptManager,
} = require("@microsoft/teams-ai");

// ✅ Setup Azure Graph Auth
const tenantId = process.env.TENANT_ID || "";
const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

// Get access token
async function getGraphToken() {
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  return token.token;
}

// Get authenticated Graph client
async function getGraphClient() {
  const token = await getGraphToken();

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

// Download file using Graph client
async function downloadPdf(downloadUrl, fileName) {
  const token = await getGraphToken();
  const tempPath = path.join(os.tmpdir(), fileName);

  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const arrayBuffer = await res.arrayBuffer(); 
  const buffer = Buffer.from(arrayBuffer);     
  fs.writeFileSync(tempPath, buffer);   

  return tempPath;
}

// Extract PDF text
async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// AI setup
const model = new OpenAIModel({
  azureApiKey: config.azureOpenAIKey,
  azureDefaultDeployment: config.azureOpenAIDeploymentName,
  azureEndpoint: config.azureOpenAIEndpoint,
  useSystemMessages: true,
  logRequests: true,
});

const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "chat",
});

const storage = new MemoryStorage();
const app = new Application({
  storage,
  ai: {
    planner,
    enable_feedback_loop: true,
  },
});

app.feedbackLoop(async (context, state, feedbackLoopData) => {
  console.log("Your feedback is " + JSON.stringify(context.activity.value));
});

app.message(/.*/, async (context, state) => {
  const userQuery = context.activity.text || "";
  const attachments = context.activity.attachments;

  if (
    attachments &&
    attachments[0]?.contentType === "application/vnd.microsoft.teams.file.download.info"
  ) {
    const file = attachments[0];
    const downloadUrl = file.content.downloadUrl;
    const fileName = file.name;

    try {
      const tempFilePath = await downloadPdf(downloadUrl, fileName);
      const pdfText = await extractPdfText(tempFilePath);
      const combinedQuery = `${userQuery}\n\n[Extracted PDF Text]\n${pdfText}`;

      const response = await axios.post("http://127.0.0.1:8000/query", {
        query: combinedQuery,
      });

      await context.sendActivity(response.data.response);
    } catch (err) {
      console.error("Error downloading or parsing PDF:", err.message);
      await context.sendActivity("❌ Failed to process the uploaded PDF.");
    }
  } else {
    try {
      const response = await axios.post("http://127.0.0.1:8000/query", {
        query: userQuery,
      });
      await context.sendActivity(response.data.response);
    } catch (err) {
      console.error("Error calling backend:", err.message);
      await context.sendActivity("⚠️ Backend error occurred.");
    }
  }
});

module.exports = app;
