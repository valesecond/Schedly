const router = require("express").Router();
const db = require("../config/database")


router.put("/search", async (req, res) => {
  try {
    const { name, typeService_key } = req.body;

    // Se não enviou name ou name está vazio, retorna array vazio
    if (!name || !name.trim()) {
      return res.status(200).send([]);
    }

    // Monta o _to completo do ServiceType
    const serviceTypeId = `ServiceType/${typeService_key}`;

    // AQL para buscar os RequisitionDetail vinculados e filtrar pelo nome
    const cursor = await db.base.query(
      `
      FOR edge IN RequisitionDetailToServiceType
        FILTER edge._to == @serviceTypeId

        // Traz o documento em RequisitionDetail
        FOR rd IN RequisitionDetail
          FILTER rd._id == edge._from
          // Filtra pelo name parcial (case-insensitive)
          FILTER STARTS_WITH(LOWER(rd.name), LOWER(@name))
          SORT rd.name
          LIMIT 6
          RETURN { 
            _key: rd._key, 
            name: rd.name 
          }
      `,
      {
        serviceTypeId,
        name: name.trim()
      }
    );

    const results = await cursor.all();
    return res.status(200).send(results);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ error: "Ocorreu um erro ao buscar RequisitionDetails." });
  }
});




module.exports = router;