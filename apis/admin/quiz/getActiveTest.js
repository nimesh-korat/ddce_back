const pool = require("../../../db/dbConnect");

async function getActiveTests(req, res) {
    try {
        const sql = `
            SELECT 
                id AS test_id,
                test_name,
                test_desc,
                test_img_path,
                test_neg_marks,
                test_start_date,
                test_end_date,
                test_duration,
                test_difficulty,
                added_by,
                status
            FROM tbl_test
            WHERE status = '1'
        `;

        const [tests] = await pool.promise().query(sql);

        if (tests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active tests found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Test list fetched successfully",
            data: tests,
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
