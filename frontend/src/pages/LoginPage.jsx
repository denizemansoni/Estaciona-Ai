// src/pages/LoginPage.jsx
import './LoginPage.css';
import logo from '../assets/logo-estaciona-ai.png';
import { useState } from 'react';
import { Link } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Email:', email);
    console.log('Senha:', password);
  };

  return (
    <div className="page-wrapper">
      <div className="login-container">
        <img src={logo} alt="Logo Estaciona Aí" className="logo" />
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Entrar</button>

          <div className="signup-link">
            <span>Não tem cadastro? </span>
            <Link to="/cadastro">Clique aqui</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;