import { auth } from "../firebase/config";


const useAuth = () => {
  const isAuthenticated = auth.currentUser ? true : false;


  
  return {
    isAuthenticated,
  };
};

export default useAuth;