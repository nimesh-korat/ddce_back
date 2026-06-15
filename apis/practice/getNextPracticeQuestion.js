const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getNextPracticeQuestion(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const student_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;
  const practice_assigned_id = req.query.practice_assigned_id || null;

  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!practice_assigned_id)
    return res
      .status(400)
      .json({ success: false, message: "practice_assigned_id is required" });

  try {
    // Get the practice_id for this batch assignment
    const [assignmentRow] = await pool.promise().query(
      `SELECT pa.practice_id FROM tbl_practice_assigned pa
       WHERE pa.id = ? AND pa.is_featured = 1 AND pa.is_featured = 1
         AND (pa.start_date IS NULL OR pa.start_date <= NOW())
         AND (pa.end_date   IS NULL OR pa.end_date   >= NOW())`,
      [practice_assigned_id],
    );
    if (assignmentRow.length === 0)
      return res
        .status(200)
        .json({ success: true, data: null, message: "all_completed" });

    const practice_id = assignmentRow[0].practice_id;

    const sql = `
      SELECT
        q.id                   AS question_id,
        q.question_text,       q.question_image,
        q.option_a_text,       q.option_a_image,
        q.option_b_text,       q.option_b_image,
        q.option_c_text,       q.option_c_image,
        q.option_d_text,       q.option_d_image,
        q.answer_text,         q.answer_image,
        q.question_marks,      q.question_difficulty,
        pq.subject_id,         pq.topic_id,           pq.subtopic_id,
        sub.Sub_Name           AS subject_name,
        t.Topic_Name           AS topic_name,
        st.SubTopicName      AS subtopic_name,
        p.title                AS assignment_title,
        ? AS practice_assigned_id,
        (SELECT COUNT(*) FROM tbl_practice_questions WHERE practice_id = ?) AS total_in_set,
        (SELECT COUNT(*) FROM tbl_practice_answer
         WHERE practice_assigned_id = ? AND student_id = ?)    AS attempted_in_set
      FROM tbl_practice_questions pq
      JOIN tbl_questions q ON q.id = pq.question_id
      JOIN tbl_practice  p ON p.id = pq.practice_id
      LEFT JOIN tbl_subject sub ON sub.Id = pq.subject_id
      LEFT JOIN tbl_topic   t   ON t.Id   = pq.topic_id
      LEFT JOIN tbl_subtopic st ON st.Id  = pq.subtopic_id
      WHERE pq.practice_id = ?
        AND p.is_active    = 1
        AND q.is_deleted   = 0
        AND NOT EXISTS (
          SELECT 1 FROM tbl_practice_answer ans
          WHERE ans.practice_assigned_id = ?
            AND ans.question_id          = pq.question_id
            AND ans.student_id           = ?
        )
      ORDER BY pq.subject_id ASC, pq.question_id ASC
      LIMIT 1
    `;

    const params = [
      practice_assigned_id, // alias in SELECT
      practice_id, // total_in_set subquery
      practice_assigned_id, // attempted_in_set subquery
      student_id, // attempted_in_set subquery
      practice_id, // main WHERE pq.practice_id
      practice_assigned_id, // NOT EXISTS subquery
      student_id, // NOT EXISTS subquery
    ];

    const [results] = await pool.promise().query(sql, params);

    if (results.length === 0)
      return res
        .status(200)
        .json({ success: true, data: null, message: "all_completed" });

    const q = results[0];
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 4);
    const sign = (p) =>
      p ? generateSignedUrl(`${cloudfrontDomain}/${p}`, expiry) : null;

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
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { getNextPracticeQuestion };
