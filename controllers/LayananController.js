import express from "express";
import cors from "cors";
import UUID from "uuid-v4";
import formidable from "formidable-serverless";
import dotenv from "dotenv";
dotenv.config();
import { layananRef, storage } from "../config/db.js";

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
        destination: `layanan/${image.name}`,
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

const createOrUpdateLayanan = async (req, res, isUpdate = false) => {
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
                const existingLayanan = await layananRef.doc(req.params.id).get();
                imageUrl = existingLayanan.data().url;
            }
    
            const docID = isUpdate ? req.params.id : layananRef.doc().id;
    
            const layananModel = {
                id: docID,
                nama: fields.name,
                deskripsi: fields.deskripsi,
                url: imageUrl || "",
                date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
            };
    
            await layananRef.doc(docID).set(layananModel, { merge: true });
    
            res.status(isUpdate ? 200 : 201).send({
                message: isUpdate ? "layanan updated successfully" : "layanan created successfully",
                data: layananModel,
                error: {},
            });
        } else {
          // If there's a new image, upload the new image
          const imageUrl = await uploadImage(image);
  
          const docID = isUpdate ? req.params.id : layananRef.doc().id;
  
          const layananModel = {
            id: docID,
            nama: fields.name,
            deskripsi: fields.deskripsi,
            url: imageUrl || "",
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
          };
  
          await layananRef.doc(docID).set(layananModel, { merge: true });
  
          res.status(isUpdate ? 200 : 201).send({
            message: isUpdate ? "layanan updated successfully" : "layanan created successfully",
            data: layananModel,
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
  

// tambah layanan
router.post("/layanan", async (req, res) => {
    createOrUpdateLayanan(req, res, false);
});

router.patch("/layanan/:id", async (req, res) => {
    createOrUpdateLayanan(req, res, true);
});
router.get("/layanan", async (req, res) => {
    try {
        const value = await layananRef.get();
        const data = value.docs.map((doc) => doc.data());
        res.status(200).send({
        message: "Fetched all layanan",
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

const getLayananById = async (layananId) => {
    const value = await layananRef.where("id", "==", layananId).get();
    return value.empty ? null : value.docs[0].data();
};

router.get("/layanan/:id", async (req, res) => {
    try {
        const layananId = req.params.id;
        const layanan = await getLayananById(layananId);

        if (!layanan) {
        return res.status(404).send({
            message: "No layanan found with the given ID",
            data: {},
        });
        }

        res.status(200).send({
        message: "layanan retrieved",
        data: layanan,
        });
    } catch (error) {
        res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
        });
    }
});

router.delete("/layanan/:id", async (req, res) => {
    try {
        const layananId = req.params.id;
        const layanan = await getLayananById(layananId);

        if (!layanan) {
        return res.status(404).send({
            message: "No layanan found with the given ID",
            data: {},
        });
        }

        await layananRef.doc(layananId).delete();
        res.status(200).send({
        message: "layanan deleted successfully",
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
