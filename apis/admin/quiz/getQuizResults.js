const pool = require("../../../db/dbConnect");

async function getQuizResults(req, res) {
  const test_id = req.query.test_id || null;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit)
    : 25;
  const offset = (page - 1) * limit;

  try {
    const db = pool.promise();

    // ── 1. Get all tests that have been assigned (with batch+phase) ──
    const [tests] = await db.query(
      `SELECT DISTINCT t.id, t.test_name,
         ta.tbl_batch, ta.tbl_phase,
         b.batch_title, p.title AS phase_title
       FROM tbl_test t
       JOIN tbl_test_assigned ta ON ta.tbl_test = t.id
       LEFT JOIN tbl_batch b ON b.id = ta.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id = ta.tbl_phase
       ORDER BY t.test_name ASC`,
    );

    if (!test_id)
      return res
        .status(200)
        .json({
          success: true,
          tests,
          data: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });

    // ── 2. Build filter conditions ────────────────────────────────
    const conditions = ["fr.test_id = ?"];
    const params = [test_id];

    if (batch_id) {
      conditions.push("ta.tbl_batch = ?");
      params.push(batch_id);
    }
    if (phase_id) {
      conditions.push("ta.tbl_phase = ?");
      params.push(phase_id);
    }

    const where = conditions.join(" AND ");

    // ── 3. Total count ────────────────────────────────────────────
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM tbl_final_result fr
       JOIN tbl_test_assigned ta ON ta.tbl_test = fr.test_id
         AND (ta.tbl_batch = (SELECT tbl_batch FROM users WHERE Id = fr.std_id LIMIT 1))
       WHERE ${where}`,
      params,
    );

    // ── 4. Results with student + batch info ──────────────────────
    const [rows] = await db.query(
      `SELECT
         fr.id, fr.std_id, fr.test_id,
         fr.total_correct, fr.total_incorrect, fr.total_skipped,
         fr.obtained_marks, fr.total_marks, fr.result_gen_datetime,
         u.Name AS student_name, u.College_Name AS college,
         u.tbl_batch, u.tbl_phase,
         b.batch_title, p.title AS phase_title,
         ROUND(fr.total_correct * 100.0 / NULLIF(fr.total_correct + fr.total_incorrect + fr.total_skipped, 0), 2) AS accuracy_pct,
         ROUND(fr.obtained_marks * 100.0 / NULLIF(fr.total_marks, 0), 2) AS score_pct
       FROM tbl_final_result fr
       JOIN users u ON u.Id = fr.std_id
       LEFT JOIN tbl_batch b ON b.id = u.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id = u.tbl_phase
       WHERE fr.test_id = ?
         ${batch_id ? "AND u.tbl_batch = ?" : ""}
         ${phase_id ? "AND u.tbl_phase = ?" : ""}
       ORDER BY fr.obtained_marks DESC, fr.total_correct DESC
       LIMIT ? OFFSET ?`,
      [
        test_id,
        ...(batch_id ? [batch_id] : []),
        ...(phase_id ? [phase_id] : []),
        limit,
        offset,
      ],
    );

    return res.status(200).json({
      success: true,
      tests,
      data: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error getQuizResults:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getQuizResults };
