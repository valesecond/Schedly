const router = require('express').Router()
const db = require('../config/database')

router.put("/search", async (req, res) => {
  const { serviceType_key, unit_key } = req.body;

  console.log(
    "Buscando Especialistas para ServiceType:",
    serviceType_key,
    "e Unit:",
    unit_key
  );

  const cursor = await db.base.query(`
    FOR edgeUnit IN SpecialistToUnit
      FILTER edgeUnit._to == CONCAT("AttendanceUnit/", @unit_key)
        AND edgeUnit.relacao == "pertence_unidade"

      FOR edgeService IN SpecialistToServiceType
        FILTER edgeService._from == edgeUnit._from
          AND edgeService._to == CONCAT("ServiceType/", @serviceType_key)
          AND edgeService.relacao == "atende_servico"

      FOR specialist IN Specialist
        FILTER specialist._id == edgeUnit._from
        RETURN specialist
  `, {
    serviceType_key,
    unit_key
  });

  const result = await cursor.all();

  res.status(200).send(result);
});


module.exports = router