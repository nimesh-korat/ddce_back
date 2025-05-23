const express = require("express");
const cors = require("cors");
const {
  SignupUser_s1,
} = require("./apis/users/authentication/signup/signup_s1");
const {
  SignupUser_s2,
} = require("./apis/users/authentication/signup/signup_s2");
const { LoginUser } = require("./apis/users/authentication/login");
const {
  verifyEmail,
} = require("./apis/users/authentication/signup/verify_email");
const {
  verifyPhone,
} = require("./apis/users/authentication/signup/verify_phone");
const {
  resendEmailOTP,
} = require("./apis/users/authentication/resend_otps/resend_email_otp");
const {
  resendMobileOTP,
} = require("./apis/users/authentication/resend_otps/resend_mobile_otp");
const checkAuth = require("./middleware/auth");
const { LogoutUser } = require("./apis/users/authentication/logout");
const cookieParser = require("cookie-parser");
const {
  send_reset_pass_otp,
} = require("./apis/users/authentication/reset_password/send_reset_pass_otp");
const {
  verifyResetPassOtp,
} = require("./apis/users/authentication/reset_password/verify_reset_pass_otp");
const {
  resetPassword,
} = require("./apis/users/authentication/reset_password/reset_password");
const Session = require("./apis/session");
const {
  registrationNotification,
} = require("./apis/users/notifications/registration_notification");
const { getSubjects } = require("./apis/admin/syllabus/getSubjects");
const { getTopic } = require("./apis/admin/syllabus/getTopic");
const { getSubTopic } = require("./apis/admin/syllabus/getSubTopic");
const { LoginAdmin } = require("./apis/admin/authentication.js/login");
const { AddQuestions } = require("./apis/admin/questions/addQuestions");
const { getQuestions } = require("./apis/admin/questions/getQuestions");
const { getQuestionsById } = require("./apis/admin/questions/getQuestionsById");
const { addTest } = require("./apis/admin/quiz/addTest");
const { addTestQuestions } = require("./apis/admin/quiz/addTestQuestions");
const { addStudentAnswer } = require("./apis/admin/quiz/addStudentAnswer");
const { addFinalResult } = require("./apis/admin/quiz/addFinalResult");
const { getQuestionsForTest } = require("./apis/admin/quiz/getQuestionForTest");
const { getActiveTests } = require("./apis/admin/quiz/getActiveTest");
const { getTestQuestions } = require("./apis/admin/quiz/getTestQuestions");
const { getResultByStudent } = require("./apis/admin/quiz/getResultByStudent");
const {
  getActiveTestsForStudent,
} = require("./apis/users/quiz/getActiveTestForStudent");
const { AddParagraph } = require("./apis/admin/questions/AddParagraph");
const { GetParagraph } = require("./apis/admin/questions/getParagraph");
const { GetProfileDetail } = require("./apis/users/profile/getProfileDetail");
const {
  UpdateProfileDetail,
} = require("./apis/users/profile/updatePersonalDetails");
const {
  changePassword,
} = require("./apis/users/authentication/change_password/changePassword");
const {
  UpdateAcademicDetail,
} = require("./apis/users/profile/updateAcademicDetails");
const { GetSyllabus } = require("./apis/users/getSyllabus");
const {
  GetSyllabusWithPaper,
} = require("./apis/users/getWholeSyllabusWithPaper");
const {
  getQuestionsForVerification,
} = require("./apis/admin/verifyQuestions/getQuestionForVerification");
const {
  VerifyQuestion,
} = require("./apis/admin/verifyQuestions/verifyQuestions");
const { UpdateProfilePic } = require("./apis/users/profile/updateProfilePic");
const {
  GetTopicWiseQuestionAnalytics,
} = require("./apis/users/analytics/getTopicWiseQuestionAnalytics");
const {
  GetSubTopicWiseQuestionAnalytics,
} = require("./apis/users/analytics/getSubTopicWiseQuestionAnalytics");
const { uploadImg } = require("./middleware/s3MulterConfig");
const { GetProfileImage } = require("./apis/users/profile/getProfileImage");
const {
  GetSubjectWiseAnalysis,
} = require("./apis/users/analytics/getSubjectWiseQuestionAnalysis");
const {
  getAddedQuestionsInTest,
} = require("./apis/admin/quiz/getAddedQuestionsInTest");
const { AddBatchTitle } = require("./apis/admin/batch/AddBatch");
const { assignTestBatch } = require("./apis/admin/quiz/assignTestToBatch");
const { getAllBatch } = require("./apis/admin/batch/getAllBatch");
const { getTestWiseBatch } = require("./apis/admin/batch/getTestWiseBatch");
const { editTestBatch } = require("./apis/admin/quiz/editAssigedTestToBatch");
const { updateIsFeatured } = require("./apis/admin/quiz/updateIsFeatured");
const { AddPhase } = require("./apis/admin/phase/addPhase");
const { getAllPhase } = require("./apis/admin/phase/getAllPhase");
const { AddSession } = require("./apis/admin/session/addSession");
const { getAllSession } = require("./apis/admin/session/getSession");
const {
  getSessionWiseBatch,
} = require("./apis/admin/phase/getSessionWiseBatch");
const {
  assignBatchToSession,
} = require("./apis/admin/session/assignBatchToSession");
const {
  updateIsFeaturedSession,
} = require("./apis/admin/session/updateIsFeaturedSession");
const {
  getActiveScheduleForStudent,
} = require("./apis/users/schedule/getActiveScheduleForStudent");
const {
  getDashboardCounts,
} = require("./apis/users/dashboard/getDashboardCounts");
const {
  getUsersWithExamData,
} = require("./apis/admin/fetchStudentsData/getStudentsWithExamData");
const { getTestNames } = require("./apis/admin/fetchStudentsData/getTestName");
const {
  getStudentsWiseExamData,
} = require("./apis/admin/fetchStudentsData/getStudentWiseExamData");
const {
  DdcetRankPredict,
} = require("./apis/users/ddcetCollegePrediction/ddcet_rank_predict");
const { getColleges } = require("./apis/users/collegeAndBranch/getColleges");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

