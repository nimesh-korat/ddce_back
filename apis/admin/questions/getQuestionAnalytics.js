const pool = require("../../../db/dbConnect");

async function getQuestionAnalytics(req, res) {
  const subject_id = req.query.subject_id || null;
  const topic_id = req.query.topic_id || null;
  const subtopic_id = req.query.subtopic_id || null;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  const sort = [
    "total_attempted",
    "total_correct",
    "total_wrong",
    "total_skipped",
    "correct_pct",
  ].includes(req.query.sort)
    ? req.query.sort
    : "total_attempted";
  const dir = req.query.dir === "asc" ? "ASC" : "DESC";
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit)
    : 25;
  const offset = (page - 1) * limit;

  try {
    const db = pool.promise();

    // ── Question filters ──────────────────────────────────────
    const qCond = ["q.is_deleted = 0"];
    const qP = [];
    if (subject_id) {
      qCond.push("sub.Id = ?");
      qP.push(subject_id);
    }
    if (topic_id) {
      qCond.push("t.Id = ?");
      qP.push(topic_id);
    }
    if (subtopic_id) {
      qCond.push("st.Id = ?");
      qP.push(subtopic_id);
    }
    if (search) {
      qCond.push("q.question_text LIKE ?");
      qP.push(search);
    }
    const qWhere = qCond.join(" AND ");

    // ── Get question IDs first (fast) ─────────────────────────
    const [qIds] = await db.query(
      `SELECT q.id FROM tbl_questions q
       JOIN tbl_subtopic st ON st.Id  = q.tbl_subtopic
       JOIN tbl_topic t     ON t.Id   = st.tbl_topic
       JOIN tbl_subject sub ON sub.Id = t.tbl_subject
       WHERE ${qWhere}`,
      qP,
    );

    if (qIds.length === 0)
      return res
        .status(200)
        .json({
          success: true,
          data: [],
          summary: null,
          pagination: { total: 0, page, limit, totalPages: 0 },
        });

    const ids = qIds.map((r) => r.id);
    const ph = ids.map(() => "?").join(",");

    // ── Get student IDs matching batch/phase (if filtered) ────
    let studentIds = null;
    if (batch_id || phase_id) {
      const uCond = [];
      const uP = [];
      if (batch_id) {
        uCond.push("tbl_batch = ?");
        uP.push(batch_id);
      }
      if (phase_id) {
        uCond.push("tbl_phase = ?");
        uP.push(phase_id);
      }
      const [uRows] = await db.query(
        `SELECT Id FROM users WHERE ${uCond.join(" AND ")}`,
        uP,
      );
      studentIds = uRows.map((r) => r.Id);
      if (studentIds.length === 0)
        return res
          .status(200)
          .json({
            success: true,
            data: [],
            summary: null,
            pagination: { total: 0, page, limit, totalPages: 0 },
          });
    }

    const sph = studentIds ? studentIds.map(() => "?").join(",") : null;
    const sFilter = studentIds ? `AND student_id IN (${sph})` : "";
    const sP = studentIds || [];

    // ── Aggregate quiz answers ────────────────────────────────
    const [quizRows] = await db.query(
      `SELECT question_id,
         SUM(is_correct='1') AS correct,
         SUM(is_correct='0') AS wrong,
         SUM(is_correct='2') AS skipped,
         COUNT(*)            AS attempted
       FROM tbl_student_answer
       WHERE question_id IN (${ph})
         AND (is_count IS NULL OR is_count = 0)
         ${sFilter}
       GROUP BY question_id`,
      [...ids, ...sP],
    );

    // ── Aggregate practice answers ────────────────────────────
    const [pracRows] = await db.query(
      `SELECT question_id,
         SUM(is_correct='1') AS correct,
         SUM(is_correct='0') AS wrong,
         0                   AS skipped,
         COUNT(*)            AS attempted
       FROM tbl_practice_answer
       WHERE question_id IN (${ph})
         AND (is_count IS NULL OR is_count = 0)
         ${sFilter}
       GROUP BY question_id`,
      [...ids, ...sP],
    );

    // ── Merge into a map ──────────────────────────────────────
    const statsMap = {};
    const merge = (rows) =>
      rows.forEach((r) => {
        const id = r.question_id;
        if (!statsMap[id])
          statsMap[id] = { correct: 0, wrong: 0, skipped: 0, attempted: 0 };
        statsMap[id].correct += parseInt(r.correct) || 0;
        statsMap[id].wrong += parseInt(r.wrong) || 0;
        statsMap[id].skipped += parseInt(r.skipped) || 0;
        statsMap[id].attempted += parseInt(r.attempted) || 0;
      });
    merge(quizRows);
    merge(pracRows);

    // Only keep questions that have at least 1 answer
    const answeredIds = Object.keys(statsMap)
      .map(Number)
      .filter((id) => ids.includes(id));
    if (answeredIds.length === 0)
      return res
        .status(200)
        .json({
          success: true,
          data: [],
          summary: null,
          pagination: { total: 0, page, limit, totalPages: 0 },
        });

    // ── Get question details for answered ones ────────────────
    const [qDetails] = await db.query(
      `SELECT q.id AS question_id, q.question_text, q.answer_text AS correct_answer,
         sub.Sub_Name AS subject_name, t.topic_name, st.SubTopicName AS subtopic_name
       FROM tbl_questions q
       JOIN tbl_subtopic st ON st.Id  = q.tbl_subtopic
       JOIN tbl_topic t     ON t.Id   = st.tbl_topic
       JOIN tbl_subject sub ON sub.Id = t.tbl_subject
       WHERE q.id IN (${answeredIds.map(() => "?").join(",")})`,
      answeredIds,
    );

    // ── Build result rows ─────────────────────────────────────
    let result = qDetails.map((q) => {
      const s = statsMap[q.question_id] || {};
      const correct = s.correct || 0;
      const wrong = s.wrong || 0;
      const skipped = s.skipped || 0;
      const attempted = s.attempted || 0;
      return {
        ...q,
        total_correct: correct,
        total_wrong: wrong,
        total_skipped: skipped,
        total_attempted: attempted,
        correct_pct:
          attempted > 0 ? Math.round((correct * 10000) / attempted) / 100 : 0,
      };
    });

    // Sort
    result.sort((a, b) => {
      const va = a[sort] ?? 0;
      const vb = b[sort] ?? 0;
      return dir === "ASC" ? va - vb : vb - va;
    });

    const total = result.length;
    const paginated = result.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    // ── Summary ───────────────────────────────────────────────
    let summary = null;
    if (subject_id || topic_id || subtopic_id) {
      const tot_correct = result.reduce((s, r) => s + r.total_correct, 0);
      const tot_wrong = result.reduce((s, r) => s + r.total_wrong, 0);
      const tot_skipped = result.reduce((s, r) => s + r.total_skipped, 0);
      const tot_attempted = result.reduce((s, r) => s + r.total_attempted, 0);
      summary = {
        total_questions: total,
        total_correct: tot_correct,
        total_wrong: tot_wrong,
        total_skipped: tot_skipped,
        total_attempted: tot_attempted,
        overall_correct_pct:
          tot_attempted > 0
            ? Math.round((tot_correct * 10000) / tot_attempted) / 100
            : 0,
      };
    }

    return res.status(200).json({
      success: true,
      data: paginated,
      summary,
      pagination: { total, page, limit, totalPages },
    });
  } catch (err) {
    console.error("Error getQuestionAnalytics:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getQuestionAnalytics };
