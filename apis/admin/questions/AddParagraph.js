const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function AddParagraph(req, res) {
    const { paragraph_title, paragraph_text, tbl_subtopic } = req.body;
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

    // Ensure file is provided before proceeding
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Paragraph image is required",
        });
    }

    // Prepare the file data for S3 upload
    const fileBuffer = req.file.buffer; // Buffer from Multer (memoryStorage)
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const bucketFolder = "paragraph_images";  // Folder name in S3
    const fileKey = `${bucketFolder}/${fileName}`;
    const mimeType = req.file.mimetype;

    try {
        // Upload the file to S3
        
        const fileUrl = await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, fileBuffer, mimeType);

        // Check if the paragraph title already exists
        const getParagraphSql = `
            SELECT * FROM tbl_paragraph WHERE paragraph_title = ?
        `;
        const getParagraphValues = [paragraph_title];

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
            fileKey,  // Save S3 file key (or URL if needed)
            tbl_subtopic,
            added_by,
            "0"  // Default status
        ];

        // Check if the paragraph title already exists in the database
        const [getParagraphResult] = await pool.promise().query(getParagraphSql, getParagraphValues);
        if (getParagraphResult.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Paragraph title already exists",
            });
        }

        // Insert new paragraph into the database
        const [result] = await pool.promise().query(paragraphSql, paragraphValues);
        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: "Error adding paragraph",
            });
        }

        // Success response
        return res.status(201).json({
            success: true,
            message: "Paragraph added successfully",
            data: {
                paragraph_title,
                paragraph_img_url: fileUrl,  // Optionally, you can return the file URL here if needed
            },
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
