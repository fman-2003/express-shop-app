const bcrypt = require("bcryptjs");
const { Resend } = require("resend");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const User = require("../models/user");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.getLogin = async (req, res, next) => {
  // let errorMessage = req.flash("error");
  // if (errorMessage.length > 0) {
  //   errorMessage = errorMessage[0];
  // } else {
  //   errorMessage = null;
  // }
  try {
    return res.render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessages: null,
      oldInput: { email: "", password: "" },
      validationErrors: [],
    });
  } catch (err) {
    // res.redirect("/500")
    const error = new Error(err);
    error.httpStatusCode = 404;
    return next(error);
  }
};

exports.getSignup = (req, res, next) => {
  // let errorMessage = req.flash("error");

  // if (errorMessage.length > 0) {
  //   errorMessage = errorMessage[0];
  // } else {
  //   errorMessage = null;
  // }
  try {
    return res.render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessages: null,
      oldInput: {
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      },
      validationErrors: [],
    });
  } catch (err) {
    // res.redirect("/500")
    const error = new Error(err);
    error.httpStatusCode = 404;
    return next(error);
  }
};

exports.postLogin = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessages: errors.array().map((err) => err.msg),
        oldInput: { email: email, password: password },
        validationErrors: errors.array(),
      });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessages: ["Invalid email or password."],
        oldInput: { email: email, password: password },
        validationErrors: [],
      });
    }

    // if (!user) {
    //   req.flash("error", "Invalid email or password.");
    //   userExist = false;
    //   return res.redirect("/login");
    // }

    // const doMatch = await bcrypt.compare(password, user.password);

    // if (!doMatch) {
    //   req.flash("error", "Invalid email or password.");
    //   passwordMatch = false;
    //   return res.redirect("/login");
    // }

    req.session.isLoggedIn = true;
    req.session.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    return req.session.save((err) => {
      if (err) console.log(err);
      res.redirect("/");
    });
  } catch (err) {
    // res.redirect("/500")
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());

    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessages: errors.array().map((err) => err.msg),
      oldInput: {
        name: name,
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  return bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        name,
        email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      if (!result) {
        return;
      }
      return resend.emails
        .send({
          from: "onboarding@resend.dev",
          to: email,
          subject: "Welcome! Your account has been created.",
          html: `<p>Hi <strong>${name}</strong>, welcome aboard! Your account has been successfully created.</p>`,
        })
        .catch((err) => console.log("Welcome email failed:", err));
    })
    .then(() => {
      return res.redirect("/login");
    })
    .catch((err) => {
      // res.redirect("/500")
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  return req.session.destroy((err) => {
    if (err) {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    }
    return res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  try {
    let errorMessage = req.flash("error");
    if (errorMessage.length > 0) {
      errorMessage = errorMessage[0];
    } else {
      errorMessage = null;
    }
    return res.render("auth/reset", {
      path: "/reset",
      pageTitle: "Password Reset",
      errorMessage,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 404;
    return next(error);
  }
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with this email found.");
          return null;
        }
        user.resetToken = token;
        user.resetTokenExpirationTime = Date.now() + 3600000;
        return user.save();
      })
      .then((user) => {
        if (!user) {
          return res.redirect("/reset");
        }
        return resend.emails
          .send({
            from: "onboarding@resend.dev",
            to: user.email,
            subject: "Password Reset",
            html: `<h2>Hi <strong>${user.name}</strong>, click the link below to reset your password.</h2>
              <p><a href="${process.env.API_URL}/reset/${user.resetToken}" >Click here</a> to reset your password. 
              If it was not you that requested for this passsword reset, ignore this email.</p>
            `,
          })
          .catch((err) => console.log("Password reset email failed:", err))
          .then(() => res.redirect("/"));
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
        // return res.redirect("/reset");
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const resetToken = req.params.resetToken;
  User.findOne({
    resetToken,
    resetTokenExpirationTime: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "This reset link is invalid or has expired.");
        return res.redirect("/reset");
      }
      let errorMessage = req.flash("error");
      if (errorMessage.length > 0) {
        errorMessage = errorMessage[0];
      } else {
        errorMessage = null;
      }
      return res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Update Password",
        errorMessage,
        userId: user._id.toString(),
        resetToken,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const userId = req.body.userId;
  const resetToken = req.body.resetToken;
  const newPassword = req.body.password;
  let foundUser;

  User.findOne({
    resetToken,
    resetTokenExpirationTime: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      if (!user) {
        return null;
      }
      foundUser = user;
      return bcrypt.hash(newPassword, 12);
      // .catch((err) => console.log(err));
    })
    .then((hashedPassword) => {
      if (!hashedPassword) {
        req.flash("error", "This reset link is invalid or has expired.");
        return res.redirect("/reset");
      }
      foundUser.password = hashedPassword;
      foundUser.resetToken = undefined;
      foundUser.resetTokenExpirationTime = undefined;
      return foundUser.save().then(() => res.redirect("/login"));
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
