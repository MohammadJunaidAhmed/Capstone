const express = require("express");
const { Category } = require("../models/Category/Category");
const { Product } = require("../models/Product/Product");
const { Seller } = require("../models/Seller/Seller");
const multer = require("multer");
const router = express.Router();

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("invalid image type");

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

// API TO GET ALL PRODUCTS;
router.get("/products", async (req, res) => {
  try {
    // Find all products and populate necessary fields
    const products = await Product.find({})
      .populate("category")
      .populate("sellerProducts.seller");

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    // Create an array to store flattened product-seller combinations
    let allProducts = [];

    // Loop through each product and flatten sellerProducts
    products.forEach((product) => {
      product.sellerProducts.forEach((sellerProduct) => {
        allProducts.push({
          id: product._id,
          name: product.name,
          category: product.category.name,
          mrp: product.mrp,
          seller: sellerProduct.seller._id,
          sellerName: sellerProduct.seller.name, // Assuming seller has a 'name' field
          price: sellerProduct.price,
          stock: sellerProduct.stock,
          sellerRating: sellerProduct.sellerRating, // Seller-specific rating
          numReviews: sellerProduct.numReviews,
          status: sellerProduct.status, // Assuming sellerProduct has a 'status' field
          published: product.published, // Assuming product has a published field
        });
      });
    });

    res.status(200).json({ allProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// API to retrieve sellers for a specific product
router.get("/products/:productId/sellers", async (req, res) => {
  const { productId } = req.params;

  try {
    // Find the product and populate the seller details
    const product = await Product.findById(productId).populate({
      path: "sellerProducts.seller",
      select: "name email phone", // Select the required seller fields
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Send the list of sellers selling this product
    res.status(200).json({
      productName: product.name,
      sellers: product.sellerProducts.map((sellerProduct) => ({
        seller: sellerProduct.seller,
        price: sellerProduct.price,
        rating: sellerProduct.sellerRating,
        stock: sellerProduct.stock,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET A PRODUCT FOR GIVEN SELLER
router.get("/products/:productId/sellers/:sellerId", async (req, res) => {
  const { productId, sellerId } = req.params;

  try {
    // Find the product by productId
    const product = await Product.findById(productId).populate(
      "sellerProducts.seller"
    );

    // Check if the product exists
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the seller exists in the product's sellerProducts
    const sellerProduct = product.sellerProducts.find(
      (sp) => sp.seller._id.toString() === sellerId
    );

    if (!sellerProduct) {
      return res
        .status(404)
        .json({ message: "Seller not selling this product" });
    }

    // Return the specific product details for the seller
    res.status(200).json({
      product: {
        name: product.name,
        category: product.category,
        description: product.description,
        seller: {
          sellerId: sellerProduct.seller._id,
          price: sellerProduct.price,
          stock: sellerProduct.stock,
          images: sellerProduct.images,
          mrp: product.mrp,
          purchasePrice: product.purchasePrice,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// API TO GET ALL PRODUCTS OF A GIVEN SELLER
router.get("/sellers/:sellerId/products", async (req, res) => {
  const { sellerId } = req.params;

  try {
    // Find all products where the seller has entries in the sellerProducts array
    const products = await Product.find({ "sellerProducts.seller": sellerId })
      .populate("category", "name") // Populate the category name for each product
      .lean(); // Use lean for better performance since we are just reading data

    // Format the products to the desired structure
    const formattedProducts = products.map((product) => {
      // Find the seller-specific details for this seller from sellerProducts array
      const sellerProduct = product.sellerProducts.find(
        (sp) => sp.seller.toString() === sellerId
      );

      return {
        id: product._id,
        name: product.name,
        category: product.category.name, // Assuming category is populated with the 'name'
        mrp: product.mrp || "N/A", // Assuming 'mrp' exists or defaults to 'N/A'
        price: sellerProduct ? sellerProduct.price : "N/A",
        stock: sellerProduct ? sellerProduct.stock : "N/A",
        status:
          sellerProduct && sellerProduct.stock > 0
            ? "In Stock"
            : "Out of Stock",
      };
    });

    if (formattedProducts.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this seller" });
    }

    res.status(200).json({
      message: `Products found for seller ${sellerId}`,
      products: formattedProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Flattened API to Get Products by Category (with at least 1 seller)
router.get("/products/category/:categoryId", async (req, res) => {
  const { categoryId } = req.params;

  try {
    // Fetch products with at least one seller in the specified category
    const products = await Product.find({
      category: categoryId,
      sellerProducts: { $exists: true, $not: { $size: 0 } },
    })
      .populate("category")
      .populate("sellerProducts.seller");

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this category" });
    }

    // Flatten the products based on sellerProducts
    let allProducts = [];

    products.forEach((product) => {
      product.sellerProducts.forEach((sellerProduct) => {
        allProducts.push({
          id: product._id,
          name: product.name,
          category: product.category.name,
          mrp: product.mrp,
          seller: sellerProduct.seller._id,
          sellerName: sellerProduct.seller.name, // Assuming seller has a 'name' field
          price: sellerProduct.price,
          stock: sellerProduct.stock,
          sellerRating: sellerProduct.sellerRating,
          numReviews: sellerProduct.numReviews,
          status: sellerProduct.status,
          published: product.published,
        });
      });
    });

    res.status(200).json({ allProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// API to add a product for a seller
router.post(
  "/sellers/:sellerId/products",
  uploadOptions.single("images"),
  async (req, res) => {
    const { sellerId } = req.params;
    const {
      productName,
      category,
      description,
      sellerPrice,
      stock,
      mrp,
      purchasePrice,
    } = req.body;

    // Use req.file to get the uploaded file
    const file = req.file;
    if (!file) return res.status(400).send("No image in the request");

    const fileName = file.filename; // Multer stores the file in req.file, not req.body
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

    try {
      // Find the seller by ID
      const seller = await Seller.findById(sellerId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      // Create the new product object
      const newProduct = new Product({
        name: productName,
        category: category,
        description: description,
        mrp: mrp,
        purchasePrice: purchasePrice,
        sellerProducts: [
          {
            seller: sellerId,
            price: sellerPrice,
            stock: stock,
            images: `${basePath}${fileName}`, // Save the image path
          },
        ],
      });

      // Save the product
      const savedProduct = await newProduct.save();
      res
        .status(201)
        .json({ message: "Product added successfully", product: savedProduct });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// API to add a review for a product sold by a specific seller
router.post(
  "/products/:productId/sellers/:sellerId/reviews",
  async (req, res) => {
    const { productId, sellerId } = req.params;
    const { consumerId, rating, comment } = req.body;

    try {
      // Find the product by ID
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Find the seller's specific product in the sellerProducts array
      const sellerProduct = product.sellerProducts.find(
        (sp) => sp.seller.toString() === sellerId
      );
      if (!sellerProduct) {
        return res
          .status(404)
          .json({ message: "Seller for this product not found" });
      }

      // Check if the consumer exists
      const consumer = await Consumer.findById(consumerId);
      if (!consumer) {
        return res.status(404).json({ message: "Consumer not found" });
      }

      // Add the review to the seller's product
      const review = {
        consumer: consumerId,
        rating,
        comment,
      };
      sellerProduct.reviews.push(review);
      sellerProduct.numReviews += 1;

      // Update the seller rating based on the average of reviews
      const totalRating = sellerProduct.reviews.reduce(
        (acc, review) => acc + review.rating,
        0
      );
      sellerProduct.sellerRating = totalRating / sellerProduct.numReviews;

      // Save the updated product document
      await product.save();

      res.status(201).json({ message: "Review added successfully", product });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// API TO DELETE A PRODUCT;
router.delete("/sellers/:sellerId/products/:productId", async (req, res) => {
  const { sellerId, productId } = req.params;

  try {
    // Step 1: Find the product by productId
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Step 2: Find the seller's product details in the `sellerProducts` array of the product
    const sellerIndex = product.sellerProducts.findIndex(
      (sp) => sp.seller.toString() === sellerId
    );
    if (sellerIndex === -1) {
      return res
        .status(404)
        .json({ message: "Seller does not sell this product" });
    }

    // Step 3: Remove the seller's product details from the product's `sellerProducts`
    product.sellerProducts.splice(sellerIndex, 1);
    await product.save();

    // Step 4: Find the seller and remove the product from their `sellerProducts`
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res
      .status(200)
      .json({ message: "Product removed successfully for the seller" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
