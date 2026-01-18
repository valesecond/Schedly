const router = require("express").Router();
const db = require("../config/database");

const collName = "AttendanceUnit";

router.get("/", async (req, res) => {
  try {
    let attendanceCursor = await db.base.query(`
        FOR a IN AttendanceUnit 
          FILTER a._key == "MAIN" 
          RETURN a
      `);
    let attendanceUnit = await attendanceCursor.next();

    if (!attendanceUnit) {
      return res.status(404).send("AttendanceUnit não encontrada.");
    }

    let propertyKey =
      attendanceUnit.address &&
      attendanceUnit.address.property &&
      attendanceUnit.address.property._key;
    if (!propertyKey) {
      return res
        .status(400)
        .send("Chave da propriedade não encontrada na AttendanceUnit.");
    }

    let propertyCursor = await db.base.query(
      `
        FOR p IN Property 
          FILTER p._key == @key 
          RETURN p
      `,
      { key: propertyKey }
    );
    let propertyDoc = await propertyCursor.next();

    if (!propertyDoc) {
      return res.status(404).send("Property não encontrada.");
    }

    let cityKey =
      propertyDoc.address &&
      propertyDoc.address.city &&
      propertyDoc.address.city._key;
    if (!cityKey) {
      return res.status(400).send("Chave da city não encontrada na Property.");
    }

    let cityCursor = await db.base.query(
      `
        FOR c IN City 
          FILTER c._key == @key 
          RETURN { key: c._key, name: c.name, state: c.state }
      `,
      { key: cityKey }
    );
    let cityDoc = await cityCursor.next();

    if (!cityDoc) {
      return res.status(404).send("City não encontrada.");
    }

    res.send(cityDoc);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro interno do servidor.");
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = `
      FOR unit IN AttendanceUnit
        FILTER unit._key != "MAIN"
        // Monta lista "achatada" de serviço + tipo + especialistas
        LET flat = (
          FOR ust IN UnitToServiceType
            FILTER ust._from == unit._id
            FOR st IN ServiceType
              FILTER st._id == ust._to
              FOR sts IN ServiceTypeToService
                FILTER sts._to == st._id
                FOR s IN Service
                  FILTER s._id == sts._from

                  // Busca especialistas na PromiseService
                  LET specialists = (
  FOR p IN PromiseService
    FILTER p.attendanceUnit._key == unit._key
      AND p.serviceType._key == st._key
    FOR sp IN p.specialist
      COLLECT spKey = sp._key, spName = sp.name INTO group
      RETURN { _key: spKey, name: spName }
)


                  RETURN {
                    serviceKey: s._key,
                    serviceName: s.name,
                    typeKey: st._key,
                    typeNome: st.nome,
                    specialists: specialists
                  }
        )

        // Agrupa por serviço
        LET grouped = (
          FOR item IN flat
            COLLECT
              sk = item.serviceKey,
              sn = item.serviceName
            INTO grp
            LET types = (
              FOR x IN grp[*].item
                FILTER x.typeKey != null
                RETURN {
                  key: x.typeKey,
                  nome: x.typeNome,
                  specialists: x.specialists
                }
            )
            RETURN {
              key: sk,
              name: sn,
              types: types
            }
        )

        RETURN {
          _key: unit._key,
          name: unit.name,
          services: grouped
        }
    `;

    const cursor = await db.base.query(query);
    const tree = await cursor.all();

    const specialistsDebug = tree
      .flatMap((unit) => unit.services)
      .flatMap((service) => service.types)
      .flatMap((type) => type.specialists);

    console.log("🔍 ESPECIALISTAS ENCONTRADOS:", specialistsDebug);
    console.log("ESSA AQUI É A ÁRVORE:", tree);

    res.json(tree);
  } catch (err) {
    console.error("Erro ao buscar árvore de unidades:", err);
    res.status(500).json({ error: "Erro interno ao buscar unidades" });
  }
});

router.post("/", async (req, res) => {
  try {
    const unitData = req.body;
    let propertyKey = "";

    const addressInput = unitData.address?.property?.address;

    if (addressInput) {
      const address = {
        city: { _key: addressInput.city._key },
        way: { _key: addressInput.way?._key || null },
        neighborhood: { _key: addressInput.neighborhood?._key || null },
        number: addressInput.number,
      };

      // Verifica se a Property já existe
      const propertyCursor = await db.base.query(
        `
          FOR p IN Property
            FILTER p.address.city._key == @city
              AND p.address.way._key == @way
              AND p.address.neighborhood._key == @neighborhood
              AND p.address.number == @number
            RETURN p
        `,
        {
          city: address.city._key,
          way: address.way,
          neighborhood: address.neighborhood,
          number: address.number,
        }
      );

      const existingProperty = await propertyCursor.next();

      if (!existingProperty) {
        const newProperty = await db.base
          .collection("Property")
          .save({ address });
        propertyKey = newProperty._key;
      } else {
        propertyKey = existingProperty._key;
      }
    }

    // Monta o documento final
    const unitToSave = {
      name: unitData.name,
      cnes: unitData.cnes,
      contact: unitData.contact,
      city: unitData.city,
      way: unitData.way || "",
      neighborhood: unitData.neighborhood || "",
      number: unitData.number || "",
      address: {
        property: {
          _key: propertyKey,
        },
      },
    };

    // Usa _key do body se vier
    if (unitData._key) {
      unitToSave._key = unitData._key;
    }

    const savedUnit = await db.base
      .collection("AttendanceUnit")
      .save(unitToSave);
    res.send({ _key: savedUnit._key });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Erro ao salvar a unidade" });
  }
});

module.exports = router;
