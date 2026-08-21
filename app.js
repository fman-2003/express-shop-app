require('dotenv').config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

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

const MONGODB_URI = process.env.MONGODB_URI
const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
const csrfProtection = csrf();

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

  const isAuthenticated = req.session?.isLoggedIn || false;

  const statusCode = error.httpStatusCode || 500;

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
  .connect(MONGODB_URI, { tls: true, tlsAllowInvalidCertificates: true })
  .then(() => {
    app.listen(process.env.PORT || 3000);
  })
  .then(() => console.log("CONNECTED TO MONGODB!"))
  .catch((err) => console.log(err));
