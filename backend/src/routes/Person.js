const router = require("express").Router();
const db = require("../config/database");
const { generateSignedUrl } = require("../config/Storage");

const collName = "Person";

router.put("/docs", async (req, res) => {
  try {
    const { person_key } = req.body;

    const cursor = await db.base.query(
      `
      FOR p IN Person
      FILTER p._key == @key
      RETURN p
    `,
      { key: person_key }
    );

    const doc = await cursor.next();

    if (!doc) {
      return res.status(404).json({ error: "Pessoa não encontrada" });
    }

    const arquivos = [];

    for (const item of doc.l_docs || []) {
      const url = await generateSignedUrl(item.filename);

      arquivos.push({
        type: item.type,
        filename: item.filename,
        url,
      });
    }

    return res.json({
      name: doc.name,
      l_docs: arquivos,
    });
  } catch (err) {
    console.error("Erro /person/docs:", err);
    return res.status(500).json({ error: "Erro ao carregar documentos." });
  }
});

router.post("/", async (req, res) => {
  const person = req.body;

  let result = await db.collection(collName).save(person);

  const person_key = result._key;

  result = await db.query(`for p in ${collName} filter p._key == @person_key`, {
    person_key,
  });

  result = await result.next();

  res.send(result);
});

router.put("/", async (req, res) => {
  const person = req.body;

  await db.collection(collName).update(person._key, person);

  res.send(person);
});

router.get("/", async (req, res) => {
  console.log("getPerson/cpf/susCard");

  let { cpf, susCard } = req.body;

  cpf = cpf || "";
  susCard = susCard || "";

  let result = await db.query(
    `
                              for p in ${collName} 
                              filter @cpf == "" OR p.cpf == @cpf
                              filter @susCard == "" OR p.susCard == @susCard
                              return p`,
    { cpf, susCard }
  );

  result = await result.next();

  res.send(result);
});

router.put("/search", async (req, res) => {
  console.log("getPerson");

  let id = req.body.id || "";
  let susCard = req.body.susCard || "";
  let _key = req.body._key || "";

  const dataSearch = {
    id: id.toString(),
    susCard: susCard.toString(),
    _key: _key.toString(),
  };

  let result = await db.base.query(
    `
    for p in ${collName}
    
    filter @id == "" OR p.id == @id
    filter @susCard == "" OR p.susCard == @susCard
    filter @_key == "" OR p._key == @_key
    
    let property = (for pr in Property filter p.address.property._key == pr._key
    
      let way = (for w in Way filter w._key == pr.address.way._key return w)
      let neighborhood =  (for n in Neighborhood filter n._key == pr.address.neighborhood._key return n)
      let city =  (for c in City filter c._key == pr.address.city._key return c)
      
      return {"_key":pr._key,"address":{"city":city[0],"way":way[0], "neighborhood":neighborhood[0],"number":pr.address.number}}
    ) 
    
    return {"property":property[0],"person":p}`,
    dataSearch
  );

  result = await result.next();

  if (!result) {
    result = {
      success: false,
    };
  } else {
    result = {
      success: true,
      data: result,
    };
  }
  console.log(result.data);
  res.send(result);
});

router.put("/search/name", async (req, res) => {
  console.log("searchByName");

  let { name } = req.body;

  const cursor = await db.base.query(
    `
  for p in Person 
      LET name = CONCAT_SEPARATOR(" ", TOKENS(p.name, "text_de"))
      LET name_ = CONCAT_SEPARATOR(" ", TOKENS(@name, "text_de"))
      filter  STARTS_WITH(name,name_)
      filter has(p,"motherName")
      filter p.motherName != "" 

      let property = (for pr in Property filter p.address.property._key == pr._key
      
        let way = (for w in Way filter w._key == pr.address.way._key return w)
        let neighborhood =  (for n in Neighborhood filter n._key == pr.address.neighborhood._key return n)
        let city =  (for c in City filter c._key == pr.address.city._key return c)
        
        return {"_key":pr._key,"address":{"city":city[0],"way":way[0], "neighborhood":neighborhood[0],"number":pr.address.number}}
      ) 
      limit 0,5
      return {"property":property[0],"person":p}
      `,
    { name }
  );

  let result = await cursor.all();

  console.log("RESULTADO RESULTADO");

  console.log(result);

  if (!result) {
    result = {
      success: false,
    };
  } else {
    result = {
      success: true,
      data: result,
    };
  }
  res.send(result);
});

router.put("/search/id", async (req, res) => {
  console.log("searchById");
  const { id } = req.body;

  if (!id || id.length < 2) {
    return res.send({ success: true, data: [] });
  }

  try {
    const cursor = await db.base.query(
      `
      FOR p IN Person
        FILTER STARTS_WITH(TO_STRING(p.id), @id)
          AND HAS(p, "name") && p.name != ""
        LET property = (
          FOR pr IN Property
            FILTER p.address.property._key == pr._key

            LET way = FIRST(
              FOR w IN Way
                FILTER w._key == pr.address.way._key
                RETURN w
            )

            LET neighborhood = FIRST(
              FOR n IN Neighborhood
                FILTER n._key == pr.address.neighborhood._key
                RETURN n
            )

            LET city = FIRST(
              FOR c IN City
                FILTER c._key == pr.address.city._key
                RETURN c
            )

            RETURN {
              _key: pr._key,
              address: {
                city,
                way,
                neighborhood,
                number: pr.address.number
              }
            }
        )
        LIMIT 5
        RETURN {
          person: p,             // retorna TODO o Person
          property: property[0]  // address sem arrays
        }
    `,
      { id }
    );

    const data = await cursor.all();
    res.send({ success: true, data });
  } catch (err) {
    console.error("Erro em /search/id:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});

module.exports = router;
