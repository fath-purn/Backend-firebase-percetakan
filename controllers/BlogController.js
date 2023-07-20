import express from "express";
import cors from "cors";
import UUID from "uuid-v4";
import formidable from "formidable-serverless";
import dotenv from "dotenv";
dotenv.config();
import { blogRef, storage } from "../config/db.js";

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
        destination: `blog/${image.name}`,
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
                const existingBlog = await blogRef.doc(req.params.id).get();
                imageUrl = existingBlog.data().url;
            }
    
            const docID = isUpdate ? req.params.id : blogRef.doc().id;
    
            const blogModel = {
                id: docID,
                nama: fields.name,
                deskripsi: fields.deskripsi,
                url: imageUrl || "",
                date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
            };
    
            await blogRef.doc(docID).set(blogModel, { merge: true });
    
            res.status(isUpdate ? 200 : 201).send({
                message: isUpdate ? "Blog updated successfully" : "Blog created successfully",
                data: blogModel,
                error: {},
            });
        } else {
          // If there's a new image, upload the new image
          const imageUrl = await uploadImage(image);
  
          const docID = isUpdate ? req.params.id : blogRef.doc().id;
  
          const blogModel = {
            id: docID,
            nama: fields.name,
            deskripsi: fields.deskripsi,
            url: imageUrl || "",
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
          };
  
          await blogRef.doc(docID).set(blogModel, { merge: true });
  
          res.status(isUpdate ? 200 : 201).send({
            message: isUpdate ? "Blog updated successfully" : "Blog created successfully",
            data: blogModel,
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
  

// tambah blog
router.post("/blog", async (req, res) => {
    parseFormAndUploadImage(req, res, false);
});

router.patch("/blog/:id", async (req, res) => {
    parseFormAndUploadImage(req, res, true);
});

router.get("/blog", async (req, res) => {
    try {
        const value = await blogRef.get();
        const data = value.docs.map((doc) => doc.data());
        res.status(200).send({
        message: "Fetched all blog",
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

const getBlogById = async (blogId) => {
    const value = await blogRef.where("id", "==", blogId).get();
    return value.empty ? null : value.docs[0].data();
};

router.get("/blog/:id", async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await getBlogById(blogId);

        if (!blog) {
        return res.status(404).send({
            message: "No blog found with the given ID",
            data: {},
        });
        }

        res.status(200).send({
        message: "Blog retrieved",
        data: blog,
        });
    } catch (error) {
        res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
        });
    }
});

router.delete("/blog/:id", async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await getBlogById(blogId);

        if (!blog) {
        return res.status(404).send({
            message: "No blog found with the given ID",
            data: {},
        });
        }

        await blogRef.doc(blogId).delete();
        res.status(200).send({
        message: "Blog deleted successfully",
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
