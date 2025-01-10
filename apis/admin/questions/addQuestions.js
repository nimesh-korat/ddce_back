const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

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
        question_difficulty,
        prevAskedPaper,
        prevAskedYear,
        fromBook
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

    // Prepare for S3 upload
    const question_image = req.files["question_image"] ? req.files["question_image"][0] : null;
    const option_a_image = req.files["option_a_image"] ? req.files["option_a_image"][0] : null;
    const option_b_image = req.files["option_b_image"] ? req.files["option_b_image"][0] : null;
    const option_c_image = req.files["option_c_image"] ? req.files["option_c_image"][0] : null;
    const option_d_image = req.files["option_d_image"] ? req.files["option_d_image"][0] : null;
    const answer_image = req.files["answer_image"] ? req.files["answer_image"][0] : null;

    // Function to upload images to S3 and return the file key
    const uploadImageToS3 = async (file) => {
        if (file) {
            const fileBuffer = file.buffer;
            const fileName = `${Date.now()}-${file.originalname}`;
            const fileKey = `question_images/${fileName}`;
            const mimeType = file.mimetype;
            const uploadResult = await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, fileBuffer, mimeType);
            return uploadResult ? fileKey : null; // Return fileKey 
        }
        return null;
    };

    try {
        // Upload images to S3
        const questionImageUrl = await uploadImageToS3(question_image);
        const optionAImageUrl = await uploadImageToS3(option_a_image);
        const optionBImageUrl = await uploadImageToS3(option_b_image);
        const optionCImageUrl = await uploadImageToS3(option_c_image);
        const optionDImageUrl = await uploadImageToS3(option_d_image);
        const answerImageUrl = await uploadImageToS3(answer_image);

        // If no image options are provided, set text options to "Option A", "Option B", "Option C", "Option D"
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
                prevAskedPaper,
                prevAskedYear,
                fromBook,
                added_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Values for the SQL query, using the image URLs/keys returned from S3
        const values = [
            tbl_subtopic,
            tbl_paragraph !== "null" ? parseFloat(tbl_paragraph) : null,
            question_text,
            questionImageUrl,
            updatedOptionAText,
            optionAImageUrl,
            updatedOptionBText,
            optionBImageUrl,
            updatedOptionCText,
            optionCImageUrl,
            updatedOptionDText,
            optionDImageUrl,
            answer_text,
            answerImageUrl,
            question_marks,
            question_difficulty,
            prevAskedPaper,
            prevAskedYear,
            fromBook,
            added_by
        ];

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
