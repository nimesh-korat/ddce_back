const { generateSignedUrl } = require("../../../utils/generateSignedUrl");
const pool = require("../../../db/dbConnect");

async function getQuestions(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  try {
    // Extract page, limit and filter params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const subject_id = req.query.subject_id || null;
    const topic_id = req.query.topic_id || null;
    const subtopic_id = req.query.subtopic_id || null;

    // Calculate OFFSET
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereParts = ["q.is_deleted = 0"];
    const whereParams = [];

    if (subtopic_id) {
      whereParts.push("q.tbl_subtopic = ?");
      whereParams.push(subtopic_id);
    } else if (topic_id) {
      whereParts.push("st.tbl_topic = ?");
      whereParams.push(topic_id);
    } else if (subject_id) {
      whereParts.push("t.tbl_subject = ?");
      whereParams.push(subject_id);
    }

    const needsJoin = topic_id || subject_id;
    const joinClause = needsJoin
      ? `JOIN tbl_subtopic st ON st.Id = q.tbl_subtopic
               JOIN tbl_topic t ON t.Id = st.tbl_topic`
      : `LEFT JOIN tbl_subtopic st ON st.Id = q.tbl_subtopic
               LEFT JOIN tbl_topic t ON t.Id = st.tbl_topic`;

    const whereClause = whereParts.join(" AND ");

    // Count query
    const countSql = `
            SELECT COUNT(*) AS total
            FROM tbl_questions q
            ${joinClause}
            WHERE ${whereClause}`;
    const [countResult] = await pool.promise().query(countSql, whereParams);
    const totalQuestions = countResult[0].total;

    if (totalQuestions === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        currentPage: page,
        totalPages: 0,
        hasMore: false,
        nextPage: null,
      });
    }

    // Query to fetch paginated questions — latest first
    const sql = `
            SELECT
                q.id,
                q.question_text,
                q.question_image,
                q.option_a_text,
                q.option_b_text,
                q.option_c_text,
                q.option_d_text,
                q.option_a_image,
                q.option_b_image,
                q.option_c_image,
                q.option_d_image,
                q.answer_text,
                q.question_marks,
                q.question_difficulty,
                q.prevAskedPaper,
                q.prevAskedYear,
                q.fromBook,
                q.tbl_subtopic
            FROM tbl_questions q
            ${joinClause}
            WHERE ${whereClause}
            ORDER BY q.id DESC
            LIMIT ? OFFSET ?`;
    const [results] = await pool
      .promise()
      .query(sql, [...whereParams, limit, offset]);

    // Generate signed URLs for images
    const signedQuestions = await Promise.all(
      results.map(async (question) => {
        // Generate signed URLs for images if they exist
        const generateSignedImageUrl = (imagePath) => {
          return imagePath
            ? generateSignedUrl(
                `${cloudfrontDomain}/${imagePath}`,
                new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day expiry
              )
            : null;
        };

        return {
          ...question,
          question_image: generateSignedImageUrl(question.question_image),
          option_a_image: generateSignedImageUrl(question.option_a_image),
          option_b_image: generateSignedImageUrl(question.option_b_image),
          option_c_image: generateSignedImageUrl(question.option_c_image),
          option_d_image: generateSignedImageUrl(question.option_d_image),
        };
      }),
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalQuestions / limit);
    const hasMore = page < totalPages;
    const nextPage = hasMore ? page + 1 : null;

    // Send the response with the paginated results and metadata
    return res.status(200).json({
      success: true,
      data: signedQuestions,
      currentPage: page,
      totalPages,
      hasMore,
      nextPage,
    });
  } catch (err) {
    console.error("Error fetching questions:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { getQuestions };
