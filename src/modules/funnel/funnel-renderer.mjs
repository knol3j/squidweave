export function renderFunnel(funnel, steps) {
  const c = funnel.settings;
  const accent = c.brandColor || "#2563eb";

  const stepsJson = escapeHtml(JSON.stringify(steps));
  const funnelJson = escapeHtml(JSON.stringify(funnel));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${escapeHtml(funnel.name)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: ${c.theme === "dark" ? "#0f172a" : "#f8fafc"};
    color: ${c.theme === "dark" ? "#e2e8f0" : "#1e293b"};
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .funnel-container {
    width: 100%;
    max-width: 480px;
    background: ${c.theme === "dark" ? "#1e293b" : "#ffffff"};
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,${c.theme === "dark" ? "0.3" : "0.08"});
    padding: 32px 24px;
    position: relative;
    transition: opacity 0.3s ease;
  }
  .funnel-logo { text-align: center; margin-bottom: 24px; }
  .funnel-logo img { max-height: 48px; }
  .progress-bar {
    width: 100%;
    height: 4px;
    background: ${c.theme === "dark" ? "#334155" : "#e2e8f0"};
    border-radius: 2px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: ${accent};
    border-radius: 2px;
    transition: width 0.4s ease;
    width: 0%;
  }
  .step { display: none; }
  .step.active { display: block; animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .step-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; line-height: 1.3; }
  .step-description { font-size: 14px; color: ${c.theme === "dark" ? "#94a3b8" : "#64748b"}; margin-bottom: 20px; line-height: 1.5; }
  .step-image { width: 100%; border-radius: 8px; margin-bottom: 16px; max-height: 200px; object-fit: cover; }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
  .form-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid ${c.theme === "dark" ? "#475569" : "#cbd5e1"};
    border-radius: 8px;
    font-size: 16px;
    background: ${c.theme === "dark" ? "#0f172a" : "#ffffff"};
    color: inherit;
    transition: border-color 0.2s;
    outline: none;
  }
  .form-input:focus { border-color: ${accent}; box-shadow: 0 0 0 3px ${accent}22; }
  .form-input.error { border-color: #ef4444; }
  .error-text { color: #ef4444; font-size: 12px; margin-top: 4px; display: none; }
  .choices { display: flex; flex-direction: column; gap: 10px; }
  .choice-btn {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    border: 1px solid ${c.theme === "dark" ? "#475569" : "#e2e8f0"};
    border-radius: 10px;
    background: ${c.theme === "dark" ? "#0f172a" : "#f8fafc"};
    cursor: pointer;
    transition: all 0.2s;
    font-size: 15px;
    text-align: left;
    color: inherit;
  }
  .choice-btn:hover { border-color: ${accent}; background: ${accent}0a; }
  .choice-btn.selected { border-color: ${accent}; background: ${accent}15; }
  .choice-btn .radio {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid ${c.theme === "dark" ? "#64748b" : "#94a3b8"};
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .choice-btn.selected .radio { border-color: ${accent}; }
  .choice-btn.selected .radio::after {
    content: ''; width: 10px; height: 10px; border-radius: 50%;
    background: ${accent};
  }
  .nav-buttons { display: flex; gap: 12px; margin-top: 24px; }
  .btn {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }
  .btn-primary {
    background: ${accent};
    color: #ffffff;
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-secondary {
    background: ${c.theme === "dark" ? "#334155" : "#f1f5f9"};
    color: ${c.theme === "dark" ? "#e2e8f0" : "#475569"};
  }
  .btn-secondary:hover { opacity: 0.9; }
  .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
  .hidden { display: none; }
  .spinner {
    width: 20px; height: 20px; border: 2px solid #ffffff44;
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
    vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .success-screen { text-align: center; padding: 40px 0; }
  .success-icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: ${accent}15; color: ${accent};
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px; font-size: 28px;
  }
  .success-title { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .success-message { font-size: 14px; color: ${c.theme === "dark" ? "#94a3b8" : "#64748b"}; }
</style>
</head>
<body>
<div class="funnel-container" id="app">
  ${c.logoUrl ? `<div class="funnel-logo"><img src="${escapeHtml(c.logoUrl)}" alt="Logo"></div>` : ""}
  <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
  <div id="stepsContainer"></div>
  <div class="nav-buttons" id="navButtons">
    <button class="btn btn-secondary hidden" id="prevBtn" onclick="prevStep()">Back</button>
    <button class="btn btn-primary" id="nextBtn" onclick="nextStep()">Continue</button>
  </div>
</div>
<script>
  const STEPS = ${stepsJson};
  const FUNNEL = ${funnelJson};
  const SUBMIT_URL = window.location.origin + "/api/funnels/" + FUNNEL.id + "/submit";
  const ACCENT = "${accent}";
  let currentStep = 0;
  let answers = {};

  function renderStep(index) {
    const step = STEPS[index];
    if (!step) return;
    const container = document.getElementById("stepsContainer");

    let bodyHtml = "";
    switch (step.type) {
      case "info":
        bodyHtml = '<div class="success-screen">' +
          '<div class="success-icon">✓</div>' +
          '<div class="success-title">' + esc(step.title) + '</div>' +
          (step.description ? '<div class="success-message">' + esc(step.description) + '</div>' : '') +
          '</div>';
        break;
      case "choice":
        bodyHtml = '<div class="choices">' +
          (step.choices || []).map((c, i) =>
            '<button class="choice-btn" data-value="' + esc(c.value) + '" onclick="selectChoice(this)">' +
            '<span class="radio"></span><span>' + esc(c.label) + '</span></button>'
          ).join("") +
          '</div>';
        break;
      default:
        bodyHtml = '<form id="stepForm" onsubmit="event.preventDefault(); nextStep();">';
        (step.fields && step.fields.length > 0 ? step.fields : [{
          type: step.type === "email" ? "email" : step.type === "phone" ? "tel" : "text",
          key: "field_0",
          label: step.title,
          placeholder: step.placeholder || "",
          required: step.required,
        }]).forEach(f => {
          const val = answers[step.id + "_" + f.key] || "";
          bodyHtml += '<div class="form-group">' +
            (f.label ? '<label class="form-label">' + esc(f.label) + '</label>' : "") +
            '<input class="form-input" type="' + esc(f.type || "text") + '"' +
            ' name="' + esc(f.key) + '"' +
            ' placeholder="' + esc(f.placeholder || "") + '"' +
            (f.required ? ' required' : '') +
            ' value="' + esc(val) + '"' +
            ' oninput="saveField(this)" />' +
            '<div class="error-text" id="error_' + esc(f.key) + '">This field is required</div>' +
            '</div>';
        });
        bodyHtml += '</form>';
        break;
    }

    container.innerHTML =
      (step.imageUrl ? '<img class="step-image" src="' + esc(step.imageUrl) + '" alt="">' : "") +
      '<div class="step-title">' + esc(step.title) + '</div>' +
      (step.description ? '<div class="step-description">' + esc(step.description) + '</div>' : "") +
      bodyHtml;

    updateProgress();
    updateNav();
    // Restore choice selection
    if (step.type === "choice") {
      const saved = answers[step.id];
      if (saved) {
        document.querySelectorAll(".choice-btn").forEach(btn => {
          if (btn.dataset.value === saved) btn.classList.add("selected");
        });
      }
    }
    container.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    container.querySelectorAll('.step').forEach(el => el.classList.add('active'));
  }

  function saveField(input) {
    const step = STEPS[currentStep];
    answers[step.id + "_" + input.name] = input.value;
    input.classList.toggle("error", input.required && !input.value.trim());
  }

  function selectChoice(btn) {
    const step = STEPS[currentStep];
    document.querySelectorAll(".choice-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    answers[step.id] = btn.dataset.value;
    setTimeout(nextStep, 200);
  }

  function validateStep() {
    const step = STEPS[currentStep];
    if (step.type === "choice" || step.type === "info") return true;
    let valid = true;
    document.querySelectorAll(".form-input").forEach(input => {
      if (input.required && !input.value.trim()) {
        input.classList.add("error");
        const err = document.getElementById("error_" + input.name);
        if (err) err.style.display = "block";
        valid = false;
      } else {
        input.classList.remove("error");
        const err = document.getElementById("error_" + input.name);
        if (err) err.style.display = "none";
      }
    });
    return valid;
  }

  function nextStep() {
    if (currentStep === STEPS.length - 1) {
      submitFunnel();
      return;
    }
    if (!validateStep()) return;
    // Save form fields
    document.querySelectorAll(".form-input").forEach(input => saveField(input));
    currentStep++;
    renderStep(currentStep);
  }

  function prevStep() {
    if (currentStep <= 0) return;
    document.querySelectorAll(".form-input").forEach(input => saveField(input));
    currentStep--;
    renderStep(currentStep);
  }

  function updateProgress() {
    const pct = STEPS.length > 1 ? ((currentStep) / (STEPS.length - 1)) * 100 : 100;
    document.getElementById("progressFill").style.width = pct + "%";
  }

  function updateNav() {
    document.getElementById("prevBtn").classList.toggle("hidden", currentStep === 0);
    const btn = document.getElementById("nextBtn");
    if (currentStep === STEPS.length - 1) {
      btn.textContent = FUNNEL.settings?.submitCta || "Submit";
    } else {
      btn.textContent = "Continue";
    }
  }

  async function submitFunnel() {
    if (!validateStep()) return;
    document.querySelectorAll(".form-input").forEach(input => saveField(input));

    const btn = document.getElementById("nextBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending...';

    const contact = {};
    const answerList = [];
    STEPS.forEach(step => {
      if (step.type === "choice") {
        const val = answers[step.id];
        if (val) {
          answerList.push({ stepId: step.id, label: step.title, value: val });
          if (step.title.toLowerCase().includes("name") && val) contact.name = val;
          if (step.title.toLowerCase().includes("email") && val) contact.email = val;
          if (step.title.toLowerCase().includes("phone") && val) contact.phone = val;
        }
      } else {
        (step.fields && step.fields.length > 0 ? step.fields : [{key: "field_0"}]).forEach(f => {
          const val = answers[step.id + "_" + f.key];
          if (val !== undefined) {
            answerList.push({ stepId: step.id, label: f.label || step.title, value: val });
            const lower = (f.label || step.title).toLowerCase();
            if (lower.includes("name") && !contact.name) contact.name = val;
            if (lower.includes("email") && !contact.email) contact.email = val;
            if (lower.includes("phone") && !contact.phone) contact.phone = val;
          }
        });
      }
      // Also grab from step type
      if (step.type === "email" && answers[step.id + "_field_0"]) contact.email = answers[step.id + "_field_0"];
      if (step.type === "phone" && answers[step.id + "_field_0"]) contact.phone = answers[step.id + "_field_0"];
      if (step.type === "text" && answers[step.id + "_field_0"] && step.title.toLowerCase().includes("name")) {
        contact.name = answers[step.id + "_field_0"];
      }
    });

    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList, contact }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess();
        if (data.redirectUrl && data.redirectUrl !== "") {
          setTimeout(() => { window.location.href = data.redirectUrl; }, 2000);
        }
      } else {
        btn.disabled = false;
        btn.textContent = FUNNEL.settings?.submitCta || "Submit";
        alert("Something went wrong. Please try again.");
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = FUNNEL.settings?.submitCta || "Submit";
      alert("Network error. Please check your connection and try again.");
    }
  }

  function showSuccess() {
    document.getElementById("stepsContainer").innerHTML =
      '<div class="success-screen">' +
      '<div class="success-icon">✓</div>' +
      '<div class="success-title">Thank You!</div>' +
      '<div class="success-message">Your submission has been received.</div>' +
      '</div>';
    document.getElementById("navButtons").classList.add("hidden");
    document.getElementById("progressFill").style.width = "100%";
  }

  function esc(s) { if (!s) return ""; return String(s).replace(/[&<>"']/g, function(m) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]; });
  }

  renderStep(0);
</script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
