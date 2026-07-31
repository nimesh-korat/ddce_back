const pool = require("../../../db/dbConnect");

async function getQuestionAnalytics(req, res) {
  const subject_id = req.query.subject_id || null;
  const topic_id = req.query.topic_id || null;
  const subtopic_id = req.query.subtopic_id || null;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  const sort = [
    "subject_name",
    "topic_name",
    "subtopic_name",
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

    // Build WHERE conditions
    const conditions = ["q.is_deleted = 0", "sa.is_count = 0"];
    const params = [];

    if (subject_id) {
      conditions.push("sub.Id = ?");
      params.push(subject_id);
    }
    if (topic_id) {
      conditions.push("t.Id = ?");
      params.push(topic_id);
    }
    if (subtopic_id) {
      conditions.push("st.Id = ?");
      params.push(subtopic_id);
    }
    if (search) {
      conditions.push("q.question_text LIKE ?");
      params.push(search);
    }
    if (batch_id) {
      conditions.push("u.tbl_batch = ?");
      params.push(batch_id);
    }
    if (phase_id) {
      conditions.push("u.tbl_phase = ?");
      params.push(phase_id);
    }

    const where = conditions.join(" AND ");

    const baseSql = `
      FROM tbl_student_answer sa
      JOIN tbl_questions q    ON q.id    = sa.question_id
      JOIN tbl_subtopic st    ON st.Id   = q.tbl_subtopic
      JOIN tbl_topic t        ON t.Id    = st.tbl_topic
      JOIN tbl_subject sub    ON sub.Id  = t.tbl_subject
      JOIN users u            ON u.Id    = sa.student_id
      WHERE ${where}`;

    // Total distinct questions
    const [[{ total }]] = await db.query(
      `SELECT COUNT(DISTINCT q.id) AS total ${baseSql}`,
      [...params],
    );

    // Per-question stats
    const [rows] = await db.query(
      `SELECT
         q.id                                          AS question_id,
         q.question_text,
         q.answer_text                                 AS correct_answer,
         sub.Sub_Name                                  AS subject_name,
         t.topic_name,
         st.SubTopicName                               AS subtopic_name,
         q.question_difficulty,
         COUNT(sa.id)                                  AS total_attempted,
         SUM(CASE WHEN sa.is_correct = '1' THEN 1 ELSE 0 END) AS total_correct,
         SUM(CASE WHEN sa.is_correct = '0' THEN 1 ELSE 0 END) AS total_wrong,
         SUM(CASE WHEN sa.is_correct = '2' THEN 1 ELSE 0 END) AS total_skipped,
         ROUND(
           SUM(CASE WHEN sa.is_correct = '1' THEN 1 ELSE 0 END) * 100.0
           / NULLIF(COUNT(sa.id), 0), 2
         )                                             AS correct_pct
       ${baseSql}
       GROUP BY q.id
       ORDER BY ${sort} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    // Summary stats (totals across all filtered questions, not just current page)
    let summary = null;
    if (subject_id || topic_id || subtopic_id) {
      const [[stats]] = await db.query(
        `SELECT
           COUNT(DISTINCT q.id)                                             AS total_questions,
           SUM(CASE WHEN sa.is_correct='1' THEN 1 ELSE 0 END)             AS total_correct,
           SUM(CASE WHEN sa.is_correct='0' THEN 1 ELSE 0 END)             AS total_wrong,
           SUM(CASE WHEN sa.is_correct='2' THEN 1 ELSE 0 END)             AS total_skipped,
           COUNT(sa.id)                                                     AS total_attempted,
           ROUND(SUM(CASE WHEN sa.is_correct='1' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(sa.id),0),2) AS overall_correct_pct
         FROM tbl_student_answer sa
         JOIN tbl_questions q    ON q.id   = sa.question_id
         JOIN tbl_subtopic st    ON st.Id  = q.tbl_subtopic
         JOIN tbl_topic t        ON t.Id   = st.tbl_topic
         JOIN tbl_subject sub    ON sub.Id = t.tbl_subject
         JOIN users u            ON u.Id   = sa.student_id
         WHERE ${where}`,
        [...params],
      );
      summary = stats;
    }

    return res.status(200).json({
      success: true,
      data: rows,
      summary,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error getQuestionAnalytics:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getQuestionAnalytics };
