const router = require("express").Router();
const db = require("../config/database");
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib"); // for template filling

const collName = "InProcess";

router.put("/pdf", async (req, res, next) => {
  try {
    const {
      timestamp,
      userProperty,
      attendanceUnit,
      serviceType,
      promiseService,
    } = req.body;
    if (!attendanceUnit?._key || !serviceType?._key || !promiseService?._key) {
      return res
        .status(400)
        .json({ error: "Missing required body parameters." });
    }

    let formattedTs = "";
    if (timestamp && typeof timestamp === "object") {
      const dd = String(timestamp.day).padStart(2, "0");
      const mm = String(timestamp.month).padStart(2, "0");
      const yyyy = timestamp.year;
      formattedTs = `${dd}/${mm}/${yyyy} ${timestamp.time}`;
    } else if (typeof timestamp === "string") {
      formattedTs = timestamp;
    }

    const aql = `
      FOR item IN PromiseServiceItem
        FILTER item.attendanceUnit._key == @unitKey
           AND item.serviceType._key == @serviceTypeKey
           AND item.promiseService._key == @promiseServiceKey
        RETURN item
    `;
    const cursor = await db.base.query(aql, {
      unitKey: attendanceUnit._key,
      serviceTypeKey: serviceType._key,
      promiseServiceKey: promiseService._key,
    });
    const items = await cursor.all();

    const templatePath = path.join(
      __dirname,
      "..",
      "scheduledReport",
      "ScheduledService.pdf"
    );
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const form = pdfDoc.getForm();
    try {
      form
        .getTextField("attendanceUnit-name")
        .setText(attendanceUnit.name.toUpperCase());
      form
        .getTextField("serviceType-name")
        .setText(serviceType.nome.toUpperCase());
      form.getTextField("user-name").setText(userProperty.name);
      form.getTextField("timestamp").setText(formattedTs);
    } catch {}

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let [page] = pdfDoc.getPages();
    const { width, height } = page.getSize();
    let y = height - 200;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const d = new Date(it.start.date + "T00:00");
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const dateStr = `${dd}/${mm}/${yyyy}`;

      const line = `${i + 1}. ${it.person.name} – ${dateStr} (${
        it.start.period
      }) – ${it.specialist.name}`;
      page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 15;
      if (y < 50) {
        page = pdfDoc.addPage();
        y = page.getSize().height - 100;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    res.json({ pdfBase64: base64 });
  } catch (err) {
    next(err);
  }
});

router.put("/day/pdf", async (req, res, next) => {
  try {
    const {
      timestamp,
      userProperty,
      attendanceUnit,
      serviceType,
      promiseService,
      date,
    } = req.body;
    if (
      !attendanceUnit?._key ||
      !serviceType?._key ||
      !promiseService?._key ||
      !date
    ) {
      return res
        .status(400)
        .json({ error: "Missing required body parameters." });
    }

    let formattedTs = "";
    if (timestamp && typeof timestamp === "object") {
      const dd = String(timestamp.day).padStart(2, "0");
      const mm = String(timestamp.month).padStart(2, "0");
      const yyyy = timestamp.year;
      formattedTs = `${dd}/${mm}/${yyyy} ${timestamp.time}`;
    } else if (typeof timestamp === "string") {
      formattedTs = timestamp;
    }

    // Fetch items for specific day
    const aql = `
      FOR item IN PromiseServiceItem
        FILTER item.attendanceUnit._key == @unitKey
          AND item.serviceType._key == @serviceTypeKey
          AND item.promiseService._key == @promiseServiceKey
          AND item.start.date == @filterDate
        RETURN item
    `;
    const cursor = await db.base.query(aql, {
      unitKey: attendanceUnit._key,
      serviceTypeKey: serviceType._key,
      promiseServiceKey: promiseService._key,
      filterDate: date,
    });
    const items = await cursor.all();

    const templatePath = path.join(
      __dirname,
      "..",
      "scheduledReport",
      "ScheduledDay.pdf"
    );
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const form = pdfDoc.getForm();
    try {
      form
        .getTextField("attendanceUnit-name")
        .setText(attendanceUnit.name.toUpperCase());
      const dt = new Date(date + "T00:00");
      const dday = String(dt.getDate()).padStart(2, "0");
      const mmonth = String(dt.getMonth() + 1).padStart(2, "0");
      const yyear = dt.getFullYear();
      const dateField = `${dday}/${mmonth}/${yyear}`;
      form.getTextField("date").setText(dateField);
      form
        .getTextField("serviceType-name")
        .setText(serviceType.nome.toUpperCase());
      form.getTextField("user-name").setText(userProperty.name);
      form.getTextField("timestamp").setText(formattedTs);
    } catch {}

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let [page] = pdfDoc.getPages();
    let y = page.getSize().height - 200;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const d = new Date(it.start.date + "T00:00");
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const dateStr = `${dd}/${mm}/${yyyy}`;

      const line = `${i + 1}. ${it.person.name} – ${dateStr} (${
        it.start.period
      }) – ${it.specialist.name}`;
      page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 15;
      if (y < 50) {
        page = pdfDoc.addPage();
        y = page.getSize().height - 100;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    res.json({ pdfBase64: base64 });
  } catch (err) {
    next(err);
  }
});

router.put("/pdf/patient", async (req, res, next) => {
  try {
    const {
      timestamp,
      userProperty,
      attendanceUnit,
      serviceType,
      promiseService,
    } = req.body;

    if (!attendanceUnit?._key || !serviceType?._key || !promiseService?._key) {
      return res
        .status(400)
        .json({ error: "Missing required body parameters." });
    }

    // Formatar timestamp
    let formattedTs = "";
    if (timestamp && typeof timestamp === "object") {
      const dd = String(timestamp.day).padStart(2, "0");
      const mm = String(timestamp.month).padStart(2, "0");
      const yyyy = timestamp.year;
      formattedTs = `${dd}/${mm}/${yyyy} ${timestamp.time}`;
    } else if (typeof timestamp === "string") {
      formattedTs = timestamp;
    }

    // Query AQL para pegar os pacientes aguardando agendamento
    const aql = `
      FOR doc IN InProcess
        FILTER doc.attendanceUnit._key == @unitKey
          AND doc.requestPhase.medicalRequest[*].typeService._key ANY == @serviceTypeKey
          AND (!HAS(doc, "schedulingPhase") OR LENGTH(doc.schedulingPhase) == 0)
        RETURN doc
    `;

    const cursor = await db.base.query(aql, {
      unitKey: attendanceUnit._key,
      serviceTypeKey: serviceType._key,
    });

    const items = await cursor.all();

    // Carregar template PDF
    const templatePath = path.join(
      __dirname,
      "..",
      "scheduledReport",
      "Patient.pdf"
    );
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const form = pdfDoc.getForm();
    try {
      form
        .getTextField("attendanceUnit-name")
        .setText(attendanceUnit.name.toUpperCase());
      form
        .getTextField("serviceType-name")
        .setText(serviceType.nome.toUpperCase());
      form.getTextField("user-name").setText(userProperty.name);
      form.getTextField("timestamp").setText(formattedTs);
    } catch {}

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let [page] = pdfDoc.getPages();
    let y = page.getSize().height - 200;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const reqTs = it.requestPhase?.timestamp;
      let reqDateStr = "";

      if (reqTs && reqTs.date) {
        const d = new Date(reqTs.date + "T00:00");
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        reqDateStr = `${dd}/${mm}/${yyyy}`;
      }

      const line = `${i + 1}. ${
        it.person.name
      } – ${reqDateStr} – Serviço solicitado: ${serviceType.nome}`;
      page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 15;

      if (y < 50) {
        page = pdfDoc.addPage();
        y = page.getSize().height - 100;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    res.json({ pdfBase64: base64 });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res) => {
  try {
    const user = req.body.user;
    if (!user || !Array.isArray(user.attendanceUnit)) {
      return res
        .status(400)
        .send({ error: "Usuário inválido em req.body.user." });
    }

    const unitKey = user.activeSession?.attendanceUnit?._key || "";

    const currentUnit = user.attendanceUnit.find((u) => u._key === unitKey);

    if (unitKey !== "MAIN" && !currentUnit) {
      return res.status(400).send({
        error: "Unidade de atendimento ativa não encontrada no usuário.",
      });
    }

    let rolesNormalized = [];
    if (unitKey === "MAIN") {
      rolesNormalized = [];
    } else {
      if (!Array.isArray(currentUnit.list_role)) {
        return res
          .status(400)
          .send({ error: "list_role inválido na unidade de atendimento." });
      }
      rolesNormalized = currentUnit.list_role.map((r) =>
        r.trim().toLowerCase()
      );
    }

    const hasSingleRole = rolesNormalized.length === 1;
    const singleRole = hasSingleRole ? rolesNormalized[0] : null;
    const isSchedulerReceptionist =
      rolesNormalized.length === 2 &&
      rolesNormalized.includes("scheduler") &&
      rolesNormalized.includes("receptionist");

    let cursor;

    if (isSchedulerReceptionist) {
      if (unitKey === "MAIN") {
        cursor = await db.base.query(`
          FOR u IN InProcess
            FILTER HAS(u, "requestPhase")
            RETURN u
        `);
      } else {
        if (!unitKey) {
          return res
            .status(400)
            .send({ error: "Unidade de atendimento não definida no usuário." });
        }
        cursor = await db.base.query(
          `
          FOR u IN InProcess
            FILTER HAS(u, "requestPhase")
              AND u.requestPhase.user.activeSession.attendanceUnit._key == @unitKey
            RETURN u
          `,
          { unitKey }
        );
      }
    } else if (
      hasSingleRole &&
      singleRole === "scheduler" &&
      unitKey === "MAIN"
    ) {
      cursor = await db.base.query(`
        FOR u IN InProcess
          FILTER HAS(u, "requestPhase")
          RETURN u
      `);
    } else {
      if (!unitKey) {
        return res
          .status(400)
          .send({ error: "Unidade de atendimento não definida no usuário." });
      }
      cursor = await db.base.query(
        `
        FOR u IN InProcess
          FILTER HAS(u, "requestPhase")
            AND u.requestPhase.user.activeSession.attendanceUnit._key == @unitKey
          RETURN u
        `,
        { unitKey }
      );
    }
    const result = await cursor.all();
    res.send({
      result,
      currentUser: user,
    });
  } catch (err) {
    console.error("Erro em GET /requestPhase:", err);
    res.status(500).send({ error: "Erro interno ao buscar requisições." });
  }
});

router.get("/:_key", async (req, res) => {
  const { _key } = req.params;

  let inProcess = await db.base.query(
    `for u in InProcess filter u._key == @_key return u`,
    { _key }
  );
  inProcess = await inProcess.next();

  let person = await db.base.query(
    `for p in Person filter p._key == @person_key return p`,
    { person_key: inProcess.person._key }
  );
  person = await person.next();

  inProcess.person = person;

  res.send(inProcess);
});

module.exports = router;
