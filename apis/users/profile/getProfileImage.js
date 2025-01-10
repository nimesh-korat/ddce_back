const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");
const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function GetProfileImage(req, res) {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    const userId = req?.user?.id;

    // Check if user ID is present
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    try {
        // Fetch user data from database
        const userSql = "SELECT User_DP FROM users WHERE Id = ?";
        const [user] = await pool.promise().query(userSql, [userId]);

        // Check if user exists
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Construct the CloudFront URL for the profile image
        const userDp = user[0].User_DP;
        if (!userDp) {
            return res.status(404).json({
                success: false,
                message: "Profile image not found",
            });
        }

        // Generate signed URL
        const signedUrl = generateSignedUrl(
            `${cloudfrontDomain}/${userDp}`,
            new Date(Date.now() + 1000 * 60 * 60 * 24 * 1) // 1 day expiry
        );

        return res.status(200).json({ success: true, data: signedUrl });
    } catch (error) {
        console.error("Error in GetProfileImage:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

module.exports = { GetProfileImage };
