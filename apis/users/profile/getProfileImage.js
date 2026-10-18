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

    // Normalize: old records may store full S3 URL instead of just the key
    const s3Prefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/`;
    const key = userDp.startsWith("http")
      ? userDp.replace(s3Prefix, "")
      : userDp;

    // The key in DB is the raw (unencoded) S3 key. Old filenames may contain
    // spaces, dots, UTF-8 chars etc. CloudFront signs the exact URL string passed,
    // but the browser always percent-encodes the URL before fetching — so we must
    // sign the encoded form, otherwise the signature won't match what the browser sends.
    // encodeURIComponent each path segment (not the slashes).
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const cfUrl = `${cloudfrontDomain}/${encodedKey}`;
    console.log("[getProfileImage] raw key from DB:", JSON.stringify(key));
    console.log("[getProfileImage] signing URL:", cfUrl);

    // Generate signed URL
    const signedUrl = generateSignedUrl(
      cfUrl,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // 1 day expiry
    );

    return res.status(200).json({ success: true, data: signedUrl });
  } catch (error) {
    console.error("Error in GetProfileImage:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

module.exports = { GetProfileImage };
