async function getCurrentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return null;

  try {
    const url = new URL(tab.url);
    return url.hostname.replace(/^www\./, "");
  } catch (e) {
    console.error("Invalid URL", e);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const fetchBtn = document.getElementById("fetchBtn");
  const copyBtn = document.getElementById("copyBtn");
  const statusEl = document.getElementById("status");

  // Core fields
  const companyNameEl = document.getElementById("companyName");
  const domainEl = document.getElementById("domain");
  const foundedYearEl = document.getElementById("foundedYear");
  const hqLocationEl = document.getElementById("hqLocation");
  const fundingStageEl = document.getElementById("fundingStage");
  const fundingAmountEl = document.getElementById("fundingAmount");
  const sourceEl = document.getElementById("source");
  const fundingBadgeEl = document.getElementById("fundingBadge");

  // New POV fields
  const investorsEl = document.getElementById("investors");
  const acceleratorsOrProgramsEl = document.getElementById("acceleratorsOrPrograms");

  const coreTechnologyEl = document.getElementById("coreTechnology");
  const technicalDifferentiationEl = document.getElementById("technicalDifferentiation");
  const patentsOrProprietaryIPEl = document.getElementById("patentsOrProprietaryIP");

  const founderBackgroundEl = document.getElementById("founderBackground");
  const priorDomainExperienceEl = document.getElementById("priorDomainExperience");
  const previousExitsOrNotableCompaniesEl = document.getElementById("previousExitsOrNotableCompanies");

  const currentEnterpriseClientsEl = document.getElementById("currentEnterpriseClients");
  const industryPartnershipsEl = document.getElementById("industryPartnerships");

  const commercializationStageEl = document.getElementById("commercializationStage");
  const enterpriseAvailabilityEl = document.getElementById("enterpriseAvailability");

  const securityProtocolsEl = document.getElementById("securityProtocols");
  const complianceCertificationsEl = document.getElementById("complianceCertifications");

  let lastData = null;

  const NA = (v, fallback = "N/A") => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === "string" && v.trim() === "") return fallback;
    return v;
  };

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function updateFundingBadge(stage) {
    const s = typeof stage === "string" ? stage.trim() : stage;
    if (!s || s === "N/A" || s === "—") {
      fundingBadgeEl.textContent = "Stage: —";
      fundingBadgeEl.classList.remove("badge-stage");
      fundingBadgeEl.classList.add("badge-muted");
      return;
    }

    fundingBadgeEl.textContent = `Stage: ${s}`;
    fundingBadgeEl.classList.remove("badge-muted");
    fundingBadgeEl.classList.add("badge-stage");
  }

  function setText(el, value, fallback = "N/A") {
    if (!el) return; // Safe in case HTML ids don't exist yet
    el.textContent = NA(value, fallback);
  }

  fetchBtn.addEventListener("click", async () => {
    setStatus("Detecting domain...");
    copyBtn.disabled = true;

    const domain = await getCurrentTabDomain();
    if (!domain) {
      setStatus("Could not detect domain. Open a normal https:// page.");
      return;
    }

    // Show domain immediately
    setText(domainEl, domain, "—");
    setStatus(`Calling backend for ${domain}...`);

    try {
      const response = await fetch(
        `http://localhost:3000/api/startup-info?domain=${encodeURIComponent(domain)}`
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Got data:", data);
      lastData = data;

      // Core populate
      setText(companyNameEl, data.companyName, "(Unknown company)");
      setText(foundedYearEl, data.foundedYear);
      setText(hqLocationEl, data.hqLocation);
      setText(fundingStageEl, data.fundingStage);
      setText(fundingAmountEl, data.fundingAmount);
      setText(sourceEl, data.source, "chatgpt-only");
      updateFundingBadge(data.fundingStage);

      // Funding & ecosystem POV
      setText(investorsEl, data.investors);
      setText(acceleratorsOrProgramsEl, data.acceleratorsOrPrograms);

      // Technology POV
      setText(coreTechnologyEl, data.coreTechnology);
      setText(technicalDifferentiationEl, data.technicalDifferentiation);
      setText(patentsOrProprietaryIPEl, data.patentsOrProprietaryIP);

      // Founder POV
      setText(founderBackgroundEl, data.founderBackground);
      setText(priorDomainExperienceEl, data.priorDomainExperience);
      setText(previousExitsOrNotableCompaniesEl, data.previousExitsOrNotableCompanies);

      // Traction & credibility POV
      setText(currentEnterpriseClientsEl, data.currentEnterpriseClients);
      setText(industryPartnershipsEl, data.industryPartnerships);

      // Commercial readiness POV
      setText(commercializationStageEl, data.commercializationStage);
      setText(enterpriseAvailabilityEl, data.enterpriseAvailability);

      // Security & compliance POV
      setText(securityProtocolsEl, data.securityProtocols);
      setText(complianceCertificationsEl, data.complianceCertifications);

      copyBtn.disabled = false;
      copyBtn.textContent = "Copy JSON";
      setStatus("Done!");
    } catch (err) {
      console.error("Error in popup fetch:", err);
      setStatus("Error fetching info. Is backend running?");
      copyBtn.disabled = true;
    }
  });

  copyBtn.addEventListener("click", async () => {
    if (!lastData) return;
    const jsonText = JSON.stringify(lastData, null, 2);
    try {
      await navigator.clipboard.writeText(jsonText);
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy JSON";
      }, 1500);
    } catch (e) {
      console.error("Clipboard error:", e);
    }
  });
});
