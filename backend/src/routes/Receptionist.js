const router = require("express").Router()
const db = require("../config/database")

const col_name = "Receptionist"

router.post("/", async (req, res) => {
    const receptionist = req.body;
    const result = await db.collection(col_name).save(receptionist)
    res.send(result)
})

router.get("/", async (req, res) => {
    const result = await db.query(`FOR r IN ${col_name} RETURN r`)
    const receptionist = await result.all()
    res.send(receptionist)
})

router.get("/:id", async (req, res) => {
    const id = req.params.id
    const result = await db.query(`FOR r IN ${col_name} FILTER r._key == @id RETURN r`, { id })
    const receptionist = await result.all()
    res.send(receptionist)
})

router.put("/:id", async (req, res) => {
    const id = req.params.id
    const newreceptionist = req.body
    const result = await db.collection(col_name).update(id, newreceptionist)
    res.send(result)
})

router.delete("/:id", async (req, res) => {
    const id = req.params.id
    const result = await db.collection(col_name).remove(id)
    res.send(result)
})

module.exports = router