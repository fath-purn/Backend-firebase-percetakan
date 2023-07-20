import express from "express";
import cors from "cors";
import UUID from "uuid-v4";
import formidable from "formidable-serverless";
import dotenv from "dotenv";
dotenv.config();
import { productRef, storage } from "../config/db.js";

const app = express();
app.use(express.json({ limit: "5mb", extended: true }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));
app.use(cors());
const router = express.Router();

// Function to upload image to Firebase Storage
const uploadImage = async (image) => {
    const uuid = UUID();
    const downLoadPath =
        "https://firebasestorage.googleapis.com/v0/b/javaindo-percetakan.appspot.com/o/";

    const bucket = storage.bucket("gs://javaindo-percetakan.appspot.com/");

    const imageResponse = await bucket.upload(image.path, {
        destination: `products/${image.name}`,
        resumable: true,
        metadata: {
        metadata: {
            firebaseStorageDownloadTokens: uuid,
        },
        },
    });

    const imageUrl =
        downLoadPath +
        encodeURIComponent(imageResponse[0].name) +
        "?alt=media&token=" +
        uuid;

    return imageUrl;
};
  
const parseFormAndUploadImage = async (req, res, isUpdate = false) => {
    const form = new formidable.IncomingForm({ multiples: true });
  
    try {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res.status(400).json({
            message: "There was an error parsing the files",
            data: {},
            error: err,
          });
        }

        const image = files.image;
        if (!image || image.size <= 0) {
            // If this is an update and there's no new image, use the existing URL
            let imageUrl;
            if (isUpdate) {
                const existingProduct = await productRef.doc(req.params.id).get();
                imageUrl = existingProduct.data().url;
            }
    
            const docID = isUpdate ? req.params.id : productRef.doc().id;
    
    
            const productModel = {
                id: docID,
                nama: fields.name,
                deskripsi: fields.deskripsi,
                harga: fields.harga,
                category: fields.category,
                ulasan: fields.ulasan,
                url: imageUrl,
                date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
            };

            await productRef.doc(docID).set(productModel, { merge: true });
    
            res.status(isUpdate ? 200 : 201).send({
                message: isUpdate ? "Product updated successfully" : "Product created successfully",
                data: productModel,
                error: {},
            });
        } else {
            // If there's a new image, upload the new image
            const imageUrl = await uploadImage(image);
    
            const docID = isUpdate ? req.params.id : productRef.doc().id;
    
            const productModel = {
                id: docID,
                nama: fields.name,
                deskripsi: fields.deskripsi,
                harga: fields.harga,
                category: fields.category,
                ulasan: fields.ulasan,
                url: imageUrl || "",
                date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
            };
    
            await productRef.doc(docID).set(productModel, { merge: true });
    
            res.status(isUpdate ? 200 : 201).send({
                message: isUpdate ? "Product updated successfully" : "Product created successfully",
                data: productModel,
                error: {},
            });
          }
        });
    } catch (err) {
        res.status(500).send({
            message: "Something went wrong",
            data: {},
            error: err,
        });
    }
};
  
router.post("/products", async (req, res) => {
    await parseFormAndUploadImage(req, res, false);
})
  
router.patch("/products/:id", async (req, res) => {
    await parseFormAndUploadImage(req, res, true);
});

router.get("/products", async (req, res) => {
    try {
        const value = await productRef.get();
        const data = value.docs.map((doc) => doc.data());
        res.status(200).send({
        message: "Fetched all products",
        data: data,
        });
    } catch (error) {
        res.status(500).send({
            message: "Something went wrong",
            data: {},
            error: error,
        });
    }
});
  
router.get("/products", async (req, res) => {
    try {
        const value = await productRef.get();
        const data = value.docs.map((doc) => doc.data());
        res.status(200).send({
        message: "Fetched all products",
        data: data,
        });
    } catch (error) {
        res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
        });
    }
});

const getProductById = async (productId) => {
    const value = await productRef.where("id", "==", productId).get();
    return value.empty ? null : value.docs[0].data();
};

router.get("/products/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await getProductById(productId);

        if (!product) {
        return res.status(404).send({
            message: "No product found with the given ID",
            data: {},
        });
        }

        res.status(200).send({
        message: "Product retrieved",
        data: product,
        });
    } catch (error) {
        res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
        });
    }
});

router.delete("/products/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await getProductById(productId);

        if (!product) {
        return res.status(404).send({
            message: "No product found with the given ID",
            data: {},
        });
        }

        await productRef.doc(productId).delete();
        res.status(200).send({
        message: "Product deleted successfully",
        data: {},
        });
    } catch (error) {
        res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
        });
    }
});
  
export default router;