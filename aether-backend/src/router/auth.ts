import { forgotPassword, getUser, githubCallback, googleCallback, login, loginGithub, loginGoogle, loginOidc, logoutOidc, oidcCallback, resetPasswordController, signup } from "../controller/auth"
import express from 'express'
import { verifyJWT } from "../middleware/auth";
const authRouter=express.Router()

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPasswordController);

authRouter.get("/google", loginGoogle);
authRouter.get("/google/callback", googleCallback);
authRouter.get("/github", loginGithub);
authRouter.get("/github/callback", githubCallback);
authRouter.get('/user/:id',verifyJWT, getUser)
authRouter.get("/google", loginGoogle);
authRouter.get("/google/callback", googleCallback);
authRouter.get("/github", loginGithub);
authRouter.get("/github/callback", githubCallback);
authRouter.get("/oidc/login", loginOidc);
authRouter.get("/oidc/callback", oidcCallback);
authRouter.post("/logout", logoutOidc);



export default authRouter