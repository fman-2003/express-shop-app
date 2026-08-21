const path = require("path");
const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/add-product", isAuth, adminController.getAddProduct);

router.post(
  "/add-product",
  [
    body("title")
      .isLength({ max: 50 })
      .trim()
      .withMessage("Enter a title not longer than 50 characters."),
    // body("imageUrl")
    // .isURL().trim().withMessage("Only a valid URL is allowed."),
    body("description")
      .isLength({ min: 5, max: 250 })
      .withMessage("Enter a description between 5 to 250 characters long."),
    body("price")
      .isCurrency({
        allow_decimal: true,
        allow_negatives: false,
        //   thousands_separator: ",",
      })
      .trim()
      .withMessage("Enter a proper price amount. Decimals are allowed."),
  ],
  isAuth,
  adminController.postAddProduct,
);

router.get("/products", isAuth, adminController.getProducts);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body("title")
      .isLength({ max: 50 })
      .trim()
      .withMessage("Enter a title not longer than 50 characters."),
    body("imageUrl"),
    // .isURL().trim().withMessage("Only a valid URL is allowed.")
    body("description")
      .isLength({ min: 5, max: 250 })
      .trim()
      .withMessage("Enter a description between 5 to 250 characters long."),
    body("price")
      .isCurrency({
        allow_decimal: true,
        allow_negatives: false,
        //   thousands_separator: ",",
      })
      .trim()
      .withMessage("Enter a proper price amount. Decimals are allowed."),
  ],
  isAuth,
  adminController.postEditProduct,
);

router.post("/delete-product", isAuth, adminController.postDeleteProduct);

module.exports = router;
