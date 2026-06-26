const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const gatewayController = read("services/api-gateway/src/gateway/gateway.controller.ts");
const gatewayService = read("services/api-gateway/src/gateway/gateway.service.ts");
const dto = read("services/api-gateway/src/gateway/dto/create-lead-contact.dto.ts");
const leadForm = read("services/frontend/components/LeadContactForm.tsx");
const leadApi = read("services/frontend/lib/api/leads.ts");
const homepage = read("services/frontend/app/page.tsx");
const configmap = read("k8s/configmap.yaml");

assert(gatewayController.includes("@Post('leads/contact')"), "Gateway must expose POST /api/leads/contact");
assert(
  gatewayController.includes("submitFlipFlopLead") &&
    gatewayController.includes("{ success: true, data: response }"),
  "Gateway route must wrap Leads response in the existing API envelope",
);
assert(gatewayService.includes("LEADS_PUBLIC_URL"), "Gateway must use LEADS_PUBLIC_URL for public intake");
assert(gatewayService.includes("sourceService: 'flipflop'"), "Lead payload must use sourceService flipflop");
assert(gatewayService.includes("sourceLabel: 'support-contact'"), "Lead payload must use stable support-contact label");
assert(
  gatewayService.includes("consentSource: 'flipflop-home-contact:v2'") &&
    gatewayService.includes("consentCapturedAt: new Date().toISOString()"),
  "Lead payload must include affirmative consent evidence",
);
assert(
  gatewayService.includes("intent: 'support_contact'") &&
    gatewayService.includes("surface: 'home_contact'") &&
    gatewayService.includes("allowedContactChannels: 'email,phone'") &&
    !gatewayService.includes("metadata: { name"),
  "Lead metadata must stay bounded and avoid raw personal data duplication",
);
assert(
  dto.includes("from 'class-validator'") &&
    dto.includes("@IsEmail()") &&
    dto.includes("phone!: string") &&
    dto.includes("@MaxLength(1200)"),
  "Gateway DTO must import class-validator and validate email/phone/message bounds",
);
assert(
  gatewayController.includes("phone: payload.phone") &&
    gatewayService.includes("phone: string") &&
    gatewayService.includes("type: 'phone'"),
  "Gateway must pass phone through to Leads contactMethods",
);
assert(leadApi.includes("'/leads/contact'"), "Frontend API wrapper must call the FlipFlop gateway route");
assert(
  leadForm.includes("marketingConsent") &&
    leadForm.includes("useAuth") &&
    leadForm.includes("useState(true)") &&
    leadForm.includes("showEmailInput") &&
    leadForm.includes("showPhoneInput") &&
    leadForm.includes("phone: contactPhone") &&
    leadForm.includes("Souhlasim, aby me FlipFlop kontaktoval"),
  "Frontend form must default visible consent and use authenticated contact data when available",
);
assert(
  homepage.includes("@/components/LeadContactForm") &&
    homepage.includes("<LeadContactForm />") &&
    homepage.includes('href="/doprava"') &&
    homepage.includes('href="/products?assistant=shop"') &&
    !homepage.includes("Bezpečné platby"),
  "Homepage must render contact form, delivery link, Shop Assistant link, and remove secure-payments tile",
);
assert(configmap.includes('LEADS_PUBLIC_URL: "https://leads.alfares.cz"'), "ConfigMap must define public Leads URL");

console.log("leads public intake verification ok");
