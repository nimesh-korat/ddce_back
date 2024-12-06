const pool = require("../../../db/dbConnect");

async function getTestQuestions(req, res) {
    const { test_id } = req.body; // Assuming test_id is sent as a query parameter

    // Validate required fields
    if (!test_id) {
        return res.status(400).json({ success: false, message: "Missing required test_id" });
    }

    try {
        // Fetch questions for the given test
        const sql = `
            SELECT 
                q.id AS question_id,
                q.question_text,
                q.question_image,
                q.option_a_text,
                q.option_a_image,
                q.option_b_text,
                q.option_b_image,
                q.option_c_text,
                q.option_c_image,
                q.option_d_text,
                q.option_d_image,
                q.question_marks,
                q.question_difficulty,
                tq.test_id
            FROM tbl_questions q
            JOIN tbl_test_questions tq ON q.id = tq.question_id
            WHERE tq.test_id = ?
        `;

        const [questions] = await pool.promise().query(sql, [test_id]);

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions found for the given test",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Questions fetched successfully",
            data: questions,
        });
    } catch (err) {
        console.error("Error fetching questions for test:", err.message);
        return res.status(500).json({
            success: false,
            error: "Database error",
            details: err.message,
        });
    }
}

module.exports = { getTestQuestions };
