// Este script funciona como um "guardião" para as páginas de dashboard.
// Ele deve ser executado antes de qualquer outro script na página.

(function() {
    const authToken = localStorage.getItem('authToken');
    const userDataString = localStorage.getItem('userData');
    
    // 1. Verifica se o usuário está logado (se existe um token)
    if (!authToken || !userDataString) {
        alert('Acesso negado. Por favor, faça o login para continuar.');
        window.location.href = 'login.html'; // Redireciona para a página de login principal
        return; // Interrompe a execução do script
    }

    // 2. Verifica se o tipo de usuário tem permissão para acessar a página atual
    const userData = JSON.parse(userDataString);
    const currentPage = window.location.pathname.split('/').pop(); // Pega o nome do arquivo (ex: "dashboard_motorista.html")

    const isDriverPage = currentPage === 'dashboard_motorista.html';
    const isEstablishmentPage = currentPage === 'dashboard_estabelecimento.html';

    const isDriver = userData.userType === 'driver';
    const isEstablishment = userData.userType === 'establishment';

    if ((isDriverPage && !isDriver) || (isEstablishmentPage && !isEstablishment)) {
        alert('Acesso negado. Você não tem permissão para acessar esta página.');
        window.location.href = 'login.html'; // Redireciona para o login
    }
})();