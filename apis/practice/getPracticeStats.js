const pool = require("../../db/dbConnect");

async function getPracticeStats(req, res) {
  const student_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;

  if (!student_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    // Get subjects available in active assignments for this student's batch
    const sql = `
      SELECT
        sub.Id AS subject_id,
        sub.Sub_Name AS subject_name,
        COUNT(DISTINCT pq.question_id) AS total_questions,
        COUNT(DISTINCT ans.question_id) AS attempted,
        COUNT(DISTINCT CASE WHEN ans.is_correct = '1' THEN ans.question_id END) AS correct,
        COUNT(DISTINCT CASE WHEN ans.is_correct = '0' THEN ans.question_id END) AS wrong,
        COUNT(DISTINCT pq.question_id) - COUNT(DISTINCT ans.question_id) AS remaining
      FROM tbl_practice_questions pq
      JOIN tbl_practice_assigned pa ON pa.id = pq.practice_assigned_id
      JOIN tbl_subject sub ON sub.Id = pq.subject_id
      LEFT JOIN tbl_practice_answer ans ON ans.question_id = pq.question_id
        AND ans.practice_assigned_id = pq.practice_assigned_id
        AND ans.student_id = ?
      WHERE pa.tbl_batch = ?
        AND (pa.tbl_phase IS NULL OR pa.tbl_phase = ?)
        AND pa.is_deleted = 0
        AND (pa.start_date IS NULL OR pa.start_date <= NOW())
        AND (pa.end_date IS NULL OR pa.end_date >= NOW())
      GROUP BY sub.Id, sub.Sub_Name
      ORDER BY sub.Id ASC
    `;

    const [subjects] = await pool.promise().query(sql, [student_id, batch_id, phase_id]);

    const totals = subjects.reduce(
      (acc, s) => {
        acc.total += s.total_questions;
        acc.attempted += s.attempted;
        acc.correct += s.correct;
        acc.wrong += s.wrong;
        acc.remaining += s.remaining;
        return acc;
      },
      { total: 0, attempted: 0, correct: 0, wrong: 0, remaining: 0 }
    );

    return res.status(200).json({ success: true, data: { subjects, totals } });
  } catch (err) {
    console.error("Error getPracticeStats:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getPracticeStats };
