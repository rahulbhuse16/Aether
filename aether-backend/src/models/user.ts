import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  fullName: string;
  profileImage?: string;

  githubConnected: boolean;
  githubId?: number;
  githubUsername?: string;
  githubAvatar?: string;
  githubAccessToken?: string;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    // -----------------------------
    // GitHub Integration
    // -----------------------------
    githubConnected: {
      type: Boolean,
      default: false,
    },

    githubId: {
      type: Number,
      default: null,
    },

    githubUsername: {
      type: String,
      default: "",
    },

    githubAvatar: {
      type: String,
      default: "",
    },

    githubAccessToken: {
      type: String,
      default: "",
      select: false, // Hide token by default
    },
  },
  {
    timestamps: true,
  }
);

export const User= mongoose.model<IUser>("User", UserSchema);