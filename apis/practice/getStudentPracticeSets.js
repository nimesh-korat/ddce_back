const pool = require("../../db/dbConnect");

async function getStudentPracticeSets(req, res) {
  const student_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;

  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    // Get all visible practice assignments for student's batch + phase
    const [sets] = await pool.promise().query(
      `SELECT
         pa.id,
         pa.title,
         pa.created_at,
         a.Name                               AS assigned_by_name,
         pa.id                               AS batch_assignment_id,
         pa.start_date,
         pa.end_date,
   
         COUNT(DISTINCT pq.question_id)       AS total_questions,
         CASE
           WHEN pa.start_date IS NOT NULL AND pa.start_date > NOW() THEN 'upcoming'
           WHEN pa.end_date   IS NOT NULL AND pa.end_date   < NOW() THEN 'ended'
           ELSE 'active'
         END                                  AS status
       FROM tbl_practice_assigned pa
       LEFT JOIN admin a
         ON a.Id = pa.assigned_by
       LEFT JOIN tbl_practice_questions pq
         ON pq.practice_assigned_id = pa.id
       WHERE pa.tbl_batch  = ?
         AND (pa.tbl_phase IS NULL OR pa.tbl_phase = ?)
         
         AND pa.is_deleted  = 0
       GROUP BY pa.id, pa.id
       ORDER BY pa.created_at DESC`,
      [batch_id, phase_id],
    );

    if (sets.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // For each set, get per-student counts in a single batched query
    const practiceIds = sets.map((s) => s.id);
    const placeholders = practiceIds.map(() => "?").join(",");

    const [answerCounts] = await pool.promise().query(
      `SELECT
         practice_assigned_id,
         COUNT(*)                                                  AS attempted,
         SUM(CASE WHEN is_correct = '1' THEN 1 ELSE 0 END)       AS correct,
         SUM(CASE WHEN is_correct = '0' THEN 1 ELSE 0 END)       AS wrong
       FROM tbl_practice_answer
       WHERE student_id = ?
         AND practice_assigned_id IN (${placeholders})
       GROUP BY practice_assigned_id`,
      [student_id, ...practiceIds],
    );

    // Build lookup map
    const countMap = {};
    answerCounts.forEach((r) => {
      countMap[r.practice_assigned_id] = {
        attempted: parseInt(r.attempted) || 0,
        correct: parseInt(r.correct) || 0,
        wrong: parseInt(r.wrong) || 0,
      };
    });

    // Merge counts into sets
    const result = sets.map((s) => {
      const counts = countMap[s.id] || { attempted: 0, correct: 0, wrong: 0 };
      const total = parseInt(s.total_questions) || 0;
      return {
        id: s.id,
        title: s.title,
        assigned_by_name: s.assigned_by_name,
        batch_assignment_id: s.batch_assignment_id,
        start_date: s.start_date,
        end_date: s.end_date,
        status: s.status,
        total_questions: total,
        attempted: counts.attempted,
        correct: counts.correct,
        wrong: counts.wrong,
        remaining: total - counts.attempted,
        progress_pct:
          total > 0 ? Math.round((counts.attempted / total) * 100) : 0,
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error getStudentPracticeSets:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { getStudentPracticeSets };
