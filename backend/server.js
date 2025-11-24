const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Usa a porta do ambiente ou 3001 como padrão

// Middlewares para permitir o uso de JSON e CORS
app.use(cors());
app.use(express.json());

// --- Simulação de um Banco de Dados ---
const users = []; // Array para armazenar usuários cadastrados
const parkings = [ // Array para armazenar estacionamentos
    {
        id: 1,
        name: 'Estacionamento Central Park',
        address: 'R. Augusta, 1500 - Consolação, São Paulo - SP',
        lat: -23.5564,
        lon: -46.6625,
        totalSpots: 50,
        availableSpots: 12
    },
    {
        id: 2,
        name: 'Garagem Faria Lima',
        address: 'Av. Brg. Faria Lima, 2300 - Jardim Paulistano, São Paulo - SP',
        lat: -23.5790,
        lon: -46.6840,
        totalSpots: 100,
        availableSpots: 35
    },
    {
        id: 3,
        name: 'Estaciona-Aí Pinheiros',
        address: 'R. dos Pinheiros, 1000 - Pinheiros, São Paulo - SP',
        lat: -23.5640,
        lon: -46.6960,
        totalSpots: 30,
        availableSpots: 5
    }
];

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
app.get('/api/parkings', (req, res) => {
    // Em uma aplicação real, você poderia filtrar por proximidade aqui.
    // Por agora, vamos retornar todos os estacionamentos cadastrados.
    res.status(200).json(parkings);
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

    // Encontra o estacionamento no nosso "banco de dados"
    const parking = parkings.find(p => p.id === parkingId);

    if (!parking) {
        return res.status(404).json({ message: 'Estacionamento não encontrado.' });
    }

    if (parking.availableSpots > 0) {
        // Diminui o número de vagas disponíveis
        parking.availableSpots--;
        console.log(`Reserva feita para ${parking.name}. Vagas restantes: ${parking.availableSpots}`);
        // Retorna o estacionamento atualizado
        res.status(200).json({ message: 'Reserva efetuada com sucesso!', parking });
    } else {
        // Se não houver vagas
        res.status(409).json({ message: 'Desculpe, não há vagas disponíveis neste estacionamento.' });
    }
});

/*
  API Endpoint para o estabelecimento buscar seus dados de estacionamento
  ROTA: GET /api/my-parking
*/
app.get('/api/my-parking', (req, res) => {
    // SIMULAÇÃO: Em um app real, você usaria o token de autenticação para
    // encontrar o usuário e o estacionamento associado a ele.
    // Por agora, vamos sempre retornar o primeiro estacionamento da lista.
    const myParking = parkings[0]; 
    if (myParking) {
        res.status(200).json(myParking);
    } else {
        res.status(404).json({ message: 'Nenhum estacionamento encontrado para este usuário.' });
    }
});

/*
  API Endpoint para o estabelecimento atualizar seus dados
  ROTA: PUT /api/my-parking
*/
app.put('/api/my-parking', (req, res) => {
    const { totalSpots, availableSpots } = req.body;

    // Validação simples
    if (totalSpots === undefined || availableSpots === undefined) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // SIMULAÇÃO: Atualizamos sempre o primeiro estacionamento.
    const myParking = parkings[0];
    myParking.totalSpots = parseInt(totalSpots, 10);
    myParking.availableSpots = parseInt(availableSpots, 10);

    console.log('Dados do estacionamento atualizados:', myParking);

    res.status(200).json({ message: 'Dados atualizados com sucesso!', parking: myParking });
});

// Inicia o servidor
app.listen(PORT, () => {
    // O console.log foi ajustado para não mostrar 'localhost' em produção
    console.log(`Servidor backend rodando na porta ${PORT}`);
});
