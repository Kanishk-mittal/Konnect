import { Routes, Route } from 'react-router-dom'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Welcome to Konnect - Home Page</div>} />
      <Route path="/about" element={<div>About Konnect - Learn more about our platform</div>} />
      <Route path="*" element={<div>404 - Page Not Found</div>} />
    </Routes>
  )
}

export default App
