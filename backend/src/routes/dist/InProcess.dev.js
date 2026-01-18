"use strict";

var router = require('express').Router();

var db = require('../config/database');

router.get("/search/data", function _callee(req, res) {
  var cursor, results;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(db.base.query("\n      FOR s IN Service\n        LET types = (\n          FOR rel IN ServiceTypeToService\n            FILTER rel._from == s._id\n            FOR st IN ServiceType\n              FILTER st._id == rel._to\n\n              // 1) Colete todos os MRs deste service+type\n              LET allMRs = (\n                FOR ip IN InProcess\n                  FILTER ip.requestPhase != null\n                  LET medReqs = IS_ARRAY(ip.requestPhase.medicalRequest)\n                    ? ip.requestPhase.medicalRequest\n                    : []\n                  FOR mr IN medReqs\n                    FILTER mr.service == s.name\n                      AND mr.typeService._key == st._key\n\n                    LET psKey = FIRST(\n                      FOR ps IN PromiseService\n                        FILTER ps.service == mr.service\n                          AND ps.serviceType._key == mr.typeService._key\n                        RETURN ps._key\n                    )\n\n                    RETURN MERGE(mr, {\n                      psKey,\n                      personKey: ip.person._key\n                    })\n              )\n\n              // 2) Filtre somente os pendentes verdadeiros:\n              LET pendingMRs = (\n                FOR mr IN allMRs\n                  FILTER mr.status NOT IN [\"DESAGENDADO\", \"CANCELADO\"]\n\n                  // \u2192 agora comparo por serviceType, n\xE3o por psKey\n                  LET hasProcessed = LENGTH(\n                    FOR psi IN PromiseServiceItem\n                      FILTER psi.person._key == mr.personKey\n                        AND psi.serviceType._key == mr.typeService._key\n                        AND psi.status IN [\"PENDENTE\", \"DESAGENDADO\"]\n                      LIMIT 1\n                      RETURN 1\n                  ) > 0\n\n                  FILTER NOT hasProcessed\n\n                  LET person = DOCUMENT(CONCAT(\"Person/\", mr.personKey))\n\n                  RETURN MERGE(mr, {\n                    personName: person.name,\n                    personId: person.id,\n                    birthdate: person.birthdate\n                  })\n              )\n\n              // 3) Conte quantos MRs ficaram pendentes\n              LET countPending = LENGTH(pendingMRs)\n\n              // 4) Agregue detalhes desses pendentes\n              LET detailCounts = (\n                FOR mr IN pendingMRs\n                  FOR rd IN mr.requisitionDetail\n                    COLLECT name = rd.name WITH COUNT INTO count\n                    RETURN { name, count }\n              )\n\n              RETURN {\n                key:                st._key,\n                nome:               st.nome,\n                pendingCount:       countPending,\n                requisitionDetails: detailCounts,\n                pendingMRs          // \u2190 agora vem com dados da pessoa\n              }\n        )\n\n        LET totalPending = SUM(types[*].pendingCount)\n\n        RETURN {\n          key:          s._key,\n          name:         s.name,\n          pendingCount: totalPending,\n          types\n        }\n    "));

        case 3:
          cursor = _context.sent;
          _context.next = 6;
          return regeneratorRuntime.awrap(cursor.all());

        case 6:
          results = _context.sent;
          console.log("DEMANDAS", results);
          res.status(200).json(results);
          _context.next = 15;
          break;

        case 11:
          _context.prev = 11;
          _context.t0 = _context["catch"](0);
          console.error("Erro na /search/data:", _context.t0);
          res.status(500).json({
            error: "Erro ao carregar dados de InProcess"
          });

        case 15:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 11]]);
});
router.get("/:_key", function _callee2(req, res) {
  var _key, result;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _key = req.params._key;
          _context2.next = 3;
          return regeneratorRuntime.awrap(db.base.query("for r in InProcess filter r._key == @_key return r", {
            _key: _key
          }));

        case 3:
          result = _context2.sent;
          _context2.next = 6;
          return regeneratorRuntime.awrap(result.next());

        case 6:
          result = _context2.sent;
          res.send(result);

        case 8:
        case "end":
          return _context2.stop();
      }
    }
  });
});
module.exports = router;