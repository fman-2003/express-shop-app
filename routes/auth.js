const express = require("express");
const bcrypt = require("bcryptjs");
const { check, body } = require("express-validator");
const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .normalizeEmail()
      .trim()
      .custom(async (value, { req }) => {
        const userDoc = await User.findOne({ email: value });

        if (!userDoc) {
          return Promise.reject("Invalid email or password.");
        }
      }),

    body("password")
      .isLength({ min: 5 })
      // .isAlphanumeric()
      .withMessage(
        "Please enter a password with only text and numbers and at least 5 characters slong",
      )
      .trim()
      .custom(async (value, { req }) => {
        const userDoc = await User.findOne({ email: req.body.email });

        const doMatch = await bcrypt.compare(value, userDoc.password);

        if (!doMatch) {
          return Promise.reject("Invalid email or password.");
        }
      }),
  ],
  authController.postLogin,
);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .normalizeEmail()
      .trim()
      .custom(async (value, { req }) => {
        const userDoc = await User.findOne({ email: value });
        if (userDoc) {
          return Promise.reject(
            "Email exists already, please pick another one.",
          );
          // return res.redirect("/login");
        }
        return true;
      }),
    body("password")
      // .isAlphanumeric()
      .isLength({ min: 5 })
      .trim()
      .withMessage(
        "Please enter a password with only text and numbers and at least 5 characters long.",
      ),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      }),
  ],
  authController.postSignup,
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:resetToken", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
