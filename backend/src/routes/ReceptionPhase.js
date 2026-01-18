const router = require("express").Router();
const db = require("../config/database");
const multer = require("multer");
const upload = multer();
const { bucket } = require("../config/Storage");

async function uploadToBucket(file, personKey, timestamp) {
  return new Promise((resolve, reject) => {
    // -------------------------------
    // 1. Identificar PASTA correta
    // -------------------------------
    let folder = "outros";

    if (file.fieldname === "doc_identidade") folder = "identidade";
    if (file.fieldname === "doc_sus") folder = "sus";
    if (file.fieldname === "doc_residencia") folder = "residencia";
    if (file.fieldname === "doc_laudos") folder = "laudos";

    // -------------------------------
    // 2. Montar nome do arquivo
    //    Exemplo: 349812_2025-11-19_17-22-09.png
    // -------------------------------
    const ext = file.originalname.split(".").pop();
    const safeTimestamp = timestamp.datetime
      .toISOString()
      .replace(/[:.]/g, "-");

    const filename = `${folder}/${personKey}_${safeTimestamp}.${ext}`;

    // -------------------------------
    // 3. Upload para o bucket
    // -------------------------------
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on("finish", () => {
      resolve({
        filename,
        folder,
      });
    });

    blobStream.on("error", (err) => {
      reject(err);
    });

    blobStream.end(file.buffer);
  });
}

const collName = "InProcess";

async function newCouterAttendence(timestamp) {
  console.log("newCouterAttendence");

  console.log(timestamp);

  await db.base.query(
    `
    FOR c IN CounterAttendence
      FILTER c._key == @year
      UPDATE c WITH {
        "value": c.value + 1,
        "list_month": {
          [@month]: {
            "value": c.list_month[@month].value == null?0:c.list_month[@month].value + 1,
            "list_day": {
              [@day]: {
                "value": c.list_month[@month].list_day[@day].value == null?0:c.list_month[@month].list_day[@day].value + 1
              }
            }
          }
        }
      } IN CounterAttendence`,
    { year: timestamp.year, month: timestamp.month, day: timestamp.day }
  );
  /*
  await db.unit.query(`
        for c in CounterAttendence filter c._key == @year
        let month = @month
        let day = @day
        let counterMonth = c.list_month[month].value == null?0:c.list_month[month].value
        let counterDay = c.list_month[month].list_day[day].value == null?0:c.list_month[month].list_day[day].value

        update c with {
                "value":c.value+1,
                "list_month":{
                [month]:{
                    "value":counterMonth+1,
                    "list_day":{
                        [day]:{
                          "value":counterDay+1
                        }
                    }
                }
            }
                    
        } in CounterAttendence
    `, { year: timestamp.year, month: timestamp.month, day: timestamp.day })
*/
}

async function newId(timestamp) {
  function substituirZeros(n, num) {
    let numStr = num.toString();

    let originalLength = n.length;

    let zerosNeeded = originalLength - numStr.length;

    let zeros = "0".repeat(zerosNeeded);

    let result = zeros + numStr;

    return result;
  }

  await newCouterAttendence(timestamp);

  result = await db.base
    .collection("CounterAttendence")
    .document({ _key: timestamp.year });

  let part1 = substituirZeros("00000", result.value);
  let part2 = substituirZeros("0000", result.list_month[timestamp.month].value);
  let part3 = substituirZeros(
    "000",
    result.list_month[timestamp.month].list_day[timestamp.day].value
  );
  let part4 = timestamp.year;

  return `${part1}.${part2}.${part3}-${part4}`;
}
/*
async function newId() {

  let config = await db.base.collection("Config").document({ "_key": "MAIN" });

  let now = new Date();

  let month = now.getMonth() + 1;
  month = month <= 9 ? `0${month}` : month;

  const year = now.getFullYear();

  let now_part1 = `${year}${month}`

  if (config.part_id.part1 != now_part1) {

    config.part_id.part1 = now_part1;
    config.part_id.part2 = 0;
  }
  config.part_id.part2++;

  await db.base.collection("Config").update({ "_key": "MAIN" }, { "part_id": config.part_id })

  return `${config.part_id.part1}/${config.part_id.part2}`
}
*/

