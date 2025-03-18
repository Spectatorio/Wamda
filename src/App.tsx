import React from 'react'
import './App.css'

function App({ children }: { children?: React.ReactNode }) {
  return (
    <div className="app-container">
      {children}
    </div>
  )
}

export default App
