const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001; // Usaremos a porta 3001 para o backend

// Middlewares para permitir o uso de JSON e CORS
app.use(cors());
app.use(express.json());

// --- Simulação de um Banco de Dados ---
const users = []; // Array para armazenar usuários cadastrados

/*
  API Endpoint para Cadastro de Usuários
  ROTA: POST /api/register
*/
app.post('/api/register', (req, res) => {
    const { name, email, password, userType } = req.body;

    // Validação simples
    if (!name || !email || !password || !userType) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // Verifica se o usuário já existe
    if (users.find(user => user.email === email)) {
        return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }

    // Salva o novo usuário (em uma aplicação real, aqui você criptografaria a senha)
    const newUser = { id: users.length + 1, name, email, password, userType };
    users.push(newUser);

    console.log('Usuário cadastrado:', newUser);
    console.log('Todos os usuários:', users);

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
});

/*
  API Endpoint para Login de Usuários
  ROTA: POST /api/login
*/
app.post('/api/login', (req, res) => {
    const { email, password, userType } = req.body;

    // Procura o usuário no nosso "banco de dados"
    const user = users.find(u => u.email === email && u.password === password && u.userType === userType);

    if (user) {
        // Login bem-sucedido
        // Em uma aplicação real, você geraria um Token JWT aqui
        res.status(200).json({ 
            message: 'Login bem-sucedido!',
            // Enviamos um "token" simulado e os dados do usuário
            token: `fake-jwt-token-for-${email}`, 
            user: { name: user.name, email: user.email, userType: user.userType }
        });
    } else {
        // Credenciais inválidas
        res.status(401).json({ message: 'Email, senha ou tipo de usuário incorreto.' });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});