router.put("/", upload.any(), async (req, res) => {
  try {
    const reception = JSON.parse(req.body.json);
    const files = req.files;

    console.log("Arquivos recebidos PUT:", files);

    let user = reception.userProperty;
    let way = {};
    let neighborhood = {};
    let property = {};

    // ====== PROCESSO BASE DO PERSON ======
    let person = {
      id: reception.person.id,
      name: reception.person.name,
      motherName: reception.person.motherName,
      contact: {
        phone: reception.person.contact.phone,
        email: reception.person.contact.email,
      },
      disability: {
        name: reception.person.disability.name,
      },
      job: {
        name: reception.person.job.name,
      },
      acs: reception.person.acs,
      esf: reception.person.esf,
      gender: reception.person.gender,
      susCard: reception.person.susCard,
      birthdate: reception.person.birthdate,
      address: {
        property: {
          _key: reception.person.address.property._key,
        },
      },
      timestamp: reception.timestamp,
    };

    // ====== ARQUIVOS ======
    let l_docs = [];

    for (const file of files) {
      const uploaded = await uploadToBucket(
        file,
        person._key,
        reception.timestamp
      );

      l_docs.push({
        type: file.fieldname, // exemplo: doc_identidade
        id: uploaded.id,
        filename: uploaded.filename,
      });
    }

    // adiciona documentos enviados
    person.l_docs = l_docs;

    // ===== WAY =====
    if (reception.person.address.property.address.way._key == "") {
      way = await createWay(
        reception.person.address.property.address.city._key,
        reception.person.address.property.address.way.name,
        reception.timestamp
      );
    } else {
      way._key = reception.person.address.property.address.way._key;
    }

    // ===== NEIGHBORHOOD =====
    if (reception.person.address.property.address.neighborhood._key == "") {
      neighborhood = await createNeighborhood(
        reception.person.address.property.address.city._key,
        reception.person.address.property.address.neighborhood.name,
        reception.timestamp
      );
    } else {
      neighborhood._key =
        reception.person.address.property.address.neighborhood._key;
    }

    let address = {
      city: {
        _key: reception.person.address.property.address.city._key,
      },
      way: {
        _key: way._key,
      },
      neighborhood: {
        _key: neighborhood._key,
      },
      number: reception.person.address.property.address.number,
    };

    property = await loadPropertyByAddress(address);

    if (!property) {
      property = await createProperty(address);
    }

    if (reception.person.address.property._key != property._key) {
      person.address.property._key = property._key;
    }

    // SALVAR OU ATUALIZAR PERSON
    if (reception.person._key == "") {
      person = await db.base.collection("Person").save(person);
    } else {
      person._key = reception.person._key;
      await db.base.collection("Person").update({ _key: person._key }, person);
    }

    res.send({ ok: true });
  } catch (err) {
    console.error("Erro PUT:", err);
    res.status(500).send({ error: err.message });
  }
});

