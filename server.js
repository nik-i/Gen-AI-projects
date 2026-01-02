// server.js - backend that uses ONLY ChatGPT (OpenAI) to get startup info

require("dotenv").config();
const express = require("express");

// Node 18+ has global fetch. If you're on Node 16, you'll need node-fetch.
const app = express();
const PORT = process.env.PORT || 3000;

// Simple CORS so the Chrome extension can call this backend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/startup-info", async (req, res) => {
  const domain =req.query.domain;
  if (!domain) {
    return res.status(400).json({ error: "domain is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not set in .env",
    });
  }

  try {
    // Ask ChatGPT to return ONLY JSON with the fields we care about.
    const prompt = `
You are an investment-grade technology research assistant evaluating startups and technology companies from the perspective of enterprise buyers, corporate innovation teams, and early-stage investors.

Your objective is to produce a defensible point of view (POV) on the company’s technology, credibility, and readiness for enterprise commercialization — not marketing language.

For the company whose website domain is:
"${domain}"

Return ONLY a single valid JSON object with the exact structure below.

{
  "companyProfile": {
    "companyName": null,
    "foundedYear": null,
    "hqLocation": null
  },
  "technologyPOV": {
    "coreTechnology": null,
    "technicalDifferentiation": null,
    "patentsOrProprietaryIP": null
  },
  "founderPOV": {
    "founderBackground": null,
    "priorDomainExperience": null,
    "previousExitsOrNotableCompanies": null
  },
  "tractionAndCredibility": {
    "currentEnterpriseClients": null,
    "industryPartnerships": null
  },
  "fundingAndEcosystem": {
    "fundingStage": null,
    "fundingAmount": null,
    "investors": null,
    "acceleratorsOrPrograms": null
  },
  "commercialReadiness": {
    "commercializationStage": null,
    "enterpriseAvailability": null
  },
  "securityAndCompliance": {
    "securityProtocols": null,
    "complianceCertifications": null
  }
}

POV AND EVALUATION GUIDELINES:
- Assess whether the technology is meaningfully differentiated or primarily positioning.
- Explicitly identify patents, proprietary algorithms, datasets, trade secrets, or defensible IP if mentioned.
- Evaluate founder credibility based on prior experience in the same domain, deep technical expertise, or successful startup exits.
- Prioritize enterprise validation: named customers, pilots, Fortune-500 usage, or adoption in regulated industries.
- Judge commercialization maturity using one of the following if possible:
  - Research / Prototype
  - Pilot-ready
  - Revenue-generating
  - Enterprise-scale
- For software or digital products, assess security maturity (e.g., SOC 2, ISO 27001, HIPAA, GDPR, encryption standards, access controls).

RESEARCH RULES (STRICT):
- Do NOT guess or infer.
- If information cannot be verified with reasonable confidence, use null.
- Use public and reputable sources only:
  - Company website
  - Press releases
  - Crunchbase
  - PitchBook
  - Accelerator or investor websites
- Do a web query to determine funding stage and funding amount.
- Only use "Public" as a fundingStage if the company is actively listed on a stock exchange.
- Do NOT add commentary, explanations, markdown, or extra fields.
- Output must be valid JSON and nothing else.
`;


    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or another chat-capable model you have access to
        response_format: { type: "json_object" }, // ask for valid JSON :contentReference[oaicite:0]{index=0}
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that always returns valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      return res.status(500).json({
        error: "OpenAI API error",
        details: errorText,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI:", content);
      return res.status(500).json({
        error: "Failed to parse JSON from OpenAI response",
        raw: content,
      });
    }

    // Normalize and add a source field
const result = {
  // Core company info
  companyName: parsed.companyProfile?.companyName ?? null,
  foundedYear: parsed.companyProfile?.foundedYear ?? null,
  hqLocation: parsed.companyProfile?.hqLocation ?? null,

  // Funding & ecosystem
  fundingStage: parsed.fundingAndEcosystem?.fundingStage ?? null,
  fundingAmount: parsed.fundingAndEcosystem?.fundingAmount ?? null,
  investors: parsed.fundingAndEcosystem?.investors ?? null,
  acceleratorsOrPrograms: parsed.fundingAndEcosystem?.acceleratorsOrPrograms ?? null,

  // Technology POV
  coreTechnology: parsed.technologyPOV?.coreTechnology ?? null,
  technicalDifferentiation: parsed.technologyPOV?.technicalDifferentiation ?? null,
  patentsOrProprietaryIP: parsed.technologyPOV?.patentsOrProprietaryIP ?? null,

  // Founder POV
  founderBackground: parsed.founderPOV?.founderBackground ?? null,
  priorDomainExperience: parsed.founderPOV?.priorDomainExperience ?? null,
  previousExitsOrNotableCompanies:
    parsed.founderPOV?.previousExitsOrNotableCompanies ?? null,

  // Traction & credibility POV
  currentEnterpriseClients:
    parsed.tractionAndCredibility?.currentEnterpriseClients ?? null,
  industryPartnerships:
    parsed.tractionAndCredibility?.industryPartnerships ?? null,

  // Commercial readiness POV
  commercializationStage:
    parsed.commercialReadiness?.commercializationStage ?? null,
  enterpriseAvailability:
    parsed.commercialReadiness?.enterpriseAvailability ?? null,

  // Security & compliance POV (critical for enterprise)
  securityProtocols:
    parsed.securityAndCompliance?.securityProtocols ?? null,
  complianceCertifications:
    parsed.securityAndCompliance?.complianceCertifications ?? null,

  // Metadata
  source: "chatgpt-only",
};


    res.json(result);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
