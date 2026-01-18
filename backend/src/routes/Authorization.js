const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs").promises;
const { aql } = require("arangojs");
const { PDFDocument } = require("pdf-lib");
const db = require("../config/database");
const moment = require("moment-timezone");

function formatDate(date) {
  const d = moment.tz(date, "America/Sao_Paulo");
  const day = d.format("DD");
  const month = d.format("MM");
  const year = d.format("YYYY");
  return `${day}/${month}/${year}`;
}

function calculateAge(birthdate) {
  const birthDate = moment.tz(birthdate, "America/Sao_Paulo");
  const now = moment.tz("America/Sao_Paulo");
  let ageYears = now.year() - birthDate.year();
  let ageMonths = now.month() - birthDate.month();

  if (ageMonths < 0) {
    ageYears--;
    ageMonths += 12;
  }

  if (ageYears === 0) {
    return `${ageMonths} Meses`;
  }

  return `${ageYears} Anos`;
}

function safeText(value) {
  return value ? value.toString() : "";
}

function disableTextFieldEditability(textField) {
  textField.enableReadOnly();
}

async function getPropertyDetails(propertyKey) {
  let propertyData = await db.base.query(
    `for p in Property filter p._key == @property_key return p`,
    { property_key: propertyKey }
  );
  propertyData = await propertyData.next();

  if (!propertyData) {
    throw new Error("Property não encontrado");
  }

  const wayKey = propertyData.address.way._key;
  const neighborhoodKey = propertyData.address.neighborhood._key;
  const cityKey = propertyData.address.city._key;

  let wayData = await db.base.query(
    `for w in Way filter w._key == @way_key return w`,
    { way_key: wayKey }
  );
  wayData = await wayData.next();

  let neighborhoodData = await db.base.query(
    `for n in Neighborhood filter n._key == @neighborhood_key return n`,
    { neighborhood_key: neighborhoodKey }
  );
  neighborhoodData = await neighborhoodData.next();

  let cityData = await db.base.query(
    `for c in City filter c._key == @city_key return c`,
    { city_key: cityKey }
  );
  cityData = await cityData.next();

  let name = "";
  let state = "";
  if (!!cityData) {
    cityName = cityData.name;
    cityState = cityData.state;
  }

  return {
    address: `${wayData.name}, ${propertyData.address.number}, ${neighborhoodData.name}`,
    city: `${cityName}, ${cityState}`,
  };
}

