/**
 * ShuttleAI — Simple Badminton Chatbot Application Logic
 */

(() => {
  'use strict';

  const SYSTEM_PROMPT = `You are ShuttleAI, an elite expert badminton coach and rules assistant.
Your expertise spans:
- Stroke biomechanics (forehand jump smash, kinetic chain, forearm pronation, wrist snap, deceptive drops, backhand clear, tight tumbling spin net shots).
- Footwork (split-step timing, chassé steps, 6-corner recovery to center base T).
- BWF Laws of Badminton (Law 9 service rules and 1.15m height device, Law 13 faults, let, scoring).
- Equipment (rackets 3U/4U, balance points, strings like BG80/Exbolt 65, and tension in lbs).
- Singles and doubles tactical rotations and positioning.

Format your responses with clear bullet points, bold key terms, and concise actionable steps.`;

  const state = {
    isConfigured: false,
    isStreaming: false,
    messages: []
  };

  const elements = {
    envStatusBadge: document.getElementById('envStatusBadge'),
    envStatusLabel: document.getElementById('envStatusLabel'),
    statusIndicator: document.getElementById('statusIndicator'),
    envMissingBanner: document.getElementById('envMissingBanner'),
    welcomeHero: document.getElementById('welcomeHero'),
    messagesContainer: document.getElementById('messagesContainer'),
    chatMain: document.getElementById('chatMain'),
    chatForm: document.getElementById('chatForm'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    sendSpinner: document.getElementById('sendSpinner'),
    btnClearChat: document.getElementById('btnClearChat'),
    promptCards: document.querySelectorAll('.prompt-card')
  };

  async function checkServerStatus() {
    try {
      const resp = await fetch('/api/status');
      if (resp.ok) {
        const data = await resp.json();
        state.isConfigured = data.configured;

        if (state.isConfigured) {
          elements.envStatusBadge.classList.add('ready');
          elements.statusIndicator.classList.add('active');
          elements.envStatusLabel.textContent = 'Groq Connected';
          elements.envMissingBanner.classList.add('hidden');
        } else {
          elements.envStatusBadge.classList.remove('ready');
          elements.statusIndicator.classList.remove('active');
          elements.envStatusLabel.textContent = 'Key Missing in .env';
          elements.envMissingBanner.classList.remove('hidden');
        }
      }
    } catch (e) {
      elements.envStatusLabel.textContent = 'Server Offline';
    }
  }

  function appendMessage(role, content, isNewBot = false) {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user' : 'bot'}`;

    const avatar = role === 'user' ? '🏸' : '🤖';
    const sender = role === 'user' ? 'You' : 'ShuttleAI';

    row.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-bubble-wrap">
        <span class="msg-sender">${sender}</span>
        <div class="msg-bubble">
          <div class="msg-text">${formatMarkdown(content)}</div>
          ${isNewBot ? '<span class="typing-cursor"></span>' : ''}
        </div>
      </div>
    `;

    elements.messagesContainer.appendChild(row);
    scrollToBottom();
    return row;
  }

  async function sendMessage(presetText = null) {
    const text = (presetText || elements.userInput.value).trim();
    if (!text || state.isStreaming) return;

    // Check configuration
    await checkServerStatus();
    if (!state.isConfigured) {
      elements.envMissingBanner.classList.remove('hidden');
      alert('Please set your GROQ_API_KEY in the .env file first, then try again.');
      return;
    }

    elements.welcomeHero.classList.add('hidden');
    elements.messagesContainer.classList.remove('hidden');

    // Add user message
    state.messages.push({ role: 'user', content: text });
    appendMessage('user', text);

    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';

    // Prepare bot message placeholder
    const botRow = appendMessage('assistant', '', true);
    const textContainer = botRow.querySelector('.msg-text');
    const cursor = botRow.querySelector('.typing-cursor');

    state.isStreaming = true;
    setSendingUI(true);

    const botMessageObj = { role: 'assistant', content: '' };
    state.messages.push(botMessageObj);

    try {
      const payload = {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...state.messages.slice(-8)
        ]
      };

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                botMessageObj.content += delta;
                textContainer.innerHTML = formatMarkdown(botMessageObj.content);
                scrollToBottom();
              }
            } catch (e) {}
          }
        }
      }

      if (cursor) cursor.remove();
    } catch (err) {
      if (cursor) cursor.remove();
      const errMsg = `⚠️ **Error**: ${err.message}`;
      botMessageObj.content = errMsg;
      textContainer.innerHTML = formatMarkdown(errMsg);
    } finally {
      state.isStreaming = false;
      setSendingUI(false);
    }
  }

  function setSendingUI(isSending) {
    elements.sendBtn.disabled = isSending;
    const sendIcon = elements.sendBtn.querySelector('.send-icon');
    if (isSending) {
      sendIcon.classList.add('hidden');
      elements.sendSpinner.classList.remove('hidden');
    } else {
      sendIcon.classList.remove('hidden');
      elements.sendSpinner.classList.add('hidden');
    }
  }

  function scrollToBottom() {
    elements.chatMain.scrollTop = elements.chatMain.scrollHeight;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li>$2</li>');
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`.replace(/<p><\/p>/g, '');
  }

  function setupEvents() {
    elements.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    elements.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elements.userInput.addEventListener('input', () => {
      elements.userInput.style.height = 'auto';
      elements.userInput.style.height = `${Math.min(elements.userInput.scrollHeight, 140)}px`;
    });

    elements.promptCards.forEach(card => {
      card.addEventListener('click', () => {
        sendMessage(card.dataset.prompt);
      });
    });

    elements.btnClearChat.addEventListener('click', () => {
      state.messages = [];
      elements.messagesContainer.innerHTML = '';
      elements.messagesContainer.classList.add('hidden');
      elements.welcomeHero.classList.remove('hidden');
    });
  }

  function init() {
    checkServerStatus();
    setupEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
