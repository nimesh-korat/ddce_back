const multer = require("multer");

// Configure multer to store files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/images/question_imgs/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadQuestionImage = multer({ storage });
module.exports = uploadQuestionImage;
