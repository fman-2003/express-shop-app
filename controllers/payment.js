const Order = require("../models/order");

exports.verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      req.flash("error", "No payment reference provided");
      return res.redirect("/orders");
    }

    console.log("Verifying payment:", reference);

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const result = await response.json();

    console.log("verification result", result);

    if (result.status && result.data.status === "success") {
      // payment successful
      const orderId = result.data.metadata.orderId;

      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            status: "paid",
            paidAt: new Date(),
          },
        },
      );

      req.flash("success", "Payment successful! Your order has been placed.");
      res.redirect("/orders");
    } else {
      // payment failed
      req.flash("error", "Payment verification failed");
      res.redirect("/orders");
    }
  } catch (err) {
    console.error("verification error:", err);
    req.flash("error", "Payment verification error");
    res.redirect("/orders");
  }
};
