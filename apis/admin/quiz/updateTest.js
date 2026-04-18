const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function updateTest(req, res) {
  const { id } = req.params;
  const {
    test_name,
    test_desc,
    test_neg_marks,
    test_duration,
    test_difficulty,
    for_who,
    isFake,
  } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Test ID is required" });
  }

  if (!test_name || !test_desc || !test_neg_marks || !test_duration || !test_difficulty) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Check if the test exists
    const [existing] = await pool
      .promise()
      .query(
        "SELECT * FROM tbl_test WHERE id = ? AND is_deleted = 0 AND status = '1'",
        [id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    const newTestDifficulty =
      test_difficulty === "Easy"
        ? "0"
        : test_difficulty === "Medium"
        ? "1"
        : test_difficulty === "Hard"
        ? "2"
        : test_difficulty === "Time Consuming"
        ? "3"
        : test_difficulty; // allow passing raw value "0"-"3"

    let test_img_path = existing[0].test_img_path;

    // Upload new image if provided
    if (req.file) {
      const fileBuffer = req.file.buffer;
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileKey = `test_images/${fileName}`;
      const mimeType = req.file.mimetype;
      await uploadFileToS3(
        process.env.AWS_BUCKET_NAME,
        fileKey,
        fileBuffer,
        mimeType
      );
      test_img_path = fileKey;
    }

    const sql = `
      UPDATE tbl_test
      SET test_name = ?, test_desc = ?, test_img_path = ?, test_neg_marks = ?,
          test_duration = ?, test_difficulty = ?, for_who = ?, isFake = ?
      WHERE id = ?
    `;
    const values = [
      test_name,
      test_desc,
      test_img_path,
      test_neg_marks,
      test_duration,
      newTestDifficulty,
      for_who || existing[0].for_who,
      isFake !== undefined ? isFake.toString() : existing[0].isFake,
      id,
    ];

    await pool.promise().query(sql, values);

    return res.status(200).json({
      success: true,
      message: "Test updated successfully",
    });
  } catch (err) {
    console.error("Error processing updateTest:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { updateTest };
