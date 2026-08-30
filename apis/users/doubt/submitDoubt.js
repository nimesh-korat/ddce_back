const pool = require("../../../db/dbConnect");
const { sendCustomSMS } = require("../../../utils/sendCustomSMS");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function submitDoubt(req, res) {
  const student_id = req?.user?.id;
  const { subject_id, doubt_text } = req.body;
  let doubt_image = null;
  if (req.file) {
    const fileKey = `doubts/${Date.now()}-${req.file.originalname}`;
    await uploadFileToS3(
      process.env.AWS_BUCKET_NAME,
      fileKey,
      req.file.buffer,
      req.file.mimetype,
    );
    doubt_image = fileKey;
  }

  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!doubt_text)
    return res
      .status(400)
      .json({ success: false, message: "Doubt text is required" });

  try {
    const db = pool.promise();

    // Get student + batch info
    const [[student]] = await db.query(
      `SELECT u.Name, b.batch_title
       FROM users u
       LEFT JOIN tbl_batch b ON b.id = u.tbl_batch
       WHERE u.Id = ?`,
      [student_id],
    );

    // Get subject name
    let subjectName = "General";
    if (subject_id) {
      const [[subj]] = await db.query(
        "SELECT Sub_Name FROM tbl_subject WHERE Id = ?",
        [subject_id],
      );
      if (subj) subjectName = subj.Sub_Name;
    }

    // Insert doubt
    const [result] = await db.query(
      `INSERT INTO tbl_doubts (student_id, subject_id, doubt_text, doubt_image)
       VALUES (?, ?, ?, ?)`,
      [student_id, subject_id || null, doubt_text, doubt_image],
    );

    // Find mentors for this subject and send SMS (fire and forget)
    if (subject_id) {
      const [mentors] = await db.query(
        `SELECT a.Name, a.Phone
         FROM tbl_mentor_subject ms
         JOIN admin a ON a.Id = ms.mentor_id
         WHERE ms.subject_id = ? AND a.Phone IS NOT NULL`,
        [subject_id],
      );

      for (const mentor of mentors) {
        const msg = `Dear ${mentor.Name},\n\n${student.Name} from ${student.batch_title || "your batch"} has submitted a doubt regarding ${subjectName}. Kindly login to your mentor portal at your earliest convenience to review and resolve it.\n\nThank you,\nUnity Training Academy`;
        sendCustomSMS(msg, mentor.Phone); // async, don't await
      }
    }

    return res.status(200).json({
      success: true,
      message: "Doubt submitted successfully",
      doubt_id: result.insertId,
    });
  } catch (err) {
    console.error("Error submitDoubt:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { submitDoubt };
