const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  resetTokenExpirationTime: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
  },
});

userSchema.methods.addToCart = function (product) {
  const existingCartProductIndex = this.cart.items.findIndex((item) => {
    // console.log("existingCartProductIndex returned value", item);
    return item.productId.toString() === product._id.toString();
  });

  let newQuantity;
  const updatedCartItems = [...this.cart.items];
  const existingCartProduct = this.cart.items[existingCartProductIndex];

  if (existingCartProductIndex >= 0) {
    newQuantity = existingCartProduct.quantity + 1;
    updatedCartItems[existingCartProductIndex].quantity = newQuantity;
  } else {
    newQuantity = 1;
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity,
    });
  }

  const updatedCart = { items: updatedCartItems };
  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.deleteItemFromCart = function (productId) {
  const updatedCartItems = this.cart.items.filter(
    (item) => item.productId.toString() !== productId.toString(),
  );

  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.clearCart = function () {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
// class User {
//   constructor(username, email, cart, _id) {
//     this.username = username;
//     this.email = email;
//     this.cart = cart;
//     this._id = _id;
//   }

//   save() {
//     const db = getDb();
//     return db.collection("users").insertOne(this);
//   }

//   static fetchUser(userId) {
//     const db = getDb();
//     return db
//       .collection("users")
//       .findOne({ _id: new ObjectId(userId) })
//       .then((user) => {
//         // console.log(user);
//         return user;
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }

//   async addToCart(product) {
//     const existingCartProductIndex = this.cart.items.findIndex((item) => {
//       // console.log("existingCartProductIndex returned value", item);
//       return item.productId.toString() === product._id.toString();
//     });

//     let newQuantity;
//     const updatedCartItems = [...this.cart.items];
//     const existingCartProduct = this.cart.items[existingCartProductIndex];

//     if (existingCartProductIndex >= 0) {
//       newQuantity = existingCartProduct.quantity + 1;
//       updatedCartItems[existingCartProductIndex].quantity = newQuantity;
//     } else {
//       newQuantity = 1;
//       updatedCartItems.push({
//         productId: new ObjectId(product._id),
//         quantity: newQuantity,
//       });
//     }

//     const updatedCart = { items: updatedCartItems };
//     const db = getDb();
//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new ObjectId(this._id) },
//         { $set: { cart: updatedCart } },
//       );
//   }

//   async getCart() {
//     const db = getDb();

//     const productIds = this.cart.items.map((i) => i.productId);
//     const products = await db
//       .collection("products")
//       .find({ _id: { $in: productIds } })
//       .toArray();

//     return this.cart.items.map((cartItem) => {
//       const productDetails = products.find(
//         (p) => p._id.toString() === cartItem.productId.toString(),
//       );

//       return {
//         ...productDetails,
//         quantity: cartItem.quantity,
//       };
//     });
//   }

//   deleteItemFromCart(productId) {
//     const db = getDb();
//     const updatedCartItems = this.cart.items.filter(
//       (item) => item.productId.toString() !== productId.toString(),
//     );

//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new ObjectId(this._id) },
//         { $set: { cart: { items: updatedCartItems } } },
//       );
//   }

//   addOrder() {
//     const db = getDb();
//     return this.getCart()
//       .then((products) => {
//         const order = {
//           items: products,
//           user: {
//             _id: new ObjectId(this._id),
//             username: this.username,
//           },
//         };
//         return db.collection("orders").insertOne(order);
//       })
//       .then((result) => {
//         this.cart = { items: [] };
//         return db
//           .collection("users")
//           .updateOne(
//             { _id: new ObjectId(this._id) },
//             { $set: { cart: { items: [] } } },
//           );
//       });
//   }

//   getOrders() {
//     const db = getDb();
//     return db
//       .collection("orders")
//       .find({ "user._id": new ObjectId(this._id) })
//       .toArray();
//   }
// }

// module.exports = User;
