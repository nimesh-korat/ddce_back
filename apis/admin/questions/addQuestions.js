const pool = require("../../../db/dbConnect");

async function AddQuestions(req, res) {
    const { questions } = req.body; // Expecting an array of questions
    console.log(req.files);
    

    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "No questions provided" });
    }

    // Prepare the SQL query
    const sql = `
        INSERT INTO tbl_questions (
            tbl_subtopic,
            question_text,
            question_image,
            option_a_text,
            option_a_image,
            option_b_text,
            option_b_image,
            option_c_text,
            option_c_image,
            option_d_text,
            option_d_image,
            answer_text,
            answer_image,
            question_marks,
            question_difficulty,
            added_by
        ) VALUES ?
    `;

    // Transform the questions array into the format required for bulk insertion
    const values = questions.map((q) => {
        return [
            q.tbl_subtopic,
            q.question_text,
            req.files["question_image"] ? req.files["question_image"][0].filename : null,  // Get the filename from the uploaded file
            q.option_a_text,
            req.files["option_a_image"] ? req.files["option_a_image"][0].filename : null,
            q.option_b_text,
            req.files["option_b_image"] ? req.files["option_b_image"][0].filename : null,
            q.option_c_text,
            req.files["option_c_image"] ? req.files["option_c_image"][0].filename : null,
            q.option_d_text,
            req.files["option_d_image"] ? req.files["option_d_image"][0].filename : null,
            q.answer_text,
            req.files["answer_image"] ? req.files["answer_image"][0].filename : null,
            q.question_marks,
            q.question_difficulty,
            q.added_by,
        ];
    });

    try {
        const [result] = await pool.promise().query(sql, [values]);
        console.log(result);

        return res.status(201).json({
            success: true,
            message: `${result.affectedRows} questions added successfully`,
            data: result,
        });
    } catch (error) {
        console.error("Error processing AddQuestions:", error.message);
        return res.status(500).json({ success: false, message: "Error processing request", details: error.message });
    }
}

module.exports = {
    AddQuestions
};