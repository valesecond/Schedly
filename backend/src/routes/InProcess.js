const router = require('express').Router()
const db = require('../config/database')


router.get("/search/data", async (req, res) => {
  try {
    const cursor = await db.base.query(`
      FOR s IN Service
        LET types = (
          FOR rel IN ServiceTypeToService
            FILTER rel._from == s._id
            FOR st IN ServiceType
              FILTER st._id == rel._to

              // 1) Colete todos os MRs deste service+type
              LET allMRs = (
                FOR ip IN InProcess
                  FILTER ip.requestPhase != null
                  LET medReqs = IS_ARRAY(ip.requestPhase.medicalRequest)
                    ? ip.requestPhase.medicalRequest
                    : []
                  FOR mr IN medReqs
                    FILTER mr.service == s.name
                      AND mr.typeService._key == st._key

                    LET psKey = FIRST(
                      FOR ps IN PromiseService
                        FILTER ps.service == mr.service
                          AND ps.serviceType._key == mr.typeService._key
                        RETURN ps._key
                    )

                    RETURN MERGE(mr, {
                      psKey,
                      personKey: ip.person._key
                    })
              )

              // 2) Filtre somente os pendentes verdadeiros:
              LET pendingMRs = (
                FOR mr IN allMRs
                  FILTER mr.status NOT IN ["DESAGENDADO", "CANCELADO"]

                  LET hasProcessed = LENGTH(
                    FOR psi IN PromiseServiceItem
                      FILTER psi.person._key == mr.personKey
                        AND psi.serviceType._key == mr.typeService._key
                        AND psi.status IN ["PENDENTE", "DESAGENDADO"]
                      LIMIT 1
                      RETURN 1
                  ) > 0

                  FILTER NOT hasProcessed

                  LET person = DOCUMENT(CONCAT("Person/", mr.personKey))

                  RETURN MERGE(mr, {
                    personName: person.name,
                    personId: person.id,
                    birthdate: person.birthdate
                  })
              )

              // 3) Conte quantos MRs ficaram pendentes
              LET countPending = LENGTH(pendingMRs)

              // 4) Agregue detalhes desses pendentes
              LET detailCounts = (
                FOR mr IN pendingMRs
                  FOR rd IN mr.requisitionDetail
                    COLLECT name = rd.name WITH COUNT INTO count
                    RETURN { name, count }
              )

              RETURN {
                key:                st._key,
                nome:               st.nome,
                pendingCount:       countPending,
                requisitionDetails: detailCounts,
                pendingMRs
              }
        )

        LET totalPending = SUM(types[*].pendingCount)

        RETURN {
          key:          s._key,
          name:         s.name,
          pendingCount: totalPending,
          types
        }
    `);

 const results = await cursor.all();

// Log completo com profundidade ilimitada
console.dir(results, { depth: null });

// Log só dos nomes dos pendentes (como antes)
console.log("🧾 Lista de pessoas com MR pendente:");
results.forEach(service => {
  service.types.forEach(type => {
    type.pendingMRs?.forEach(mr => {
      console.log(`- ${mr.personName} (ID: ${mr.personId})`);
    });
  });
});

    res.status(200).json(results);

  } catch (err) {
    console.error("Erro na /search/data:", err);
    res.status(500).json({ error: "Erro ao carregar dados de InProcess" });
  }
});



router.get("/:_key", async (req, res) => {

    const {_key} = req.params

    let result = await db.base.query(`for r in InProcess filter r._key == @_key return r`,{_key})

    result = await result.next();

    res.send(result)
})

module.exports = router