router.post("/", upload.any(), async (req, res) => {
  try {
    // -----------------------------------------
    //  TIMESTAMP AJUSTADO PARA SÃO PAULO
    // -----------------------------------------
    let now = new Date();
    const dtl = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    );

    const timestamp = {
      day: String(dtl.getDate()).padStart(2, "0"),
      month: String(dtl.getMonth() + 1).padStart(2, "0"),
      year: String(dtl.getFullYear()),
      time: `${String(dtl.getHours()).padStart(2, "0")}:${String(
        dtl.getMinutes()
      ).padStart(2, "0")}:${String(dtl.getSeconds()).padStart(2, "0")}`,
      date: `${String(dtl.getDate()).padStart(2, "0")}/${String(
        dtl.getMonth() + 1
      ).padStart(2, "0")}/${dtl.getFullYear()}`,
      datetime: dtl,
    };

    // -----------------------------------------
    //  DADOS RECEBIDOS
    // -----------------------------------------
    const reception = JSON.parse(req.body.json);
    const files = req.files;

    console.log("📥 Reception recebido:", reception);
    console.log("📄 Arquivos recebidos:", files);

    let user = reception.userProperty;
    let way = {};
    let neighborhood = {};
    let property = {};

    // -----------------------------------------
    //  MONTAR OBJETO PERSON
    // -----------------------------------------
    let person = {
      id: reception.person.id,
      name: reception.person.name,
      motherName: reception.person.motherName,
      contact: {
        phone: reception.person.contact.phone,
        email: reception.person.contact.email,
      },
      disability: { name: reception.person.disability.name },
      job: { name: reception.person.job.name },
      acs: reception.person.acs,
      esf: reception.person.esf,
      gender: reception.person.gender,
      susCard: reception.person.susCard,
      birthdate: reception.person.birthdate,
      address: {
        property: { _key: reception.person.address.property._key },
      },
      timestamp,
      l_docs: [],
    };

    // -----------------------------------------
    //  ENDEREÇO (WAY / NEIGHBORHOOD / PROPERTY)
    // -----------------------------------------

    if (reception.person.address.property.address.way._key == "") {
      way = await createWay(
        reception.person.address.property.address.city._key,
        reception.person.address.property.address.way.name,
        timestamp
      );
    } else {
      way._key = reception.person.address.property.address.way._key;
    }

    if (reception.person.address.property.address.neighborhood._key == "") {
      neighborhood = await createNeighborhood(
        reception.person.address.property.address.city._key,
        reception.person.address.property.address.neighborhood.name,
        timestamp
      );
    } else {
      neighborhood._key =
        reception.person.address.property.address.neighborhood._key;
    }

    let address = {
      city: { _key: reception.person.address.property.address.city._key },
      way: { _key: way._key },
      neighborhood: { _key: neighborhood._key },
      number: reception.person.address.property.address.number,
    };

    property = await loadPropertyByAddress(address);
    if (!property) property = await createProperty(address);

    if (reception.person.address.property._key != property._key) {
      person.address.property._key = property._key;
    }

    // -----------------------------------------
    //  SALVAR / UPDATE PERSON
    // -----------------------------------------
    if (!reception.person._key || reception.person._key === "") {
      const saved = await db.base.collection("Person").save(person);
      person._key = saved._key;
    } else {
      person._key = reception.person._key;
      await db.base.collection("Person").update({ _key: person._key }, person);
    }

    // -----------------------------------------
    //  UPLOAD DOS ARQUIVOS – 100% CORRIGIDO
    //  AGORA EM PARALELO (Promise.all)
    // -----------------------------------------
    const uploadedFiles = await Promise.all(
      files.map((file) => uploadToBucket(file, person._key, timestamp))
    );

    // MONTAR L_DOCS
    const l_docs = uploadedFiles.map((uploaded, index) => ({
      type: files[index].fieldname,
      filename: uploaded.filename,
      bucketUrl: uploaded.url,
    }));

    // SALVAR DOCUMENTOS
    await db.base
      .collection("Person")
      .update({ _key: person._key }, { l_docs });

    // -----------------------------------------
    //  INPROCESS
    // -----------------------------------------
    const AttendanceUnit = await loadUnitId();
    const id = await newId(timestamp);

    const savedReception = await db.base.collection(collName).save({
      id,
      AttendanceUnit,
      person,
      receptionPhase: {
        timestamp,
        receptionist: user,
      },
    });

    // -----------------------------------------
    //  RESPOSTA FINAL
    // -----------------------------------------
    res.send({ _key: savedReception._key });
  } catch (err) {
    console.error("❌ Erro POST:", err);
    res.status(500).send({ error: err.message });
  }
});

async function loadUnitId() {
  let AttendanceUnit = await db.base.query(
    `for a in AttendanceUnit filter a._key == "MAIN" return a`
  );

  AttendanceUnit = await AttendanceUnit.next();

  return AttendanceUnit.unit;
}

async function createWay(city_key, way_name, timestamp) {
  let result = await db.base.collection("Way").save({
    name: way_name,
    timestamp,
    city: {
      _key: city_key,
    },
    class: {
      key: "street",
      abbreviation: "Rua",
      name: "Rua",
      purpose: "way",
    },
  });

  result = await db.base.collection("Way").document(result);

  return result;
}

async function createNeighborhood(city_key, neighborhood_name, timestamp) {
  let result = await db.base.collection("Neighborhood").save({
    name: neighborhood_name,
    city: {
      _key: city_key,
    },
    timestamp,
  });

  result = await db.base.collection("Neighborhood").document(result);

  return result;
}

async function createProperty(address) {
  /* sempre localiza a property porque pode haver mudança de endereço*/
  let property = await db.base
    .collection("Property")
    .save({ address: address });

  return property;
}

