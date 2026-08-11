const pool = require("../../../db/dbConnect");
const { v4: uuidv4 } = require("uuid");

async function uploadAttendance(req, res) {
  const { session_date, subject_id, topic_name } = req.body;
  const marked_by = req?.user?.id;

  if (!session_date)
    return res
      .status(400)
      .json({ success: false, message: "session_date required" });
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "CSV file required" });

  try {
    const db = pool.promise();
    const upload_batch_id = uuidv4();

    // Parse CSV from buffer
    const text = req.file.buffer.toString("utf8");
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2)
      return res
        .status(400)
        .json({
          success: false,
          message: "CSV must have header + at least one row",
        });

    // Auto-detect delimiter: tab or comma
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, ""),
    );
    const emailIdx = headers.indexOf("email");
    const minutesIdx = headers.indexOf("minutes");

    if (emailIdx === -1)
      return res
        .status(400)
        .json({ success: false, message: "CSV must have 'email' column" });

    const rows = lines
      .slice(1)
      .map((line) => {
        const cols = line.split(delimiter).map((c) => c.trim());
        return {
          email: cols[emailIdx] || "",
          minutes:
            minutesIdx !== -1 && cols[minutesIdx]
              ? parseInt(cols[minutesIdx]) || null
              : null,
        };
      })
      .filter((r) => r.email);

    // Batch lookup emails
    const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
    const [users] = await db.query(
      `SELECT Id, Email_Id FROM users WHERE LOWER(Email_Id) IN (${emails.map(() => "?").join(",")})`,
      emails,
    );
    const emailMap = {};
    users.forEach((u) => {
      emailMap[u.Email_Id.toLowerCase()] = u.Id;
    });

    const toInsert = [];
    const notFound = [];
    const processed = [];

    rows.forEach((r) => {
      const studentId = emailMap[r.email.toLowerCase()];
      if (!studentId) {
        notFound.push(r.email);
      } else {
        toInsert.push([
          studentId,
          session_date,
          subject_id || null,
          topic_name || null,
          r.minutes,
          "present",
          marked_by,
          upload_batch_id,
        ]);
        processed.push(r.email);
      }
    });

    if (toInsert.length > 0) {
      await db.query(
        `INSERT INTO tbl_attendance
           (student_id, session_date, subject_id, topic_name, minutes, status, marked_by, upload_batch_id)
         VALUES ?`,
        [toInsert],
      );
    }

    return res.status(200).json({
      success: true,
      message: "Attendance uploaded successfully",
      summary: {
        total: rows.length,
        marked: toInsert.length,
        not_found: notFound.length,
        not_found_emails: notFound,
        upload_batch_id,
      },
    });
  } catch (err) {
    console.error("Error uploadAttendance:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { uploadAttendance };
