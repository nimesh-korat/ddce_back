const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getQuestionsForPractice(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const user_id = req?.user?.id;
  const role = req?.user?.role; // 1=admin, 2=mentor

  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const subject_id = req.query.subject_id || null;
  const mentor_id = req.query.mentor_id || null; // admin filter by mentor
  const search = req.query.search ? `%${req.query.search}%` : null;

  try {
    const conditions = ["q.is_deleted = 0"];
    const params = [];

    // Mentor sees only own; admin sees all (with optional mentor filter)
    if (role === 2) {
      conditions.push("q.added_by = ?");
      params.push(user_id);
    } else if (role === 1 && mentor_id) {
      conditions.push("q.added_by = ?");
      params.push(mentor_id);
    }

    if (subject_id) {
      conditions.push("sub.Id = ?");
      params.push(subject_id);
    }
    if (search) {
      conditions.push("q.question_text LIKE ?");
      params.push(search);
    }

    const whereClause = conditions.join(" AND ");

    const [countResult] = await pool.promise().query(
      `SELECT COUNT(*) AS total
       FROM tbl_questions q
       LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
       LEFT JOIN tbl_topic t ON st.tbl_topic = t.Id
       LEFT JOIN tbl_subject sub ON t.tbl_subject = sub.Id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [results] = await pool.promise().query(
      `SELECT q.id, q.question_text, q.question_image,
              q.option_a_text, q.option_b_text, q.option_c_text, q.option_d_text,
              q.option_a_image, q.option_b_image, q.option_c_image, q.option_d_image,
              q.answer_text, q.question_marks, q.question_difficulty,
              sub.Id AS subject_id, sub.Sub_Name AS subject_name,
              t.Topic_Name AS topic_name, st.SubTopicName AS subtopic_name,
              a.Name AS added_by_name
       FROM tbl_questions q
       LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
       LEFT JOIN tbl_topic t ON st.tbl_topic = t.Id
       LEFT JOIN tbl_subject sub ON t.tbl_subject = sub.Id
       LEFT JOIN admin a ON a.Id = q.added_by
       WHERE ${whereClause}
       ORDER BY sub.Id ASC, q.added_on DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const sign = (p) =>
      p ? generateSignedUrl(`${cloudfrontDomain}/${p}`, new Date(Date.now() + 1000 * 60 * 60 * 24)) : null;

    const signed = results.map((q) => ({
      ...q,
      question_image: sign(q.question_image),
      option_a_image: sign(q.option_a_image),
      option_b_image: sign(q.option_b_image),
      option_c_image: sign(q.option_c_image),
      option_d_image: sign(q.option_d_image),
    }));

    return res.status(200).json({
      success: true,
      data: signed,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      hasMore: page < Math.ceil(total / limit),
      nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
    });
  } catch (err) {
    console.error("Error getQuestionsForPractice:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getQuestionsForPractice };
