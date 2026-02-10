const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "PROFEP MAX <judo@profepmax.com.br>";
const to = "luizpavani@gmail.com";
const userName = "Luiz";
const trackingId = "manual-test";
const SITE_URL = "https://www.profepmax.com.br";
const trackingUrl = `${SITE_URL}/checkout?plan=mensal&paymentMethod=2&tracking_id=${trackingId}&utm_source=launch_campaign&utm_medium=email`;

const templatePath = path.join(__dirname, "..", "supabase", "functions", "send-launch-campaign", "index.ts");
const source = fs.readFileSync(templatePath, "utf8");

const subjectMatch = source.match(/const subject = '([^']+)'/);
const htmlMatch = source.match(/const html = `([\s\S]*?)`\n/);

if (!subjectMatch || !htmlMatch) {
  throw new Error("Template não encontrado em send-launch-campaign/index.ts");
}

const subject = subjectMatch[1];
let html = htmlMatch[1];

html = html
  .replace(/\$\{userName\}/g, userName)
  .replace(/\$\{trackingUrl\}/g, trackingUrl)
  .replace(/\$\{SITE_URL\}/g, SITE_URL)
  .replace(/\$\{lead\.tracking_id\}/g, trackingId);

(async () => {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html
  });

  if (error) {
    console.error("Erro Resend:", error);
    process.exit(1);
  }

  console.log("OK", data?.id);
})();
