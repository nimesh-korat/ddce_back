const pool = require("../db/dbConnect");

/**
 * checkFeesLock
 * Runs AFTER checkAuth. Blocks student API requests (Role = 0) when they
 * have an unpaid fees reminder whose lock window has passed.
 *
 * Lock condition (same as frontend):
 *   deadline + lock_after_minutes has passed AND is_paid = 0
 *
 * Admin / mentor requests (Role != 0) pass through unconditionally.
 * The student's own /feesReminder fetch also passes through so the frontend
 * can still display the lock screen with payment details.
 */
const checkFeesLock = async (req, res, next) => {
  // Only enforce for students (role = 0) — JWT payload uses lowercase 'role'
  const role = req.user?.role ?? req.user?.Role;
  console.log(
    "[feesLock] path:",
    req.path,
    "role:",
    role,
    "user:",
    req.user?.id,
  );

  if (!req.user || role !== 0) return next();

  // Allow the fees reminder fetch itself — needed to render the lock screen
  if (req.path === "/feesReminder" && req.method === "GET") return next();

  try {
    const user_id = req.user.id || req.user.Id;
    console.log("[feesLock] checking user_id:", user_id);

    const [rows] = await pool.promise().query(
      `SELECT fra.deadline, fra.lock_after_minutes
       FROM tbl_fees_reminder_assigned fra
       WHERE fra.user_id = ?
         AND fra.is_paid = 0
         AND fra.lock_after_minutes IS NOT NULL
         AND UTC_TIMESTAMP() > DATE_ADD(fra.deadline, INTERVAL fra.lock_after_minutes MINUTE)
       LIMIT 1`,
      [user_id],
    );

    console.log("[feesLock] locked rows:", rows.length);
    if (rows.length > 0) {
      return res.status(403).json({
        success: false,
        locked: true,
        message:
          "Your portal access is locked due to a pending fee payment. Please complete payment to continue.",
      });
    }

    next();
  } catch (err) {
    console.error("checkFeesLock error:", err.message);
    // Fail open — don't block the student if the DB check itself errors
    next();
  }
};

module.exports = checkFeesLock;
