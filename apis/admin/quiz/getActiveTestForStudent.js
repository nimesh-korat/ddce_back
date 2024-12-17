const pool = require("../../../db/dbConnect");

async function getActiveTestsForStudent(req, res) {
    const std_id = req?.user.id;

    if (!std_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        // SQL query to fetch active tests with minimum 5 questions and check if the student has taken the test
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
                COUNT(ttq.question_id) AS total_questions,
                IF(fr.std_id IS NOT NULL, true, false) AS has_taken
            FROM tbl_test t
            LEFT JOIN tbl_test_questions ttq ON t.id = ttq.test_id
            LEFT JOIN tbl_final_result fr ON t.id = fr.test_id AND fr.std_id = ?
            WHERE t.status = '1'
            GROUP BY t.id
            HAVING total_questions >= 5
        `;

        // Execute the query with the student ID as parameter
        const [tests] = await pool.promise().query(sql, [std_id]);

        if (tests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active tests with minimum 5 questions found",
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
