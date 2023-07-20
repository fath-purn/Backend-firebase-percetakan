import express from "express";
import cors from "cors";
import UUID from "uuid-v4";
import formidable from "formidable-serverless";
import dotenv from "dotenv";
dotenv.config();
import { layananRef, storage } from "../config/db.js";
import util from 'util';
const form = new formidable.IncomingForm({ multiples: true });

const parseForm = util.promisify(form.parse.bind(form));

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
        destination: `layanans/${image.name}`,
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

// Create or update layanan
const createOrUpdateLayanan = async (req, res, isUpdate = false, hasNewImage = false, err, fields, files) => {
    try {
        if (err) {
            return res.status(400).json({
                message: "There was an error parsing the files",
                data: {},
                error: err,
            });
        }

        const image = files.image;
        if (!image || image.size <= 0) {
            if (isUpdate && !hasNewImage) {
                console.log("eksekusi");
                // Jika ini update dan tidak ada gambar baru, gunakan gambar yang sudah ada
                imageUrl = fields.url; // Ganti 'existingImageUrl' dengan variabel yang sesuai dari data layanan yang sudah ada
            } else {
                return res.status(500).send({
                message: "Image not found",
                data: {},
                });
            }
        } else {
            // Jika ada gambar baru, upload gambar baru
            imageUrl = await uploadImage(image);
        }

        const docID = isUpdate ? req.params.id : layananRef.doc().id;

        const layananModel = {
            id: docID,
            nama: fields.name,
            deskripsi: fields.deskripsi,
            url: imageUrl,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
        };

        await layananRef.doc(docID).set(layananModel, { merge: true });

        res.status(isUpdate ? 200 : 201).send({
            message: isUpdate ? "layanan updated successfully" : "layanan created successfully",
            data: layananModel,
            error: {},
        });
    } catch (err) {
        res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: err,
        });
    }
};

// Function to handle the POST request for creating layanan
router.post("/layanan", async (req, res) => {
    try {
      const { fields, files } = await parseForm(req);
      // Check if there is a new image uploaded
      const hasNewImage = !!files.image;
      const result = await createOrUpdateLayanan(false, hasNewImage, fields, files);
      res.status(result.status).send(result);
    } catch (error) {
      res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
      });
    }
  });
  
  // Function to handle the PATCH request for updating layanan
  router.patch("/layanan/:id", async (req, res) => {
    try {
      const { fields, files } = await parseForm(req);
      // Check if there is a new image uploaded
      const hasNewImage = !!files.image;
      const result = await createOrUpdateLayanan(true, hasNewImage, fields, files);
      res.status(result.status).send(result);
    } catch (error) {
      res.status(500).send({
        message: "Something went wrong",
        data: {},
        error: error,
      });
    }
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
