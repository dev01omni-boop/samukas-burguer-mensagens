// =============================================
// APP STATE
// =============================================
let state = {
  activeChat: null,
  theme: localStorage.getItem('chat-theme') || 'light',
  infoPanelOpen: false,
  leads: [],
  currentMessages: [],
  periodFilter: '7dias'
};

// =============================================
// DOM REFERENCES
// =============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const sidebar = $('#sidebar');
const chatList = $('#chat-list');
const searchInput = $('#search-input');
const chatArea = $('#chat-area');
const emptyState = $('#empty-state');
const chatHeader = $('#chat-header');
const contactAvatar = $('#contact-avatar');
const contactName = $('#contact-name');
const contactStatus = $('#contact-status');
const messagesContainer = $('#messages-container');
const messagesList = $('#messages-list');
const infoPanel = $('#info-panel');
const infoPanelBody = $('#info-panel-body');

// =============================================
// THEME
// =============================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem('chat-theme', theme);
  
  const btn = $('#btn-theme-toggle');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
}

// =============================================
// RENDER CHAT LIST
// =============================================
function renderChatList(filter = '') {
  const filtered = state.leads.filter(lead =>
    (lead.lead_nome || '').toLowerCase().includes(filter.toLowerCase()) ||
    (lead.lead_telefone || '').toLowerCase().includes(filter.toLowerCase())
  );

  chatList.innerHTML = filtered.map(lead => {
    const preview = lead.lead_mensagem || '';
    const time = lead.criado_em ? new Date(lead.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const unread = 0; // Not tracked in DB yet
    const isActive = state.activeChat === lead.lead_id;

    const name = lead.lead_nome || 'Lead Sem Nome';
    const initials = lead.is_no_lead ? 'NL' : name.substring(0, 2).toUpperCase();
    const color = lead.is_no_lead ? '#e63946' : getAvatarColor(lead.lead_id);

    return `
      <div class="chat-item ${isActive ? 'active' : ''} ${unread > 0 ? 'unread' : ''}"
           data-id="${lead.lead_id}" id="chat-item-${lead.lead_id}">
        <div class="chat-item-avatar" style="background: ${color}">
          ${initials}
        </div>
        <div class="chat-item-content">
          <div class="chat-item-row">
            <span class="chat-item-name">${name}</span>
            <span class="chat-item-time">${time}</span>
          </div>
          <div class="chat-item-row-bottom">
            <span class="chat-item-preview">${truncate(preview, 45)}</span>
            ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click events
  chatList.querySelectorAll('.chat-item').forEach(el => {
    el.addEventListener('click', () => openChat(el.dataset.id));
  });
}

function getAvatarColor(idStr) {
  if (!idStr) return '#4a5a64';
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

function truncate(str, len) {
  if (!str) return '';
  // Strip markdown-like formatting for preview
  const clean = str.replace(/\*\*/g, '').replace(/\n/g, ' ');
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

// =============================================
// OPEN CHAT & FETCH MESSAGES
// =============================================
async function openChat(leadId) {
  state.activeChat = leadId;
  const lead = state.leads.find(l => l.lead_id === leadId);
  if (!lead) return;

  // Update sidebar
  renderChatList(searchInput.value);

  // Show chat UI
  emptyState.classList.add('hidden');
  chatHeader.classList.remove('hidden');
  messagesContainer.classList.remove('hidden');
  
  const watermark = document.getElementById('chat-watermark');
  if (watermark) watermark.classList.remove('hidden');

  // Mobile: hide sidebar
  if (window.innerWidth <= 768) {
    sidebar.classList.add('hide-mobile');
  }

  const name = lead.lead_nome || 'Lead Sem Nome';
  // Update header
  if (lead.is_no_lead) {
    contactAvatar.style.background = '#e63946';
    contactAvatar.innerHTML = 'NL';
    contactName.textContent = 'Novo Lead';
    contactStatus.textContent = 'Sem vínculo';
  } else {
    contactAvatar.style.background = getAvatarColor(lead.lead_id);
    contactAvatar.innerHTML = name.substring(0, 2).toUpperCase();
    contactName.textContent = name;
    contactStatus.textContent = lead.lead_telefone ? lead.lead_telefone : 'Online';
  }
  contactStatus.className = 'contact-status';

  // Fetch messages from DB
  await fetchMessages(leadId);

  // Close info panel
  closeInfoPanel();
}

async function fetchMessages(leadId) {
  messagesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #8696a0;">Carregando mensagens...</div>';

  let query = db.from('samukas_mensagens').select('*');
  if (leadId === 'no_lead') {
    query = query.is('lead_id', null);
  } else {
    query = query.eq('lead_id', leadId);
  }

  const { data, error } = await query.order('criado_em', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    messagesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #e63946;">Erro ao carregar mensagens</div>';
    return;
  }

  state.currentMessages = data || [];
  renderMessages(state.currentMessages, state.leads.find(l => l.lead_id === leadId));
  update24hWindowUI(state.currentMessages);

  // Scroll to bottom
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 50);
}

// =============================================
// RENDER MESSAGES
// =============================================
function renderMessages(messages, lead) {
  if (messages.length === 0) {
    messagesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #8696a0;">Nenhuma mensagem encontrada.</div>';
    return;
  }

  messagesList.innerHTML = messages.map(msg => {
    // Assume origin 'cliente' is incoming, everything else is outgoing
    const isOutgoing = (msg.mensagem_origem || '').toLowerCase() !== 'cliente';
    const statusIcon = getStatusIcon(msg.mensagem_status || 'read');
    const formattedText = formatMessageText(msg.mensagem_conteudo || '');
    
    // Format time
    const time = msg.criado_em ? new Date(msg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return `
      <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}" id="msg-${msg.mensagem_id}">
        <div class="message-bubble">
          <div class="message-text">${formattedText}</div>
          <div class="message-footer">
            <span class="message-time">${time}</span>
            ${isOutgoing ? `<span class="message-status ${msg.mensagem_status || 'read'}">${statusIcon}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatMessageText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--accent); text-decoration: underline;">$1</a>');
}

function getStatusIcon(status) {
  if (status === 'sent') {
    return '<svg width="16" height="11" viewBox="0 0 16 11"><path d="M11 1L4.5 8.5L1.5 5.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
  }
  if (status === 'delivered') {
    return '<svg width="20" height="11" viewBox="0 0 20 11"><path d="M14 1L7.5 8.5L5 6" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M10 1L3.5 8.5L1.5 6.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
  }
  if (status === 'read') {
    return '<svg width="20" height="11" viewBox="0 0 20 11"><path d="M14 1L7.5 8.5L5 6" stroke="#e63946" stroke-width="1.5" fill="none"/><path d="M10 1L3.5 8.5L1.5 6.5" stroke="#e63946" stroke-width="1.5" fill="none"/></svg>';
  }
  return '';
}

function getSenderColor(name) {
  const colors = ['#e88ca5', '#5b9bd5', '#6dbf67', '#e8a838', '#8e7cc3', '#c25b5b', '#42a5a5', '#d4609a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// =============================================
// WHATSAPP 24-HOUR WINDOW CALCULATOR & UI
// =============================================
function update24hWindowUI(messages) {
  const chatFooter = $('#chat-footer');
  const banner = $('#whatsapp-window-banner');
  const chatInput = $('#chat-input');
  const sendBtn = $('#btn-send-message');

  if (!chatFooter || !banner || !chatInput || !sendBtn) return;

  chatFooter.classList.remove('hidden');

  // Filter incoming client messages
  const clientMsgs = (messages || []).filter(m => (m.mensagem_origem || '').toLowerCase() === 'cliente');

  if (clientMsgs.length === 0) {
    state.window24h = { active: false, reason: 'no_msg' };
    banner.className = 'whatsapp-window-banner no-msg';
    banner.innerHTML = `
      <span class="badge-pulse"></span>
      <span><strong>Janela 24h WhatsApp:</strong> Nenhuma mensagem enviada pelo cliente ainda. Apenas modelos pré-aprovados permitidos.</span>
    `;
    chatInput.disabled = true;
    chatInput.placeholder = 'Aguardando o cliente responder para abrir a janela de 24h...';
    sendBtn.disabled = true;
    return;
  }

  // Get most recent client message
  const lastMsg = clientMsgs[clientMsgs.length - 1];
  const lastDate = new Date(lastMsg.criado_em);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const totalMinsLeft = Math.floor((24 * 60) - (diffMs / (1000 * 60)));
    const hLeft = Math.floor(totalMinsLeft / 60);
    const mLeft = totalMinsLeft % 60;

    state.window24h = { active: true, hLeft, mLeft, lastDate };

    banner.className = 'whatsapp-window-banner active';
    banner.innerHTML = `
      <span class="badge-pulse"></span>
      <span><strong>🟢 Janela 24h Aberta:</strong> O cliente mandou mensagem recentemente. Restam <strong>${hLeft}h ${mLeft}min</strong> para responder livremente.</span>
    `;
    chatInput.disabled = false;
    chatInput.placeholder = 'Digite sua mensagem para o cliente...';
    sendBtn.disabled = false;
  } else {
    state.window24h = { active: false, reason: 'expired', lastDate };

    const hoursAgo = Math.floor(diffHours);
    banner.className = 'whatsapp-window-banner expired';
    banner.innerHTML = `
      <span class="badge-pulse"></span>
      <span><strong>🔴 Janela 24h Expirada:</strong> Última mensagem do cliente foi há ${hoursAgo}h. Apenas mensagens de modelo/template podem ser enviadas.</span>
    `;
    chatInput.disabled = true;
    chatInput.placeholder = 'Janela de 24h fechada — Aguarde o cliente enviar mensagem para reabrir...';
    sendBtn.disabled = true;
  }
}

async function sendMessageToLead(text) {
  if (!state.activeChat || !state.window24h || !state.window24h.active) {
    alert('Não é possível enviar mensagem: A janela de 24h do WhatsApp está fechada.');
    return;
  }

  const lead = state.leads.find(l => l.lead_id === state.activeChat);
  if (!lead || !lead.lead_telefone) {
    alert('Telefone do lead não encontrado.');
    return;
  }

  const chatInput = $('#chat-input');
  const sendBtn = $('#btn-send-message');
  if (chatInput) chatInput.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  try {
    // 1. Send via Meta WhatsApp Official API
    const metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: lead.lead_telefone,
      type: "text",
      text: { preview_url: false, body: text }
    };

    const tokenMeta = (window.ENV && window.ENV.TOKEN_META) ? window.ENV.TOKEN_META : "EAGPsZBbZAJkuYBSQMrTOJZBxih2C79AxCC2lCE0HEaN8k6QyetFhC7ycIGypQSbvdEXZAOUjcVduxkf3KKiK6m7w7fOtRm1va5KvkRsK6ZBNlv5fOMLyLjqTiPxxBnSZBBExrvKwgql6lCgQa3pNvFsNUlYeHKZAORMcsY17BZBRbUMRhsZBS93CDtkNiU0JO4wZDZD";
    const apiPhoneId = (window.ENV && window.ENV.API_WHATSAPP) ? window.ENV.API_WHATSAPP : "1312724251922734";

    const metaRes = await fetch(`https://graph.facebook.com/v20.0/${apiPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenMeta}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaPayload)
    });

    const metaData = await metaRes.json();
    console.log('Meta API Send Result:', metaData);

    let wamid = null;
    let msgStatus = 'sent';
    if (metaData && metaData.messages && metaData.messages[0]) {
      wamid = metaData.messages[0].id;
    } else if (metaData && metaData.error) {
      msgStatus = 'failed: ' + (metaData.error.message || 'Erro Meta');
    }

    // 2. Save to Supabase samukas_mensagens
    const { data: insertedMsg, error: supaErr } = await db.from('samukas_mensagens').insert([{
      lead_id: lead.lead_id === 'no_lead' ? null : lead.lead_id,
      mensagem_conteudo: text,
      mensagem_origem: 'Atendente',
      mensagem_status: msgStatus,
      mensagem_provedor_id: wamid
    }]).select('*');

    if (supaErr) {
      console.error('Erro ao salvar no Supabase:', supaErr);
    }

    if (chatInput) chatInput.value = '';

    // Re-fetch messages
    await fetchMessages(state.activeChat);

  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    alert('Erro ao enviar mensagem via WhatsApp Meta API: ' + err.message);
  } finally {
    if (chatInput) chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatInput) chatInput.focus();
  }
}



