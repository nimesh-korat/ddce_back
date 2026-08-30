const pool = require("../../../db/dbConnect");
const { sendCustomSMS } = require("../../../utils/sendCustomSMS");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function solveDoubt(req, res) {
  const { id } = req.params;
  const answered_by = req?.user?.id;
  const { answer_text } = req.body;
  let answer_image = null;
  if (req.file) {
    const fileKey = `doubts/answers/${Date.now()}-${req.file.originalname}`;
    await uploadFileToS3(
      process.env.AWS_BUCKET_NAME,
      fileKey,
      req.file.buffer,
      req.file.mimetype,
    );
    answer_image = fileKey;
  }

  if (!answer_text && !answer_image)
    return res
      .status(400)
      .json({ success: false, message: "Answer is required" });

  try {
    const db = pool.promise();

    const [[doubt]] = await db.query(
      `SELECT d.student_id, d.subject_id, s.Sub_Name AS subject_name
       FROM tbl_doubts d
       LEFT JOIN tbl_subject s ON s.Id = d.subject_id
       WHERE d.id = ?`,
      [id],
    );
    if (!doubt)
      return res
        .status(404)
        .json({ success: false, message: "Doubt not found" });

    await db.query(
      `UPDATE tbl_doubts
       SET status = 'solved', answered_by = ?, answered_at = NOW(),
           answer_text = ?, answer_image = ?
       WHERE id = ?`,
      [answered_by, answer_text || null, answer_image, id],
    );

    // SMS to student
    const [[student]] = await db.query(
      "SELECT Name, Phone_Number FROM users WHERE Id = ?",
      [doubt.student_id],
    );
    if (student?.Phone_Number) {
      const msg = `Dear ${student.Name},\n\nYour doubt regarding ${doubt.subject_name || "your subject"} has been resolved by your subject faculty. Kindly login to your account to view the detailed response.\n\nThank you,\nUnity Training Academy`;
      sendCustomSMS(msg, String(student.Phone_Number));
    }

    return res
      .status(200)
      .json({ success: true, message: "Doubt solved successfully" });
  } catch (err) {
    console.error("Error solveDoubt:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { solveDoubt };
