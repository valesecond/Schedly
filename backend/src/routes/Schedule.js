const router = require("express").Router();
const db = require("../config/database");

// Desserializa JSON em string
const tryParse = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

router.post("/", async (req, res) => {
  try {
    // 1) Extrai e desserializa
    let {
      attendanceUnit,
      serviceType,
      scheduledDays,
      limits,
      limit,
      specialist,
      observations,
      service,
      user,
      timestamp,
    } = req.body;

    attendanceUnit = tryParse(attendanceUnit);
    serviceType = tryParse(serviceType);
    specialist = tryParse(specialist);

    console.log("specialist:", specialist);

    // 2) Garante array de datas
    let days = Array.isArray(scheduledDays)
      ? scheduledDays
      : tryParse(scheduledDays);
    if (!Array.isArray(days)) {
      return res
        .status(400)
        .json({ success: false, error: "scheduledDays deve ser um array" });
    }

    // 3) Prepara limites
    let limitsArray;
    if (Array.isArray(limits)) {
      limitsArray = limits.map((n) => Number(n));
    } else {
      const single = limit != null ? Number(limit) : 0;
      limitsArray = days.map(() => single);
    }

    const scheduledDaysWithLimits = days.map((d, idx) => {
      const dateObj =
        typeof d === "object" && d.date && d.period
          ? d
          : { date: d.date ?? d, period: d.period ?? "manha" };

      return {
        date: dateObj,
        vacancyLimit: limitsArray[idx] ?? 0,
      };
    });

    // 4) Monta o documento
    const doc = {
      attendanceUnit,
      serviceType,
      scheduledDays: scheduledDaysWithLimits,
      specialist,
      observations: observations ?? "",
      service: service ?? "",
      user,
      timestamp,
    };

    // 5) Cria _key único, mesmo padrão de leitura
    const specialistKey = Array.isArray(specialist)
      ? specialist[0]._key
      : specialist._key;

    const uniqueKey = [
      attendanceUnit._key,
      serviceType._key,
      specialistKey,
    ].join("_");

    doc._key = uniqueKey;
    console.log("uniqueKey gerada:", uniqueKey);

    // 6) Executa UPSERT só pela chave
    const cursor = await db.base.query(
      `
      UPSERT { _key: @uniqueKey }
        INSERT @doc
        UPDATE @doc
      IN PromiseService
      RETURN NEW
      `,
      { uniqueKey, doc }
    );

    const saved = await cursor.next();
    return res.status(200).json({ success: true, data: saved });
  } catch (err) {
    console.error(
      "Erro ao gravar/atualizar em PromiseService via AQL:",
      err.stack || err
    );
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

router.put("/search", async (req, res) => {
  try {
    const { specialistKey, serviceTypeKey, attendanceUnitKey } = req.body;

    console.log("📥 Requisição recebida com dados:");
    console.log("  ➤ specialistKey:", specialistKey);
    console.log("  ➤ serviceTypeKey:", serviceTypeKey);
    console.log("  ➤ attendanceUnitKey:", attendanceUnitKey);

    if (!specialistKey || !serviceTypeKey || !attendanceUnitKey) {
      return res.status(400).json({
        success: false,
        error:
          "attendanceUnitKey, specialistKey e serviceTypeKey são obrigatórios",
      });
    }

    const uniqueKeyPrefix = `${attendanceUnitKey}_${serviceTypeKey}_`;

    const query = `
  FOR ps IN PromiseService
    FILTER STARTS_WITH(ps._key, @uniqueKeyPrefix)
    RETURN {
      scheduledDays: ps.scheduledDays,
      observations: ps.observations
    }
`;

    const cursor = await db.base.query(query, { uniqueKeyPrefix });
    const data = await cursor.next();

    if (!data) {
      console.warn("⚠️ Nenhuma agenda encontrada com a chave:", uniqueKey);

      // Diagnóstico extra: lista todas as chaves existentes no banco
      const allKeysCursor = await db.base.query(`
        FOR ps IN PromiseService
          RETURN ps._key
      `);
      const allKeys = await allKeysCursor.all();
      console.log("📋 Todas as chaves existentes:", allKeys);
    } else {
      console.log("✅ Agenda encontrada:", data);
    }

    return res.json({ success: true, data: data ?? null });
  } catch (err) {
    console.error("❌ Erro em PUT /schedule/search:", err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

router.put("/promiseService", async (req, res) => {
  try {
    const { attendanceUnitKey, serviceTypeKey, specialistKey, service } =
      req.body;

    // Validação dos parâmetros
    if (!attendanceUnitKey || !serviceTypeKey || !specialistKey || !service) {
      return res.status(400).json({
        success: false,
        error:
          "attendanceUnitKey, serviceTypeKey, specialistKey e service são obrigatórios",
      });
    }

    const uniqueKey = `${attendanceUnitKey}_${serviceTypeKey}_${specialistKey}`;

    const cursor = await db.base.query(
      `
      FOR ps IN PromiseService
        FILTER ps._key == @uniqueKey
          AND ps.service == @service
        RETURN {
          attendanceUnit: ps.attendanceUnit,
          serviceType:    ps.serviceType,
          specialist:     ps.specialist,
          service:        ps.service,
          observations:   ps.observations,
          scheduledDays:  ps.scheduledDays,
          user:           ps.user,
          timestamp:      ps.timestamp
        }
      `,
      { uniqueKey, service }
    );

    const doc = await cursor.next();

    if (!doc) {
      // Retorna sucesso mesmo sem dados
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (err) {
    console.error("Erro em PUT /schedule/promiseService:", err);
    return res.status(500).json({
      success: false,
      error: err.message || err,
    });
  }
});

module.exports = router;
