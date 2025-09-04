import React from 'react';
import UsuarioForm from '../components/UsuarioForm';
import EstabelecimentoForm from '../components/EstabelecimentoForm';
import './Cadastro.css';

export default function Cadastro() {
  return (
    <div className="page-wrapper">
      <div className="cadastro-container">
        <div className="form-section usuario">
          <h2>Cadastro de Usuário</h2>
          <UsuarioForm />
        </div>
        <div className="form-section estabelecimento">
          <h2>Cadastro de Estabelecimento</h2>
          <EstabelecimentoForm />
        </div>
      </div>
    </div>
  );
}