
import {
  Schema,
  model,
  Types,
  Document,
} from "mongoose";

/* -------------------------------------------------------------------------- */
/* API KEY PURPOSE                                                            */
/* -------------------------------------------------------------------------- */

export type ApiKeyPurpose =
  | "cli"
  | "github_actions"
  | "ci_cd"
  | "custom";

/* -------------------------------------------------------------------------- */
/* API KEY INTERFACE                                                          */
/* -------------------------------------------------------------------------- */

export interface IApiKey {
  id: string;
  name: string;

  purpose: ApiKeyPurpose[];

  key: string;

  /* ------------------------------ USAGE ---------------------------------- */

  tokensUsed: number;
  tokenLimit: number;

  spendingUsed: number;
  spendingLimit: number;

  rateLimit: number;

  /* ------------------------------ META ----------------------------------- */

  createdAt: Date;
  lastUsed?: Date;
}

/* -------------------------------------------------------------------------- */
/* SESSION INTERFACE                                                          */
/* -------------------------------------------------------------------------- */

export interface ISession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: Date;
  current: boolean;
}

/* -------------------------------------------------------------------------- */
/* SECURITY INTERFACE                                                         */
/* -------------------------------------------------------------------------- */

export interface ISecurity extends Document {
  userId: Types.ObjectId;

  twoFactorEnabled: boolean;
  twoFactorSecret?: string;

  apiKeys: IApiKey[];
  sessions: ISession[];

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* API KEY SCHEMA                                                             */
/* -------------------------------------------------------------------------- */

const ApiKeySchema = new Schema<IApiKey>(
  {
    id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: [String],
      enum: [
        "cli",
        "github_actions",
        "ci_cd",
        "custom",
      ],
      required: true,
      default: ["custom"],
    },

    key: {
      type: String,
      required: true,
      unique: true,
    },

    /* ---------------------------- TOKEN USAGE ----------------------------- */

    tokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    tokenLimit: {
      type: Number,
      required: true,
      min: 1000,
    },

    /* -------------------------- SPENDING USAGE ---------------------------- */

    /**
     * Stored in cents.
     *
     * Example:
     * spendingUsed: 250  => $2.50
     * spendingLimit: 500 => $5.00
     */

    spendingUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    spendingLimit: {
      type: Number,
      required: true,
      min: 1,
    },

    /* ----------------------------- RATE LIMIT ----------------------------- */

    /**
     * Maximum requests allowed per minute.
     */
    rateLimit: {
      type: Number,
      required: true,
      min: 1,
    },

    /* ------------------------------- META -------------------------------- */

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastUsed: {
      type: Date,
    },
  },
  {
    _id: false,
  }
);

/* -------------------------------------------------------------------------- */
/* SESSION SCHEMA                                                             */
/* -------------------------------------------------------------------------- */

const SessionSchema = new Schema<ISession>(
  {
    id: {
      type: String,
      required: true,
    },

    device: {
      type: String,
      required: true,
    },

    browser: {
      type: String,
      required: true,
    },

    ip: {
      type: String,
      required: true,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    current: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

/* -------------------------------------------------------------------------- */
/* SECURITY SCHEMA                                                            */
/* -------------------------------------------------------------------------- */

const SecuritySchema = new Schema<ISecurity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      select: false,
    },

    apiKeys: {
      type: [ApiKeySchema],
      default: [],
    },

    sessions: {
      type: [SessionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default model<ISecurity>(
  "Security",
  SecuritySchema
);

