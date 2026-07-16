
import { useEffect } from 'react'
import './App.css'
import Router from './router/Router'
import { loadUser } from './services/auth'
import { useSSENotification } from './hooks/useSSENotification'

function App() {

 // useSSENotification()

  useEffect(()=>{
    loadUser()

  },[])

  return (
    <Router/>
    
  )
}

export default App
