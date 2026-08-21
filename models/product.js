const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Product", productSchema);
// const mongoDb = require("mongodb");
// const { getDb } = require("../util/database");

// class Product {
//   constructor(title, price, description, imageUrl, userId) {
//     this.title = title;
//     this.price = price;
//     this.description = description;
//     this.imageUrl = imageUrl;
//     this.userId = userId;
//   }

//   save() {
//     const db = getDb();
//     return db
//       .collection("products")
//       .insertOne(this)
//       .then((product) => {
//         // console.log(product);
//         return product;
//       })
//       .catch((err) => console.log(err));
//   }

//   static fetchAll() {
//     const db = getDb();
//     return db
//       .collection("products")
//       .find()
//       .toArray()
//       .then((products) => {
//         // console.log(products);
//         return products;
//       })
//       .catch((err) => console.log(err));
//   }

//   static fetchOne(productId) {
//     const db = getDb();
//     return db
//       .collection("products")
//       .findOne({ _id: new mongoDb.ObjectId(productId) })
//       .then((product) => {
//         // console.log(product);
//         return product;
//       })
//       .catch((err) => console.log(err));
//   }

//   static postEditProduct(productId, productEdit) {
//     const db = getDb();
//     return db
//       .collection("products")
//       .updateOne({ _id: productId }, { $set: productEdit }, { upsert: true })
//       .then((editedProduct) => {
//         // console.log(editedProduct);
//         return editedProduct;
//       })
//       .catch((err) => console.log(err));
//   }

//   static delete(productId) {
//     const db = getDb();
//     return db
//       .collection("products")
//       .deleteOne({ _id: productId })
//       .then((data) => {
//         return data;
//       })
//       .catch((err) => console.log(err));
//   }
// }

// module.exports = Product;