async function generateAuthorization(new_authorization) {
  const pdfPath = path.join(
    __dirname,
    "..",
    "authorization",
    "AUTHORIZATION_UPANEMA.pdf"
  );
  const pdfData = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfData);

  const form = pdfDoc.getForm();

  const age = calculateAge(new_authorization.person.birthdate);

  const periodMap = {
    manha: "MANHÃ",
    tarde: "TARDE",
    noite: "NOITE",
  };

  const fieldsToSet = [
    {
      field: form.getTextField("person-name"),
      value: new_authorization.person.name.toUpperCase(),
    },
    { field: form.getTextField("person-age"), value: age },
    {
      field: form.getTextField("person-registry"),
      value: new_authorization.InProcess_id,
    },
    {
      field: form.getTextField("person-gender"),
      value: new_authorization.person.gender.charAt(0).toUpperCase(),
    },
    {
      field: form.getTextField("person-birthdate"),
      value: formatDate(new_authorization.person.birthdate),
    },
    {
      field: form.getTextField("person-disability-name"),
      value: new_authorization.person.disability.name.toUpperCase(),
    },
    {
      field: form.getTextField("person-contact-phone"),
      value: new_authorization.person.contact.phone,
    },
    {
      field: form.getTextField("person-job"),
      value: new_authorization.person.job.name.toUpperCase(),
    },
    {
      field: form.getTextField("person-susCard"),
      value: new_authorization.person.susCard,
    },
    {
      field: form.getTextField("person-id"),
      value: new_authorization.person.id,
    },
    {
      field: form.getTextField("user-person-name"),
      value: new_authorization.receptionist.toUpperCase(),
    },
    {
      field: form.getTextField("timestamp"),
      value: `${new_authorization.timestamp.date} ${new_authorization.timestamp.time}`,
    },
    {
      field: form.getTextField("person-address"),
      value: new_authorization.person.address,
    },
    {
      field: form.getTextField("person-address-city"),
      value: new_authorization.person.city,
    },
    {
      field: form.getTextField("person-motherName"),
      value: new_authorization.person.motherName.toUpperCase(),
    },
    {
      field: form.getTextField("serviceType-name"),
      value: new_authorization.scheduling?.serviceType.toUpperCase() || "",
    },
    {
      field: form.getTextField("specialist-name"),
      value: new_authorization.scheduling?.specialist.toUpperCase() || "",
    },
    {
      field: form.getTextField("timestamp-scheduled"),
      value: new_authorization.scheduling?.timestamp?.date
        ? `${formatDate(new_authorization.scheduling.timestamp.date)}${
            new_authorization.scheduling.timestamp.period
              ? " - " +
                (periodMap[
                  new_authorization.scheduling.timestamp.period.toLowerCase()
                ] || "")
              : ""
          }`
        : "",
    },
    {
      field: form.getTextField("attendanceUnit-name"),
      value: new_authorization.scheduling?.unit.toUpperCase() || "",
    },
    {
      field: form.getTextField("request-observation"),
      value: new_authorization.observations || "",
    },
  ];

  fieldsToSet.forEach(({ field, value }) => {
    field.setText(safeText(value));
    disableTextFieldEditability(field);
  });

  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes).toString("base64");
}

