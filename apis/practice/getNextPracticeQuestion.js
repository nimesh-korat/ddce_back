const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getNextPracticeQuestion(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const student_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;
  const subject_id = req.query.subject_id || null; // optional filter

  if (!student_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    // Build subject filter
    const subjectCondition = subject_id ? "AND pq.subject_id = ?" : "";
    const subjectParam = subject_id ? [subject_id] : [];

    // Get next unattempted question across all active assignments for student's batch
    // Order: by subject_id (so mentor1's subject first), then by practice_assigned_id, then question_id
    const sql = `
      SELECT
        q.id AS question_id,
        q.question_text, q.question_image,
        q.option_a_text, q.option_a_image,
        q.option_b_text, q.option_b_image,
        q.option_c_text, q.option_c_image,
        q.option_d_text, q.option_d_image,
        q.answer_text, q.answer_image,
        q.question_marks, q.question_difficulty,
        pq.practice_assigned_id,
        pq.subject_id,
        sub.Sub_Name AS subject_name,
        pa.title AS assignment_title,
        (
          SELECT COUNT(*) FROM tbl_practice_questions pq2
          WHERE pq2.practice_assigned_id = pq.practice_assigned_id
            ${subject_id ? "AND pq2.subject_id = ?" : ""}
        ) AS total_in_assignment,
        (
          SELECT COUNT(*) FROM tbl_practice_answer pa2
          WHERE pa2.practice_assigned_id = pq.practice_assigned_id
            AND pa2.student_id = ?
            ${subject_id ? "AND pa2.subject_id = ?" : ""}
        ) AS attempted_in_assignment
      FROM tbl_practice_questions pq
      JOIN tbl_practice_assigned pa ON pa.id = pq.practice_assigned_id
      JOIN tbl_questions q ON q.id = pq.question_id
      LEFT JOIN tbl_subject sub ON sub.Id = pq.subject_id
      WHERE pa.tbl_batch = ?
        AND (pa.tbl_phase IS NULL OR pa.tbl_phase = ?)
        AND pa.is_deleted = 0
        AND q.is_deleted = 0
        AND (pa.start_date IS NULL OR pa.start_date <= NOW())
        AND (pa.end_date IS NULL OR pa.end_date >= NOW())
        ${subjectCondition}
        AND NOT EXISTS (
          SELECT 1 FROM tbl_practice_answer ans
          WHERE ans.practice_assigned_id = pq.practice_assigned_id
            AND ans.question_id = pq.question_id
            AND ans.student_id = ?
        )
      ORDER BY pq.subject_id ASC, pq.practice_assigned_id ASC, pq.question_id ASC
      LIMIT 1
    `;

    // Build params in correct order matching ?s above
    const params = [
      ...(subject_id ? [subject_id] : []),
      student_id,
      ...(subject_id ? [subject_id] : []),
      batch_id,
      phase_id,
      ...subjectParam,
      student_id,
    ];

    const [results] = await pool.promise().query(sql, params);

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "all_completed",
      });
    }

    const q = results[0];
    const sign = (p) =>
      p ? generateSignedUrl(`${cloudfrontDomain}/${p}`, new Date(Date.now() + 1000 * 60 * 60 * 4)) : null;

    return res.status(200).json({
      success: true,
      data: {
        ...q,
        question_image: sign(q.question_image),
        option_a_image: sign(q.option_a_image),
        option_b_image: sign(q.option_b_image),
        option_c_image: sign(q.option_c_image),
        option_d_image: sign(q.option_d_image),
        answer_image: sign(q.answer_image),
      },
    });
  } catch (err) {
    console.error("Error getNextPracticeQuestion:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getNextPracticeQuestion };
