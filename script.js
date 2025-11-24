// Função para alternar o tema
const toggleTheme = () => {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    let newTheme;

    // Verifica o tema atual e alterna
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        newTheme = 'light';
        themeToggle.textContent = '🌙'; // Ícone para ir para o modo escuro
    } else {
        body.setAttribute('data-theme', 'dark');
        newTheme = 'dark';
        themeToggle.textContent = '☀️'; // Ícone para ir para o modo claro
    }

    // Salva a preferência do usuário no localStorage
    localStorage.setItem('theme', newTheme);
};

// Função para aplicar o tema salvo ao carregar a página
const applySavedTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light'; // Padrão é 'light'
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');

    body.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
};

// Função para lidar com o cadastro, agora enviando para o backend
const handleRegistration = async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="user_type"]:checked').value;

    try {
        const response = await fetch('http://localhost:3001/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, userType }),
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message); // "Usuário cadastrado com sucesso!"
            // Redireciona para a página de login correta
            window.location.href = userType === 'driver' ? 'login_motorista.html' : 'login_estabelecimento.html';
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (error) {
        console.error('Falha ao conectar com o servidor:', error);
        alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    }
};

// Função para lidar com o login, validando no backend
const handleLogin = async (event, userType) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, userType }),
        });

        const result = await response.json();

        if (response.ok) {
            // Salva o "token" e os dados do usuário no localStorage para uso futuro
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            
            // Redireciona para o dashboard correto
            window.location.href = userType === 'driver' ? 'dashboard_motorista.html' : 'dashboard_estabelecimento.html';
        } else {
            alert(`Erro de login: ${result.message}`);
        }
    } catch (error) {
        console.error('Falha ao conectar com o servidor:', error);
        alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    }
};

// ==================================================================
// INICIALIZADOR PRINCIPAL - Executado quando a página carrega
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Variável para guardar a instância do mapa Leaflet
    let mapInstance = null;

    // 1. Configura o tema (claro/escuro) em todas as páginas
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleTheme);
    applySavedTheme();
    
    // Adicionado: Exibe a saudação ao usuário
    displayUserGreeting();

    // 2. Configura o botão de logout
    const logoutButton = document.querySelector('.btn-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }

    const driverLoginForm = document.getElementById('driver-login-form');
    if (driverLoginForm) {
        driverLoginForm.addEventListener('submit', (event) => handleLogin(event, 'driver'));
    }

    const establishmentLoginForm = document.getElementById('establishment-login-form');
    if (establishmentLoginForm) {
        // Passamos 'establishment' para a função de login saber qual tipo de usuário é
        establishmentLoginForm.addEventListener('submit', (event) => handleLogin(event, 'establishment'));
    }

    // 3. Se existir um elemento com id="map", inicializa o mapa
    // Isso garante que o código do mapa só rode na página do dashboard do motorista
    if (document.getElementById('map')) {
        mapInstance = initLeafletMap();

        // 4. Adiciona o listener para o botão de busca de endereço
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => handleAddressSearch(mapInstance));
        }

        // 5. Carrega os marcadores de estacionamento do backend
        loadParkingMarkers(mapInstance);
    }

    // 6. Se estiver no dashboard do estabelecimento, carrega os dados
    const managementForm = document.getElementById('management-form');
    if (managementForm) {
        loadEstablishmentData();
        managementForm.addEventListener('submit', handleUpdateParkingData);
    }
});

// Função para fazer logout
const handleLogout = (event) => {
    event.preventDefault(); // Previne o redirecionamento padrão do link
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'index.html'; // Redireciona para a página inicial
};

// Função para exibir o nome do usuário logado
const displayUserGreeting = () => {
    const userDataString = localStorage.getItem('userData');
    const greetingElement = document.getElementById('user-greeting');

    // Se o elemento de saudação e os dados do usuário existirem...
    if (greetingElement && userDataString) {
        const userData = JSON.parse(userDataString);
        // Pega apenas o primeiro nome para manter o cabeçalho limpo
        const firstName = userData.name.split(' ')[0];
        greetingElement.textContent = `Olá, ${firstName}!`;
    }
};

/*
  ==============================================
  FUNÇÕES DO DASHBOARD (MAPA COM LEAFLET)
  ==============================================
*/

// Variável para guardar a instância do mapa, acessível por outras funções
let map;

// Variável para guardar os marcadores e poder atualizá-los
let parkingMarkers = [];

