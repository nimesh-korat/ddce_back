const pool = require("../../../db/dbConnect");

async function AddQuestions(req, res) {
    const {
        tbl_subtopic,
        tbl_paragraph,
        question_text,
        option_a_text,
        option_b_text,
        option_c_text,
        option_d_text,
        answer_text,
        question_marks,
        question_difficulty
    } = req.body;

    const added_by = req?.user.id;
    if (!added_by) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    // Check if all required fields are provided
    if (!tbl_subtopic || !question_text || !answer_text || !question_marks || !question_difficulty || !added_by) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    // Get the filenames of uploaded images, or set them to null if no files were uploaded
    const question_image = req.files["question_image"] ? req.files["question_image"][0].filename : null;
    const option_a_image = req.files["option_a_image"] ? req.files["option_a_image"][0].filename : null;
    const option_b_image = req.files["option_b_image"] ? req.files["option_b_image"][0].filename : null;
    const option_c_image = req.files["option_c_image"] ? req.files["option_c_image"][0].filename : null;
    const option_d_image = req.files["option_d_image"] ? req.files["option_d_image"][0].filename : null;
    const answer_image = req.files["answer_image"] ? req.files["answer_image"][0].filename : null;

    // If image options are provided, set text options to "Option A", "Option B", "Option C", "Option D"
    const updatedOptionAText = option_a_image ? "Option A" : option_a_text || null;
    const updatedOptionBText = option_b_image ? "Option B" : option_b_text || null;
    const updatedOptionCText = option_c_image ? "Option C" : option_c_text || null;
    const updatedOptionDText = option_d_image ? "Option D" : option_d_text || null;

    // Prepare the SQL query for inserting a single question
    const sql = `
        INSERT INTO tbl_questions (
            tbl_subtopic,
            tbl_paragraph,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Values for the SQL query
    const values = [
        tbl_subtopic,
        tbl_paragraph,
        question_text,
        question_image,
        updatedOptionAText,
        option_a_image,
        updatedOptionBText,
        option_b_image,
        updatedOptionCText,
        option_c_image,
        updatedOptionDText,
        option_d_image,
        answer_text,
        answer_image,
        question_marks,
        question_difficulty,
        added_by
    ];

    try {
        const [result] = await pool.promise().query(sql, values);

        return res.status(201).json({
            success: true,
            message: "Question added successfully",
            data: { question_id: result.insertId }
        });
    } catch (error) {
        console.error("Error processing AddQuestion:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: error.message
        });
    }
}

module.exports = { AddQuestions };