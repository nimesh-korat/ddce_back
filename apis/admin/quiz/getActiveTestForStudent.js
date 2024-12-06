const pool = require("../../../db/dbConnect");

async function getActiveTestsForStudent(req, res) {

    const std_id = req?.user.id;
    if (!std_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        // SQL query to fetch active tests and check if the student has already taken the test
        const sql = `
            SELECT 
                t.id AS test_id,
                t.test_name,
                t.test_desc,
                t.test_img_path,
                t.test_neg_marks,
                t.test_start_date,
                t.test_end_date,
                t.test_difficulty,
                t.test_duration,
                t.added_by,
                t.status,
                IF(fr.std_id IS NOT NULL, true, false) AS has_taken
            FROM tbl_test t
            LEFT JOIN tbl_final_result fr ON t.id = fr.test_id AND fr.std_id = ?
            WHERE t.status = '1'
        `;

        // Execute the query with the student ID as parameter
        const [tests] = await pool.promise().query(sql, [std_id]);

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

module.exports = { getActiveTestsForStudent };