// Função para inicializar o mapa com Leaflet.js e OpenStreetMap
function initLeafletMap() {
    // Coordenadas iniciais do mapa (Ex: Centro de São Paulo)
    const initialLocation = { lat: -23.55052, lng: -46.633308 };

    // 1. Cria o objeto do mapa na div com id="map"
    // .setView([latitude, longitude], zoomLevel)
    map = L.map('map').setView([initialLocation.lat, initialLocation.lng], 14);

    // 2. Adiciona a camada de "tiles" (as imagens do mapa) do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        // Atribuição é obrigatória para o OpenStreetMap
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 3. Adiciona um marcador (pin) no mapa
    L.marker([initialLocation.lat, initialLocation.lng]).addTo(map)
        .bindPopup('Centro de São Paulo.<br> Ponto inicial.') // Mensagem que aparece ao clicar
        .openPopup(); // Abre o popup por padrão
    
    return map; // Retorna a instância do mapa para ser usada por outras funções
}

// Função para carregar os estacionamentos do backend e adicioná-los ao mapa
async function loadParkingMarkers(map) {
    try {
        const response = await fetch('http://localhost:3001/api/parkings');
        const parkings = await response.json();

        if (response.ok) {
            // Limpa marcadores antigos antes de adicionar novos
            parkingMarkers.forEach(marker => marker.remove());
            parkingMarkers = [];

            parkings.forEach(parking => {
                // Cria o conteúdo do popup com as informações do estacionamento
                const popupContent = `
                    <strong>${parking.name}</strong><br>
                    Vagas disponíveis: ${parking.availableSpots} / ${parking.totalSpots}<br>
                    <button class="btn btn-small" onclick="handleReservation(${parking.id})" style="margin-top: 10px; width: 100%;">Reservar</button>
                `;

                // Adiciona o marcador no mapa
                const marker = L.marker([parking.lat, parking.lon])
                    .addTo(map)
                    .bindPopup(popupContent);
                
                // Guarda o marcador para referência futura
                parkingMarkers.push(marker);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar os estacionamentos:', error);
        alert('Não foi possível carregar os pontos de estacionamento.');
    }
}

// Função para lidar com o clique no botão "Reservar"
async function handleReservation(parkingId) {
    try {
        const response = await fetch('http://localhost:3001/api/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parkingId }),
        });

        const result = await response.json();
        alert(result.message);

        if (response.ok) {
            // Se a reserva foi bem-sucedida, fecha todos os popups
            map.closePopup();
            // E recarrega os marcadores para mostrar a contagem de vagas atualizada
            loadParkingMarkers(map);
        }

    } catch (error) {
        console.error('Erro ao fazer a reserva:', error);
        alert('Não foi possível conectar ao servidor para fazer a reserva.');
    }
}

// Função para buscar o endereço e centralizar o mapa
async function handleAddressSearch() {
    const addressInput = document.getElementById('search-address');
    const address = addressInput.value;

    if (!address) {
        alert('Por favor, digite um endereço para buscar.');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/geocode?address=${encodeURIComponent(address)}`);
        const result = await response.json();

        if (response.ok) {
            const { lat, lon } = result;
            // Centraliza o mapa nas novas coordenadas com um zoom mais próximo
            map.setView([lat, lon], 16);
            // Adiciona um novo marcador no local encontrado
            L.marker([lat, lon]).addTo(map).bindPopup(address).openPopup();
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
        alert('Não foi possível conectar ao servidor para buscar o endereço.');
    }
}

/*
  ==============================================
  FUNÇÕES DO DASHBOARD DO ESTABELECIMENTO
  ==============================================
*/

// Função para carregar os dados do estacionamento no formulário
async function loadEstablishmentData() {
    try {
        const response = await fetch('http://localhost:3001/api/my-parking');
        const data = await response.json();

        if (response.ok) {
            document.getElementById('total-spots').value = data.totalSpots;
            document.getElementById('available-spots').value = data.availableSpots;
            // Aqui você também preencheria os campos de preço, se eles estivessem no backend
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        console.error('Erro ao carregar dados do estabelecimento:', error);
        alert('Não foi possível carregar os dados do seu estacionamento.');
    }
}

// Função para salvar as alterações no formulário de gerenciamento
async function handleUpdateParkingData(event) {
    event.preventDefault();

    const totalSpots = document.getElementById('total-spots').value;
    const availableSpots = document.getElementById('available-spots').value;

    const response = await fetch('http://localhost:3001/api/my-parking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalSpots, availableSpots }),
    });

    const result = await response.json();
    alert(result.message);
}