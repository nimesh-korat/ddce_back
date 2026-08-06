const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getPracticeQuestionsAdmin(req, res) {
  const { practice_id } = req.params;
  if (!practice_id)
    return res
      .status(400)
      .json({ success: false, message: "practice_id required" });

  const cf = process.env.AWS_CLOUDFRONT_DOMAIN;
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const sign = (path) =>
    path ? generateSignedUrl(`${cf}/${path}`, expiry) : null;

  try {
    const [rows] = await pool.promise().query(
      `SELECT
         pq.id, pq.question_id, pq.subject_id,
         q.question_text, q.question_image,
         q.option_a_text, q.option_a_image,
         q.option_b_text, q.option_b_image,
         q.option_c_text, q.option_c_image,
         q.option_d_text, q.option_d_image,
         q.answer_text   AS correct_answer,
         sub.Sub_Name    AS subject_name,
         t.topic_name,
         st.SubTopicName AS subtopic_name
       FROM tbl_practice_questions pq
       JOIN tbl_questions q    ON q.id   = pq.question_id
       LEFT JOIN tbl_subject sub ON sub.Id = pq.subject_id
       LEFT JOIN tbl_topic t     ON t.Id   = pq.topic_id
       LEFT JOIN tbl_subtopic st ON st.Id  = pq.subtopic_id
       WHERE pq.practice_id = ?
       ORDER BY pq.id ASC`,
      [practice_id],
    );

    const signed = rows.map((q) => ({
      ...q,
      question_image: sign(q.question_image),
      option_a_image: sign(q.option_a_image),
      option_b_image: sign(q.option_b_image),
      option_c_image: sign(q.option_c_image),
      option_d_image: sign(q.option_d_image),
    }));

    return res.status(200).json({ success: true, data: signed });
  } catch (err) {
    console.error("Error getPracticeQuestionsAdmin:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getPracticeQuestionsAdmin };
