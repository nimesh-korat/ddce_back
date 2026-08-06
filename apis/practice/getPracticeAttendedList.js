const pool = require("../../db/dbConnect");

async function getPracticeAttendedList(req, res) {
  const { practice_id } = req.params;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;

  if (!practice_id)
    return res
      .status(400)
      .json({ success: false, message: "practice_id required" });

  try {
    const db = pool.promise();

    // Get all batch assignments for this practice
    const [assignments] = await db.query(
      `SELECT pa.id AS batch_assignment_id, pa.tbl_batch, pa.tbl_phase,
         b.batch_title, p.title AS phase_title
       FROM tbl_practice_assigned pa
       LEFT JOIN tbl_batch b ON b.id  = pa.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id  = pa.tbl_phase
       WHERE pa.practice_id = ?`,
      [practice_id],
    );

    // Total questions in this practice
    const [[{ total_questions }]] = await db.query(
      `SELECT COUNT(*) AS total_questions FROM tbl_practice_questions WHERE practice_id = ?`,
      [practice_id],
    );

    // Get assignment IDs
    const assignmentIds = assignments.map((a) => a.batch_assignment_id);
    if (assignmentIds.length === 0)
      return res
        .status(200)
        .json({ success: true, data: [], assignments: [], total_questions });

    // Filter by batch/phase if provided
    let filteredAssignmentIds = assignmentIds;
    if (batch_id || phase_id) {
      filteredAssignmentIds = assignments
        .filter(
          (a) =>
            (!batch_id || String(a.tbl_batch) === String(batch_id)) &&
            (!phase_id || String(a.tbl_phase) === String(phase_id)),
        )
        .map((a) => a.batch_assignment_id);
      if (filteredAssignmentIds.length === 0)
        return res
          .status(200)
          .json({ success: true, data: [], assignments, total_questions });
    }

    const ph = filteredAssignmentIds.map(() => "?").join(",");

    const [rows] = await db.query(
      `SELECT
         u.Id           AS student_id,
         u.Name         AS student_name,
         u.College_Name AS college,
         u.tbl_batch, u.tbl_phase,
         b.batch_title, p.title AS phase_title,
         COUNT(DISTINCT pa.question_id)                                     AS attempted,
         SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END)               AS correct,
         SUM(CASE WHEN pa.is_correct='0' THEN 1 ELSE 0 END)               AS wrong,
         MAX(pa.attempted_on)                                               AS last_attempted,
         ROUND(SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END)*100.0
               / NULLIF(COUNT(DISTINCT pa.question_id),0), 2)             AS accuracy_pct
       FROM tbl_practice_answer pa
       JOIN users u        ON u.Id  = pa.student_id
       LEFT JOIN tbl_batch b  ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase p  ON p.Id  = u.tbl_phase
       WHERE pa.practice_assigned_id IN (${ph})
       GROUP BY u.Id
       ORDER BY accuracy_pct DESC, attempted DESC`,
      filteredAssignmentIds,
    );

    return res.status(200).json({
      success: true,
      data: rows,
      assignments,
      total_questions,
    });
  } catch (err) {
    console.error("Error getPracticeAttendedList:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getPracticeAttendedList };
