const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getStudentPracticeSets(req, res) {
  const student_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;
  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

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
         pa.is_featured,
         pa.assigned_on,
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
         AND pa.is_featured = 1
         AND p.is_active   = 1
       GROUP BY p.id, pa.id
       ORDER BY pa.assigned_on DESC`,
      [batch_id, phase_id],
    );

    if (sets.length === 0)
      return res.status(200).json({ success: true, data: [] });

    // Batch-fetch student answer counts for all practice_ids
    const practiceIds = sets.map((s) => s.id);
    const placeholders = practiceIds.map(() => "?").join(",");
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 4);

    const [answerCounts] = await pool.promise().query(
      `SELECT
         practice_assigned_id,
         COUNT(*)                                            AS attempted,
         SUM(CASE WHEN is_correct = '1' THEN 1 ELSE 0 END) AS correct,
         SUM(CASE WHEN is_correct = '0' THEN 1 ELSE 0 END) AS wrong,
         MAX(attempted_on)                                  AS last_attempted
       FROM tbl_practice_answer
       WHERE student_id = ?
         AND practice_assigned_id IN (${placeholders})
       GROUP BY practice_assigned_id`,
      [student_id, ...sets.map((s) => s.batch_assignment_id)],
    );

    const countMap = {};
    answerCounts.forEach((r) => {
      countMap[r.practice_assigned_id] = {
        attempted: parseInt(r.attempted) || 0,
        correct: parseInt(r.correct) || 0,
        wrong: parseInt(r.wrong) || 0,
        last_attempted: r.last_attempted || null,
      };
    });

    const result = sets.map((s) => {
      const counts = countMap[s.batch_assignment_id] || {
        attempted: 0,
        correct: 0,
        wrong: 0,
        last_attempted: null,
      };
      const total = parseInt(s.total_questions) || 0;
      return {
        id: s.id,
        batch_assignment_id: s.batch_assignment_id,
        title: s.title,
        description: s.description,
        image_url: s.image_url
          ? generateSignedUrl(`${cloudfrontDomain}/${s.image_url}`, expiry)
          : null,
        assigned_by_name: s.assigned_by_name,
        start_date: s.start_date,
        end_date: s.end_date,
        assigned_on: s.assigned_on,
        is_featured: s.is_featured,
        status: s.status,
        total_questions: total,
        attempted: counts.attempted,
        correct: counts.correct,
        wrong: counts.wrong,
        remaining: total - counts.attempted,
        progress_pct:
          total > 0 ? Math.round((counts.attempted / total) * 100) : 0,
        last_attempted: counts.last_attempted,
      };
    });

    // ── Sort order ───────────────────────────────────────────
    // 1. Partial (attempted > 0 AND remaining > 0) → by last_attempted DESC
    // 2. Not started (attempted === 0)             → by assigned_on DESC
    // 3. Completed (remaining === 0 AND attempted > 0) → last
    const sortGroup = (r) => {
      if (r.attempted > 0 && r.remaining > 0) return 0; // partial
      if (r.attempted === 0) return 1; // not started
      return 2; // completed
    };

    result.sort((a, b) => {
      const ga = sortGroup(a),
        gb = sortGroup(b);
      if (ga !== gb) return ga - gb;
      // Within partial group: last_attempted DESC
      if (ga === 0) {
        return (
          new Date(b.last_attempted || 0) - new Date(a.last_attempted || 0)
        );
      }
      // Within not-started group: assigned_on DESC
      return new Date(b.assigned_on || 0) - new Date(a.assigned_on || 0);
    });

    // Fetch subjects per practice for client-side filtering
    const [subjectRows] = await pool.promise().query(
      `SELECT pq.practice_id, sub.Sub_Name
       FROM tbl_practice_questions pq
       JOIN tbl_subject sub ON sub.Id = pq.subject_id
       WHERE pq.practice_id IN (${placeholders})
       GROUP BY pq.practice_id, sub.Id`,
      [...sets.map((s) => s.id)],
    );

    // Build subject map: { practice_id: ["Physics", "Chemistry"] }
    const subjectMap = {};
    subjectRows.forEach((r) => {
      if (!subjectMap[r.practice_id]) subjectMap[r.practice_id] = [];
      if (!subjectMap[r.practice_id].includes(r.Sub_Name))
        subjectMap[r.practice_id].push(r.Sub_Name);
    });

    // Add subjects to each result
    result.forEach((r) => {
      r.subjects = subjectMap[r.id] || [];
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
