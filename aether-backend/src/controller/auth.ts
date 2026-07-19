import { userInfo } from "os";
import { User } from "../models/user";
import { Request, Response } from "express";
import { sendWelcomeMail } from "../utils/send-email";

export const firebaseLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { uid,
      email,
      name,
      picture,
    } = req.body;

    if (!uid) {
      res.status(400).json({
        success: false,
        message: "Firebase UID is required.",
      });
      return;
    }


    let user = await User.findOne({
      firebaseUid: uid,
    });

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email: email,
        fullName: name,
        profileImage: picture,
      });
      await sendWelcomeMail(email)
    } else {
      user.email = email;
      user.fullName = name;
      user.profileImage = picture;

      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        user,
      },
    });
  } catch (err: any) {
    console.error(err);

    res.status(401).json({
      success: false,
      message: err?.message ?? "Invalid Firebase token.",
    });
  }
};



export const getUser = async (
  req: Request,
  res: Response
) => {
  try {
    const { id} = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "id is required.",
      });
      return;
    }


    const user = await User.findById(id);



    res.status(200).json({
      user: user
    });
  } catch (err: any) {
    console.error(err);

    res.status(401).json({
      success: false,
      message: err?.message ?? "Failed to fetch user",
    });
  }
};