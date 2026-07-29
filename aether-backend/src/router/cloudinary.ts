import { Router } from "express";
import { upload } from "../services/cloudinary";
import { uploadImage } from "../controller/cloudinary";


const cloudinaryRouter = Router();
cloudinaryRouter.post("/upload", upload.single("image"), uploadImage);

export default cloudinaryRouter;