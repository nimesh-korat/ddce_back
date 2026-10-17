const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getFeesReminders(req, res) {
  try {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day

    const [reminders] = await pool.promise().query(`
      SELECT fr.*,
             u.Name AS created_by_name,
             COUNT(DISTINCT fra.id)  AS total_assigned,
             COALESCE(SUM(fra.is_paid), 0) AS total_paid
      FROM tbl_fees_reminder fr
      LEFT JOIN users u ON u.Id = fr.created_by
      LEFT JOIN tbl_fees_reminder_assigned fra ON fra.reminder_id = fr.id
      GROUP BY fr.id
      ORDER BY fr.created_at DESC
    `);

    // Normalize qr_code — old rows store full S3 URL, new rows store just the key
    const s3Prefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/`;
    const toKey = (val) => {
      if (!val) return null;
      if (val.startsWith("http")) return val.replace(s3Prefix, ""); // strip S3 URL → key
      return val; // already a key
    };

    const data = reminders.map((r) => ({
      ...r,
      qr_code: r.qr_code
        ? generateSignedUrl(`${cloudfrontDomain}/${toKey(r.qr_code)}`, expiry)
        : null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("getFeesReminders:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getFeesReminders };
