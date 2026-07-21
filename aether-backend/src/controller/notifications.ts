import { Request, Response } from "express";
import { addSseClient } from "../services/sse";
import Notification from "../models/notification";
import  jwt  from "jsonwebtoken";

export const notificationsSSE = (
  req: Request,
  res: Response
) => {
  const userId = req.params.userId;

   const token = req.query.token as string;

  if (!token) {
    return res.status(401).json({
      message: "Token is required",
    });
  }

  const decoded = jwt.decode(token) as jwt.JwtPayload | null;

  if (!decoded?.exp) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();

  addSseClient(userId, res);

  const expiresIn = decoded.exp * 1000 - Date.now();

  const expiryTimer = setTimeout(() => {
    res.write(
      `event: token_expired\n` +
      `data: ${JSON.stringify({
        message: "JWT token expired",
      })}\n\n`
    );

    res.end();
  }, Math.max(expiresIn, 0));
   req.on("close", () => {
    clearTimeout(expiryTimer);

  });
};




/**
 * Get logged-in user notifications
 */
export const getUserNotifications = async (
  req: Request,
  res: Response
) => {

  try {

    const userId = req.params.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const skip = (page - 1) * limit;


    const [notifications, total, unreadCount] =
      await Promise.all([

        Notification.find({
          userId,
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),


        Notification.countDocuments({
          userId,
        }),


        Notification.countDocuments({
          userId,
          read:false,
        })

      ]);


    return res.status(200).json({

      success:true,

      data:{
        notifications,
        pagination:{
          total,
          page,
          limit,
          totalPages:Math.ceil(total / limit)
        },

        unreadCount
      }

    });


  } catch(error:any){

    console.error(
      "getUserNotifications error:",
      error
    );

    return res.status(500).json({
      success:false,
      message:"Failed to fetch notifications"
    });

  }

};





/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  req: Request,
  res: Response
)=>{

  try {

    const userId = req.params.id;

    const { notificationId } = req.params;


    const notification =
      await Notification.findOneAndUpdate(
        {
          _id:notificationId,
          userId
        },
        {
          $set:{
            read:true
          }
        },
        {
          new:true
        }
      );


    if(!notification){

      return res.status(404).json({
        success:false,
        message:"Notification not found"
      });

    }


    return res.status(200).json({

      success:true,

      message:"Notification marked as read",

      notification

    });


  } catch(error:any){

    console.error(
      "markNotificationAsRead error:",
      error
    );


    return res.status(500).json({
      success:false,
      message:"Failed to update notification"
    });

  }

};