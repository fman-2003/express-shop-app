require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const helmet = require("helmet");
const morgan = require("morgan");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");
const User = require("./models/user");
// const sequelize = require("./util/database");
// const db = require("./util/database");
// const Product = require("./models/product");
// const User = require("./models/user");
// const Cart = require("./models/cart");
// const CartItem = require("./models/cart-item");
// const Order = require("./models/order");
// const OrderItem = require("./models/order-item");

const MONGODB_URI = process.env.MONGODB_URI;
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
store.on("error", (err) => console.log("SESSION STORE ERROR:", err));
const csrfProtection = csrf();

// Uploads and generated invoices are written to these folders, so they have to
// exist before the first request lands (a fresh deploy may not ship them).
fs.mkdirSync(path.join(__dirname, "images"), { recursive: true });
fs.mkdirSync(path.join(__dirname, "invoices"), { recursive: true });

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      // "auto" + "trust proxy" => Secure over https (Render), plain over http
      // (local). A hard-coded true drops the cookie on http, which breaks csrf.
      secure: "auto",
      sameSite: "lax",
      httpOnly: true,
    },
  }),
);
app.use(csrfProtection);
app.use(flash());
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use((req, res, next) => {
  res.status(404).render("404", {
    pageTitle: "Page Not Found",
    path: "/404",
    isAuthenticated: req.session?.isLoggedIn || false,
  });
});
// app.get("/500", errorController.get500);
app.use((error, req, res, next) => {
  console.log("Error caught:", error);

  if (res.headersSent) {
    return next(error);
  }

  const isAuthenticated = req.session?.isLoggedIn || false;

  // csurf rejects a request before res.locals.csrfToken is set, and the error
  // views include the navigation which reads it.
  res.locals.isAuthenticated = isAuthenticated;
  res.locals.csrfToken = res.locals.csrfToken || "";

  const statusCode =
    error.code === "EBADCSRFTOKEN" ? 403 : error.httpStatusCode || 500;

  res.status(statusCode).render("500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated,
  });
});
// Product.belongsTo(User, { onDelete: "CASCADE" });
// User.hasMany(Product);
// User.hasOne(Cart);
// Cart.belongsTo(User);
// Cart.belongsToMany(Product, { through: CartItem });
// Product.belongsToMany(Cart, { through: CartItem });
// User.hasMany(Order);
// Order.belongsTo(User);
// Order.belongsToMany(Product, { through: OrderItem });
// Product.belongsToMany(Order, { through: OrderItem });

// sequelize
//   // .sync({ force: true })
//   .sync()
//   .then((data) => User.findByPk(1))
//   .then((user) => {
//     if (!user) {
//       return User.create({
//         name: "Fulfilment",
//         email: "olatunjifulfilment95@gmail.com",
//       });
//     }
//     return user;
//   })
//   .then((user) => {
//     return user.getCart().then((cart) => {
//       if (!cart) return user.createCart();

//       return cart;
//     });
//   })
//   .then(() => app.listen(3000))
//   .catch((err) => console.log(err));

mongoose
  .connect(MONGODB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: process.env.NODE_ENV !== "production",
  })
  .then(() => {
    app.listen(process.env.PORT || 3002);
  })
  .then(() => console.log("CONNECTED TO MONGODB!"))
  .catch((err) => console.log(err));
