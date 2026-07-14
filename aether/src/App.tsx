
import { useEffect } from 'react'
import './App.css'
import Router from './router/Router'
import { loadUser } from './services/auth'

function App() {

  useEffect(()=>{
    loadUser()

  },[])

  return (
    <Router/>
    
  )
}

export default App
