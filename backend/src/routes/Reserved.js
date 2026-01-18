const router = require("express").Router();
const db = require("../config/database");

router.put("/", async (req, res) => {
  try {
    const { ids, serviceInfo, timestamp } = req.body;

    console.log("Received IDs:", ids);
    console.log("Received Service:", serviceInfo);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum item enviado." });
    }

    const docsToInsert = ids.map((item) => ({
      person: {
        _key: item.id,
        name: item.name,
      },
      serviceInfo: serviceInfo || null,
      timestamp,
      status: "RESERVADO",
    }));

    const query = `
      FOR doc IN @docs
        INSERT doc INTO Reserved
        RETURN NEW
    `;

    const cursor = await db.base.query(query, { docs: docsToInsert });
    const inserted = await cursor.all();

    res.status(200).json({
      success: true,
      insertedCount: inserted.length,
      inserted,
    });
  } catch (error) {
    console.error("Erro ao inserir documentos em Reserved:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/search", async (req, res) => {
  console.log("ENTROU NA ROTA /search");

  try {
    const { selected } = req.body;
    console.log("Selected:", selected);
    const filters = [`r.serviceInfo.serviceType._key == @serviceTypeKey`];
    const bindVars = {
      serviceTypeKey: selected.serviceType._key,
    };

    if (selected.unit?._key) {
      filters.push(`r.serviceInfo.unit._key == @unitKey`);
      bindVars.unitKey = selected.unit._key;
    }

    const query = `
      FOR r IN Reserved
        FILTER ${filters.join(" AND ")}
        RETURN r
    `;

    const cursor = await db.base.query({ query, bindVars });
    const results = await cursor.all();

    console.log("Resultados encontrados:", results);

    res.json(results);
  } catch (err) {
    console.error("Erro na rota /search:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/listReserved", async (req, res) => {
  console.log("ENTROU NA ROTA /listReserved");

  try {
    const { service, serviceType, specialist, unit } = req.body;

    // exige serviceType._key
    if (!serviceType?._key) {
      return res
        .status(400)
        .json({ error: "Parâmetro serviceType._key é obrigatório" });
    }

    const bind = {
      stKey: serviceType._key,
    };

    const cursor = await db.base.query(
      `
      FOR i IN InProcess
        FILTER @stKey IN i.requestPhase.medicalRequest[*].typeService._key

        /* procura um Reserved equivalente (mesma pessoa + mesmo serviceType) */
        LET reservedDoc = FIRST(
          FOR r IN Reserved
            FILTER r.person._key == i.person._key
              AND r.serviceInfo.serviceType._key == @stKey
            LIMIT 1
            RETURN r
        )

        FILTER reservedDoc == null

        RETURN i
      `,
      bind
    );

    const results = await cursor.all();

    res.json({
      count: results.length,
      reserved: results,
    });
  } catch (err) {
    console.error("Erro ao buscar reservados:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

module.exports = router;
