const router = require("express").Router();
const db = require("../config/database");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");

const InProcess = db.base.collection("InProcess");

router.get("/:key", async (req, res) => {
  try {
    const key = req.params.key;

    if (!key) return res.status(400).json({ error: "Key inválida" });

    const doc = await InProcess.document(key).catch(() => null);
    if (!doc)
      return res.status(404).json({ error: "Documento não encontrado" });

    // Carregar template HTML
    const htmlPath = path.join(__dirname, "..", "proof", "Proof.html");
    let html = fs.readFileSync(htmlPath, "utf-8");

    // Tradução de CONDUCT
    function traduzirConduct(c) {
      switch (c) {
        case "elective":
          return "ELETIVO";
        case "urgency":
          return "URGÊNCIA";
        case "emergency":
          return "EMERGÊNCIA";
        default:
          return (c || "").toUpperCase();
      }
    }

    // Tradução de PRIORITY GROUP
    function traduzirPriorityGroup(arr = []) {
      const map = {
        pregnant: "GESTANTE",
        elderly: "IDOSO (60+)",
        superelderly: "SUPER IDOSO (80+)",
        disabilities: "PCD",
      };
      return arr.map((item) => map[item] || item.toUpperCase()).join(", ");
    }

    // Montagem dos serviços
    const servicos =
      doc.requestPhase?.medicalRequest
        ?.map((item) => (item.service || "").toUpperCase())
        .join(", ") || "";

    const tiposServico =
      doc.requestPhase?.medicalRequest
        ?.map((item) => (item.typeService?.name || "").toUpperCase())
        .join(", ") || "";

    const grupoPrioritario = traduzirPriorityGroup(
      doc.requestPhase?.priorityGroup || []
    );

    const classificacao = traduzirConduct(doc.requestPhase?.conduct);

    // -------------------------------
    // Data + Hora atuais no timezone SP
    // -------------------------------
    const dataHora = moment()
      .tz("America/Sao_Paulo")
      .format("DD/MM/YYYY HH:mm");

    // Replaces finais
    html = html
      .replace("{{solicitante_nome}}", (doc.person?.name || "").toUpperCase())
      .replace("{{solicitante_cpf}}", (doc.person?.id || "").toUpperCase())
      .replace("{{servico_nome}}", servicos)
      .replace("{{tipo_servico}}", tiposServico)
      .replace("{{classificacao}}", classificacao)
      .replace("{{grupo_prioritario}}", grupoPrioritario)
      .replace(
        "{{observacoes}}",
        (doc.requestPhase?.observations || "").toUpperCase()
      )
      .replace(
        "{{unidade_nome}}",
        (
          doc.requestPhase?.user?.activeSession?.attendanceUnit?.name || ""
        ).toUpperCase()
      )
      .replace(
        "{{usuario_responsavel}}",
        (doc.requestPhase?.user?.name || "").toUpperCase()
      )
      .replace("{{data_hora}}", dataHora.toUpperCase());

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    await browser.close();

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    res.json({ proof: pdfBase64 });
  } catch (err) {
    console.error("Erro HTML→PDF:", err);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao gerar PDF" });
  }
});

module.exports = router;
