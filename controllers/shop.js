const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
// const PaystackPop = require("@paystack/inline-js");
const { v4: uuidv4 } = require("uuid");

const Product = require("../models/product");
const Order = require("../models/order");

let PRODUCTS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalProducts;
  Product.find()
    .countDocuments()
    .then((productsNumber) => {
      totalProducts = productsNumber;
      return Product.find()
        .skip((page - 1) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE);
    })
    .then((products) => {
      return res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        hasNextPage: totalProducts > page * PRODUCTS_PER_PAGE,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findById(productId)
    .then((product) => {
      if (!product) {
        return res.redirect("/products");
      }
      return res.render("shop/product-detail", {
        product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalProducts;
  Product.find()
    .countDocuments()
    .then((productsNumber) => {
      totalProducts = productsNumber;
      return Product.find()
        .skip((page - 1) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE);
    })
    .then((products) => {
      return res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: totalProducts > page * PRODUCTS_PER_PAGE,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((userData) => {
      // console.log(userData);
      const products = userData.cart.items;
      // console.log(products);
      return res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      // console.log(product);
      return req.user.addToCart(product);
    })
    .then((data) => res.redirect("/cart"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteItemFromCart(prodId)
    .then(() => res.redirect("/cart"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((userData) => {
      const products = userData.cart.items;
      let totalPrice = 0;

      products.forEach((product) => {
        return (totalPrice += product.productId.price * product.quantity);
      });
      return res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products,
        totalPrice: +totalPrice.toFixed(2),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.postCheckout = (req, res, next) => {
  const amount = Math.round(req.body.totalPrice * 100);
  const userEmail = req.user.email;
  const checkoutId = uuidv4();

  // post new order
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const cartProducts = user.cart.items.map((item) => {
        return {
          product: { title: item.productId.title, price: item.productId.price },
          quantity: item.quantity,
        };
      });
      const order = new Order({
        products: cartProducts,
        user: { name: req.user.name, userId: req.user },
        status: "pending",
      });
      return order.save().then((order) => {
        // res.redirect("/checkout");

        //checkout is initialized
        const data = {
          email: userEmail,
          amount,
          reference: `order-${order._id}-${Date.now()}`,
          callback_url: `${
            process.env.API_URL || `${req.protocol}://${req.get("host")}`
          }/payment/verify`,
          metadata: {
            // cancel_action: "https://your-cancel-url.com",
            order_status: order.status,
            orderId: order._id.toString(),
            userId: req.user._id.toString(),
          },
        };

        console.log("this is the data to be attached to feth body", data);

        return fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
            // "Cache-Control": "no-cache",
          },
          body: JSON.stringify(data),
        })
          .then((response) => response.json())
          .then((result) => {
            console.log("authorization url data", result);
            if (result.status) {
              // Payment initialization success
              order.paymentRef = result.data.reference;
              return order
                .save()
                .then(() => {
                  return req.user.clearCart();
                })
                .then(() => {
                  console.log("successfully placed an order and cleared cart!");
                  res.redirect(result.data.authorization_url);
                });
            } else {
              // Payment initialization failed
              console.log("Payment initialization failed:", result.message);
              res.redirect("/cart");
            }
          });
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// exports.postOrder = (req, res, next) => {
//   req.user
//     .populate("cart.items.productId")
//     .then((user) => {
//       const cartProducts = user.cart.items.map((item) => {
//         return {
//           product: { title: item.productId.title, price: item.productId.price },
//           quantity: item.quantity,
//         };
//       });
//       const order = new Order({
//         products: cartProducts,
//         user: { name: req.user.name, userId: req.user },
//       });
//       return order.save();
//     })
//     .then(() => {
//       return req.user.clearCart();
//     })
//     .then(() => {
//       console.log("successfully placed an order and cleared cart!");
//       return res.redirect("/orders");
//     })
//     .catch((err) => {
//       const error = new Error(err);
//       error.httpStatusCode = 404;
//       return next(error);
//     });
// };

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      return res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 404;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found"));
      }

      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized access"));
      }

      const invoiceName = `invoice-${orderId}.pdf`;
      const invoicePath = path.join(__dirname, "..", "invoices", invoiceName);
      const doc = new PDFDocument();
      let totalPrice = 0;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

      const invoiceFile = fs.createWriteStream(invoicePath);
      invoiceFile.on("error", (err) =>
        console.log("Could not save invoice copy:", err.message),
      );

      doc.pipe(invoiceFile);
      doc.pipe(res);

      doc
        .fontSize(26)
        .text(`Invoice for Order #${orderId}`, { underline: true });

      order.products.forEach((prod) => {
        totalPrice += prod.product.price * prod.quantity;
        return doc
          .fontSize(18)
          .text(
            `${prod.product.title} - $${prod.product.price} x ${prod.quantity}`,
          );
      });

      doc.fontSize(18).text(`Grand Total - $${totalPrice}`);
      doc.end();
      // const file = fs.createReadStream(invoicePath);
      // file.pipe(res);
    })
    .catch((err) => next(err));
};

// exports.getCheckout = (req, res, next) => {
//   res.render("shop/checkout", {
//     path: "/checkout",
//     pageTitle: "Checkout",
//   });
// };
