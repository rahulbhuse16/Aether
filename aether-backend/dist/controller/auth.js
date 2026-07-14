"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.firebaseLogin = void 0;
const user_1 = require("../models/user");
const firebaseLogin = async (req, res) => {
    try {
        const { uid, email, name, picture, } = req.body;
        if (!uid) {
            res.status(400).json({
                success: false,
                message: "Firebase UID is required.",
            });
            return;
        }
        let user = await user_1.User.findOne({
            firebaseUid: uid,
        });
        if (!user) {
            user = await user_1.User.create({
                firebaseUid: uid,
                email: email,
                fullName: name,
                profileImage: picture,
            });
        }
        else {
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
    }
    catch (err) {
        console.error(err);
        res.status(401).json({
            success: false,
            message: err?.message ?? "Invalid Firebase token.",
        });
    }
};
exports.firebaseLogin = firebaseLogin;
const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: "id is required.",
            });
            return;
        }
        const user = await user_1.User.findById(id);
        res.status(200).json({
            user: user
        });
    }
    catch (err) {
        console.error(err);
        res.status(401).json({
            success: false,
            message: err?.message ?? "Failed to fetch user",
        });
    }
};
exports.getUser = getUser;
