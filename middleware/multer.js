const multer = require("multer");

// Configure multer to store files
const storageQuestion = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/images/question_imgs/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadQuestionImage = multer({ storage: storageQuestion });

// Configure multer to store files
const storageParagraph = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/images/paragraph_imgs/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadParagraphImage = multer({ storage: storageParagraph });

// Configure multer to store files
const storageTest = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/images/test_imgs/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadTestImage = multer({ storage: storageTest });

// Configure multer to store files
const storageProfile = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/images/profile_imgs/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadProfileImage = multer({ storage: storageProfile });

module.exports = { uploadQuestionImage, uploadParagraphImage, uploadTestImage, uploadProfileImage };
