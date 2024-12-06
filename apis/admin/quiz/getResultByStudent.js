const pool = require("../../../db/dbConnect");

async function getResultByStudent(req, res) {
    const { test_id } = req.body; // Assuming std_id and test_id are sent in the body

    // Validate required fields
    if (!test_id) {
        return res.status(400).json({ success: false, message: "Missing required std_id or test_id" });
    }
    console.log(req.user);
    

    const std_id = req?.user.id;
    if (!std_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        // Fetch the result for the student with test details
        const sqlResult = `
            SELECT 
                fr.test_id,
                t.test_name,
                t.test_desc,
                t.test_img_path AS test_img,
                fr.total_marks,
                fr.obtained_marks,
                fr.total_correct,
                fr.total_incorrect,
                fr.total_skipped,
                fr.result_gen_datetime,
                fr.status
            FROM tbl_final_result fr
            JOIN tbl_test t ON fr.test_id = t.id
            WHERE fr.std_id = ? AND fr.test_id = ?
        `;

        const [results] = await pool.promise().query(sqlResult, [std_id, test_id]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No results found for the given student ID and test ID",
            });
        }

        // Fetch questions related to the test and student answers
        const sqlQuestions = `
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
                q.answer_text,
                q.answer_image,
                q.question_marks,
                sa.std_answer,
                sa.is_correct
            FROM tbl_questions q
            JOIN tbl_test_questions tq ON q.id = tq.question_id
            LEFT JOIN tbl_student_answer sa ON sa.question_id = q.id AND sa.student_id = ? AND sa.test_id = ?
            WHERE tq.test_id = ?
        `;

        const [questions] = await pool.promise().query(sqlQuestions, [std_id, test_id, test_id]);

        // Format the response data
        const response = {
            test_id: test_id,
            std_id: std_id,
            test_name: results[0].test_name,
            question_data: questions.map((question) => ({
                question_text: question.question_text,
                question_image: question.question_image,
                option_a_text: question.option_a_text,
                option_a_image: question.option_a_image,
                option_b_text: question.option_b_text,
                option_b_image: question.option_b_image,
                option_c_text: question.option_c_text,
                option_c_image: question.option_c_image,
                option_d_text: question.option_d_text,
                option_d_image: question.option_d_image,
                answer_text: question.answer_text,
                answer_image: question.answer_image,
                std_answer: question.std_answer || null,  // Ensure it defaults to null if no answer
                is_correct: question.is_correct || null,  // Ensure it defaults to null if no correctness info
                question_marks: question.question_marks
            })),
            total_marks: results[0].total_marks,
            obtained_marks: results[0].obtained_marks,
            total_correct: results[0].total_correct,
            total_incorrect: results[0].total_incorrect,
            total_skipped: results[0].total_skipped,
            result_gen_datetime: results[0].result_gen_datetime
        };

        return res.status(200).json({
            success: true,
            message: "Results fetched successfully",
            data: response,
        });
    } catch (err) {
        console.error("Error fetching results by student:", err.message);
        return res.status(500).json({
            success: false,
            error: "Database error",
            details: err.message,
        });
    }
}

module.exports = { getResultByStudent };
