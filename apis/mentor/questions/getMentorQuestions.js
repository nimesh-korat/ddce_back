const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getMentorQuestions(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const mentor_id = req?.user?.id;

  if (!mentor_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const subject_id = req.query.subject_id || null;
  const date_from = req.query.date_from || null;
  const date_to = req.query.date_to || null;
  const search = req.query.search ? `%${req.query.search}%` : null;

  try {
    // Build dynamic WHERE clause
    const conditions = ["q.added_by = ?", "q.is_deleted = 0"];
    const params = [mentor_id];

    if (subject_id) {
      conditions.push("sub.Id = ?");
      params.push(subject_id);
    }
    if (date_from) {
      conditions.push("DATE(q.added_on) >= ?");
      params.push(date_from);
    }
    if (date_to) {
      conditions.push("DATE(q.added_on) <= ?");
      params.push(date_to);
    }
    if (search) {
      conditions.push("q.question_text LIKE ?");
      params.push(search);
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `
      SELECT COUNT(*) AS total
      FROM tbl_questions q
      LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
      LEFT JOIN tbl_topic t ON st.tbl_topic = t.Id
      LEFT JOIN tbl_subject sub ON t.tbl_subject = sub.Id
      WHERE ${whereClause}
    `;
    const [countResult] = await pool.promise().query(countSql, params);
    const totalQuestions = countResult[0].total;

    const sql = `
      SELECT
        q.id, q.question_text, q.question_image,
        q.option_a_text, q.option_a_image,
        q.option_b_text, q.option_b_image,
        q.option_c_text, q.option_c_image,
        q.option_d_text, q.option_d_image,
        q.answer_text, q.answer_image,
        q.question_marks, q.question_difficulty,
        q.added_on, q.prevAskedPaper, q.prevAskedYear, q.fromBook,
        sub.Id AS subject_id, sub.Sub_Name AS subject_name,
        t.Topic_Name AS topic_name,
        st.SubTopicName AS subtopic_name
      FROM tbl_questions q
      LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
      LEFT JOIN tbl_topic t ON st.tbl_topic = t.Id
      LEFT JOIN tbl_subject sub ON t.tbl_subject = sub.Id
      WHERE ${whereClause}
      ORDER BY q.added_on DESC
      LIMIT ? OFFSET ?
    `;
    const [results] = await pool
      .promise()
      .query(sql, [...params, limit, offset]);

    const signedQuestions = results.map((q) => {
      const sign = (p) =>
        p
          ? generateSignedUrl(
              `${cloudfrontDomain}/${p}`,
              new Date(Date.now() + 1000 * 60 * 60 * 24)
            )
          : null;
      return {
        ...q,
        question_image: sign(q.question_image),
        option_a_image: sign(q.option_a_image),
        option_b_image: sign(q.option_b_image),
        option_c_image: sign(q.option_c_image),
        option_d_image: sign(q.option_d_image),
        answer_image: sign(q.answer_image),
      };
    });

    const totalPages = Math.ceil(totalQuestions / limit);
    return res.status(200).json({
      success: true,
      data: signedQuestions,
      currentPage: page,
      totalPages,
      totalQuestions,
      hasMore: page < totalPages,
      nextPage: page < totalPages ? page + 1 : null,
    });
  } catch (err) {
    console.error("Error getMentorQuestions:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { getMentorQuestions };
