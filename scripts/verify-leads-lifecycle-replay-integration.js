const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const leadsClient = read("shared/clients/leads-client.service.ts");
const clientsModule = read("shared/clients/clients.module.ts");
const configmap = read("k8s/configmap.yaml");
const externalSecret = read("k8s/external-secret.yaml");

assert(
  leadsClient.includes("LEADS_REPLAY_CONSUMER = \"flipflop-service\""),
  "Leads client must scope replay to flipflop-service",
);
assert(
  leadsClient.includes("/api/leads/internal/${encodeURIComponent(leadId)}/lifecycle-replay"),
  "Leads client must call the guarded one-lead lifecycle replay route",
);
assert(
  leadsClient.includes("MAX_LEADS_REPLAY_EVENTS = 30") &&
    leadsClient.includes("Math.min(MAX_LEADS_REPLAY_EVENTS"),
  "Leads client must clamp replay limit to 30",
);
assert(
  leadsClient.includes("LEADS_SERVICE_TOKEN") &&
    leadsClient.includes("authorization:") &&
    leadsClient.includes("Bearer"),
  "Leads client must send Auth Bearer LEADS_SERVICE_TOKEN",
);
assert(
  !leadsClient.includes("LEADS_INTERNAL_SERVICE_TOKEN") &&
    !leadsClient.includes("x-internal-service-token") &&
    !leadsClient.includes('"x-service-name"'),
  "Leads client must not send static internal headers or x-service-name",
);
assert(
  !leadsClient.includes("confirmationToken"),
  "Leads client must not construct confirmation tokens",
);
assert(
  clientsModule.includes("LeadsClientService") &&
    clientsModule.includes("exports: [CatalogClientService, WarehouseClientService, OrderClientService, LeadsClientService"),
  "Shared clients module must export LeadsClientService",
);
assert(
  configmap.includes("LEADS_SERVICE_URL: \"http://leads-microservice:4400\""),
  "FlipFlop configmap must expose the in-cluster Leads service URL",
);
assert(
  externalSecret.includes("secretKey: LEADS_SERVICE_TOKEN") &&
    externalSecret.includes("property: LEADS_SERVICE_TOKEN") &&
    !externalSecret.includes("LEADS_INTERNAL_SERVICE_TOKEN"),
  "FlipFlop ExternalSecret must map Auth-minted LEADS_SERVICE_TOKEN only",
);

console.log("leads lifecycle replay integration verification ok");
