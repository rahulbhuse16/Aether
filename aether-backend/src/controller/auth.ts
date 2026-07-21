import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user";
import { sendWelcomeMail, sendResetPasswordMail } from "../utils/send-email";
import { ENV } from "../config/env";
import { connectGithubAccount } from "../services/github-connect";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI,
  FRONTEND_URL,
  JWT_SECRET,
} = ENV;

const OAUTH_STATE_COOKIE = "oauth_state";
const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function issueToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
}

function setStateCookie(res: Response, state: string) {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });
}

/* ------------------------------------------------------------------ */
/* Email + Password — own backend, bcrypt + JWT, no Firebase           */
/* ------------------------------------------------------------------ */

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({
        success: false,
        message: "An account already exists with this email.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      fullName: name,
      passwordHash,
      provider: "local",
    });

    await sendWelcomeMail(email);

    const token = issueToken(user._id.toString());

    res.status(201).json({
      success: true,
      data: { userId: user._id, user, token },
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      message: err?.message ?? "Failed to create account.",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordHash) {
      res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
      return;
    }

    const token = issueToken(user._id.toString());

    res.status(200).json({
      success: true,
      data: { userId: user._id, user, token },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: err?.message ?? "Login failed.",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    const user = await User.findOne({ email });

    // Don't reveal whether the account exists
    if (!user) {
      res.status(200).json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent.",
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}&id=${user._id}`;

    await sendResetPasswordMail(email, resetUrl, user.fullName);

    res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: err?.message ?? "Failed to process request.",
    });
  }
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, token, password } = req.body;

    if (!id || !token || !password) {
      res.status(400).json({
        success: false,
        message: "id, token and new password are required.",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
      return;
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      _id: id,
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired.",
      });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset. You can now sign in.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: err?.message ?? "Failed to reset password.",
    });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: "id is required." });
      return;
    }

    const user = await User.findById(id).select("-passwordHash -resetPasswordToken -resetPasswordExpire");
    res.status(200).json({ user });
  } catch (err: any) {
    console.error(err);
    res.status(401).json({
      success: false,
      message: err?.message ?? "Failed to fetch user",
    });
  }
};

/* ------------------------------------------------------------------ */
/* Google OAuth — redirect flow                                        */
/* ------------------------------------------------------------------ */

export const loginGoogle = (req: Request, res: Response): void => {
  const state = crypto.randomBytes(16).toString("hex");
  setStateCookie(res, state);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const savedState = req.cookies?.[OAUTH_STATE_COOKIE];

    if (!code || !state || state !== savedState) {
      res.redirect(`${FRONTEND_URL}/auth?error=oauth_state_mismatch`);
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE);

    const { data: tokenData } = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { data: profile } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    let user = await User.findOne({
      $or: [{ googleId: profile.sub }, { email: profile.email }],
    });

    if (!user) {
      user = await User.create({
        googleId: profile.sub,
        email: profile.email,
        fullName: profile.name,
        profileImage: profile.picture,
        provider: "google",
      });
      await sendWelcomeMail(profile.email);
    } else {
      user.googleId = user.googleId ?? profile.sub;
      user.fullName = user.fullName ?? profile.name;
      user.profileImage = profile.picture ?? user.profileImage;
      await user.save();
    }

    const token = issueToken(user._id.toString());
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}&userId=${user._id}`);
  } catch (err: any) {
    console.error("Google OAuth error:", err?.response?.data ?? err);
    res.redirect(`${FRONTEND_URL}/auth?error=google_oauth_failed`);
  }
};

/* ------------------------------------------------------------------ */
/* GitHub OAuth — redirect flow                                        */
/* ------------------------------------------------------------------ */

export const loginGithub = (req: Request, res: Response): void => {
  const randomState = crypto.randomBytes(16).toString("hex");

  const source =
    typeof req.query.source === "string"
      ? req.query.source
      : "auth";

  // Store source inside state
  const state = `${randomState}.${source}`;

  setStateCookie(res, randomState);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "read:user user:email repo workflow",
    allow_signup: "true",
    state,
  });

  res.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
};

export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query as {
      code?: string;
      state?: string;
    };

    if (!code || !state) {
      res.redirect(`${FRONTEND_URL}/auth?error=github_oauth_failed`);
      return;
    }

    // Extract random state and source
    const [randomState, source] = state.split(".");

    console.log("randomState:", randomState);
    console.log("source:", source)

    const savedState = req.cookies?.[OAUTH_STATE_COOKIE];

    // Validate state
    if (randomState !== savedState) {
      res.redirect(`${FRONTEND_URL}/auth?error=oauth_state_mismatch`);
      return;
    }

    res.clearCookie(OAUTH_STATE_COOKIE);

    const { data: tokenData } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: GITHUB_REDIRECT_URI,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    if (tokenData.error) {
      throw new Error(tokenData.error_description ?? tokenData.error);
    }

    const accessToken = tokenData.access_token as string;

    const { data: profile } = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let email = profile.email;
    if (!email) {
      const { data: emails } = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      email = emails.find((e: any) => e.primary)?.email ?? emails[0]?.email;
    }

    let user = await User.findOne({
      $or: [{ githubId: String(profile.id) }, { email }],
    });

    if (!user) {
      user = await User.create({
        githubId: String(profile.id),
        email,
        fullName: profile.name ?? profile.login,
        profileImage: profile.avatar_url,
        githubAccessToken: accessToken,
        provider: "github",
      });
      await sendWelcomeMail(email);
    } else {
      user.fullName = user.fullName ?? profile.name ?? profile.login;
      user.profileImage = profile.avatar_url ?? user.profileImage;
      user.githubAccessToken = accessToken;
      await user.save();
    }

    const token = issueToken(user._id.toString());

    if (source === 'onboarding') {

      await connectGithubAccount(user._id.toString(), accessToken)
    }

    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}&userId=${user._id}`);
  } catch (err: any) {
    console.error("GitHub OAuth error:", err?.response?.data ?? err);
    res.redirect(`${FRONTEND_URL}/auth?error=github_oauth_failed`);
  }
};