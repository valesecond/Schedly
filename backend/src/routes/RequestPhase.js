const router = require("express").Router();
const db = require("../config/database");
const multer = require("multer");
const upload = multer();
const { bucket } = require("../config/Storage");

const collName = "InProcess";

async function incrementRequestCounter(timestamp, specialties = []) {
  const year = String(timestamp.year);
  const month = String(timestamp.month).padStart(2, "0");
  const day = String(timestamp.day).padStart(2, "0");
  const coll = db.base.collection("CounterRequest");

  // 1) Busca o documento do ano (ou null se não existir)
  let oldDoc = null;
  try {
    oldDoc = await coll.document(year);
  } catch (e) {
    // não existe ainda
  }

  // 2) Monta o specMap já com incremento (old.value + 1)
  const specMap = specialties.reduce((acc, spec) => {
    if (!spec) return acc;

    // pega oldSpec (ou inicializa)
    const oldSpec = oldDoc?.list_specialties?.[spec] ?? {
      value: 0,
      list_month: {},
    };
    const oldMonth = oldSpec.list_month?.[month] ?? { value: 0, list_day: {} };
    const oldDayVal = oldMonth.list_day?.[day]?.value ?? 0;

    acc[spec] = {
      value: oldSpec.value + 1,
      list_month: {
        [month]: {
          value: oldMonth.value + 1,
          list_day: {
            [day]: { value: oldDayVal + 1 },
          },
        },
      },
    };
    return acc;
  }, {});

  // 3) Roda o UPSERT usando esse specMap
  await db.base.query(
    `
    UPSERT { _key: @year }
    INSERT {
      _key: @year,
      value: 1,
      list_month: {
        [@month]: {
          value: 1,
          list_day: { [@day]: { value: 1 } }
        }
      },
      list_specialties: @specMap
    }
    UPDATE {
      value: OLD.value + 1,
      list_month: MERGE(
        OLD.list_month,
        {
          [@month]: {
            value: (OLD.list_month[@month].value || 0) + 1,
            list_day: MERGE(
              OLD.list_month[@month].list_day,
              { [@day]: { value: (OLD.list_month[@month].list_day[@day].value || 0) + 1 } }
            )
          }
        }
      ),
      list_specialties: MERGE_RECURSIVE(OLD.list_specialties, @specMap)
    }
    IN CounterRequest
  `,
    { year, month, day, specMap }
  );
}

async function uploadRequestDocToBucket(file, inProcessKey, timestamp) {
  return new Promise((resolve, reject) => {
    const ext = file.originalname.split(".").pop();
    const safeTimestamp = timestamp.datetime
      .toISOString()
      .replace(/[:.]/g, "-");

    const filename = `requisicao/${inProcessKey}_${safeTimestamp}.${ext}`;

    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on("finish", () => {
      resolve({
        type: file.fieldname, // <-- tipo do documento
        filename, // <-- caminho salvo no bucket
      });
    });

    blobStream.on("error", reject);
    blobStream.end(file.buffer);
  });
}

router.put("/", async (req, res) => {
  try {
    const timestamp = req.body.timestamp;
    if (!timestamp || !timestamp.year || !timestamp.month) {
      return res.status(400).json({
        error:
          "Timestamp ausente ou incompleto. Deve ter { year, month, day, ... }",
      });
    }

    const inProcess_key = req.body._key;
    const rp = req.body.requestPhase || {};
    const user = req.body.userProperty || {};
    const observations = req.body.observations || "";
    const conduct = req.body.conduct || "";
    const personPayload = req.body.person || {};
    const priorityGroup = Array.isArray(req.body.priorityGroup)
      ? req.body.priorityGroup
      : [];

    const rawArr = Array.isArray(rp.medicalRequest) ? rp.medicalRequest : [];
    const parsedArr = rawArr.map((item) => {
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return item;
    });

    const newRequestPhase = {
      _key: inProcess_key,
      observations,
      conduct,
      person: personPayload,
      priorityGroup,
      medicalRequest: parsedArr,
      timestamp,
      user,
    };

    const cursor = await db.base.query(
      `FOR u IN ${collName} FILTER u._key == @key RETURN u`,
      { key: inProcess_key }
    );
    const existingDoc = await cursor.next();

    let savedDoc;
    if (existingDoc) {
      await db.base
        .collection(collName)
        .update(existingDoc._key, { requestPhase: newRequestPhase });
      savedDoc = existingDoc;
    } else {
      savedDoc = await db.base
        .collection(collName)
        .save({ _key: inProcess_key, requestPhase: newRequestPhase });
    }

    const specialties = parsedArr
      .map((item) => item.typeService?.name || item.typeService?._key)
      .filter(Boolean);

    incrementRequestCounter(timestamp, specialties).catch((err) =>
      console.error("Erro incrementando CounterRequest:", err)
    );

    return res.json({ _key: savedDoc._key });
  } catch (err) {
    console.error("Erro em PUT /requestPhase:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
});


router.get("/list/:user", async (req, res) => {
  try {
    // 1) Decodifica o user da URL
    const raw = req.params.user;
    let user;
    try {
      user = JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      return res
        .status(400)
        .json({ error: "Parâmetro user inválido. JSON mal formatado." });
    }

    // 2) Extrai unidade ativa só para saber quem está pedindo
    const activeUnit = user.activeSession?.attendanceUnit;
    if (!activeUnit || typeof activeUnit._key !== "string") {
      return res
        .status(400)
        .json({ error: "Unidade ativa inválida no usuário." });
    }
    const unitKey = activeUnit._key;
    const isMain = unitKey === "MAIN";

    // 3) Monta AQL
    let aql = `
      FOR u IN InProcess
        FILTER HAS(u, "requestPhase")
          AND (NOT HAS(u, "schedulingPhase") OR LENGTH(u.schedulingPhase) == 0)
    `;
    const bindVars = {};

    if (!isMain) {
      // → aqui o campo correto da criação do atendimento:
      aql += `
        AND u.receptionPhase.receptionist.activeSession.attendanceUnit._key == @unitKey
      `;
      bindVars.unitKey = unitKey;
    }

    aql += "\n    RETURN u";

    // 4) Executa e retorna
    const cursor = await db.base.query(aql, bindVars);
    const result = await cursor.all();
    return res.json({ result, currentUser: user });
  } catch (err) {
    console.error("❌ Erro em GET /requestPhase/list/:user:", err);
    return res.status(500).json({ error: "Erro interno." });
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
