const { PutObjectCommand, S3 } = require("@aws-sdk/client-s3");
const pool = require("../../../db/dbConnect");
const s3 = require("../../../utils/s3Config");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function UpdateProfilePic(req, res) {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        // Check if userId is present
        const userId = req?.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        // Check if a file is provided
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Image is required." });
        }

        // Fetch user data
        const userSql = "SELECT * FROM users WHERE Id = ?";
        const [user] = await pool.promise().query(userSql, [userId]);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Prepare file data
        const fileBuffer = req.file.buffer; // Buffer from Multer (memoryStorage)
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const bucketFolder = "user_pic";
        const fileKey = `user_pic/${fileName}`;
        const mimeType = req.file.mimetype;

        // Upload file to S3
        await uploadFileToS3(bucketName, fileKey, fileBuffer, mimeType);

        // Update user profile picture in the database
        const sql = "UPDATE users SET User_DP = ? WHERE Id = ?";
        const values = [fileKey, userId];
        const [results] = await pool.promise().query(sql, values);

        // If no rows were affected, return an error
        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Profile update failed.",
            });
        }

        // Success response
        return res.status(200).json({
            success: true,
            data: fileKey,
            message: "Profile picture updated successfully.",
        });

    } catch (err) {
        console.error("Error updating profile:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { UpdateProfilePic };
