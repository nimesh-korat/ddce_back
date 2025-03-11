const { generateSignedUrl } = require("../../../utils/generateSignedUrl");
const pool = require("../../../db/dbConnect");

async function getActiveTests(req, res) {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    try {
        const sql = `
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
                t.added_by,
                t.status,
                CASE 
                    WHEN ta.tbl_test IS NOT NULL THEN true 
                    ELSE false 
                END AS isAssigned
            FROM tbl_test t
            LEFT JOIN tbl_test_assigned ta ON t.id = ta.tbl_test
            WHERE t.status = '1'
            GROUP BY t.id
        `;

        const [tests] = await pool.promise().query(sql);

        if (tests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active tests found",
            });
        }

        // Generate signed URLs for test images
        const signedTests = await Promise.all(
            tests.map(async (test) => {
                const testImgPath = test.test_img_path;

                // If an image path exists, generate a signed URL
                const signedUrl = testImgPath
                    ? generateSignedUrl(
                        `${cloudfrontDomain}/${testImgPath}`,
                        new Date(Date.now() + 1000 * 60 * 60 * 24) // 1 day expiry
                    )
                    : null;

                return {
                    ...test,
                    test_img_path: signedUrl, // Replace image path with signed URL
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
