const pool = require("../../../db/dbConnect");

async function getQuizResults(req, res) {
  const test_id = req.query.test_id || null;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;
  const not_attempted = req.query.not_attempted === "1";
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit)
    : 25;
  const offset = (page - 1) * limit;

  try {
    const db = pool.promise();

    // ── 1. Tests that have results (for dropdown) ───────────
    const [tests] = await db.query(
      `SELECT DISTINCT t.id, t.test_name,
         ta.tbl_batch, ta.tbl_phase,
         b.batch_title, p.title AS phase_title
       FROM tbl_test t
       JOIN tbl_final_result fr ON fr.test_id = t.id
       LEFT JOIN tbl_test_assigned ta ON ta.tbl_test = t.id
       LEFT JOIN tbl_batch b ON b.id = ta.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id = ta.tbl_phase
       ORDER BY t.id DESC`,
    );

    if (!test_id)
      return res.status(200).json({
        success: true,
        tests,
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });

    // ── 2a. NOT ATTEMPTED mode ────────────────────────────────
    if (not_attempted) {
      // Get batches/phases assigned to this test
      const [assignedRows] = await db.query(
        `SELECT DISTINCT tbl_batch, tbl_phase FROM tbl_test_assigned WHERE tbl_test = ?`,
        [test_id],
      );

      if (assignedRows.length === 0) {
        return res.status(200).json({
          success: true,
          tests,
          data: [],
          not_attempted: true,
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }

      // Build conditions for students in assigned batches/phases
      const naConditions = [];
      const naParams = [];

      if (batch_id) {
        naConditions.push("u.tbl_batch = ?");
        naParams.push(batch_id);
      } else {
        const batchIds = [
          ...new Set(assignedRows.map((r) => r.tbl_batch).filter(Boolean)),
        ];
        if (batchIds.length > 0) {
          naConditions.push(
            `u.tbl_batch IN (${batchIds.map(() => "?").join(",")})`,
          );
          naParams.push(...batchIds);
        }
      }

      if (phase_id) {
        naConditions.push("u.tbl_phase = ?");
        naParams.push(phase_id);
      } else {
        const phaseIds = [
          ...new Set(assignedRows.map((r) => r.tbl_phase).filter(Boolean)),
        ];
        if (phaseIds.length > 0) {
          naConditions.push(
            `u.tbl_phase IN (${phaseIds.map(() => "?").join(",")})`,
          );
          naParams.push(...phaseIds);
        }
      }

      // Exclude students who have attempted (use NOT EXISTS to handle NULLs correctly)
      naConditions.push(
        `NOT EXISTS (SELECT 1 FROM tbl_final_result fr2 WHERE fr2.std_id = u.Id AND fr2.test_id = ?)`,
      );
      naParams.push(test_id);

      const naWhere =
        naConditions.length > 0 ? naConditions.join(" AND ") : "1=1";

      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM users u WHERE ${naWhere}`,
        [...naParams],
      );

      const [rows] = await db.query(
        `SELECT
           u.Id AS std_id,
           u.Name AS student_name,
           u.Phone_Number AS mobile_no,
           u.College_Name AS college,
           u.tbl_batch, u.tbl_phase,
           b.batch_title,
           ph.title AS phase_title
         FROM users u
         LEFT JOIN tbl_batch b  ON b.id  = u.tbl_batch
         LEFT JOIN tbl_phase ph ON ph.Id = u.tbl_phase
         WHERE ${naWhere}
         ORDER BY u.Name ASC
         LIMIT ? OFFSET ?`,
        [...naParams, limit, offset],
      );

      return res.status(200).json({
        success: true,
        tests,
        data: rows,
        not_attempted: true,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // ── 2b. Normal (attempted) mode ───────────────────────────
    const conditions = ["fr.test_id = ?"];
    const params = [test_id];

    if (batch_id) {
      conditions.push("u.tbl_batch = ?");
      params.push(batch_id);
    }
    if (phase_id) {
      conditions.push("u.tbl_phase = ?");
      params.push(phase_id);
    }

    const where = conditions.join(" AND ");

    // ── 3. Total count ────────────────────────────────────────
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM tbl_final_result fr
       JOIN users u ON u.Id = fr.std_id
       WHERE ${where}`,
      [...params],
    );

    // ── 4. Paginated results ──────────────────────────────────
    const [rows] = await db.query(
      `SELECT
         fr.id, fr.std_id, fr.test_id,
         fr.total_correct, fr.total_incorrect, fr.total_skipped,
         fr.obtained_marks, fr.total_marks,
         fr.result_gen_datetime,
         u.Name       AS student_name,
         u.Phone_Number AS mobile_no,
         u.College_Name AS college,
         u.tbl_batch, u.tbl_phase,
         b.batch_title,
         ph.title     AS phase_title,
         ROUND(
           fr.total_correct * 100.0 /
           NULLIF(fr.total_correct + fr.total_incorrect + fr.total_skipped, 0),
         2) AS accuracy_pct,
         ROUND(
           fr.obtained_marks * 100.0 / NULLIF(fr.total_marks, 0),
         2) AS score_pct
       FROM tbl_final_result fr
       JOIN users u         ON u.Id    = fr.std_id
       LEFT JOIN tbl_batch  b  ON b.id   = u.tbl_batch
       LEFT JOIN tbl_phase  ph ON ph.Id  = u.tbl_phase
       WHERE ${where}
       ORDER BY fr.obtained_marks DESC, fr.total_correct DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
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
