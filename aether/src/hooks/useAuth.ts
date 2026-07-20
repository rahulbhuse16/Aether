import { auth } from "../firebase/config";


const useAuth = () => {
    const userId=localStorage.getItem('token')

  const isAuthenticated = (auth.currentUser || userId) ? true : false;


  
  return {
    isAuthenticated,
  };
};

export default useAuth;