router.get("/search", async (req, res) => {
  try {
    const query = `
  FOR item IN PromiseServiceItem
    FILTER item.status == "PENDENTE"
    COLLECT person = item.person INTO grouped

    LET inProcess = FIRST(
      FOR ip IN InProcess
        FILTER ip.person._key == person._key
        RETURN ip
    )

    RETURN {
      person: person,
      services: grouped[*].item,
      inProcessKey: inProcess._key
    }
`;

    const cursor = await db.base.query(query);
    const result = await cursor.all();

    console.dir(result, { depth: null });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Erro ao agrupar por pessoa:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
});

router.get("/:key", async (req, res) => {
  try {
    const InProcess_key = req.params.key;
    const promiseServiceKey = req.query.promiseServiceKey;
    console.log("🔑 PromiseServiceKey:", promiseServiceKey);

    // 1) Busca o InProcess
    const cursor = await db.base.query(
      `FOR u IN InProcess FILTER u._key == @key RETURN u`,
      { key: InProcess_key }
    );
    const InProcessData = await cursor.next();

    if (!InProcessData) {
      return res
        .status(404)
        .json({ success: false, message: "InProcess não encontrado." });
    }

    // 2) Busca detalhes de endereço
    const propertyDetails = await getPropertyDetails(
      InProcessData.person.address.property._key
    );
    InProcessData.person.address = propertyDetails.address;
    InProcessData.person.city = propertyDetails.city;

    // 3) Garante que exista schedulingPhase e filtra pela promiseServiceKey
    const phases = InProcessData.schedulingPhase || [];

    const phase = phases.find((p) => p._key === promiseServiceKey);

    if (!phase) {
      return res.status(404).json({
        success: false,
        message: "Fase correspondente à chave fornecida não encontrada.",
      });
    }

    // 4) Monta dados da autorização com a fase filtrada
    const schedulingInfo = {
      serviceType: phase.serviceType?.nome || "",
      specialist: phase.specialist?.name || "",
      timestamp: {
        date: phase.start?.date || "",
        period: phase.start?.period || "",
      },
      unit: phase.attendanceUnit?.name || "",
    };

    const authorization = await generateAuthorization({
      person: InProcessData.person,
      observations: InProcessData.requestPhase.observations,
      InProcess_id: InProcessData._key,
      receptionist: InProcessData.receptionPhase.receptionist.person.name,
      timestamp: InProcessData.receptionPhase.timestamp,
      scheduling: schedulingInfo,
    });

    // 5) Retorna a autorização
    res.json({ success: true, authorization });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro interno." });
  }
});

router.put("/status", async (req, res) => {
  const { promiseServiceKey } = req.body;

  console.log("PROMISE SERVICE AQUI:", promiseServiceKey);

  if (!promiseServiceKey) {
    return res
      .status(400)
      .json({ success: false, message: "Chave de serviço não fornecida." });
  }

  try {
    const query = `
      FOR item IN PromiseServiceItem
        FILTER item._key == @key
        UPDATE item WITH { status: "AUTORIZADO" } IN PromiseServiceItem
        RETURN NEW
    `;

    const cursor = await db.base.query(query, { key: promiseServiceKey });
    const updated = await cursor.next();

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Item não encontrado." });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
});

router.get("/search/authorized", async (req, res) => {
  try {
    const query = `
      FOR item IN PromiseServiceItem
        FILTER item.status == "AUTORIZADO"  // <-- FILTRA AQUI

        COLLECT person = item.person INTO grouped

        LET inProcess = FIRST(
          FOR ip IN InProcess
            FILTER ip.person._key == person._key
            RETURN ip
        )

        RETURN {
          person: person,
          services: grouped[*].item,
          inProcessKey: inProcess._key
        }
    `;

    const cursor = await db.base.query(query);
    const result = await cursor.all();

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Erro ao agrupar por pessoa:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
});

router.get("/search/arrival", async (req, res) => {
  try {
    const query = `
      FOR item IN PromiseServiceItem
        FILTER item.status == "CHEGADA_CONFIRMADA"  // <-- FILTRA AQUI

        COLLECT person = item.person INTO grouped

        LET inProcess = FIRST(
          FOR ip IN InProcess
            FILTER ip.person._key == person._key
            RETURN ip
        )

        RETURN {
          person: person,
          services: grouped[*].item,
          inProcessKey: inProcess._key
        }
    `;
    const cursor = await db.base.query(query);
    const result = await cursor.all();

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Erro ao agrupar por pessoa:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
});

router.put("/oncoming", async (req, res) => {
  const { promiseServiceKey, status, timestamp } = req.body;

  if (!promiseServiceKey || !status || !timestamp) {
    return res
      .status(400)
      .json({ success: false, message: "Dados incompletos." });
  }

  try {
    const query = `
      FOR item IN PromiseServiceItem
        FILTER item._key == @promiseServiceKey
        UPDATE item WITH {
          status: @status,
          arrivalTime: @timestamp // ← salva como arrivalTime
        } IN PromiseServiceItem
        RETURN NEW
    `;

    const cursor = await db.base.query(query, {
      promiseServiceKey,
      status,
      timestamp, // ← ainda envia como timestamp para o Arango
    });

    const updatedItems = await cursor.all();

    if (updatedItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nenhum item encontrado para atualização.",
      });
    }

    res.json({ success: true, updatedItems });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor.",
    });
  }
});