// =============================================
// INFO PANEL
// =============================================
function openInfoPanel() {
  const contact = state.leads.find(c => c.lead_id === state.activeChat);
  if (!contact) return;

  state.infoPanelOpen = true;
  infoPanel.classList.add('open');

  if (contact.is_no_lead) {
    infoPanelBody.innerHTML = `
      <div style="text-align: center; padding: 24px 16px; border-bottom: 1px solid var(--border);">
        <div class="chat-item-avatar" style="background: #e63946; width: 72px; height: 72px; font-size: 28px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-weight: bold; box-shadow: 0 4px 16px rgba(230,57,70,0.3);">NL</div>
        <h3 style="margin-bottom: 4px; font-size: 18px; color: var(--text-primary); font-weight: 600;">Novo Lead</h3>
        <p style="color: var(--text-secondary); font-size: 13px;">Mensagens sem vínculo com nenhum lead</p>
      </div>
      <div style="padding: 16px;">
        <div style="background: var(--bg-tertiary, rgba(255,255,255,0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;">
          <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Status</div>
          <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">Não identificado no sistema</div>
        </div>
      </div>
    `;
    return;
  }

  const name = contact.lead_nome || 'Lead Sem Nome';
  const initials = name.substring(0, 2).toUpperCase();
  const color = getAvatarColor(contact.lead_id);
  const phone = contact.lead_telefone || 'Não informado';
  const pedidos = contact.lead_quantidade_pedidos || 0;
  const ticket = contact.lead_ticket_medio != null 
    ? `R$ ${Number(contact.lead_ticket_medio).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : 'R$ 0,00';
  const ultimaCompra = contact.lead_ultima_compra 
    ? new Date(contact.lead_ultima_compra).toLocaleDateString('pt-BR') 
    : 'Sem registros';
  const dataDisparo = contact.data_disparo_mensagem 
    ? new Date(contact.data_disparo_mensagem).toLocaleDateString('pt-BR') + ' ' + new Date(contact.data_disparo_mensagem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Não informada';

  infoPanelBody.innerHTML = `
    <div style="text-align: center; padding: 24px 16px; border-bottom: 1px solid var(--border);">
      <div class="chat-item-avatar" style="background: ${color}; width: 72px; height: 72px; font-size: 28px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-weight: bold; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">${initials}</div>
      <h3 style="margin-bottom: 4px; font-size: 18px; color: var(--text-primary); font-weight: 600;">${name}</h3>
      <p style="color: var(--text-secondary); font-size: 13px;">${phone}</p>
    </div>

    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
      <div style="background: var(--bg-tertiary, rgba(255,255,255,0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;">
        <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Telefone</div>
        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${phone}</div>
      </div>

      <div style="background: var(--bg-tertiary, rgba(255,255,255,0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;">
        <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Quantidade de Pedidos</div>
        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${pedidos}</div>
      </div>

      <div style="background: var(--bg-tertiary, rgba(255,255,255,0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;">
        <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Ticket Médio</div>
        <div style="font-size: 14px; color: var(--accent); font-weight: 600;">${ticket}</div>
      </div>

      <div style="background: var(--bg-tertiary, rgba(255,255,255,0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;">
        <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Última Compra</div>
        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${ultimaCompra}</div>
      </div>

      <div style="background: var(--bg-tertiary, rgba(255,255,255,0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;">
        <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Data do Disparo</div>
        <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${dataDisparo}</div>
      </div>
    </div>
  `;
}

function closeInfoPanel() {
  state.infoPanelOpen = false;
  infoPanel.classList.remove('open');
}

// =============================================
// EMOJI PICKER
// =============================================


// =============================================
// LOGIN & SUPABASE INIT
// =============================================
let db;
try {
  db = window.supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
} catch (e) {
  alert("Erro fatal: O Supabase não carregou. Se você usa AdBlock ou Brave, desative os escudos para esta página. Erro: " + e.message);
}

function initLogin() {
  const loginScreen = $('#login-screen');
  const loginForm = $('#login-form');
  const loginEmail = $('#login-email');
  const loginPassword = $('#login-password');
  const loginBtn = $('#login-btn');
  const togglePassword = $('#toggle-password');
  const app = $('#app');
  const rememberMe = $('#remember-me');

  // Supabase auth state listener
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const card = loginScreen.querySelector('.login-card');
      card.classList.add('success');
      loginScreen.classList.add('fade-out');
      
      setTimeout(() => {
        loginScreen.classList.add('hidden');
        app.classList.remove('hidden');
        initChat();
      }, 600);
    } else if (event === 'SIGNED_OUT') {
      app.classList.add('hidden');
      loginScreen.classList.remove('hidden');
      loginScreen.classList.remove('fade-out');
      const card = loginScreen.querySelector('.login-card');
      card.classList.remove('success');
    }
  });

  // Check current session
  db.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      loginScreen.classList.add('hidden');
      app.classList.remove('hidden');
      initChat();
    }
  });

  // Toggle password visibility
  togglePassword.addEventListener('click', () => {
    const isPassword = loginPassword.type === 'password';
    loginPassword.type = isPassword ? 'text' : 'password';
    togglePassword.innerHTML = isPassword
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });

  // Clear errors on input
  loginEmail.addEventListener('input', () => {
    loginEmail.classList.remove('error');
    removeError(loginEmail);
  });
  loginPassword.addEventListener('input', () => {
    loginPassword.classList.remove('error');
    removeError(loginPassword);
  });

  // Form submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin(loginEmail, loginPassword, loginBtn, loginScreen, app);
  });

  // Social login buttons (mock)
  ['#login-google', '#login-github', '#login-apple'].forEach(sel => {
    const el = $(sel);
    if (el) {
      el.addEventListener('click', () => {
        alert('Login social não implementado.');
      });
    }
  });

  // Prevent default on links
  $('#forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Funcionalidade de recuperação de senha a ser implementada.');
  });
  const signupLink = $('#signup-link');
  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Funcionalidade de cadastro a ser implementada.');
    });
  }
}

async function handleLogin(emailInput, passwordInput, btn, loginScreen, app) {
  try {
    // Validate
    let valid = true;
    if (!emailInput.value.trim() || !emailInput.validity.valid) {
      emailInput.classList.add('error');
      showError(emailInput, 'Insira um e-mail válido');
      valid = false;
    }
    if (!passwordInput.value || passwordInput.value.length < 3) {
      passwordInput.classList.add('error');
      showError(passwordInput, 'A senha deve ter pelo menos 3 caracteres');
      valid = false;
    }
    if (!valid) return;

    // Show loading state
    btn.classList.add('loading');
    btn.querySelector('.login-btn-text').classList.add('hidden');
    btn.querySelector('.login-btn-loader').classList.remove('hidden');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    btn.classList.remove('loading');
    btn.querySelector('.login-btn-text').classList.remove('hidden');
    btn.querySelector('.login-btn-loader').classList.add('hidden');

    if (error) {
      emailInput.classList.add('error');
      passwordInput.classList.add('error');
      showError(passwordInput, 'senha incorreta');
      alert("ERRO SUPABASE: " + error.message);
      return;
    }
  } catch (err) {
    btn.classList.remove('loading');
    btn.querySelector('.login-btn-text').classList.remove('hidden');
    btn.querySelector('.login-btn-loader').classList.add('hidden');
    showError(passwordInput, 'Erro crítico no script');
    alert("ERRO CATCH: " + err.message);
  }
}

function showError(input, message) {
  removeError(input);
  const errorEl = document.createElement('div');
  errorEl.className = 'form-error';
  errorEl.textContent = message;
  input.closest('.form-group').appendChild(errorEl);
}

function removeError(input) {
  const group = input.closest('.form-group');
  const existing = group.querySelector('.form-error');
  if (existing) existing.remove();
}

// =============================================
// FETCH LEADS & REALTIME
// =============================================
async function fetchLeads() {
  const { data: leadsData, error: leadsErr } = await db
    .from('samukas_leads')
    .select('*')
    .eq('lead_ativo', true);

  if (leadsErr) {
    console.error('Error fetching leads:', leadsErr);
    return;
  }

  // Buscar mensagens para identificar os leads com mensagens e obter a prévia da última mensagem e data criado_em
  const { data: messagesData, error: msgsErr } = await db
    .from('samukas_mensagens')
    .select('lead_id, mensagem_conteudo, criado_em')
    .not('lead_id', 'is', null)
    .order('criado_em', { ascending: false });

  if (msgsErr) {
    console.error('Error fetching messages summary:', msgsErr);
  }

  const latestMsgByLead = new Map();
  if (messagesData) {
    for (const msg of messagesData) {
      if (msg.lead_id && !latestMsgByLead.has(msg.lead_id)) {
        latestMsgByLead.set(msg.lead_id, msg);
      }
    }
  }

  // Incluir leads ativos
  let leadsList = (leadsData || []).map(lead => {
    const latest = latestMsgByLead.get(lead.lead_id);
    return {
      ...lead,
      lead_mensagem: latest ? latest.mensagem_conteudo : (lead.lead_mensagem || ''),
      criado_em: latest ? latest.criado_em : lead.lead_ultima_compra
    };
  });

  // Buscar se existem mensagens sem vínculo com nenhum lead (lead_id is null)
  const { data: noLeadMsgs, error: noLeadErr } = await db
    .from('samukas_mensagens')
    .select('*')
    .is('lead_id', null)
    .order('criado_em', { ascending: false })
    .limit(1);

  if (!noLeadErr && noLeadMsgs && noLeadMsgs.length > 0) {
    const latestMsg = noLeadMsgs[0];
    leadsList.unshift({
      lead_id: 'no_lead',
      lead_nome: 'Novo Lead',
      lead_telefone: 'Sem Vínculo',
      lead_mensagem: latestMsg.mensagem_conteudo || '',
      criado_em: latestMsg.criado_em,
      is_no_lead: true
    });
  }

  // Ordenar conversas das mais recentes para as mais antigas usando a coluna criado_em da tabela samukas_mensagens
  leadsList.sort((a, b) => {
    if (a.is_no_lead) return -1;
    if (b.is_no_lead) return 1;
    const timeA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
    const timeB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
    return timeB - timeA;
  });

  state.leads = leadsList;
  renderChatList(searchInput.value);
}

async function openChat(leadId) {
  state.activeChat = leadId;
  const lead = state.leads.find(l => l.lead_id === leadId);
  if (!lead) return;

  // Alternar para a visão de conversa
  switchView('chat');

  // Update sidebar
  renderChatList(searchInput.value);

  // Show chat UI
  emptyState.classList.add('hidden');
  chatHeader.classList.remove('hidden');
  messagesContainer.classList.remove('hidden');
  
  const watermark = document.getElementById('chat-watermark');
  if (watermark) watermark.classList.remove('hidden');

  // Mobile: hide sidebar
  if (window.innerWidth <= 768) {
    sidebar.classList.add('hide-mobile');
  }

  const name = lead.lead_nome || 'Lead Sem Nome';
  // Update header
  if (lead.is_no_lead) {
    contactAvatar.style.background = '#e63946';
    contactAvatar.innerHTML = 'NL';
    contactName.textContent = 'Novo Lead';
    contactStatus.textContent = 'Sem vínculo';
  } else {
    contactAvatar.style.background = getAvatarColor(lead.lead_id);
    contactAvatar.innerHTML = name.substring(0, 2).toUpperCase();
    contactName.textContent = name;
    contactStatus.textContent = lead.lead_telefone ? lead.lead_telefone : 'Online';
  }
  contactStatus.className = 'contact-status';

  // Fetch messages from DB
  await fetchMessages(leadId);

  // Close info panel
  closeInfoPanel();
}

// =============================================
// VIEW SWITCHER
// =============================================
function switchView(viewName) {
  state.currentView = viewName;
  const tabDashboard = $('#tab-dashboard');
  const tabChat = $('#tab-chat');
  const viewDashboard = $('#view-dashboard');
  const viewChat = $('#view-chat');

  if (viewName === 'dashboard') {
    if (tabDashboard) tabDashboard.classList.add('active');
    if (tabChat) tabChat.classList.remove('active');
    if (viewDashboard) viewDashboard.classList.remove('hidden');
    if (viewChat) viewChat.classList.add('hidden');
  } else {
    if (tabChat) tabChat.classList.add('active');
    if (tabDashboard) tabDashboard.classList.remove('active');
    if (viewChat) viewChat.classList.remove('hidden');
    if (viewDashboard) viewDashboard.classList.add('hidden');
  }
}

// =============================================
// KPI & METRICS DASHBOARD
// =============================================
function renderKPISkeletons() {
  const container = $('#kpi-cards-container');
  if (!container) return;

  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="kpi-skeleton-card">
      <div class="kpi-skeleton-header">
        <div class="kpi-skeleton-block kpi-skeleton-label"></div>
        <div class="kpi-skeleton-block kpi-skeleton-icon"></div>
      </div>
      <div class="kpi-skeleton-block kpi-skeleton-value"></div>
      <div class="kpi-skeleton-block kpi-skeleton-subtext"></div>
    </div>
  `).join('');
}

