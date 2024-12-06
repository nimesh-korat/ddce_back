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

// Configure multer to store files
const storageTest = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/images/test_images/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});



const uploadTestImage = multer({ storage: storageTest });
module.exports = { uploadQuestionImage, uploadTestImage };
