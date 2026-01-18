const router = require("express").Router();
const db = require("../config/database");

const collName = "Service";

router.post("/", async (req, res) => {
  const data = req.body;

  let result = await db.base.collection(collName).save(data);

  const _key = result._key;

  result = await db.base.query(
    `for p in ${collName} filter p._key == @_key return p`,
    { _key }
  );

  result = await result.next();

  res.send(result);
});

router.get("/search", async (req, res) => {
  const serviceCollection = db.base.collection("Service");

  const query = `
    FOR doc IN ${serviceCollection.name}
      SORT doc.name ASC
      RETURN doc
  `;
  const cursor = await db.base.query(query);
  const services = await cursor.all();

  res.json(services);
});

router.get("/:serviceKey/types", async (req, res) => {
  try {
    const serviceKey = req.params.serviceKey;
    const serviceId = `Service/${serviceKey}`;

    const aql = `
      FOR rel IN ServiceTypeToService
        FILTER rel._from == @serviceId
        LET tipo = DOCUMENT(rel._to)
        SORT tipo.nome ASC
        RETURN {
          tipoKey: tipo._key,
          nome: tipo.nome,
          relacao: rel.relacao 
        }
    `;
    const cursor = await db.base.query(aql, { serviceId });
    const tipos = await cursor.all();
    res.json(tipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar tipos de serviço." });
  }
});

router.put("/promise", async (req, res) => {
  const { unit, service, serviceType, specialist, userProperty } = req.body;

  console.log("🚀 Rota /promise chamada");
  console.log("📦 Dados recebidos:", JSON.stringify(req.body, null, 2));

  // Validação
  if (!unit?._key || !service || !serviceType?._key || !specialist?._key) {
    if (!unit?._key) console.error("❌ Falta unit._key");
    if (!service) console.error("❌ Falta service");
    if (!serviceType?._key) console.error("❌ Falta serviceType._key");
    if (!specialist?._key) console.error("❌ Falta specialist._key");

    return res.status(400).json({
      error:
        "É necessário informar unit._key, service, serviceType._key e specialist._key",
    });
  }

  if (!userProperty) {
    return res
      .status(400)
      .json({ error: "Usuário (userProperty) não fornecido." });
  }

  try {
    // Variáveis de bind
    const unitKey = unit._key;
    const typeKey = serviceType._key;
    const serviceName = typeof service === "string" ? service : service.name;
    const specialistKey = specialist._key;

    const userUnitKey = userProperty?.activeSession?.attendanceUnit?._key || "";
    const isMain = userUnitKey === "MAIN";

    console.log("🔑 Variáveis bind:", {
      unitKey,
      typeKey,
      serviceName,
      specialistKey,
      userUnitKey,
      isMain,
    });

    // 1) Consulta PromiseService
    const promiseQuery = `
      FOR p IN PromiseService
        FILTER p.attendanceUnit._key == @unitKey
          AND p.serviceType._key == @typeKey
          AND p.service == @service
          AND @specialistKey IN p.specialist[*]._key
        RETURN p
    `;
    const promiseCursor = await db.base.query({
      query: promiseQuery,
      bindVars: { unitKey, typeKey, service: serviceName, specialistKey },
    });
    const promiseServices = await promiseCursor.all();
    console.log(`✅ PromiseServices encontrados: ${promiseServices.length}`);

    const inProcessQuery = `
      FOR ip IN InProcess
        FILTER HAS(ip, "requestPhase")
        ${
          !isMain
            ? "AND ip.requestPhase.user.activeSession.attendanceUnit._key == @userUnitKey"
            : ""
        }
        LET medReqs = IS_ARRAY(ip.requestPhase.medicalRequest)
          ? ip.requestPhase.medicalRequest
          : []
        FOR mr IN medReqs
          FILTER mr.service == @service
            AND mr.typeService._key == @typeKey
            AND mr.status NOT IN ["PENDENTE", "DESAGENDADO"]
          LET hasProcessed = LENGTH(
            FOR psi IN PromiseServiceItem
              FILTER psi.person._key      == ip.person._key
                AND psi.serviceType._key == mr.typeService._key
                AND psi.status IN ["PENDENTE", "DESAGENDADO"]
              LIMIT 1 RETURN 1
          ) > 0
          FILTER NOT hasProcessed
          RETURN {
            person: ip.person,
            requestPhaseKey: ip.requestPhase._key,
            requestPhase: ip.requestPhase,
            medicalRequest: mr,
            promiseServiceKey: FIRST(
              FOR ps IN PromiseService
                FILTER ps.service               == mr.service
                  AND ps.serviceType._key       == mr.typeService._key
                  AND @specialistKey IN ps.specialist[*]._key
                RETURN ps._key
            )
          }
    `;

    const inProcessCursor = await db.base.query({
      query: inProcessQuery,
      bindVars: {
        service: serviceName,
        typeKey,
        specialistKey,
        ...(isMain ? {} : { userUnitKey }),
      },
    });

    const pendingItems = await inProcessCursor.all();
    console.log(`✅ Itens pendentes encontrados: ${pendingItems.length}`);

    // 3) Ordenação
    const conductOrder = ["emergency", "urgency", "elective"];
    const priorityOrder = [
      "disabilities",
      "superelderly",
      "elderly",
      "pregnant",
    ];

    function getPriorityIndex(groups = []) {
      if (!Array.isArray(groups) || groups.length === 0) {
        return priorityOrder.length;
      }
      const indices = groups
        .map((g) => priorityOrder.indexOf(g))
        .filter((i) => i >= 0);
      return indices.length > 0 ? Math.min(...indices) : priorityOrder.length;
    }

    pendingItems.sort((a, b) => {
      const idxA = conductOrder.indexOf(a.requestPhase.conduct || "elective");
      const idxB = conductOrder.indexOf(b.requestPhase.conduct || "elective");
      if (idxA !== idxB) return idxA - idxB;

      const pA = getPriorityIndex(a.requestPhase.priorityGroup);
      const pB = getPriorityIndex(b.requestPhase.priorityGroup);
      return pA - pB;
    });

    console.log(
      "📋 Ordenados:",
      pendingItems.map((p) => ({
        conduct: p.requestPhase.conduct,
        priorityGroup: p.requestPhase.priorityGroup,
      }))
    );

    // 0) Buscar todos os Reserved relevantes
    const reservedQuery = `
  FOR r IN Reserved
    FILTER r.serviceInfo.serviceType._key == @typeKey
    RETURN r.person._key
`;

    const reservedCursor = await db.base.query({
      query: reservedQuery,
      bindVars: { typeKey },
    });
    const reservedKeys = new Set(await reservedCursor.all());
    console.log("🔒 Pessoas já reservadas:", reservedKeys);

    // 1) Ao processar o pendingItems, sinaliza se já está reservado
    const flaggedItems = pendingItems.map((item) => {
      const personKey = item.person._key;
      return {
        ...item,
        isReserved: reservedKeys.has(personKey), // true se já reservado
      };
    });

    // 2) Retorna os dados com a sinalização
    return res.json({
      promiseServices,
      inProcessDocs: flaggedItems,
    });
  } catch (err) {
    console.error("❌ Erro ao consultar PromiseService/InProcess:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 1) Novo contador em CounterScheduling: status + especialidade
async function incrementSchedulingCounter(
  timestamp,
  statuses = [],
  specialties = []
) {
  const year = String(timestamp.year);
  const month = String(timestamp.month).padStart(2, "0");
  const day = String(timestamp.day).padStart(2, "0");
  const coll = db.base.collection("CounterScheduling");

  // 1.1) Lê doc existente (ou null)
  let oldDoc = null;
  try {
    oldDoc = await coll.document(year);
  } catch (e) {
    /* não existia ainda */
  }

  // 1.2) Prepara dois mapas: um global de status, outro de especialidade→status
  const globalStatusMap = {};
  const specStatusMap = {};

  for (let i = 0; i < statuses.length; i++) {
    const st = statuses[i];
    const sp = specialties[i];
    if (!st || !sp) continue;

    // — contador global de status
    const oldStat = oldDoc?.list_statuses?.[st] ?? { value: 0, list_month: {} };
    const oldMonthS = oldStat.list_month?.[month] ?? { value: 0, list_day: {} };
    const oldDayValS = oldMonthS.list_day?.[day]?.value ?? 0;

    globalStatusMap[st] = {
      value: oldStat.value + 1,
      list_month: {
        [month]: {
          value: oldMonthS.value + 1,
          list_day: { [day]: { value: oldDayValS + 1 } },
        },
      },
    };

    // — contador por especialidade e status
    // inicializa a especialidade caso ainda não exista
    if (!specStatusMap[sp]) {
      // traz os valores antigos para a especialidade
      const oldSp = oldDoc?.list_specialties?.[sp] ?? {
        value: 0,
        list_month: {},
        list_statuses: {},
      };
      const oldSpMon = oldSp.list_month?.[month] ?? { value: 0, list_day: {} };
      const oldSpDayV = oldSpMon.list_day?.[day]?.value ?? 0;

      specStatusMap[sp] = {
        value: oldSp.value + 1,
        list_month: {
          [month]: {
            value: oldSpMon.value + 1,
            list_day: { [day]: { value: oldSpDayV + 1 } },
          },
        },
        list_statuses: {},
      };
    } else {
      // se já criamos acima, apenas incrementa value + mês/dia
      const accSp = specStatusMap[sp];
      const oldSpMon = accSp.list_month[month] ?? { value: 0, list_day: {} };
      const oldSpDayV = oldSpMon.list_day?.[day]?.value ?? 0;

      accSp.value = (accSp.value || 0) + 1;
      accSp.list_month[month] = {
        value: (oldSpMon.value || 0) + 1,
        list_day: { [day]: { value: oldSpDayV + 1 } },
      };
    }

    // agora, dentro de specStatusMap[sp].list_statuses[st]:
    const accSpStat = specStatusMap[sp].list_statuses[st] ?? {
      value: 0,
      list_month: {},
    };
    const accSpMonthS = accSpStat.list_month?.[month] ?? {
      value: 0,
      list_day: {},
    };
    const accSpDayVal = accSpMonthS.list_day?.[day]?.value ?? 0;

    specStatusMap[sp].list_statuses[st] = {
      value: accSpStat.value + 1,
      list_month: {
        [month]: {
          value: accSpMonthS.value + 1,
          list_day: { [day]: { value: accSpDayVal + 1 } },
        },
      },
    };
  }

  // 1.3) UPSERT em CounterScheduling mesclando ambos mapas
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
      list_statuses:    @globalStatusMap,
      list_specialties: @specStatusMap
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
      list_statuses:    MERGE_RECURSIVE(OLD.list_statuses,    @globalStatusMap),
      list_specialties: MERGE_RECURSIVE(OLD.list_specialties, @specStatusMap)
    }
    IN CounterScheduling
  `,
    {
      year,
      month,
      day,
      globalStatusMap,
      specStatusMap,
    }
  );
}

// 2) Rota PUT /promise/items
router.put("/promise/items", async (req, res) => {
  const {
    promiseService,
    serviceType,
    specialist,
    attendanceUnit,
    persons,
    start,
    status,
    userProperty,
    timestamp,
  } = req.body;

  if (!Array.isArray(persons) || persons.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "É preciso enviar ao menos um person" });
  }

  try {
    // 1) Insere cada PromiseServiceItem e atualiza InProcess...
    for (const person of persons) {
      const itemDoc = {
        promiseService: { _key: promiseService._key },
        serviceType,
        attendanceUnit,
        specialist,
        person: { _key: person._key, name: person.name },
        start: { date: start.date, period: start.period || "" },
        status,
      };
      const insertCursor = await db.base.query(
        `INSERT @doc INTO PromiseServiceItem RETURN NEW`,
        { doc: itemDoc }
      );
      const savedItem = await insertCursor.next();

      const phaseEntry = {
        _key: savedItem._key,
        promiseService: savedItem.promiseService,
        person: savedItem.person,
        attendanceUnit: savedItem.attendanceUnit,
        serviceType: savedItem.serviceType,
        specialist: savedItem.specialist,
        start: savedItem.start,
        status: savedItem.status,
        user: userProperty,
        timestamp,
      };
      await db.base.query(
        `
        FOR ip IN InProcess
          FILTER ip.person._key == @personKey
          LET phaseList = (HAS(ip, "schedulingPhase") && IS_ARRAY(ip.schedulingPhase) ? ip.schedulingPhase : [])
          LET exists = LENGTH(
            FOR s IN phaseList
              FILTER s.promiseService._key == @psKey
                AND s.start.date      == @date
                AND s.start.period    == @period
                AND s.serviceType._key== @serviceTypeKey
              RETURN 1
          ) > 0
          LET newList = exists
            ? (
                FOR s IN phaseList
                  RETURN (
                    s.promiseService._key == @psKey
                    AND s.start.date      == @date
                    AND s.start.period    == @period
                    AND s.serviceType._key== @serviceTypeKey
                  ) ? @newPhase : s
              )
            : APPEND(phaseList, [@newPhase])
          UPDATE ip WITH { schedulingPhase: newList } IN InProcess
      `,
        {
          personKey: person._key,
          psKey: promiseService._key,
          date: start.date,
          period: start.period || "",
          serviceTypeKey: serviceType._key,
          newPhase: phaseEntry,
        }
      );
    }

    // 2) Decrementa vacancyLimit (uma vez)
    await db.base.query(
      `
      FOR ps IN PromiseService
        FILTER ps._key == @psKey
        LET updatedDays = (
          FOR d IN ps.scheduledDays
            LET newVac = d.date.date == @date
              ? (d.vacancyLimit > @count ? d.vacancyLimit - @count : 0)
              : d.vacancyLimit
            RETURN MERGE(d, { vacancyLimit: newVac })
        )
        UPDATE ps WITH { scheduledDays: updatedDays } IN PromiseService
    `,
      {
        psKey: promiseService._key,
        date: start.date,
        count: persons.length,
      }
    );

    // 3) Contabiliza status e especialidade juntos em CounterScheduling
    const statuses = persons.map(() => status);
    const specialties = persons.map(() => serviceType.nome);
    await incrementSchedulingCounter(timestamp, statuses, specialties).catch(
      (err) => console.error("Erro em CounterScheduling:", err)
    );

    return res.json({ success: true, scheduledCount: persons.length });
  } catch (err) {
    console.error("Erro no batch /promise/items:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

async function updateSchedulingStatus(
  timestamp,
  specialty,
  fromStatus,
  toStatus
) {
  const year = String(timestamp.year);
  const month = String(timestamp.month).padStart(2, "0");
  const day = String(timestamp.day).padStart(2, "0");

  await db.base.query(
    `
    FOR doc IN CounterScheduling
      FILTER doc._key == @year

      // GLOBAL: monta decremento e incremento de status
      LET decGlobal = {
        [@from]: {
          value:        doc.list_statuses[@from].value - 1,
          list_month: {
            [@month]: {
              value:    doc.list_statuses[@from].list_month[@month].value - 1,
              list_day: {
                [@day]: {
                  value: doc.list_statuses[@from].list_month[@month].list_day[@day].value - 1
                }
              }
            }
          }
        }
      }
      LET incGlobal = {
        [@to]: {
          value:        (doc.list_statuses[@to].value   || 0) + 1,
          list_month: {
            [@month]: {
              value:    ((doc.list_statuses[@to].list_month[@month].value) || 0) + 1,
              list_day: {
                [@day]: {
                  value: ((doc.list_statuses[@to].list_month[@month].list_day[@day].value)||0) + 1
                }
              }
            }
          }
        }
      }

      // SPECIALTY: decrementa e incrementa apenas na especialidade específica
      LET spDoc = doc.list_specialties[@spec]
      LET decSpec = {
        [@spec]: {
          value:        spDoc.value,
          list_month:   spDoc.list_month,
          list_statuses: {
            [@from]: {
              value:        spDoc.list_statuses[@from].value - 1,
              list_month: {
                [@month]: {
                  value:    spDoc.list_statuses[@from].list_month[@month].value - 1,
                  list_day: {
                    [@day]: {
                      value: spDoc.list_statuses[@from].list_month[@month].list_day[@day].value - 1
                    }
                  }
                }
              }
            }
          }
        }
      }
      LET incSpec = {
        [@spec]: {
          value:        spDoc.value,
          list_month:   spDoc.list_month,
          list_statuses: {
            [@to]: {
              value:        (spDoc.list_statuses[@to].value   || 0) + 1,
              list_month: {
                [@month]: {
                  value:    ((spDoc.list_statuses[@to].list_month[@month].value)||0) + 1,
                  list_day: {
                    [@day]: {
                      value: ( (spDoc.list_statuses[@to].list_month[@month].list_day[@day].value)||0 ) + 1
                    }
                  }
                }
              }
            }
          }
        }
      }

      UPDATE doc WITH {
        list_statuses:    MERGE_RECURSIVE(doc.list_statuses,    decGlobal, incGlobal),
        list_specialties: MERGE_RECURSIVE(doc.list_specialties, decSpec,   incSpec)
      } IN CounterScheduling
  `,
    {
      year,
      month,
      day,
      from: fromStatus,
      to: toStatus,
      spec: specialty,
    }
  );
}

router.put("/promise/item/delete", async (req, res) => {
  console.log("📩 ENTROU NO PROMISE DELETE");
  const { promiseService, person, userProperty, timestamp } = req.body;

  try {
    // 1) Busca o InProcess
    const getCursor = await db.base.query(
      `FOR ip IN InProcess
         FILTER ip.person._key == @personKey
         RETURN ip`,
      { personKey: person._key }
    );
    const ipDoc = await getCursor.next();
    if (!ipDoc) {
      return res
        .status(404)
        .json({ success: false, error: "InProcess não encontrado." });
    }

    // 2) Remove PromiseServiceItem
    await db.base.query(
      `FOR psi IN PromiseServiceItem
         FILTER psi.promiseService._key == @svcKey
           AND psi.person._key == @personKey
         REMOVE psi IN PromiseServiceItem`,
      { svcKey: promiseService._key, personKey: person._key }
    );

    // 3) Atualiza schedulingPhase → DESMARCADO
    const updateCursor = await db.base.query(
      `FOR ip IN InProcess
         FILTER ip.person._key == @personKey
         LET newPhases = (
           FOR phase IN ip.schedulingPhase
             RETURN phase.promiseService._key == @psKey
               ? MERGE(phase, { status: "DESMARCADO", user: @user, timestamp: @timestamp })
               : phase
         )
         UPDATE ip WITH { schedulingPhase: newPhases } IN InProcess
         RETURN NEW`,
      {
        personKey: person._key,
        psKey: promiseService._key,
        user: userProperty,
        timestamp,
      }
    );
    const updatedDoc = await updateCursor.next();

    // 4) Reabre vaga em PromiseService
    const dateToAdjust = updatedDoc.schedulingPhase.find(
      (p) => p.promiseService._key === promiseService._key
    )?.start?.date;
    if (dateToAdjust) {
      await db.base.query(
        `FOR ps IN PromiseService
           FILTER ps._key == @psKey
           LET adjusted = (
             FOR d IN ps.scheduledDays
               LET newVal = d.date.date == @date
                            ? d.vacancyLimit + 1
                            : d.vacancyLimit
               RETURN MERGE(d, { vacancyLimit: newVal })
           )
           UPDATE ps WITH { scheduledDays: adjusted } IN PromiseService`,
        { psKey: promiseService._key, date: dateToAdjust }
      );
    }

    // 5) Ajusta contadores em CounterScheduling
    const firstPhase = updatedDoc.schedulingPhase.find(
      (p) => p.promiseService._key === promiseService._key
    );
    const specialtyKey = firstPhase ? firstPhase.serviceType.nome : null;
    if (specialtyKey) {
      await updateSchedulingStatus(
        timestamp,
        specialtyKey,
        "PENDENTE",
        "DESMARCADO"
      );
    } else {
      // Só global se não houver specialty
      await updateSchedulingStatus(timestamp, null, "PENDENTE", "DESMARCADO");
    }

    // 6) Se todos desmarcados, finaliza InProcess → FinishedProcess
    const descheduledCount = updatedDoc.schedulingPhase.filter(
      (p) => p.status === "DESMARCADO"
    ).length;
    const medicalCount = (ipDoc.requestPhase?.medicalRequest || []).length;

    if (descheduledCount === medicalCount) {
      const rmCursor = await db.base.query(
        `FOR ip IN InProcess
           FILTER ip._key == @key
           REMOVE ip IN InProcess
           RETURN OLD`,
        { key: updatedDoc._key }
      );
      const oldDoc = await rmCursor.next();
      const finishedDoc = {
        ...oldDoc,
        cancelledPhase: { user: userProperty, timestamp },
      };
      await db.base.query(`INSERT @doc INTO FinishedProcess`, {
        doc: finishedDoc,
      });
      return res
        .status(200)
        .json({ success: true, finishedProcess: finishedDoc });
    }

    // 7) Caso contrário, retorna a fase atualizada
    return res.status(200).json({
      success: true,
      schedulingPhase: updatedDoc.schedulingPhase,
    });
  } catch (err) {
    console.error("❌ Erro em PUT /promise/item/delete:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Erro interno" });
  }
});

router.put("/promise/item/return", async (req, res) => {
  const { promiseService, person } = req.body;

  try {
    const [removed] = await db.base
      .query(
        `
        FOR psi IN PromiseServiceItem
          FILTER psi.promiseService._key == @svcKey
            AND psi.person._key == @personKey
            AND psi.status == "PENDENTE"
          REMOVE psi IN PromiseServiceItem
          RETURN OLD
        `,
        {
          svcKey: promiseService._key,
          personKey: person._key,
        }
      )
      .then((c) => c.all());

    if (!removed) {
      return res
        .status(404)
        .json({ success: false, error: "PromiseServiceItem não encontrado." });
    }
    const {
      start: { date },
    } = removed;

    await db.base.query(
      `
      FOR ps IN PromiseService
        FILTER ps._key == @psKey

        LET adjusted = (
          FOR d IN ps.scheduledDays
            LET newVal = d.date.date == @date
             ? d.vacancyLimit + 1
             : d.vacancyLimit
            RETURN {
              date:         d.date,
              vacancyLimit: newVal
            }
        )

        UPDATE ps
          WITH { scheduledDays: adjusted }
          IN PromiseService

        RETURN adjusted
      `,
      {
        psKey: promiseService._key,
        date,
      }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro em PUT /promise/item/return:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/scheduled/search", async (req, res) => {
  console.log("entrouuuuuuuuuuuuu");

  try {
    const { promiseService, date, serviceType } = req.body;
    if (!promiseService?._key || !date || !serviceType?._key) {
      return res
        .status(400)
        .json({ success: false, error: "Faltam parâmetros" });
    }

    const cursor = await db.base.query(
      `
      FOR item IN PromiseServiceItem
        FILTER item.promiseService._key == @psKey
          AND item.start.date           == @date
          AND item.serviceType._key     == @stKey
          AND item.status               == "PENDENTE"
        LET personDoc = DOCUMENT(Person, item.person._key)
        RETURN {
          _key:    item._key,
          person:  { _key: personDoc._key, name: personDoc.name },
          start:   item.start,
          status:  item.status
        }
      `,
      {
        psKey: promiseService._key,
        date,
        stKey: serviceType._key,
      }
    );
    const items = await cursor.all();

    console.log("ITENS:", items);

    res.json({ success: true, data: items });
  } catch (err) {
    console.error("Erro em PUT /scheduled/search:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
