import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();


import Product from "./controllers/ProductController.js";
import Layanan from "./controllers/LayananController.js";
import Blog from "./controllers/BlogController.js";


const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())


app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.use(Product);
app.use(Layanan);
app.use(Blog);



app.listen(PORT, () => {
  console.log(`App launcher on ${PORT}`);
});
