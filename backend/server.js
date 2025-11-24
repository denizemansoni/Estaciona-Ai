const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importa o Pool do pacote pg

require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const app = express();
const PORT = process.env.PORT || 3001; // Usa a porta do ambiente ou 3001 como padrão

// Middlewares para permitir o uso de JSON e CORS
app.use(cors());
app.use(express.json());

// --- Conexão com o Banco de Dados PostgreSQL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para o Render em alguns casos, mas idealmente deve ser true em produção com certificados válidos
    }
});

// Testar a conexão com o banco de dados
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco de dados', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Erro ao executar query de teste', err.stack);
        }
        console.log('Conectado ao PostgreSQL:', result.rows[0].now);
    });
});

// Rota raiz para verificar se a API está no ar
app.get('/', (req, res) => {
    res.send('API do Estaciona-Aí está funcionando!');
});

/*
  API Endpoint para Cadastro de Usuários
  ROTA: POST /api/register
*/
app.post('/api/register', (req, res) => {
    const { name, email, password, userType } = req.body;

    // Validação simples
    if (!name || !email || !password || !userType) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

    try {
        // Verifica se o usuário já existe
        const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }

        // Salva o novo usuário (em uma aplicação real, aqui você criptografaria a senha)
        const result = await pool.query(
            'INSERT INTO users (name, email, password, user_type) VALUES ($1, $2, $3, $4) RETURNING id, name, email, user_type',
            [name, email, password, userType]
        );
        const newUser = result.rows[0];

        console.log('Usuário cadastrado:', newUser);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: newUser });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao cadastrar usuário.' });
    }
});

/*
  API Endpoint para Login de Usuários
  ROTA: POST /api/login
*/
app.post('/api/login', (req, res) => {
    const { email, password, userType } = req.body;
    
    try {
        // Procura o usuário no banco de dados
        const result = await pool.query('SELECT id, name, email, user_type, password FROM users WHERE email = $1 AND user_type = $2', [email, userType]);
        const user = result.rows[0];

        if (user && user.password === password) { // Em uma aplicação real, você compararia a senha criptografada
            // Login bem-sucedido
            // Em uma aplicação real, você geraria um Token JWT aqui
            res.status(200).json({ 
                message: 'Login bem-sucedido!',
                token: `fake-jwt-token-for-${email}`, 
                user: { id: user.id, name: user.name, email: user.email, userType: user.user_type }
            });
        } else {
            // Credenciais inválidas
            res.status(401).json({ message: 'Email, senha ou tipo de usuário incorreto.' });
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

/*
  API Endpoint para Geocodificação de Endereços
  ROTA: GET /api/geocode?address=...
*/
app.get('/api/geocode', async (req, res) => {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ message: 'O endereço é obrigatório.' });
    }

    // URL da API do Nominatim (serviço de geocodificação do OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Estaciona-Ai-App/1.0' } // A API do Nominatim exige um User-Agent
        });
        const data = await response.json();

        if (data && data.length > 0) {
            // Retorna a latitude e longitude do primeiro resultado encontrado
            const { lat, lon } = data[0];
            res.status(200).json({ lat: parseFloat(lat), lon: parseFloat(lon) });
        } else {
            res.status(404).json({ message: 'Endereço não encontrado.' });
        }
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        res.status(500).json({ message: 'Erro ao buscar o endereço.' });
    }
});

/*
  API Endpoint para buscar estacionamentos
  ROTA: GET /api/parkings
*/
app.get('/api/parkings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM parkings');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar estacionamentos:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar estacionamentos.' });
    }
});

/*
  API Endpoint para reservar uma vaga
  ROTA: POST /api/reserve
*/
app.post('/api/reserve', (req, res) => {
    const { parkingId } = req.body;

    if (!parkingId) {
        return res.status(400).json({ message: 'O ID do estacionamento é obrigatório.' });
    }

    try {
        // Encontra o estacionamento e verifica vagas
        const result = await pool.query('SELECT * FROM parkings WHERE id = $1 FOR UPDATE', [parkingId]); // FOR UPDATE para evitar race conditions
        const parking = result.rows[0];

        if (!parking) {
            return res.status(404).json({ message: 'Estacionamento não encontrado.' });
        }

        if (parking.available_spots > 0) {
            // Diminui o número de vagas disponíveis
            const updateResult = await pool.query('UPDATE parkings SET available_spots = available_spots - 1 WHERE id = $1 RETURNING *', [parkingId]);
            const updatedParking = updateResult.rows[0];
            console.log(`Reserva feita para ${updatedParking.name}. Vagas restantes: ${updatedParking.available_spots}`);
            res.status(200).json({ message: 'Reserva efetuada com sucesso!', parking: updatedParking });
        } else {
            res.status(409).json({ message: 'Desculpe, não há vagas disponíveis neste estacionamento.' });
        }
    } catch (error) {
        console.error('Erro ao reservar vaga:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao reservar vaga.' });
    }

});

/*
  API Endpoint para o estabelecimento buscar seus dados de estacionamento
  ROTA: GET /api/my-parking
*/
app.get('/api/my-parking', (req, res) => {
    // Em um app real, você usaria o token de autenticação para
    // encontrar o usuário e o estacionamento associado a ele.
    // Por enquanto, vamos buscar um estacionamento de exemplo.
    try {
        const result = await pool.query('SELECT * FROM parkings LIMIT 1'); // Busca o primeiro estacionamento
        const myParking = result.rows[0];
        if (myParking) {
            res.status(200).json(myParking);
        } else {
            res.status(404).json({ message: 'Nenhum estacionamento encontrado para este usuário.' });
        }
    } catch (error) {
        console.error('Erro ao buscar meu estacionamento:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar meu estacionamento.' });
    }
});

/*
  API Endpoint para o estabelecimento atualizar seus dados
  ROTA: PUT /api/my-parking
*/
app.put('/api/my-parking', (req, res) => {
    const { totalSpots, availableSpots } = req.body;
    // Validação simples
    if (totalSpots === undefined || availableSpots === undefined) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

    try {
        // Em um app real, você atualizaria o estacionamento associado ao usuário logado.
        // Por enquanto, vamos atualizar o primeiro estacionamento de exemplo.
        const result = await pool.query(
            'UPDATE parkings SET total_spots = $1, available_spots = $2 WHERE id = (SELECT id FROM parkings LIMIT 1) RETURNING *',
            [parseInt(totalSpots, 10), parseInt(availableSpots, 10)]
        );
        const updatedParking = result.rows[0];

        if (!updatedParking) return res.status(404).json({ message: 'Nenhum estacionamento encontrado para atualização.' });

        console.log('Dados do estacionamento atualizados:', updatedParking);
        res.status(200).json({ message: 'Dados atualizados com sucesso!', parking: updatedParking });
    } catch (error) {
        console.error('Erro ao atualizar estacionamento:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar estacionamento.' });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    // O console.log foi ajustado para não mostrar 'localhost' em produção
    console.log(`Servidor backend rodando na porta ${PORT}`);
});
