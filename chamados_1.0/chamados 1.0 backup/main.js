
document.addEventListener('DOMContentLoaded', function () {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const html = document.documentElement;

  if (
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  darkModeToggle.addEventListener('click', function () {
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  });

  const newTicketBtn = document.getElementById('newTicketBtn');
  const newTicketModal = document.getElementById('newTicketModal');
  const closeNewTicketModal = document.getElementById('closeNewTicketModal');
  const cancelNewTicket = document.getElementById('cancelNewTicket');
  const ticketForm = document.getElementById('ticketForm');
  const ticketGrid = document.getElementById('ticketGrid');
  const editModal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const closeModal = document.getElementById('closeModal');
  const deleteTicket = document.getElementById('deleteTicket');
  const addChecklistItem = document.getElementById('addChecklistItem');
  const showAll = document.getElementById('showAll');
  const showActive = document.getElementById('showActive');
  const showCompleted = document.getElementById('showCompleted');
  const searchInput = document.getElementById('searchInput');
  const searchField = document.getElementById('searchField');
  const confirmModal = document.getElementById('confirmModal');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmDelete = document.getElementById('confirmDelete');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let currentTicketId = null;
  let allTickets = [];
  let currentFilter = 'all';

  async function apiRequest(method, body) {
    try {
      const response = await fetch('api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Erro na requisição ao servidor.');
      }
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      showToast('Erro de comunicação com o servidor.', 'error');
    }
  }

  async function fetchTickets(filter = 'all') {
    try {
      currentFilter = filter;
      const response = await fetch(`api.php?filter=${filter}`);
      if (!response.ok) {
        throw new Error('Não foi possível buscar os chamados.');
      }
      allTickets = await response.json();
      renderTickets();
    } catch (error) {
      console.error('Fetch Error:', error);
      showToast(error.message, 'error');
    }
  }

  ticketForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm(ticketForm)) return;

    const newTicketData = {
      action: 'create',
      location: document.getElementById('location').value,
      user: document.getElementById('user').value,
      ip: document.getElementById('ip').value,
      asset: document.getElementById('asset').value,
      technician: document.getElementById('technician').value,
      problem: document.getElementById('problem').value,
      checklist: document
        .getElementById('checklist')
        .value.split('\n')
        .filter((item) => item.trim() !== '')
        .map((item) => ({ text: item.trim(), completed: false })),
    };

    const result = await apiRequest('POST', newTicketData);

    if (result && result.success) {
      showToast('Chamado registrado com sucesso!', 'success');
      ticketForm.reset();
      newTicketModal.classList.add('hidden');
      fetchTickets(currentFilter);
    } else {
      showToast(result.message || 'Erro ao registrar chamado.', 'error');
    }
  });

  editForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm(editForm)) return;

    const ticketId = parseInt(
      document.getElementById('editTicketId').textContent
    );
    const updatedTicketData = {
      action: 'update',
      id: ticketId,
      location: document.getElementById('editLocation').value,
      user: document.getElementById('editUser').value,
      ip: document.getElementById('editIp').value,
      asset: document.getElementById('editAsset').value,
      technician: document.getElementById('editTechnician').value,
      problem: document.getElementById('editProblem').value,
      solution: document.getElementById('editSolution').value,
      completed: document.getElementById('editCompleted').checked,
      checklist: Array.from(
        document.getElementById('editChecklist').children
      ).map((item) => ({
        text: item.querySelector('.checklist-text').value,
        completed: item.querySelector('.checklist-checkbox').checked,
      })),
    };

    const result = await apiRequest('POST', updatedTicketData);

    if (result && result.success) {
      showToast('Chamado atualizado com sucesso!', 'success');
      editModal.classList.add('hidden');
      fetchTickets(currentFilter);
    } else {
      showToast(result.message || 'Erro ao atualizar chamado.', 'error');
    }
  });

  confirmDelete.addEventListener('click', async function () {
    if (currentTicketId) {
      const result = await apiRequest('POST', {
        action: 'delete',
        id: currentTicketId,
      });

      if (result && result.success) {
        showToast('Chamado excluído com sucesso!', 'warning');
        editModal.classList.add('hidden');
        confirmModal.classList.add('hidden');
        currentTicketId = null;
        fetchTickets(currentFilter);
      } else {
        showToast(result.message || 'Erro ao excluir chamado.', 'error');
      }
    }
  });

  showAll.addEventListener('click', () => {
    updateFilterButtons(showAll);
    fetchTickets('all');
  });

  showActive.addEventListener('click', () => {
    updateFilterButtons(showActive);
    fetchTickets('active');
  });

  showCompleted.addEventListener('click', () => {
    updateFilterButtons(showCompleted);
    fetchTickets('completed');
  });

  function updateFilterButtons(activeButton) {
    [showAll, showActive, showCompleted].forEach((button) => {
      button.classList.remove('btn-blue');
      button.classList.add(
        'bg-gray-200',
        'dark:bg-gray-700',
        'text-gray-700',
        'dark:text-gray-300'
      );
    });
    activeButton.classList.add('btn-blue');
    activeButton.classList.remove(
      'bg-gray-200',
      'dark:bg-gray-700',
      'text-gray-700',
      'dark:text-gray-300'
    );
  }

  searchInput.addEventListener('input', () => renderTickets());
  searchField.addEventListener('change', () => renderTickets());

  function renderTickets() {
    let filteredTickets = [...allTickets];

    const searchTerm = searchInput.value.toLowerCase().trim();
    const searchBy = searchField.value;

    if (searchTerm) {
      filteredTickets = filteredTickets.filter((ticket) => {
        if (searchBy === 'all') {
          return (
            ticket.id.toString().includes(searchTerm) ||
            (ticket.location &&
              ticket.location.toLowerCase().includes(searchTerm)) ||
            (ticket.user && ticket.user.toLowerCase().includes(searchTerm)) ||
            (ticket.asset && ticket.asset.toLowerCase().includes(searchTerm)) ||
            (ticket.technician &&
              ticket.technician.toLowerCase().includes(searchTerm)) ||
            (ticket.problem &&
              ticket.problem.toLowerCase().includes(searchTerm))
          );
        } else if (searchBy === 'id') {
          return ticket.id.toString().includes(searchTerm);
        } else {
          return (
            ticket[searchBy] &&
            ticket[searchBy].toLowerCase().includes(searchTerm)
          );
        }
      });
    }

    if (filteredTickets.length === 0) {
      ticketGrid.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400 col-span-full">
            ${
              searchTerm
                ? 'Nenhum chamado encontrado para esta pesquisa'
                : currentFilter === 'all'
                ? 'Nenhum chamado registrado'
                : currentFilter === 'active'
                ? 'Nenhum chamado ativo'
                : 'Nenhum chamado concluído'
            }
        </div>`;
      return;
    }

    ticketGrid.innerHTML = '';

    filteredTickets.forEach((ticket) => {
      const ticketCard = document.createElement('div');
      ticketCard.className = `ticket-card bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 ${
        ticket.completed ? 'completed' : ''
      }`;

      const date = new Date(ticket.date);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString(
        [],
        { hour: '2-digit', minute: '2-digit' }
      )}`;

      const completedItems = ticket.checklist
        ? ticket.checklist.filter((item) => item.completed).length
        : 0;
      const totalItems = ticket.checklist ? ticket.checklist.length : 0;

      const truncatedProblem =
        ticket.problem.length > 100
          ? ticket.problem.substring(0, 100) + '...'
          : ticket.problem;

      ticketCard.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h4 class="font-semibold text-gray-800 dark:text-white">Chamado #${
                  ticket.id
                }</h4>
                <p class="text-sm text-gray-600 dark:text-gray-300">${
                  ticket.location
                }</p>
            </div>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${
              ticket.completed
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            }">
                ${ticket.completed ? 'Concluído' : 'Em aberto'}
            </span>
        </div>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">${formattedDate}</div>
        <div class="mt-2 grid grid-cols-2 gap-1 text-xs">
            <div class="text-gray-700 dark:text-gray-300"><span class="font-medium">Usuário:</span> ${
              ticket.user || '-'
            }</div>
            <div class="text-gray-700 dark:text-gray-300"><span class="font-medium">IP:</span> ${
              ticket.ip || '-'
            }</div>
            <div class="text-gray-700 dark:text-gray-300"><span class="font-medium">Patrimônio:</span> ${
              ticket.asset || '-'
            }</div>
            <div class="text-gray-700 dark:text-gray-300"><span class="font-medium">Técnico:</span> ${
              ticket.technician || '-'
            }</div>
        </div>
        <div class="mt-2">
            <div class="text-xs font-medium text-gray-700 dark:text-gray-300">Problema:</div>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">${truncatedProblem}</p>
        </div>
        <div class="mt-2 flex justify-between items-center">
            <div class="text-xs text-gray-700 dark:text-gray-300"><span class="font-medium">Checklist:</span> ${completedItems}/${totalItems}</div>
            <button class="edit-ticket btn-blue text-xs py-1 px-2 rounded">Editar</button>
        </div>
      `;

      ticketGrid.appendChild(ticketCard);

      ticketCard
        .querySelector('.edit-ticket')
        .addEventListener('click', () => openEditModal(ticket));
    });
  }

  deleteTicket.addEventListener('click', function () {
    const ticketId = parseInt(
      document.getElementById('editTicketId').textContent
    );
    currentTicketId = ticketId;
    confirmModal.classList.remove('hidden');
  });

  cancelDelete.addEventListener('click', function () {
    confirmModal.classList.add('hidden');
  });

  newTicketBtn.addEventListener('click', function () {
    newTicketModal.classList.remove('hidden');
    document.getElementById('location').focus();
  });

  closeNewTicketModal.addEventListener('click', function () {
    newTicketModal.classList.add('hidden');
    ticketForm.reset();
    hideAllErrors();
  });

  cancelNewTicket.addEventListener('click', function () {
    newTicketModal.classList.add('hidden');
    ticketForm.reset();
    hideAllErrors();
  });

  closeModal.addEventListener('click', function () {
    editModal.classList.add('hidden');
    hideAllErrors();
  });

  function setupIpMask(inputElement) {
    inputElement.addEventListener('input', function (e) {
      let value = e.target.value.replace(/[^0-9.]/g, '');
      let parts = value
        .split('.')
        .map((part) => (part.length > 3 ? part.slice(0, 3) : part));
      e.target.value = parts.slice(0, 4).join('.');
    });
    inputElement.addEventListener('blur', (e) => validateIp(e.target));
  }

  setupIpMask(document.getElementById('ip'));
  setupIpMask(document.getElementById('editIp'));

  function validateIp(input) {
    const ipRegex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const errorElement =
      input.id === 'ip'
        ? document.getElementById('ipError')
        : document.getElementById('editIpError');
    if (!input.value.trim()) {
      errorElement.classList.add('hidden');
      return true;
    }
    if (!ipRegex.test(input.value)) {
      errorElement.classList.remove('hidden');
      return false;
    } else {
      errorElement.classList.add('hidden');
      return true;
    }
  }

  function hideAllErrors() {
    document
      .querySelectorAll('[id$="Error"]')
      .forEach((el) => el.classList.add('hidden'));
  }

  function validateForm(form) {
    let isValid = true;
    const location = form.querySelector('[id$="Location"]');
    const locationError = document.getElementById(location.id + 'Error');
    if (!location.value.trim()) {
      locationError.classList.remove('hidden');
      isValid = false;
    } else {
      locationError.classList.add('hidden');
    }

    const problem = form.querySelector('[id$="Problem"]');
    const problemError = document.getElementById(problem.id + 'Error');
    if (!problem.value.trim()) {
      problemError.classList.remove('hidden');
      isValid = false;
    } else {
      problemError.classList.add('hidden');
    }

    const ip = form.querySelector('[id$="Ip"]');
    if (ip && ip.value.trim() && !validateIp(ip)) {
      isValid = false;
    }

    return isValid;
  }

  function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    toast.className = 'toast';
    toast.classList.add(`toast-${type}`);
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  addChecklistItem.addEventListener('click', function () {
    const editChecklist = document.getElementById('editChecklist');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'flex items-center space-x-2';
    itemDiv.innerHTML = `
      <input type="checkbox" class="checklist-checkbox h-4 w-4 text-green-600 border-gray-300 rounded dark:border-gray-600">
      <input type="text" class="checklist-text flex-1 text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Novo item">
      <button type="button" class="remove-item text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;
    editChecklist.appendChild(itemDiv);
    itemDiv.querySelector('.checklist-text').focus();
    itemDiv
      .querySelector('.remove-item')
      .addEventListener('click', () => itemDiv.remove());
  });

  function openEditModal(ticket) {
    document.getElementById('editTicketId').textContent = ticket.id;
    document.getElementById('editLocation').value = ticket.location;
    document.getElementById('editUser').value = ticket.user || '';
    document.getElementById('editIp').value = ticket.ip || '';
    document.getElementById('editAsset').value = ticket.asset || '';
    document.getElementById('editTechnician').value = ticket.technician || '';
    document.getElementById('editProblem').value = ticket.problem;
    document.getElementById('editSolution').value = ticket.solution || '';
    document.getElementById('editCompleted').checked = ticket.completed;

    hideAllErrors();
    const editChecklist = document.getElementById('editChecklist');
    editChecklist.innerHTML = '';

    if (ticket.checklist && ticket.checklist.length > 0) {
      ticket.checklist.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex items-center space-x-2';
        itemDiv.innerHTML = `
          <input type="checkbox" class="checklist-checkbox h-4 w-4 text-green-600 border-gray-300 rounded dark:border-gray-600" ${
            item.completed ? 'checked' : ''
          }>
          <input type="text" class="checklist-text flex-1 text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value="${
            item.text
          }">
          <button type="button" class="remove-item text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        `;
        editChecklist.appendChild(itemDiv);
        itemDiv
          .querySelector('.remove-item')
          .addEventListener('click', () => itemDiv.remove());
      });
    }
    editModal.classList.remove('hidden');
  }

  updateFilterButtons(showAll);
  fetchTickets('all');
});
