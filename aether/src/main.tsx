import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import "./index.css";
import App from "./App.tsx";
import { Slide, ToastContainer } from "react-toastify";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
       <ToastContainer
        position="top-center"
        autoClose={1800}
        hideProgressBar
        transition={Slide} 
        closeOnClick
        draggable={false}
        theme="light"
      />
      <App />
    </Provider>
  </StrictMode>
);