async function incrmentProvided(timestamp, specialtyKey, oldStatus, newStatus) {
  if (newStatus !== "REALIZADO") return;

  const year = String(timestamp.year);
  const month = String(timestamp.month).padStart(2, "0");
  const day = String(timestamp.day).padStart(2, "0");
  const coll = db.base.collection("CounterService");

  // Tenta obter documento do ano
  let oldDoc = null;
  try {
    oldDoc = await coll.document(year);
  } catch (e) {
    // não existe ainda
  }

  // Monta o specMap já com incremento
  const oldSpec = oldDoc?.list_specialties?.[specialtyKey] ?? {
    value: 0,
    list_month: {},
  };
  const oldMonth = oldSpec.list_month?.[month] ?? { value: 0, list_day: {} };
  const oldDayVal = oldMonth.list_day?.[day]?.value ?? 0;
  const specMap = {
    [specialtyKey]: {
      value: oldSpec.value + 1,
      list_month: {
        [month]: {
          value: oldMonth.value + 1,
          list_day: { [day]: { value: oldDayVal + 1 } },
        },
      },
    },
  };

  // UPSERT na coleção CounterService
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
    IN CounterService
  `,
    { year, month, day, specMap }
  );
}

router.put("/provided", async (req, res) => {
  const { userProperty, servicesKeys, status, timestamp } = req.body;

  if (
    !Array.isArray(servicesKeys) ||
    servicesKeys.length === 0 ||
    !status ||
    !timestamp ||
    !timestamp.year ||
    !timestamp.month ||
    !timestamp.day
  ) {
    return res.status(400).json({
      success: false,
      message: "Dados incompletos ou formato inválido.",
    });
  }

  try {
    // 1) Atualiza os PromiseServiceItem e retorna o NEW
    const updateQuery = `
      FOR item IN PromiseServiceItem
        FILTER item._key IN @servicesKeys
        UPDATE item WITH {
          status: @status,
          providedTime: @timestamp
        } IN PromiseServiceItem
        RETURN NEW
    `;
    const cursor = await db.base.query(updateQuery, {
      servicesKeys,
      status,
      timestamp,
    });
    const updatedItems = await cursor.all();

    if (!updatedItems.length) {
      return res.status(404).json({
        success: false,
        message: "Nenhum item encontrado para atualização.",
      });
    }

    // 2) Remove os PromiseServiceItem atualizados
    await db.base.query(
      `FOR key IN @servicesKeys REMOVE { _key: key } IN PromiseServiceItem`,
      { servicesKeys }
    );

    // 3) Para cada item, atualiza InProcess e faz a contagem de realizados
    for (const item of updatedItems) {
      const promiseServiceKey = item._key;

      // 3.1) Busca o InProcess contendo este phase
      const inCursor = await db.base.query(
        `
        FOR doc IN InProcess
          FILTER LENGTH(doc.schedulingPhase[* FILTER CURRENT._key == @promiseServiceKey]) > 0
          RETURN doc
      `,
        { promiseServiceKey }
      );
      const inProcessDoc = await inCursor.next();
      if (!inProcessDoc) continue;

      // 3.2) Atualiza o schedulingPhase daquele item
      const updatedScheduling = inProcessDoc.schedulingPhase.map((phase) =>
        phase._key === promiseServiceKey
          ? { ...phase, status, user: userProperty, providedTime: timestamp }
          : phase
      );

      // 3.3) Persiste InProcess ou move para FinishedProcess
      const allFinal = updatedScheduling.every((p) =>
        ["DESMARCADO", "NÃO_AUTORIZADO", "REALIZADO"].includes(p.status)
      );
      if (allFinal) {
        await db.base.query(`REMOVE { _key: @key } IN InProcess`, {
          key: inProcessDoc._key,
        });
        const finalDoc = {
          ...inProcessDoc,
          schedulingPhase: updatedScheduling,
          successPhase: { timestamp, user: userProperty },
        };
        await db.base.query(`INSERT @doc INTO FinishedProcess`, {
          doc: finalDoc,
        });
      } else {
        await db.base.query(
          `UPDATE { _key: @key } WITH { schedulingPhase: @updatedScheduling } IN InProcess`,
          {
            key: inProcessDoc._key,
            updatedScheduling,
          }
        );
      }

      // 3.4) Extrai especialidade deste item
      const specialtyKey = item.serviceType.nome;

      // 3.5) Ajusta contadores em CounterService via incrmentProvided
      await incrmentProvided(
        timestamp,
        specialtyKey,
        /*oldStatus*/ null,
        status
      );
    }

    res.json({ success: true, updatedItems });
  } catch (err) {
    console.error("❌ Erro ao atualizar como REALIZADO:", err);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor.",
    });
  }
});

router.put("/noShow", async (req, res) => {
  const { userProperty, promiseServiceKey, timestamp } = req.body;

  console.log("userProperty:", userProperty);

  if (!promiseServiceKey || !timestamp) {
    return res.status(400).json({
      success: false,
      message: "Dados incompletos.",
    });
  }

  try {
    // 1) Atualiza PromiseServiceItem para status "NÃO_AUTORIZADO"
    const updateQuery = `
      FOR item IN PromiseServiceItem
        FILTER item._key == @promiseServiceKey
        UPDATE item WITH {
          status: "NÃO_AUTORIZADO",
          unauthorizedTime: @timestamp
        } IN PromiseServiceItem
        RETURN NEW
    `;

    const cursor = await db.base.query(updateQuery, {
      promiseServiceKey,
      timestamp,
    });

    const [updatedItem] = await cursor.all();
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: "Serviço não encontrado.",
      });
    }

    // 2) Remove o PromiseServiceItem atualizado
    await db.base.query(`REMOVE { _key: @key } IN PromiseServiceItem`, {
      key: promiseServiceKey,
    });

    // 3) Busca documento InProcess que contém o serviço
    const inProcessQuery = `
      FOR doc IN InProcess
        FILTER LENGTH(doc.schedulingPhase[* FILTER CURRENT._key == @promiseServiceKey]) > 0
        RETURN doc
    `;

    const inCursor = await db.base.query(inProcessQuery, { promiseServiceKey });
    const inProcessDoc = await inCursor.next();

    if (!inProcessDoc) {
      return res.status(404).json({
        success: false,
        message: "Documento InProcess não encontrado.",
      });
    }

    // 4) Atualiza schedulingPhase dentro do InProcess
    const updatedScheduling = inProcessDoc.schedulingPhase.map((item) => {
      if (item._key === promiseServiceKey) {
        return {
          ...item,
          status: "NÃO_AUTORIZADO",
          unauthorizedTime: timestamp,
        };
      }
      return item;
    });

    // --- INÍCIO: AUMENTAR VACANCY LIMIT NA PROMISESERVICE ---

    // Encontra o item atualizado para pegar a data e promiseService._key
    const serviceToAdjust = updatedScheduling.find(
      (item) => item._key === promiseServiceKey
    );
    const dateToAdjust = serviceToAdjust?.start?.date;

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
        { psKey: serviceToAdjust.promiseService._key, date: dateToAdjust }
      );
    }

    // Opcional: Atualizar contadores (se existir função)
    if (typeof updateSchedulingStatus === "function") {
      const specialtyKey = serviceToAdjust?.serviceType?.nome || null;
      if (specialtyKey) {
        await updateSchedulingStatus(
          timestamp,
          specialtyKey,
          "PENDENTE",
          "NÃO_AUTORIZADO"
        );
      } else {
        await updateSchedulingStatus(
          timestamp,
          null,
          "PENDENTE",
          "NÃO_AUTORIZADO"
        );
      }
    }

    // --- FIM: AUMENTAR VACANCY LIMIT ---

    // 5) Verifica se todos os serviços estão em status finais
    const todosFinalizados = updatedScheduling.every((item) =>
      ["DESAGENDADO", "DESMARCADO", "NÃO_AUTORIZADO"].includes(item.status)
    );

    if (todosFinalizados) {
      // 6) Remove InProcess
      await db.base.query(`REMOVE { _key: @key } IN InProcess`, {
        key: inProcessDoc._key,
      });

      // 7) Move para FinishedProcess
      const finishedDoc = {
        ...inProcessDoc,
        schedulingPhase: updatedScheduling,
        unauthorizedPhase: { timestamp, user: userProperty },
      };

      await db.base.query(`INSERT @doc INTO FinishedProcess`, {
        doc: finishedDoc,
      });
    } else {
      // Apenas atualiza schedulingPhase dentro do InProcess
      await db.base.query(
        `
        UPDATE { _key: @key } WITH {
          schedulingPhase: @updatedScheduling
        } IN InProcess
        `,
        {
          key: inProcessDoc._key,
          updatedScheduling,
        }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao processar ausência:", err);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor.",
    });
  }
});

router.put("/filter", async (req, res) => {
  console.log("🔍 [ROTA] /filter");

  const {
    name = "",
    dateTimeBegin = null,
    id = "",
    susCard = "",
    specialty = "",
  } = req.body;

  try {
    const query = `
      LET allSpecialties = @specialty == "" OR @specialty == "Especialidades"
      LET nextDay = DATE_ADD(@dateTimeBegin, 1, "day")

      FOR item IN PromiseServiceItem
        FILTER item.status == "AUTORIZADO"

        ${
          dateTimeBegin
            ? `
          FILTER item.start != null
          FILTER item.start.date >= @dateTimeBegin
          FILTER item.start.date < nextDay
        `
            : ""
        }

        FILTER allSpecialties OR item.serviceType._key == @specialty

        LET match = FIRST(
          FOR proc IN InProcess
            FILTER proc.person != null
            LET person = proc.person

            FILTER (
              (@name == "" OR CONTAINS(LOWER(person.name), LOWER(@name))) &&
              (@id == "" OR person.cpf == @id) &&
              (@susCard == "" OR person.susCard == @susCard)
            )

            FILTER LENGTH(proc.schedulingPhase[* FILTER CURRENT._key == item._key]) > 0

            RETURN person
        )

        FILTER match != null

        RETURN {
          person: match,
          item
        }
    `;

    const bindVars = {
      name: name.trim(),
      id: id.trim(),
      susCard: susCard.trim(),
      specialty,
      dateTimeBegin,
    };

    console.log("📦 [BINDVARS]", bindVars);

    const cursor = await db.base.query(query, bindVars);
    const raw = await cursor.all();

    const data = raw.map(({ person, item }) => ({
      person,
      ...item,
    }));

    console.log(`✅ [RESULTADOS] ${data.length} registros encontrados`);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Erro ao filtrar serviços autorizados:", err);
    return res
      .status(500)
      .json({ success: false, message: "Erro interno do servidor." });
  }
});

router.get("/search/served", async (req, res) => {
  try {
    const query = `
      FOR fp IN FinishedProcess
        FOR s IN fp.schedulingPhase
          FILTER s.status == "REALIZADO"
          
          // agrupa por unidade
          COLLECT unit = s.attendanceUnit INTO grouped
      
          RETURN {
            attendanceUnit: unit,     // { _key, name }
            services: grouped[*].s    // lista de todos os s para esta unidade
          }
    `;

    const cursor = await db.base.query(query);
    const result = await cursor.all();

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Erro ao buscar serviços realizados por unidade:", err);
    res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
});

router.get("/unauthorized/search", async (req, res) => {
  try {
    const cursor = await db.base.query(aql`
      RETURN UNION(
        FOR doc IN InProcess
          FOR s IN doc.schedulingPhase
            FILTER s.status == "NÃO_AUTORIZADO"
            RETURN {
              collection: "InProcess",
              inProcessKey: doc._key,
              person: doc.person,
              svc: s
            },
        FOR doc IN FinishedProcess
          FOR s IN doc.schedulingPhase
            FILTER s.status == "NÃO_AUTORIZADO"
            RETURN {
              collection: "FinishedProcess",
              inProcessKey: doc._key,
              person: doc.person,
              svc: s
            }
      )
    `);

    // cursor.all() vai retornar um array único (o resultado do RETURN UNION(...))
    const [data] = await cursor.all();
    res.json({ success: true, data });
  } catch (err) {
    console.error("Erro ao buscar NÃO_AUTORIZADO:", err);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
});

module.exports = router;
