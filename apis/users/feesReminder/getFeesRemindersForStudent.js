const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getFeesRemindersForStudent(req, res) {
  try {
    // JWT payload stores user id as lowercase 'id' (set in utils/jwt.js generateToken)
    const user_id = req.user.id || req.user.Id;

    if (!user_id) {
      console.error(
        "getFeesRemindersForStudent: no user_id in token payload",
        req.user,
      );
      return res
        .status(401)
        .json({ success: false, message: "User identity missing from token" });
    }

    const [reminders] = await pool.promise().query(
      `SELECT fr.id, fr.title, fr.description, fr.amount,
              fr.qr_code, fr.payment_link,
              fra.deadline, fra.lock_after_minutes,
              fra.is_paid, fra.paid_at,
              COALESCE(fra.created_at, fra.deadline) AS assigned_at
       FROM tbl_fees_reminder_assigned fra
       JOIN tbl_fees_reminder fr ON fr.id = fra.reminder_id
       WHERE fra.user_id = ?
       ORDER BY fra.is_paid ASC, fra.deadline ASC`,
      [user_id],
    );

    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day

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
    console.error("getFeesRemindersForStudent error:", err.message, err.stack);
    res
      .status(500)
      .json({ success: false, message: "Server error", detail: err.message });
  }
}

module.exports = { getFeesRemindersForStudent };
