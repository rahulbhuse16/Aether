import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { ENV } from "../config/env";

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder = "aether"
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result?.secure_url) {
          return reject(new Error("Cloudinary upload failed"));
        }

        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
};

export default cloudinary;