//?Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://192.168.0.19:3000",
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_2,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(
  "/uploads/images/test_images",
  express.static("uploads/images/test_imgs")
);
app.use(
  "/uploads/images/question_imgs",
  express.static("upload/images/question_imgs")
);
app.use(
  "/uploads/images/profile_imgs",
  express.static("uploads/images/profile_imgs")
);
app.use((req, res, next) => {
  //?Removing the first part of the url for nginx
  req.url = req.url.replace(/^\/[^\/]+/, "");
  next();
});

//!User APIs
app.post("/signup_s1", SignupUser_s1);
app.post("/signup_s2", SignupUser_s2);
app.post("/login", LoginUser);
app.post("/verify_phone", verifyPhone);
app.post("/verify_email", verifyEmail);
app.post("/resend_email_otp", resendEmailOTP);
app.post("/resend_mobile_otp", resendMobileOTP);
app.post("/send_reset_pass_otp", send_reset_pass_otp);
app.post("/verify_reset_pass_otp", verifyResetPassOtp);
app.post("/change_password", checkAuth, changePassword);
app.get("/getProfileDetails", checkAuth, GetProfileDetail);
app.post("/getTest", checkAuth, getActiveTestsForStudent);
app.get("/getSyllabus", checkAuth, GetSyllabus);
app.get("/getSyllabusWithPaper", checkAuth, GetSyllabusWithPaper);
app.post("/updatePersonalDetails", checkAuth, UpdateProfileDetail);
app.post(
  "/updateProfilePic",
  checkAuth,
  uploadImg.single("User_DP"),
  UpdateProfilePic
);
app.get("/getProfileImage", checkAuth, GetProfileImage);
app.post("/updateAcademicDetails", checkAuth, UpdateAcademicDetail);
app.post("/reset_password", resetPassword);
app.post("/logout", checkAuth, LogoutUser);
app.post("/session", checkAuth, Session);
app.get("/getRecentRegNotifications", registrationNotification);
app.get(
  "/getTopicWiseQuestionAnalytics",
  checkAuth,
  GetTopicWiseQuestionAnalytics
);
app.get(
  "/getSubTopicWiseQuestionAnalytics",
  checkAuth,
  GetSubTopicWiseQuestionAnalytics
);
app.get("/getSubjectWiseAnalysis", checkAuth, GetSubjectWiseAnalysis);
app.get("/getActiveScheduleForStudent", checkAuth, getActiveScheduleForStudent);
app.get("/getDashboardCounts", checkAuth, getDashboardCounts);
app.post("/ddcetRankPredict", DdcetRankPredict);
app.get("/getColleges", getColleges);

