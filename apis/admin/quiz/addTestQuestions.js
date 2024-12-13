const pool = require("../../../db/dbConnect");

async function addTestQuestions(req, res) {
    const { test_id, q_id } = req.body;

    // Validate required fields
    if (!test_id || !Array.isArray(q_id) || q_id.length === 0) {
        return res.status(400).json({ success: false, message: "Missing or invalid required fields" });
    }

    const added_by = req?.user.id;
    if (!added_by) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        // Step 1: Fetch existing questions for the test
        const checkSql = `
            SELECT question_id
            FROM tbl_test_questions
            WHERE test_id = ? AND status = '0'
        `; // Assuming '0' is the status for active questions
        const [existingQuestions] = await pool.promise().query(checkSql, [test_id]);
        const existingQuestionIds = existingQuestions.map((q) => q.question_id);

        // Step 2: Filter out duplicate questions
        const newQuestions = q_id.filter((question) => !existingQuestionIds.includes(question.q_id));

        if (newQuestions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "All provided questions are already added to this test",
            });
        }

        // Step 3: Prepare data for batch insert
        const insertSql = `
            INSERT INTO tbl_test_questions (
                test_id,
                question_id,
                added_by,
                status
            ) VALUES ?
        `;
        const values = newQuestions.map((question) => [
            test_id,
            question.q_id,
            added_by,
            "0", // Assuming '0' is the status for active questions
        ]);

        // Step 4: Insert new questions into the database
        const [result] = await pool.promise().query(insertSql, [values]);

        return res.status(201).json({
            success: true,
            message: "Questions added to test successfully",
            data: {
                affectedRows: result.affectedRows,
            },
        });
    } catch (err) {
        console.error("Error processing addTestQuestions:", err.message);
        return res.status(500).json({
            success: false,
            error: "Database error",
            details: err.message,
        });
    }
}

module.exports = { addTestQuestions };
