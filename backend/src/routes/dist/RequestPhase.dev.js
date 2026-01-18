"use strict";

var router = require("express").Router();

var db = require("../config/database");

var collName = "InProcess";
router.put("/", function _callee(req, res) {
  var inProcess_key, observations, person, priorityGroup, timestamp, user, rawArr, parsedArr, newRequestPhase, cursor, existingDoc, resultCursor, result;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          inProcess_key = req.body._key;
          console.log("Dados recebidos:", req.body);
          observations = req.body.observations || "";
          person = req.body.person || {};
          priorityGroup = Array.isArray(req.body.priorityGroup) ? req.body.priorityGroup : [];
          timestamp = req.body.timestamp || {};
          user = req.body.user || {};
          rawArr = [];

          if (req.body.requestPhase && Array.isArray(req.body.requestPhase.medicalRequest)) {
            rawArr = req.body.requestPhase.medicalRequest;
          }

          parsedArr = rawArr.map(function (item) {
            if (typeof item === "string") {
              try {
                return JSON.parse(item);
              } catch (_unused) {
                return item;
              }
            }

            return item;
          });
          newRequestPhase = {
            _key: inProcess_key,
            observations: observations,
            person: person,
            priorityGroup: priorityGroup,
            medicalRequest: parsedArr,
            timestamp: timestamp,
            user: user
          };
          _context.next = 13;
          return regeneratorRuntime.awrap(db.base.query("FOR u IN InProcess FILTER u._key == @key RETURN u", {
            key: inProcess_key
          }));

        case 13:
          cursor = _context.sent;
          _context.next = 16;
          return regeneratorRuntime.awrap(cursor.next());

        case 16:
          existingDoc = _context.sent;

          if (!existingDoc) {
            _context.next = 22;
            break;
          }

          _context.next = 20;
          return regeneratorRuntime.awrap(db.base.collection(collName).update(existingDoc._key, {
            requestPhase: newRequestPhase
          }));

        case 20:
          _context.next = 24;
          break;

        case 22:
          _context.next = 24;
          return regeneratorRuntime.awrap(db.base.collection(collName).save({
            _key: inProcess_key,
            requestPhase: newRequestPhase
          }));

        case 24:
          _context.next = 26;
          return regeneratorRuntime.awrap(db.base.query("FOR u IN InProcess FILTER u._key == @key RETURN u", {
            key: inProcess_key
          }));

        case 26:
          resultCursor = _context.sent;
          _context.next = 29;
          return regeneratorRuntime.awrap(resultCursor.next());

        case 29:
          result = _context.sent;
          res.send(result);

        case 31:
        case "end":
          return _context.stop();
      }
    }
  });
});
router.get("/list/:user", function _callee2(req, res) {
  var raw, user, currentUnit, unitKey, roles, MAIN_KEY, isMain, aql, bindVars, cursor, result;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          // 1) Captura do user via parâmetro de rota (URL-encoded JSON)
          raw = req.params.user;
          _context2.prev = 2;
          // decodifica e faz o parse do JSON
          user = JSON.parse(decodeURIComponent(raw));
          _context2.next = 10;
          break;

        case 6:
          _context2.prev = 6;
          _context2.t0 = _context2["catch"](2);
          console.error("❌ Falha ao parsear user do parâmetro:", raw, _context2.t0);
          return _context2.abrupt("return", res.status(400).json({
            error: "Parâmetro user inválido. Envie JSON URL-encoded."
          }));

        case 10:
          console.log("🔍 [DEBUG] Usuário recebido via params:", user); // 3) Extrai a unidade ativa

          currentUnit = user.activeSession.attendanceUnit;

          if (!(!currentUnit || typeof currentUnit._key !== "string")) {
            _context2.next = 14;
            break;
          }

          return _context2.abrupt("return", res.status(400).json({
            error: "Unidade de atendimento ativa inválida ou não definida."
          }));

        case 14:
          unitKey = currentUnit._key;
          console.log("\uD83D\uDD0D [DEBUG] Unidade ativa (unitKey):", unitKey); // 4) Normaliza papéis

          roles = Array.isArray(currentUnit.list_role) ? currentUnit.list_role.map(function (r) {
            return String(r).trim().toLowerCase();
          }) : [];
          console.log("🔍 [DEBUG] Papéis:", roles); // 5) Decide se é MAIN

          MAIN_KEY = "MAIN";
          isMain = unitKey === MAIN_KEY;
          console.log("🔍 [DEBUG] isMain?", isMain); // 6) Monta a AQL base

          aql = "\n      FOR u IN InProcess\n        FILTER HAS(u, \"requestPhase\")\n          AND ( NOT HAS(u, \"schedulingPhase\") OR LENGTH(u.schedulingPhase) == 0 )\n    ";
          bindVars = {}; // 7) Aplica filtro de unidade sempre que não for MAIN

          if (!isMain) {
            console.log("🔐 [DEBUG] Aplicando filtro de unidade (não-MAIN).");
            aql += "\n        AND u.requestPhase.attendanceUnitKey == @unitKey\n      ";
            bindVars.unitKey = unitKey;
          } else {
            console.log("✅ [DEBUG] Unidade MAIN: verá tudo.");
          }

          aql += "\n    RETURN u";
          console.log("🔍 [DEBUG] AQL final:\n", aql.trim(), "\n🔍 bindVars:", bindVars); // 8) Executa a consulta

          _context2.next = 28;
          return regeneratorRuntime.awrap(db.base.query(aql, bindVars));

        case 28:
          cursor = _context2.sent;
          _context2.next = 31;
          return regeneratorRuntime.awrap(cursor.all());

        case 31:
          result = _context2.sent;
          return _context2.abrupt("return", res.json({
            result: result,
            currentUser: user
          }));

        case 35:
          _context2.prev = 35;
          _context2.t1 = _context2["catch"](0);
          console.error("❌ Erro em GET /requestPhase/:user:", _context2.t1);
          return _context2.abrupt("return", res.status(500).json({
            error: "Erro interno ao buscar requisições."
          }));

        case 39:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 35], [2, 6]]);
});
router.get("/:_key", function _callee3(req, res) {
  var _key, inProcess, person;

  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _key = req.params._key;
          _context3.next = 3;
          return regeneratorRuntime.awrap(db.base.query("for u in InProcess filter u._key == @_key return u", {
            _key: _key
          }));

        case 3:
          inProcess = _context3.sent;
          _context3.next = 6;
          return regeneratorRuntime.awrap(inProcess.next());

        case 6:
          inProcess = _context3.sent;
          _context3.next = 9;
          return regeneratorRuntime.awrap(db.base.query("for p in Person filter p._key == @person_key return p", {
            person_key: inProcess.person._key
          }));

        case 9:
          person = _context3.sent;
          _context3.next = 12;
          return regeneratorRuntime.awrap(person.next());

        case 12:
          person = _context3.sent;
          inProcess.person = person;
          res.send(inProcess);

        case 15:
        case "end":
          return _context3.stop();
      }
    }
  });
});
module.exports = router;