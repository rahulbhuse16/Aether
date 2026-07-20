import React from "react";
import { toast as originalToast, Slide, type ToastContentProps } from "react-toastify";
import { CheckCircle, AlertOctagon } from "lucide-react";

const baseStyle = {
  borderRadius: "14px",
  fontSize: "14.5px",
  fontWeight: "bold",
  padding: "12px 16px",
  minHeight: "60px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  backdropFilter: "blur(8px)",
};

const toastConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  transition: Slide,
};

export const toast = {
  success: (msg: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | ((props: ToastContentProps<unknown>) => React.ReactNode) | null | undefined, opts = {}) =>
    originalToast.success(msg, {
      ...toastConfig,
      ...opts,
      //@ts-ignore
      icon: React.createElement(CheckCircle, { className: "text-green-800", size: 20 }),
      style: {
        ...baseStyle,
        background: "linear-gradient(135deg, #D4FC79 0%, #96E6A1 100%)",
        color: "#146C43",
        //@ts-ignore
        ...opts.style,
      },
    }),

  error: (msg: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | ((props: ToastContentProps<unknown>) => React.ReactNode) | null | undefined, opts = {}) =>
    originalToast.error(msg, {
      ...toastConfig,
      ...opts,
      //@ts-ignore
      icon: React.createElement(AlertOctagon, { className: "text-red-200", size: 20 }),
      style: {
        ...baseStyle,
        background: "linear-gradient(135deg, #f85032 0%, #e73827 100%)",
        color: "#fff",
        //@ts-ignore
        ...opts.style,
      },
    }),

 
  
};