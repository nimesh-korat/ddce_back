const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getStudentPracticeSets(req, res) {
  const student_id = req?.user?.id;
  const batch_id   = req?.user?.Batch;
  const phase_id   = req?.user?.Phase;
  if (!student_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    // Get all visible practice assignments for student's batch + phase
    const [sets] = await pool.promise().query(
      `SELECT
         p.id,
         p.title,
         p.description,
         p.image_url,
         p.added_on,
         a.Name                         AS assigned_by_name,
         pa.id                          AS batch_assignment_id,
         pa.start_date,
         pa.end_date,
         pa.is_visible,
         pa.is_featured,
         COUNT(DISTINCT pq.question_id) AS total_questions,
         CASE
           WHEN pa.start_date IS NOT NULL AND pa.start_date > NOW() THEN 'upcoming'
           WHEN pa.end_date   IS NOT NULL AND pa.end_date   < NOW() THEN 'ended'
           ELSE 'active'
         END                            AS status
       FROM tbl_practice p
       JOIN tbl_practice_assigned pa ON pa.practice_id = p.id
       LEFT JOIN admin a ON a.Id = p.added_by
       LEFT JOIN tbl_practice_questions pq ON pq.practice_id = p.id
       WHERE pa.tbl_batch  = ?
         AND (pa.tbl_phase IS NULL OR pa.tbl_phase = ?)
         AND pa.is_visible = 1
         AND p.is_active   = 1
       GROUP BY p.id, pa.id
       ORDER BY pa.assigned_on DESC`,
      [batch_id, phase_id]
    );

    if (sets.length === 0) return res.status(200).json({ success: true, data: [] });

    // Batch-fetch student answer counts for all practice_ids
    const practiceIds   = sets.map((s) => s.id);
    const placeholders  = practiceIds.map(() => "?").join(",");
    const expiry        = new Date(Date.now() + 1000 * 60 * 60 * 4);

    const [answerCounts] = await pool.promise().query(
      `SELECT
         practice_assigned_id,
         COUNT(*)                                            AS attempted,
         SUM(CASE WHEN is_correct = '1' THEN 1 ELSE 0 END) AS correct,
         SUM(CASE WHEN is_correct = '0' THEN 1 ELSE 0 END) AS wrong
       FROM tbl_practice_answer
       WHERE student_id = ?
         AND practice_assigned_id IN (${placeholders})
       GROUP BY practice_assigned_id`,
      [student_id, ...sets.map((s) => s.batch_assignment_id)]
    );

    const countMap = {};
    answerCounts.forEach((r) => {
      countMap[r.practice_assigned_id] = {
        attempted: parseInt(r.attempted) || 0,
        correct:   parseInt(r.correct)   || 0,
        wrong:     parseInt(r.wrong)     || 0,
      };
    });

    const result = sets.map((s) => {
      const counts = countMap[s.batch_assignment_id] || { attempted: 0, correct: 0, wrong: 0 };
      const total  = parseInt(s.total_questions) || 0;
      return {
        id:                  s.id,             // tbl_practice.id
        batch_assignment_id: s.batch_assignment_id,
        title:               s.title,
        description:         s.description,
        image_url:           s.image_url
          ? generateSignedUrl(`${cloudfrontDomain}/${s.image_url}`, expiry)
          : null,
        assigned_by_name:    s.assigned_by_name,
        start_date:          s.start_date,
        end_date:            s.end_date,
        is_featured:         s.is_featured,
        status:              s.status,
        total_questions:     total,
        attempted:           counts.attempted,
        correct:             counts.correct,
        wrong:               counts.wrong,
        remaining:           total - counts.attempted,
        progress_pct:        total > 0 ? Math.round((counts.attempted / total) * 100) : 0,
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error getStudentPracticeSets:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getStudentPracticeSets };
