const { generateSignedUrl } = require("../../../utils/generateSignedUrl");
const pool = require("../../../db/dbConnect");

async function getActiveTests(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    // Get all active tests sorted by added_on
    const testSql = `
      SELECT 
        t.id AS test_id,
        t.test_name,
        t.test_desc,
        t.test_img_path,
        t.test_neg_marks,
        t.test_start_date,
        t.test_end_date,
        t.test_duration,
        t.test_difficulty,
        t.for_who,
        t.isFake,
        t.added_by,
        t.added_on,
        t.status,
        CASE 
          WHEN ta.tbl_test IS NOT NULL THEN true 
          ELSE false 
        END AS isAssigned
      FROM tbl_test t
      LEFT JOIN tbl_test_assigned ta ON t.id = ta.tbl_test
      WHERE t.status = '1'
      GROUP BY t.id
      ORDER BY t.added_on DESC
    `;

    const [tests] = await pool.promise().query(testSql);

    if (tests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active tests found",
      });
    }

    const signedTests = await Promise.all(
      tests.map(async (test) => {
        const testImgPath = test.test_img_path;

        // Generate signed image URL
        const signedUrl = testImgPath
          ? generateSignedUrl(
              `${cloudfrontDomain}/${testImgPath}`,
              new Date(Date.now() + 1000 * 60 * 60 * 24)
            )
          : null;

        let assignments = [];

        if (test.isAssigned) {
          const assignedSql = `
            SELECT
              p.Id AS phase_id,
              p.title AS phase_title,
              b.id AS batch_id,
              b.batch_title AS batch_title,
              ta.start_date AS assigned_start_date,
              ta.end_date AS assigned_end_date
            FROM tbl_test_assigned ta
            LEFT JOIN tbl_phase p ON p.Id = ta.tbl_phase
            LEFT JOIN tbl_batch b ON b.id = ta.tbl_batch
            WHERE ta.tbl_test = ?
          `;
          const [assignedData] = await pool
            .promise()
            .query(assignedSql, [test.test_id]);

          assignments = assignedData.map((row) => ({
            phase: row.phase_id ? { id: row.phase_id, title: row.phase_title } : null,
            batch: row.batch_id ? { id: row.batch_id, title: row.batch_title } : null,
            start_date: row.assigned_start_date,
            end_date: row.assigned_end_date,
          }));
        }

        return {
          ...test,
          test_img_path: signedUrl,
          assignments,
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

module.exports = { getActiveTests };