function filterLeadsByPeriod(leads, period) {
  if (!period || period === 'todos') return leads;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return leads.filter(lead => {
    const dateStr = lead.data_disparo_mensagem || lead.criado_em || lead.lead_ultima_compra;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    if (period === 'hoje') {
      return d >= todayStart && d <= todayEnd;
    } else if (period === 'ontem') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      return d >= yesterdayStart && d <= yesterdayEnd;
    } else if (period === '7dias') {
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return d >= sevenDaysAgo && d <= todayEnd;
    } else if (period === 'mes') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return d >= monthStart && d <= todayEnd;
    }
    return true;
  });
}

async function fetchKPIs() {
  const container = $('#kpi-cards-container');
  const refreshBtn = $('#btn-refresh-kpis');
  const summaryText = $('#summary-text');
  if (!container) return;

  if (refreshBtn) refreshBtn.classList.add('loading');

  try {
    const { data: leadsData, error } = await db
      .from('samukas_leads')
      .select('lead_id, lead_nome, lead_telefone, lead_ativo, lead_comprou, compra_valor, lead_valor_total, lead_quantidade_pedidos, lead_ultima_compra, lead_mensagem, data_disparo_mensagem, criado_em')
      .order('data_disparo_mensagem', { ascending: false });

    if (error) {
      console.error('Erro ao buscar dados de samukas_leads para KPIs:', error);
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 16px; background: rgba(230,57,70,0.1); border: 1px solid rgba(230,57,70,0.3); border-radius: 12px; color: #ff6b6b; font-size: 0.85rem; text-align: center;">
          Não foi possível carregar as métricas do Supabase.
        </div>
      `;
      return;
    }

    const rawLeads = leadsData || [];
    const leads = filterLeadsByPeriod(rawLeads, state.periodFilter);

    // 1. Disparos Realizados: Contagem de leads com data_disparo_mensagem ou mensagem de disparo
    const disparosLeads = leads.filter(l => {
      if (l.data_disparo_mensagem) return true;
      if (l.lead_mensagem) {
        const msgStr = String(l.lead_mensagem).trim().toLowerCase();
        return msgStr.includes('mensagem 1');
      }
      return false;
    });

    const totalDisparos = disparosLeads.length > 0 ? disparosLeads.length : leads.length;

    // 2. Vendas Convertidas: Quantidade de pedidos gerados onde lead_comprou = true
    const compradores = leads.filter(l => Boolean(l.lead_comprou));
    const vendasConvertidas = compradores.length;

    // 3. Faturamento Gerado: Valor total das vendas atribuídas aos disparos
    const faturamentoGeradoVal = compradores.reduce((sum, l) => {
      const val = l.compra_valor != null ? Number(l.compra_valor) : Number(l.lead_valor_total || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const faturamentoStr = faturamentoGeradoVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 4. Taxa de Conversão (%): Porcentagem de conversões sobre os disparos
    const taxaConversaoVal = totalDisparos > 0 ? (vendasConvertidas / totalDisparos) * 100 : 0;
    const taxaConversaoStr = taxaConversaoVal.toFixed(1).replace('.', ',') + '%';

    // Rótulo temporal dinâmico para o banner
    let periodPrefix = "No geral";
    if (state.periodFilter === 'hoje') periodPrefix = "Hoje";
    else if (state.periodFilter === 'ontem') periodPrefix = "Ontem";
    else if (state.periodFilter === '7dias') periodPrefix = "Nos últimos 7 dias";
    else if (state.periodFilter === 'mes') periodPrefix = "Neste mês";

    if (summaryText) {
      summaryText.innerHTML = `${periodPrefix} foram feitos <strong style="color: #ffffff;">${totalDisparos} disparos</strong>, gerando <strong style="color: #2ec4b6;">${vendasConvertidas} ${vendasConvertidas === 1 ? 'venda' : 'vendas'}</strong> e <strong style="color: #ffcc00;">${faturamentoStr}</strong> de faturamento (Conversão: <strong style="color: #ff6b6b;">${taxaConversaoStr}</strong>).`;
    }

    renderKPICards({
      disparos: `${totalDisparos} disparos`,
      vendas: `${vendasConvertidas} ${vendasConvertidas === 1 ? 'venda' : 'vendas'}`,
      faturamento: faturamentoStr,
      taxaConversao: taxaConversaoStr,
      totalDisparos,
      vendasConvertidas
    });

    // Atualizar estatísticas secundárias
    const totalLeadsAtivos = leads.filter(l => Boolean(l.lead_ativo)).length;
    const statAtivos = $('#stat-leads-ativos');
    const statConvertidos = $('#stat-leads-convertidos');
    const statProspeccao = $('#stat-leads-prospeccao');

    if (statAtivos) statAtivos.textContent = totalLeadsAtivos;
    if (statConvertidos) statConvertidos.textContent = vendasConvertidas;
    if (statProspeccao) statProspeccao.textContent = Math.max(0, totalLeadsAtivos - vendasConvertidas);

    // Renderizar tabela de compradores recentes
    const tbody = $('#recent-buyers-tbody');
    if (tbody) {
      if (compradores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 20px;">Nenhum comprador cadastrado no período selecionado.</td></tr>`;
      } else {
        tbody.innerHTML = compradores.slice(0, 15).map(c => {
          const name = c.lead_nome || 'Sem Nome';
          const phone = c.lead_telefone || 'Não informado';
          const pedidos = c.lead_quantidade_pedidos || 1;
          const valNum = c.compra_valor != null ? Number(c.compra_valor) : Number(c.lead_valor_total || 0);
          const valor = valNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const data = c.lead_ultima_compra ? new Date(c.lead_ultima_compra).toLocaleDateString('pt-BR') : 'Sem registro';

          return `
            <tr>
              <td><strong style="color: var(--text-primary);">${name}</strong></td>
              <td>${phone}</td>
              <td><span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 600;">${pedidos} ${pedidos === 1 ? 'pedido' : 'pedidos'}</span></td>
              <td><strong style="color: #ffcc00;">${valor}</strong></td>
              <td>${data}</td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.error('Erro ao processar KPIs:', err);
  } finally {
    if (refreshBtn) {
      setTimeout(() => refreshBtn.classList.remove('loading'), 450);
    }
  }
}

function renderKPICards(kpi) {
  const container = $('#kpi-cards-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Card 1: Disparos Realizados -->
    <div class="kpi-card kpi-card-disparos" style="--card-accent: #3b82f6; --card-glow: rgba(59, 130, 246, 0.2); --icon-bg: rgba(59, 130, 246, 0.15); --icon-color: #60a5fa; --icon-border: rgba(59, 130, 246, 0.3);">
      <div class="kpi-card-top">
        <span class="kpi-card-label">Disparos Realizados</span>
        <div class="kpi-card-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </div>
      </div>
      <div class="kpi-card-value">${kpi.disparos}</div>
      <div class="kpi-card-subtext">Total de mensagens disparadas</div>
    </div>

    <!-- Card 2: Vendas Convertidas -->
    <div class="kpi-card kpi-card-buyers">
      <div class="kpi-card-top">
        <span class="kpi-card-label">Vendas Convertidas</span>
        <div class="kpi-card-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
      </div>
      <div class="kpi-card-value">${kpi.vendas}</div>
      <div class="kpi-card-subtext">Pedidos gerados após o disparo</div>
    </div>

    <!-- Card 3: Faturamento Gerado -->
    <div class="kpi-card kpi-card-revenue">
      <div class="kpi-card-top">
        <span class="kpi-card-label">Faturamento Gerado</span>
        <div class="kpi-card-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
      <div class="kpi-card-value">${kpi.faturamento}</div>
      <div class="kpi-card-subtext">Valor total das vendas atribuídas</div>
    </div>

    <!-- Card 4: Taxa de Conversão (%) -->
    <div class="kpi-card kpi-card-conversion">
      <div class="kpi-card-top">
        <span class="kpi-card-label">Taxa de Conversão</span>
        <div class="kpi-card-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
      </div>
      <div class="kpi-card-value">${kpi.taxaConversao}</div>
      <div class="kpi-card-subtext">${kpi.vendasConvertidas} conversões sobre ${kpi.totalDisparos} disparos</div>
    </div>
  `;
}

let realtimeChannel = null;

function initRealtime() {
  if (realtimeChannel) {
    try { db.removeChannel(realtimeChannel); } catch(e) {}
    realtimeChannel = null;
  }

  realtimeChannel = db.channel('samukas_realtime_' + Date.now())
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'samukas_mensagens' },
      (payload) => {
        const newMsg = payload.new;
        const isCurrentChat = (state.activeChat === newMsg.lead_id) || (state.activeChat === 'no_lead' && newMsg.lead_id === null);
        if (isCurrentChat) {
          state.currentMessages.push(newMsg);
          renderMessages(state.currentMessages, state.leads.find(l => l.lead_id === state.activeChat));
          setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }, 50);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'samukas_leads' },
      (payload) => {
        fetchLeads();
        fetchKPIs();
      }
    )
    .subscribe();
}

// =============================================
// EVENT LISTENERS
// =============================================
let chatInitialized = false;

function initChat() {
  if (chatInitialized) return;
  chatInitialized = true;

  // Apply saved theme
  applyTheme(state.theme);

  // Fetch data, KPIs and setup realtime
  fetchLeads();
  renderKPISkeletons();
  fetchKPIs();
  initRealtime();

  // Navigation tabs
  const tabDashboard = $('#tab-dashboard');
  const tabChat = $('#tab-chat');

  if (tabDashboard) {
    tabDashboard.addEventListener('click', () => switchView('dashboard'));
  }
  if (tabChat) {
    tabChat.addEventListener('click', () => switchView('chat'));
  }

  // Period filter buttons
  const periodBtns = $$('.period-btn');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.periodFilter = btn.dataset.period;
      fetchKPIs();
    });
  });

  // Default view
  switchView('dashboard');

  // Refresh KPIs button
  const refreshBtn = $('#btn-refresh-kpis');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchKPIs();
    });
  }

  // Logout button
  const logoutBtn = $('#btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await db.auth.signOut();
      window.location.reload();
    });
  }

  // Search
  searchInput.addEventListener('input', (e) => {
    renderChatList(e.target.value);
  });

  // Back button (mobile)
  $('#btn-back').addEventListener('click', () => {
    sidebar.classList.remove('hide-mobile');
    state.activeChat = null;
    emptyState.classList.remove('hidden');
    chatHeader.classList.add('hidden');
    messagesContainer.classList.add('hidden');
    const chatFooter = $('#chat-footer');
    if (chatFooter) chatFooter.classList.add('hidden');
    renderChatList(searchInput.value);
  });

  // Chat Form Submit (Send Direct Message)
  const chatForm = $('#chat-form');
  const chatInput = $('#chat-input');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput ? chatInput.value.trim() : '';
      if (text) {
        sendMessageToLead(text);
      }
    });
  }

  // Info panel
  $('#btn-info').addEventListener('click', () => {
    if (state.infoPanelOpen) closeInfoPanel();
    else openInfoPanel();
  });
  $('#chat-contact').addEventListener('click', () => {
    if (!state.infoPanelOpen) openInfoPanel();
  });
  $('#btn-close-info').addEventListener('click', closeInfoPanel);

  // New chat button (Removed)

  // Search messages button
  $('#btn-search-messages').addEventListener('click', () => {
    const query = prompt('Pesquisar mensagens:');
    if (!query) return;
    const msgs = messagesList.querySelectorAll('.message-text');
    msgs.forEach(el => {
      const text = el.textContent;
      if (text.toLowerCase().includes(query.toLowerCase())) {
        el.closest('.message').style.background = 'var(--accent-light)';
        el.closest('.message').scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          el.closest('.message').style.background = '';
        }, 3000);
      }
    });
  });
}

// =============================================
// BOOT
// =============================================
// =============================================
// BOOT
// =============================================
// =============================================
// BOOT
// =============================================
try {
  const subtitle = document.querySelector('.login-subtitle');
  if (subtitle) subtitle.textContent = "Executando Boot...";
  
  initLogin();
  
  if (subtitle) subtitle.textContent = "Sistema Conectado - Pronto para Login";
} catch (e) {
  const subtitle = document.querySelector('.login-subtitle');
  if (subtitle) subtitle.textContent = "ERRO FATAL: " + e.message;
  console.error(e);
}
