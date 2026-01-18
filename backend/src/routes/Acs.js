const router = require('express').Router()
const db = require('../config/database')

const collName = "ACS"

router.post("/", async (req, res) => {

  const data = req.body

  let result = await db.base.collection(collName).save(data);

  const _key = result._key;

  result = await db.base.query(`for p in ${collName} filter p._key == @_key return p`,{_key})

  result = await result.next();

  res.send(result)
})

router.put("/search", async (req, res) => {
    let { name, esf_key } = req.body; // Recebe o nome para busca e o identificador da ESF
  
    console.log("Buscando ACS para ESF:", esf_key, "com o nome:", name);
  
    const cursor = await db.base.query(`
      FOR doc IN ACS
        FILTER doc.esf._key == @esf_key
        LET nameTokens = CONCAT_SEPARATOR(" ", TOKENS(doc.name, "text_de"))
        LET searchTokens = CONCAT_SEPARATOR(" ", TOKENS(@name, "text_de"))
        FILTER STARTS_WITH(nameTokens, searchTokens)
        LIMIT 0,5
        RETURN doc
    `, { name, esf_key });
  
    const result = await cursor.all();
    res.status(200).send(result);
  });

  
router.get('/', async (req, res) => {
  console.log("getPerson/cpf/susCard");

  let {cpf,susCard} = req.body;

  cpf = cpf || ""
  susCard = susCard || ""

  let result = await db.base.query(`
                              for p in ${collectionName} 
                              filter @cpf == "" OR p.cpf == @cpf
                              filter @susCard == "" OR p.susCard == @susCard
                              return p`,{cpf,susCard})

  result = await result.next();
  
  res.send(result);
})

router.get('/:_key', async (req, res) => {
  console.log("getPerson/key");

  const person_key = req.params._key

  let result = await db.base.query(`for p in ${collectionName} filter p._key == @person_key`,{person_key})

  result = result.next();
  
  res.send(result);
})



module.exports = router