async function loadPropertyByAddress(address) {
  console.log("loadPropertyByAddress");

  let result = await db.base.query(
    `for p in Property 
                    filter p.address.city._key == @city._key
                    filter p.address.way._key == @way._key
                    filter p.address.neighborhood._key == @neighborhood._key
                    filter p.address.number == @number 
                    return p`,
    address
  );

  result = result.next();

  return result;
}

router.get("/", async (req, res) => {
  console.log("getPerson/cpf/susCard");

  let { cpf, susCard } = req.body;

  cpf = cpf || "";
  susCard = susCard || "";

  let result = await db.base.query(
    `
                              for p in Person 
                              filter @cpf == "" OR p.cpf == @cpf
                              filter @susCard == "" OR p.susCard == @susCard
                              return p`,
    { cpf, susCard }
  );

  result = await result.next();

  res.send(result);
});

router.get("/:_key", async (req, res) => {
  try {
    console.log("getPerson/key");

    const person_key = req.params._key;
    console.log("person_key:", person_key);

    let personCursor = await db.base.query(
      `FOR p IN Person FILTER p._key == @person_key RETURN p`,
      { person_key }
    );
    const personData = await personCursor.next();

    if (!personData) {
      return res.status(404).send({ error: "Pessoa não encontrada" });
    }

    const property_key = personData.address?.property?._key;
    if (!property_key) {
      return res
        .status(400)
        .send({ error: "Propriedade do endereço não encontrada na pessoa" });
    }

    const propertyCursor = await db.base.query(
      `FOR prop IN Property FILTER prop._key == @property_key RETURN prop`,
      { property_key }
    );
    const propertyData = await propertyCursor.next();
    if (!propertyData) {
      return res.status(404).send({ error: "Property não encontrada" });
    }

    const way_key = propertyData.address?.way?._key;
    const neighborhood_key = propertyData.address?.neighborhood?._key;
    const city_key = propertyData.address?.city?._key;

    let cityData = {};
    if (city_key) {
      const cityCursor = await db.base.query(
        `FOR c IN City FILTER c._key == @city_key RETURN c`,
        { city_key }
      );
      cityData = (await cityCursor.next()) || {};
    }

    let wayData = {};
    if (way_key) {
      const wayCursor = await db.base.query(
        `FOR w IN Way FILTER w._key == @way_key RETURN w`,
        { way_key }
      );
      wayData = (await wayCursor.next()) || {};
    }

    let neighborhoodData = {};
    if (neighborhood_key) {
      const neighborhoodCursor = await db.base.query(
        `FOR n IN Neighborhood FILTER n._key == @neighborhood_key RETURN n`,
        { neighborhood_key }
      );
      neighborhoodData = (await neighborhoodCursor.next()) || {};
    }

    const doc = {
      _key: personData._key,
      person: {
        _key: personData._key,
        id: personData.id || "",
        name: personData.name || "",
        gender: personData.gender || "",
        susCard: personData.susCard || "",
        birthdate: personData.birthdate || "",
        motherName: personData.motherName || "",
        acs: personData.acs || "",
        esf: personData.esf || "",
        disability: {
          name: personData.disability?.name || "",
        },
        contact: {
          phone: personData.contact?.phone || "",
          email: personData.contact?.email || "",
        },
        job: {
          name: personData.job?.name || "",
        },
        address: {
          property: {
            _key: propertyData._key || "",
            address: {
              way: {
                _key: wayData._key || "",
                name: wayData.name || "",
              },
              neighborhood: {
                _key: neighborhoodData._key || "",
                name: neighborhoodData.name || "",
              },
              city: {
                _key: cityData._key || "",
                name: cityData.name || "",
                state: cityData.state || "",
              },
              number: propertyData.address?.number || "",
            },
          },
        },
      },
    };

    // NOVA PARTE: buscar o último registro de "InProcess" para essa pessoa
    // 10. Busca o último registro da coleção InProcess
    const InProcessCursor = await db.base.query(`
  FOR r IN InProcess
    SORT r._createdAt DESC
    LIMIT 1
    RETURN r._key
`);
    const lastInProcessKey = (await InProcessCursor.next()) || null;

    // 11. Adiciona o _key do último registro de InProcess na resposta
    doc.lastInProcessKey = lastInProcessKey;

    // 12. Retorna o objeto completo como resposta
    res.send(doc);
  } catch (error) {
    console.error("Erro na rota:", error);
    res.status(500).send({ error: "Erro ao processar a requisição" });
  }
});

module.exports = router;
