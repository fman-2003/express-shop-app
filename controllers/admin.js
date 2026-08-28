// const mongoose = require("mongoose");
const Product = require("../models/product");
const User = require("../models/user");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const fileHelper = require("../util/file");

exports.getAddProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    return res.render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      errorMessages: "",
      postAddProduct: { title: "", imageUrl: "", price: null, description: "" },
      validationErrors: [],
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 404;
    return next(error);
  }
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const userId = req.user._id;
  const errors = validationResult(req);
  console.log(image);

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      errorMessages: ["Please upload an image"],
      postAddProduct: { title, price, description },
      validationErrors: [],
    });
  }

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      errorMessages: errors.array().map((err) => err.msg),
      postAddProduct: { title, price, description },
      validationErrors: errors.array(),
    });
  }

    const product = new Product({
      title,
      imageUrl: fileHelper.toWebPath(image.path),
      price,
      description,
      userId,
    });

    return product
      .save()
      .then(() => {
        return res.redirect("/admin/products");
      })
      .catch((err) => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  // const errors = validationResult(req);

  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findOne({ userId: req.user._id, _id: prodId })
    .then((product) => {
      if (!product) {
        console.log("no product retrieved.");
        return res.redirect("/");
      }
      console.log(product);
      return res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product,
        errorMessages: "",
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      errorMessages: errors.array().map((err) => err.msg),
      product: {
        _id: prodId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
      },
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/admin/products");
      }
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = fileHelper.toWebPath(image.path);
      }
      return product.save().then(() => res.redirect("/admin/products"));
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      return res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        throw new Error("Product not found!");
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ userId: req.user._id, _id: prodId });
    })
    .then(() => {
      return req.user.deleteItemFromCart(prodId);
    })
    .then(() => {
      return res.redirect("/admin/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
