import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Services from './pages/Services';
import Products from './pages/Products';
import Booking from './pages/Booking';
import BookingHistory from './pages/BookingHistory';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/products" element={<Products />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/history" element={<BookingHistory />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
        <footer style={{ padding: '40px 5%', textAlign: 'center', backgroundColor: 'var(--primary)', color: 'white' }}>
          <p className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Lumina Spa</p>
          <p style={{ opacity: 0.8 }}>Relieving stress, restoring balance, renewing you.</p>
          <div style={{ marginTop: '20px', fontSize: '0.9rem', opacity: 0.6 }}>
            &copy; 2026 Lumina Spa. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
