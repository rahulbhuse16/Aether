import { Request, Response } from "express";
import { addSseClient } from "../services/sse";
import Notification from "../models/notification";


export const notificationsSSE = (
  req: Request,
  res: Response
) => {
  const userId = req.params.userId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();

  addSseClient(userId, res);
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