import { auth } from "../firebase/config";


const useAuth = () => {
    const userId=localStorage.getItem('userId')

  const isAuthenticated = (auth.currentUser || userId) ? true : false;


  
  return {
    isAuthenticated,
  };
};

export default useAuth;