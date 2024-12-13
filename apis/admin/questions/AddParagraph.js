const pool = require("../../../db/dbConnect");

async function AddParagraph(req, res) {
    const { paragraph_title, paragraph_text, tbl_subtopic } = req.body;

    const paragraphImage = req.file?.filename;

    const added_by = req?.user?.id;

    if (!added_by) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    if (!paragraph_title || !paragraph_text || !tbl_subtopic) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields for paragraph",
        });
    }

    const paragraphSql = `
        INSERT INTO tbl_paragraph (
            paragraph_title,
            paragraph_text,
            paragraph_img,
            tbl_subtopic,
            added_by,
            status
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const paragraphValues = [
        paragraph_title,
        paragraph_text,
        paragraphImage,
        tbl_subtopic,
        added_by,
        "0"
    ];

    try {
        const [result] = await pool.promise().query(paragraphSql, paragraphValues);

        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: "Error adding paragraph",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Paragraph added successfully",
        });

    } catch (error) {
        console.error("Error processing AddParagraph:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: error.message
        });
    }

}

module.exports = { AddParagraph };