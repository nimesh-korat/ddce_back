const { Upload } = require("@aws-sdk/lib-storage");
const s3 = require("./s3Config");

async function uploadFileToS3(bucketName, key, fileBuffer, mimeType) {
    try {
        // Validate inputs
        if (!bucketName || !key || !fileBuffer || !mimeType) {
            throw new Error("Invalid input parameters for file upload.");
        }

        // Initialize the upload object
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
            },
        });

        // Upload the file to S3
        await upload.done();

        // Return the S3 file URL
        return `https://${bucketName}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${key}`;

    } catch (error) {
        console.error("uploadFileToS3 error:", error.message);
        throw new Error(`File upload failed: ${error.message}`);
    }
}

module.exports = { uploadFileToS3 };
