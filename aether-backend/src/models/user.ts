import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  fullName: string;
  profileImage?: string;

  // Local email/password auth
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;

  // Provider tracking
  provider: "local" | "google" | "github";

  // Google
  googleId?: string;

  // GitHub
  githubConnected: boolean;
  githubId?: string;
  githubUsername?: string;
  githubAvatar?: string;
  githubAccessToken?: string;
  slack:{
    accessToken: string;
    teamId: string;
    teamName: string;
    userId: string;
    botUserId: string;
    appId: string;
    connected: boolean;
    lastSyncAt: Date;

  },

  googleCalendar: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
    connected: boolean;
    channelId?: string;
    resourceId?: string;
    expiration?: string;
  }

  createdAt: Date;
  updatedAt: Date;

}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
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
    // Local email/password auth
    // -----------------------------
    passwordHash: {
      type: String,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
    },

    provider: {
      type: String,
      enum: ["local", "google", "github"],
      required: true,
      default: "local",
    },

    // -----------------------------
    // Google Integration
    // -----------------------------
    googleId: {
      type: String,
      index: true,
      sparse: true,
    },

    // -----------------------------
    // GitHub Integration
    // -----------------------------
    githubConnected: {
      type: Boolean,
      default: false,
    },

    githubId: {
      type: String,
      index: true,
      sparse: true,
    },

    githubUsername: {
      type: String,
      default: "",
    },

    githubAvatar: {
      type: String,
      default: "",
    },

    slack: {
  accessToken: {
    type: String,
  },

  teamId: {
    type: String,
  },

  teamName: {
    type: String,
  },

  userId: {
    type: String,
  },

  botUserId: {
    type: String,
  },

  appId: {
    type: String,
  },

  connected: {
    type: Boolean,
    default: false,
  },

  lastSyncAt: {
    type: Date,
  },
},

    googleCalendar: {
      accessToken: {
        type: String,
      },

      refreshToken: {
        type: String,
      },

      expiryDate: {
        type: Number,
      },

      connected: {
        type: Boolean,
        default: false,
      },

      channelId: {
        type: String,
      },

      resourceId: {
        type: String,
      },

      expiration: {
        type: String,
      },
    },

    githubAccessToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);