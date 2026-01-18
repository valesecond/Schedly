const router = require("express").Router();
const db = require("../config/database");

const collName = "Media";

router.put("/", async (req, res) => {
  const { system } = req.body;

  try {
    let result = await db.base.query(
      `FOR m IN ${collName} FILTER m.system == @system RETURN m`,
      { system }
    );

    let videos = await result.all();

    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar vídeos" });
  }
});

module.exports = router;
