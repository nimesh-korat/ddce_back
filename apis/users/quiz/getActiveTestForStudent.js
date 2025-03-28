const { generateSignedUrl } = require("../../../utils/generateSignedUrl");
const pool = require("../../../db/dbConnect");

async function getActiveTestsForStudent(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const std_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;

  if (!std_id || !batch_id) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized or missing batch ID" });
  }

  try {
    // SQL query to fetch active tests assigned to the student's batch
    const sql = `
    SELECT 
        t.id AS test_id,
        t.test_name,
        t.test_desc,
        t.test_img_path,
        t.test_neg_marks,
        t.test_difficulty,
        t.test_duration,
        t.added_by,
        t.isFake,
        t.status,
        COUNT(ttq.question_id) AS total_questions,
        COALESCE(SUM(q.question_marks), 0) AS total_marks,
        IF(fr.std_id IS NOT NULL, true, false) AS has_taken,
        ta.start_date,
        ta.end_date
    FROM tbl_test_assigned ta
    INNER JOIN tbl_test t ON ta.tbl_test = t.id
    LEFT JOIN tbl_test_questions ttq ON t.id = ttq.test_id
    LEFT JOIN tbl_questions q ON ttq.question_id = q.id
    LEFT JOIN tbl_final_result fr ON t.id = fr.test_id AND fr.std_id = ?
    WHERE t.status = '1' AND ta.tbl_batch = ? AND ta.tbl_phase = ? AND ta.isFeatured = '1'
    GROUP BY t.id, ta.start_date, ta.end_date
    HAVING total_questions >= 0
`;

    // Execute the query with student ID and batch ID as parameters
    const [tests] = await pool
      .promise()
      .query(sql, [std_id, batch_id, phase_id]);

    if (tests.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No active tests with minimum 5 questions found for this batch",
      });
    }

    // Generate signed URLs for test images
    const signedTests = await Promise.all(
      tests.map(async (test) => {
        const testImgPath = test.test_img_path;

        // Generate signed URL if the test image exists
        const signedUrl = testImgPath
          ? generateSignedUrl(
              `${cloudfrontDomain}/${testImgPath}`,
              new Date(Date.now() + 1000 * 60 * 60 * 24) // 1-day expiry
            )
          : null;

        return {
          ...test,
          test_img_path: signedUrl, // Replace test_img_path with signed URL
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Test list fetched successfully",
      data: signedTests,
    });
  } catch (err) {
    console.error("Error fetching active tests:", err.message);
    return res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getActiveTestsForStudent };
