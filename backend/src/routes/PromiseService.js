const router = require("express").Router();
const db = require("../config/database");

router.get("/:unitKey/:serviceTypeKey/:specialistKey", async (req, res) => {
  const { unitKey, serviceTypeKey, specialistKey } = req.params;

  try {
    const cursor = await db.base.query(
      `
  FOR ps IN PromiseService
    FILTER ps.attendanceUnit._key == @unitKey
      AND ps.serviceType._key == @serviceTypeKey
      AND LENGTH(
        FOR sp IN ps.specialist
          FILTER sp._key == @specialistKey
          RETURN 1
      ) > 0
    RETURN ps
  `,
      { unitKey, serviceTypeKey, specialistKey }
    );

    const promiseService = await cursor.next();

    if (!promiseService) {
      return res.status(404).json({ error: "Serviço não encontrado." });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // só data, sem hora

    // Verifica se existe pelo menos 1 dia com data >= hoje e vagas > 0
    const hasValidDay = (promiseService.scheduledDays || []).some(
      ({ date, vacancyLimit }) => {
        const scheduledDate = new Date(date.date);
        scheduledDate.setHours(0, 0, 0, 0);

        return scheduledDate >= now && (vacancyLimit || 0) > 0;
      }
    );

    console.log("hasValidDay:", hasValidDay);

    return res.json({ available: hasValidDay });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor." });
  }
});

router.get("/:unitKey/:serviceTypeKey", async (req, res) => {
  const { unitKey, serviceTypeKey } = req.params;

  try {
    const cursor = await db.base.query(
      `
      FOR ps IN PromiseService
        FILTER ps.attendanceUnit._key == @unitKey
          AND ps.serviceType._key == @serviceTypeKey
        RETURN ps
      `,
      { unitKey, serviceTypeKey }
    );

    let promiseService = await cursor.next();

    if (!promiseService) {
      const newKey = `${unitKey}_${serviceTypeKey}`;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");

      const timestamp = {
        day: now.getDate(),
        month: now.getMonth() + 1,
        year: String(now.getFullYear()),
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
          now.getSeconds()
        )}`,
        date: `${pad(now.getDate())}/${pad(
          now.getMonth() + 1
        )}/${now.getFullYear()}`,
        datetime: now.toISOString(),
      };

      const novo = {
        _key: newKey,
        attendanceUnit: {
          _key: unitKey,
          name: unitKey,
        },
        serviceType: {
          _key: serviceTypeKey,
          name: serviceTypeKey,
        },
        scheduledDays: [],
        specialist: [],
        observations: "",
        service: "CONSULTA",
        timestamp,
      };

      await db.base.collection("PromiseService").save(novo);

      return res.json({ available: false, created: true });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const hasValidDay = (promiseService.scheduledDays || []).some(
      ({ date, vacancyLimit }) => {
        const scheduledDate = new Date(date.date);
        scheduledDate.setHours(0, 0, 0, 0);
        return scheduledDate >= now && (vacancyLimit || 0) > 0;
      }
    );

    return res.json({ available: hasValidDay, created: false });
  } catch (err) {
    console.error("Erro ao verificar vaga genérica:", err);
    return res.status(500).json({ error: "Erro no servidor." });
  }
});

module.exports = router;
