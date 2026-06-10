const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getWrongPracticeAnswers(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const student_id = req?.user?.id;
  const practice_assigned_id = req.query.practice_assigned_id || null;

  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!practice_assigned_id)
    return res
      .status(400)
      .json({ success: false, message: "practice_assigned_id is required" });

  try {
    const sql = `
      SELECT
        pa2.id              AS answer_id,
        pa2.practice_assigned_id,
        pa2.question_id,
        pa2.std_answer,
        pa2.correct_answer,
        pa2.subject_id,
        pa2.attempted_on,
        q.question_text,    q.question_image,
        q.option_a_text,    q.option_a_image,
        q.option_b_text,    q.option_b_image,
        q.option_c_text,    q.option_c_image,
        q.option_d_text,    q.option_d_image,
        q.question_marks,   q.question_difficulty,
        sub.Sub_Name        AS subject_name,
        pq_assign.title     AS assignment_title
      FROM tbl_practice_answer pa2
      JOIN tbl_questions q
        ON q.id = pa2.question_id
      JOIN tbl_practice_assigned pq_assign
        ON pq_assign.id = pa2.practice_assigned_id
      LEFT JOIN tbl_subject sub
        ON sub.Id = pa2.subject_id
      WHERE pa2.student_id           = ?
        AND pa2.is_correct            = '0'
        AND pa2.practice_assigned_id  = ?
        AND pq_assign.is_deleted      = 0
      ORDER BY pa2.subject_id ASC, pa2.attempted_on DESC
    `;

    const [results] = await pool
      .promise()
      .query(sql, [student_id, practice_assigned_id]);

    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 4);
    const sign = (p) =>
      p ? generateSignedUrl(`${cloudfrontDomain}/${p}`, expiry) : null;

    const signed = results.map((q) => ({
      ...q,
      question_image: sign(q.question_image),
      option_a_image: sign(q.option_a_image),
      option_b_image: sign(q.option_b_image),
      option_c_image: sign(q.option_c_image),
      option_d_image: sign(q.option_d_image),
    }));

    return res
      .status(200)
      .json({ success: true, data: signed, total: signed.length });
  } catch (err) {
    console.error("Error getWrongPracticeAnswers:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { getWrongPracticeAnswers };