//!Admin APIs
app.post("/admin/login", LoginAdmin);
app.post(
  "/admin/addQuestion",
  checkAuth,
  uploadImg.fields([
    { name: "question_image", maxCount: 1 },
    { name: "option_a_image", maxCount: 1 },
    { name: "option_b_image", maxCount: 1 },
    { name: "option_c_image", maxCount: 1 },
    { name: "option_d_image", maxCount: 1 },
    { name: "answer_image", maxCount: 1 },
  ]),
  AddQuestions
);
app.post(
  "/admin/addParagraph",
  checkAuth,
  uploadImg.single("paragraph_img"),
  AddParagraph
);
app.post("/admin/getParagraph", checkAuth, GetParagraph);
app.get("/getSubjects", checkAuth, getSubjects);
app.post("/getTopics", checkAuth, getTopic);
app.post("/getSubTopics", checkAuth, getSubTopic);
app.get("/admin/questions", checkAuth, getQuestions);
app.post("/admin/getquestionsbyid", checkAuth, getQuestionsById);
app.post("/admin/addBatchTitle", checkAuth, AddBatchTitle);
app.post("/admin/assignTestToBatch", checkAuth, assignTestBatch);
app.get("/admin/getAllBatch", checkAuth, getAllBatch);
app.post("/admin/getTestWiseBatch", checkAuth, getTestWiseBatch);
app.post("/admin/editAssignedTestToBatch", checkAuth, editTestBatch);
app.post("/admin/updateIsFeatured", checkAuth, updateIsFeatured);
app.post("/admin/addPhase", checkAuth, AddPhase);
app.get("/admin/getPhase", checkAuth, getAllPhase);
app.post("/admin/addSession", checkAuth, AddSession);
app.get("/admin/getSession", checkAuth, getAllSession);
app.post("/admin/getSessionWiseBatch", checkAuth, getSessionWiseBatch);
app.post("/admin/assignBatchToSession", checkAuth, assignBatchToSession);
app.post("/admin/updateIsFeaturedSession", checkAuth, updateIsFeaturedSession);

app.post(
  "/admin/addTest",
  checkAuth,
  uploadImg.single("test_img_path"),
  addTest
);
app.post("/admin/addTestQuestions", checkAuth, addTestQuestions);
app.post("/addStudentAnswer", checkAuth, addStudentAnswer);
app.post("/addFinalResult", checkAuth, addFinalResult);
app.post("/admin/getQuestionsForTest", checkAuth, getQuestionsForTest);
app.post(
  "/admin/getQuestionsForVerification",
  checkAuth,
  getQuestionsForVerification
);
app.post("/admin/verifyQuestion", checkAuth, VerifyQuestion);
app.get("/admin/getTests", checkAuth, getActiveTests);
app.post("/admin/getAddedQuestionsInTest", checkAuth, getAddedQuestionsInTest);
app.post("/getTestQuestions", checkAuth, getTestQuestions);
app.post("/getResultByStudent", checkAuth, getResultByStudent);
app.get(
  "/admin/getUsersWithExamData/:test_id",
  checkAuth,
  getUsersWithExamData
);
app.get("/admin/getStudentWiseExamData", checkAuth, getStudentsWiseExamData);
app.get("/admin/getTestNames", checkAuth, getTestNames);

//?activate server
app.listen(PORT, () => {
  console.log("Server Started on port: ", PORT);
});
