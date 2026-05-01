/* ===== NAVBAR SCROLL ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ===== HAMBURGER MENU ===== */
const hamburger = document.getElementById('hamburger');
hamburger.addEventListener('click', () => {
  const links = document.querySelector('.nav-links');
  links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
  links.style.flexDirection = 'column';
  links.style.position = 'absolute';
  links.style.top = '70px';
  links.style.right = '24px';
  links.style.background = 'var(--surface)';
  links.style.border = '1px solid var(--border2)';
  links.style.borderRadius = '12px';
  links.style.padding = '16px 24px';
  links.style.gap = '16px';
});

/* ===== FAQ TOGGLE ===== */
function toggleFAQ(btn) {
  const item = btn.closest('.faq-item');
  const answer = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');

  document.querySelectorAll('.faq-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.faq-a').classList.remove('open');
  });

  if (!isOpen) {
    item.classList.add('open');
    answer.classList.add('open');
  }
}

/* ===== SCROLL ANIMATIONS ===== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.step-card, .guide-card, .tl-item, .faq-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

/* ===== AI PROXY CONFIG ===== */
// No API keys here — the key lives in Vercel Environment Variables.
// Requests go to /api/chat (a serverless function that calls Groq securely).
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

const SYSTEM_PROMPT = `You are VoteWise, a friendly and knowledgeable AI assistant specializing in helping citizens understand the democratic election process — primarily focused on Indian elections but covering general democratic principles too.

Your role:
- Explain election processes, timelines, and steps in a simple, clear, and engaging way
- Help users understand voter registration, polling day procedures, EVMs, VVPAT, NOTA, Model Code of Conduct, candidate nominations, vote counting, and result declaration
- Guide first-time voters with patience and encouragement
- Cite official sources like eci.gov.in and voters.eci.gov.in where relevant
- Use relevant emojis sparingly to make answers friendly
- Use **bold** for key terms
- Keep answers concise but complete — use bullet points and numbered steps for processes
- If asked about a specific state election, provide relevant context
- Always stay on topic: elections, voting, civic processes, democracy. If asked something completely unrelated, politely redirect to election topics.
- Never express personal political opinions or favor any party or candidate
- Helpline number: 1950 | Voter portal: voters.eci.gov.in`;

// OpenAI-compatible message history
const conversationHistory = [];

async function callAI(userMessage) {
  conversationHistory.push({ role: 'user', content: userMessage });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory
  ];

  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model })
      });

      if (!response.ok) {
        const err = await response.json();
        const msg = err?.error?.message || err?.error || 'Unknown error';
        if (response.status === 429 || msg.toLowerCase().includes('rate limit')) {
          lastError = new Error(`Rate limit on ${model}`);
          continue;
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const assistantText = data.choices?.[0]?.message?.content
        || 'Sorry, I could not generate a response.';

      conversationHistory.push({ role: 'assistant', content: assistantText });
      return assistantText;

    } catch (err) {
      if (err.message.startsWith('Rate limit on')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  conversationHistory.pop();
  throw new Error('All models are currently rate-limited. Please try again in a moment.');
}

/* ===== CHAT ENGINE ===== */
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(text, role) {
  const msg = document.createElement('div');
  msg.className = `msg msg-${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatText(text);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = getTime();

  msg.appendChild(bubble);
  msg.appendChild(time);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

function formatText(text) {
  // Convert markdown-style formatting to HTML
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:0.85em">$1</code>')
    .replace(/^###\s(.+)$/gm, '<strong style="color:var(--primary-light)">$1</strong>')
    .replace(/^##\s(.+)$/gm, '<strong style="font-size:1.05em">$1</strong>')
    .replace(/^•\s/gm, '• ')
    .replace(/\n/g, '<br/>');
}

function showTyping() {
  const msg = document.createElement('div');
  msg.className = 'msg msg-bot';
  msg.id = 'typing-indicator';
  msg.innerHTML = `<div class="msg-bubble" style="padding:14px 20px">
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  </div>`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

function showError(message) {
  const msg = document.createElement('div');
  msg.className = 'msg msg-bot';
  msg.innerHTML = `<div class="msg-bubble" style="border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.08)">
    ⚠️ <strong>Error:</strong> ${message}<br/><br/>Please try again or check your connection.
  </div>`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // Hide suggestion chips after first message
  const sugg = document.getElementById('chat-suggestions');
  if (sugg) sugg.style.display = 'none';

  appendMessage(text, 'user');
  chatInput.value = '';
  chatSend.disabled = true;
  chatInput.disabled = true;

  showTyping();

  try {
    const answer = await callAI(text);
    removeTyping();
    appendMessage(answer, 'bot');
  } catch (err) {
    removeTyping();
    showError(err.message);
    // On error, remove the failed message from history so it doesn't corrupt context
    conversationHistory.pop();
  } finally {
    chatSend.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

function sendSuggestion(btn) {
  chatInput.value = btn.textContent;
  sendMessage();
}

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !chatSend.disabled) sendMessage();
});

/* ===== BALLOT CARD ANIMATION ===== */
const ballotItems = document.querySelectorAll('.ballot-item');
let currentActive = 0;
setInterval(() => {
  ballotItems.forEach(i => i.classList.remove('active'));
  currentActive = (currentActive + 1) % ballotItems.length;
  ballotItems[currentActive].classList.add('active');
}, 2200);
