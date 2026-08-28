const fs = require("fs");

// multer hands back an OS path ("images\x.png" on Windows). Both the <img src>
// and fs need forward slashes, so everything is stored web-style.
const toWebPath = (filePath) => filePath.split("\\").join("/");

const deleteFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(toWebPath(filePath), (err) => {
    // a missing file must not take the server down (the disk is wiped on deploy)
    if (err) console.log("Could not delete file:", filePath, err.message);
  });
};

exports.toWebPath = toWebPath;
exports.deleteFile = deleteFile;
