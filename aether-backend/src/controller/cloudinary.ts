import { Request, Response } from "express";
import { uploadToCloudinary } from "../services/cloudinary";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const imageUrl = await uploadToCloudinary(req.file, "nova/profile");

    return res.json({
      success: true,
      imageUrl,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};