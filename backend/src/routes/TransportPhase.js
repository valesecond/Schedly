const router = require("express").Router();
const db = require("../config/database");

router.get("/list/:user", async (req, res) => {
  try {
    const raw = req.params.user;

    let user;
    try {
      user = JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      return res
        .status(400)
        .json({ error: "Parâmetro user inválido. JSON mal formatado." });
    }

    const activeUnit = user.activeSession?.attendanceUnit;
    if (!activeUnit || typeof activeUnit._key !== "string") {
      return res
        .status(400)
        .json({ error: "Unidade ativa inválida no usuário." });
    }

    const unitKey = activeUnit._key;
    const isMain = unitKey === "MAIN";

    const bindVars = {};
    let aql = `
      FOR u IN InProcess
        FILTER HAS(u, "schedulingPhase")
          AND LENGTH(u.schedulingPhase) > 0
    `;

    if (isMain) {
      // MAIN: pega todos os pendentes de qualquer unidade
      aql += `
        LET pendingItems = (
          FOR s IN u.schedulingPhase
            FILTER s.status == "PENDENTE"
            RETURN s
        )
        FILTER LENGTH(pendingItems) > 0
        RETURN MERGE(u, { schedulingPhase: pendingItems })
      `;
    } else {
      // Unidade normal: só pendentes da unidade do usuário
      aql += `
        LET pendingItems = (
          FOR s IN u.schedulingPhase
            FILTER s.status == "PENDENTE"
              AND HAS(s, "attendanceUnit")
              AND s.attendanceUnit._key == @unitKey
            RETURN s
        )
        FILTER LENGTH(pendingItems) > 0
        RETURN MERGE(u, { schedulingPhase: pendingItems })
      `;
      bindVars.unitKey = unitKey;
    }

    const cursor = await db.base.query(aql, bindVars);
    const result = await cursor.all();

    return res.json({ result, currentUser: user });
  } catch (err) {
    console.error("❌ Erro em GET /requestPhase/list/:user:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/:_key", async (req, res) => {
  try {
    const { _key } = req.params;

    const cursor = await db.base.query(
      `FOR u IN InProcess FILTER u._key == @_key LIMIT 1 RETURN u`,
      { _key },
    );

    const inProcess = await cursor.next();

    if (!inProcess) {
      return res.status(404).send({ error: "InProcess não encontrado." });
    }

    const personKey = inProcess.person?._key;

    if (!personKey) {
      return res
        .status(400)
        .send({ error: "InProcess não possui person._key." });
    }

    const cursorPerson = await db.base.query(
      `FOR p IN Person FILTER p._key == @person_key LIMIT 1 RETURN p`,
      { person_key: personKey },
    );

    const person = await cursorPerson.next();

    if (!person) {
      return res
        .status(404)
        .send({ error: "Person não encontrada para este InProcess." });
    }

    inProcess.person = person;
    return res.send(inProcess);
  } catch (err) {
    console.error("GET /transportPhase/:_key error:", err);
    return res.status(500).send({ error: "Erro interno." });
  }
});

router.put("/createTravel", async (req, res) => {
  const payload = req.body || {};

  const unit = payload.unit || null;
  const userProperty = payload.userProperty || null;

  const name = (payload.name || "").trim();
  const driver = (payload.driver || "").trim();
  const destination = (payload.destination || "").trim();
  const tripDate = (payload.tripDate || "").trim(); // yyyy-mm-dd
  const vehicle = (payload.vehicle || "").trim();
  const status = (payload.status || "PENDENTE").trim(); // PENDENTE / REALIZADA...
  const mainService = (payload.mainService || "Serviço").trim();

  const persons = Array.isArray(payload.persons) ? payload.persons : [];

  // -----------------------------
  // validações mínimas
  // -----------------------------
  if (!unit?._key) {
    return res.status(400).json({ error: "É necessário informar unit._key" });
  }
  if (!userProperty) {
    return res
      .status(400)
      .json({ error: "Usuário (userProperty) não fornecido." });
  }
  if (!name) return res.status(400).json({ error: "Informe name." });
  if (!driver) return res.status(400).json({ error: "Informe driver." });
  if (!vehicle) return res.status(400).json({ error: "Informe vehicle." });

  // persons precisa ter inProcessKey
  const validPersons = persons
    .map((p) => ({
      inProcessKey: p?.inProcessKey || null,
      personKey: p?.personKey || null,
      personName: p?.personName || null,
      start: p?.start || null,
      serviceType: p?.serviceType || null,
      promiseService: p?.promiseService || null,
    }))
    .filter((p) => p.inProcessKey && p.personKey);

  if (validPersons.length === 0) {
    return res.status(400).json({
      error: "persons vazio ou sem inProcessKey/personKey.",
    });
  }

  try {
    const now = Date.now();

    // -----------------------------
    // 1) cria doc em Travel
    // -----------------------------
    const travelDoc = {
      unit: { _key: unit._key, name: unit.name || "" },

      name,
      driver,
      destination,
      tripDate,
      vehicle,

      status,
      mainService,

      persons: validPersons,

      userProperty,

      createdAt: now,
      updatedAt: now,
    };

    const travelInsert = await db.base.query({
      query: `
        INSERT @travel INTO Travel
        RETURN NEW
      `,
      bindVars: { travel: travelDoc },
    });

    const travel = await travelInsert.next();
    if (!travel?._key) {
      return res
        .status(500)
        .json({ error: "Falha ao criar Travel (sem _key)." });
    }

    // -----------------------------
    // 2) atualiza cada InProcess: cria/atualiza transportPhase dentro do doc
    // -----------------------------
    const inProcessKeys = validPersons.map((p) => p.inProcessKey);

    // objeto que vai dentro do InProcess
    const transportPhasePatch = {
      transportPhase: {
        // referência da viagem
        travel: { _key: travel._key, _id: travel._id },

        unit: { _key: unit._key, name: unit.name || "" },

        // dados do transporte
        name,
        driver,
        destination,
        tripDate,
        vehicle,
        status,
        mainService,

        // pessoas envolvidas
        persons: validPersons,

        // auditoria
        userProperty,
        timestamp: now,
      },
    };

    await db.base.query({
      query: `
        FOR k IN @keys
          LET ip = DOCUMENT("InProcess", k)
          FILTER ip != null

          UPDATE k WITH MERGE(
            @patch,
            {
              transportPhaseHistory: PUSH(
                ip.transportPhaseHistory || [],
                MERGE(@patch.transportPhase, { createdAt: @now })
              )
            }
          ) IN InProcess
      `,
      bindVars: {
        keys: inProcessKeys,
        patch: transportPhasePatch,
        now,
      },
    });

    // -----------------------------
    // 3) marca PromiseServiceItem como EM_TRANSPORTE
    // (pra pessoa sumir do /service/promise/by-unit que filtra PENDENTE)
    // -----------------------------
    try {
      const unitKey = unit._key;

      await db.base.query({
        query: `
          FOR p IN @persons
            FOR psi IN PromiseServiceItem
              FILTER psi.attendanceUnit != null
                AND psi.attendanceUnit._key == @unitKey
                AND psi.person != null
                AND psi.person._key == p.personKey
                AND psi.status == "PENDENTE"

              UPDATE psi WITH MERGE(psi, {
                status: "EM_TRANSPORTE",
                transportInfo: {
                  travelKey: @travelKey,
                  timestamp: @now
                }
              }) IN PromiseServiceItem
        `,
        bindVars: {
          persons: validPersons,
          unitKey,
          travelKey: travel._key,
          now,
        },
      });
    } catch (e) {
      console.error("⚠️ Falha ao marcar PromiseServiceItem EM_TRANSPORTE:", e);
      // não bloqueia criação
    }

    return res.json({
      ok: true,
      travel,
      updatedInProcessKeys: inProcessKeys,
    });
  } catch (err) {
    console.error("❌ Erro /createTravel:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.put("/list", async (req, res) => {
  const body = req.body || {};
  const unitKey = (body.unitKey || "").trim(); // ex: "CLINCORDIS"
  const tripDate = (body.tripDate || "").trim(); // "2026-01-30"
  const serviceKey = (body.serviceKey || "").trim(); // "consulta_cardiologista" ou vazio
  const status = (body.status || "PENDENTE").trim(); // default PENDENTE

  try {
    const cursor = await db.base.query({
      query: `
        FOR t IN Travel
          FILTER @status == "" OR t.status == @status

          FILTER @unitKey == "" OR t.unit._key == @unitKey
          FILTER @tripDate == "" OR t.tripDate == @tripDate

          FILTER @serviceKey == "" OR LENGTH(
            FOR p IN (t.persons || [])
              FILTER p.serviceType != null
                AND p.serviceType._key == @serviceKey
              LIMIT 1
              RETURN 1
          ) > 0

          SORT t.createdAt DESC
          RETURN t
      `,
      bindVars: { unitKey, tripDate, serviceKey, status },
    });

    const travels = await cursor.all();
    return res.json({ ok: true, travels });
  } catch (err) {
    console.error("❌ Erro /travel/list:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.put("/markDone", async (req, res) => {
  const { travelKey, userProperty } = req.body || {};
  if (!travelKey)
    return res.status(400).json({ error: "travelKey é obrigatório" });

  try {
    const now = Date.now();

    // atualiza Travel
    const cur = await db.base.query({
      query: `
        UPDATE @key WITH {
          status: "REALIZADA",
          updatedAt: @now
        } IN Travel
        RETURN NEW
      `,
      bindVars: { key: travelKey, now },
    });
    const travel = await cur.next();

    // opcional: refletir nos InProcess (transportPhase.status)
    const keys = (travel?.persons || [])
      .map((p) => p?.inProcessKey)
      .filter(Boolean);

    if (keys.length) {
      await db.base.query({
        query: `
          FOR k IN @keys
            LET ip = DOCUMENT("InProcess", k)
            FILTER ip != null
            UPDATE k WITH {
              transportPhase: MERGE(ip.transportPhase || {}, {
                status: "REALIZADA",
                updatedAt: @now,
                updatedBy: @userProperty
              })
            } IN InProcess
        `,
        bindVars: { keys, now, userProperty: userProperty || null },
      });
    }

    return res.json({ ok: true, travel });
  } catch (err) {
    console.error("❌ Erro /travel/mark-done:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.put("/cancel", async (req, res) => {
  const { travelKey, reason, userProperty } = req.body || {};
  if (!travelKey)
    return res.status(400).json({ error: "travelKey é obrigatório" });

  try {
    const now = Date.now();

    const cur = await db.base.query({
      query: `
        UPDATE @key WITH {
          status: "CANCELADA",
          cancelReason: @reason,
          canceledAt: @now,
          canceledBy: @userProperty,
          updatedAt: @now
        } IN Travel
        RETURN NEW
      `,
      bindVars: {
        key: travelKey,
        reason: reason || "",
        now,
        userProperty: userProperty || null,
      },
    });
    const travel = await cur.next();

    // opcional: refletir nos InProcess
    const keys = (travel?.persons || [])
      .map((p) => p?.inProcessKey)
      .filter(Boolean);

    if (keys.length) {
      await db.base.query({
        query: `
          FOR k IN @keys
            LET ip = DOCUMENT("InProcess", k)
            FILTER ip != null
            UPDATE k WITH {
              transportPhase: MERGE(ip.transportPhase || {}, {
                status: "CANCELADA",
                cancelReason: @reason,
                canceledAt: @now,
                updatedAt: @now,
                updatedBy: @userProperty
              })
            } IN InProcess
        `,
        bindVars: {
          keys,
          now,
          reason: reason || "",
          userProperty: userProperty || null,
        },
      });
    }

    return res.json({ ok: true, travel });
  } catch (err) {
    console.error("❌ Erro /travel/cancel:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.put("/update", async (req, res) => {
  const { travelKey, patch, userProperty } = req.body;

  if (!travelKey)
    return res.status(400).json({ error: "travelKey é obrigatório." });
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "patch inválido." });
  }

  try {
    const travelId = `Travel/${travelKey}`;

    const updatedAt = Date.now();

    const updatePatch = {
      ...patch,
      updatedAt,
      updatedBy: userProperty || null,
    };

    const cursor = await db.base.query({
      query: `
        UPDATE @travelId WITH @patch IN Travel
        RETURN NEW
      `,
      bindVars: { travelId, patch: updatePatch },
    });

    const updated = (await cursor.all())[0];
    if (!updated?._key)
      return res.status(404).json({ error: "Viagem não encontrada." });

    // (Opcional, recomendado) refletir alterações em InProcess.transportPhase
    // para todas as pessoas desta viagem, se você usa transportPhase como "espelho":
    // Aqui vai depender se no InProcess você identifica a viagem por travel._key.
    // Dá pra atualizar onde ip.transportPhase.travel._key == travelKey

    return res.json({ ok: true, travel: updated });
  } catch (err) {
    console.error("❌ Erro update travel:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/by-unit/:unitKey", async (req, res) => {
  const { unitKey } = req.params;

  if (!unitKey) {
    return res.status(400).json({ error: "unitKey não informado." });
  }

  try {
    const cursor = await db.base.query({
      query: `
        FOR t IN Travel
          FILTER t.unit != null
            AND t.unit._key == @unitKey
            // Se quiser esconder canceladas:
            // AND t.status != "CANCELADA"
          SORT t.createdAt DESC
          RETURN t
      `,
      bindVars: { unitKey },
    });

    const travels = await cursor.all();
    return res.json({ travels });
  } catch (err) {
    console.error("❌ Erro list travel by unit:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
