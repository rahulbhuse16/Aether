import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { addNotification } from "../store/slices/notificationSlice";
import { API_BASE } from "../constants/constants";

const userId=localStorage.getItem("userId")




const SSE_URL =
  `${API_BASE}/notifications/stream/${userId}`;


export const useSSENotification = () => {

  const dispatch = useDispatch();

  const eventSourceRef =
    useRef<EventSource | null>(null);


  const [connected, setConnected] =
    useState(false);



  useEffect(() => {


    const connectSSE = () => {


      // Prevent duplicate connection
      if(eventSourceRef.current){
        return;
      }


      const eventSource =
        new EventSource(
          SSE_URL,
          
        );


      eventSourceRef.current =
        eventSource;



      /**
       * Connection established
       */
      eventSource.addEventListener(
        "connected",
        () => {

          console.log(
            "SSE Connected"
          );

          setConnected(true);

        }
      );



      /**
       * Notification received
       */
      eventSource.addEventListener(
        "notification",
        (event)=>{

          try {

            const notification =
              JSON.parse(
                event.data
              );


            dispatch(
              addNotification(
                notification
              )
            );


          } catch(error){

            console.error(
              "Invalid SSE notification",
              error
            );

          }

        }
      );



      /**
       * Error handling
       */
      eventSource.onerror = () => {


        console.log(
          "SSE disconnected"
        );


        setConnected(false);


        eventSource.close();

        eventSourceRef.current=null;


        /**
         * reconnect after 5 seconds
         */
        setTimeout(()=>{

          connectSSE();

        },5000);


      };


    };



    connectSSE();



    /**
     * Cleanup
     */
    return ()=>{


      if(eventSourceRef.current){

        eventSourceRef.current.close();

        eventSourceRef.current=null;

      }


    };


  },[]);



  return {
    connected
  };

};