const vscode = acquireVsCodeApi();

const messagesContainer = document.getElementById('messages');
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");

let currentAIMessageElement = null;

window.addEventListener("message", event => {
    const { role, content, isStreaming } = event.data;

    if (role === "ai") {
        if (isStreaming) {
            // Append streaming content
            appendToAIMessage(content);
        } else {
            // Final message (non-streaming or end of stream)
            finalizeAIMessage(content);
            sendBtn.disabled = false;
            currentAIMessageElement = null;
        }

        hideTypingIndicator();
    }
    else if (role === "user") {
        addMessage(content, role);
        showTypingIndicator();
        sendBtn.disabled = true;
    }
});

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Send message function
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    userInput.value = '';
    userInput.style.height = 'auto';

    vscode.postMessage({ type: "user", content: message });
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

    if (sender === 'user') {
        messageDiv.innerHTML = `
          <div class="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-lg shadow-lg">
            <p class="text-sm">${text}</p>
          </div>
        `;
    } else {
        messageDiv.innerHTML = `
          <div class="msg bg-gray-800/80 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-lg shadow-lg border border-gray-700/50">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 bg-green-400 rounded-full"></div>
              <span class="text-xs text-gray-400 font-medium">DevFlow</span>
            </div>
            <p class="text-sm"></p>
          </div>
        `;
        currentAIMessageElement = messageDiv.querySelector('p');
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Append tokens to AI message while streaming
function appendToAIMessage(textChunk) {
    if (!currentAIMessageElement) {
        addMessage("", "ai"); // Create a bubble if not exists
    }
    currentAIMessageElement.innerHTML += textChunk;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Finalize AI message (for non-streaming or after complete)
function finalizeAIMessage(fullText) {
    if (!currentAIMessageElement) {
        addMessage(fullText, "ai");
    } else {
        currentAIMessageElement.innerHTML = fullText;
    }
}

function showTypingIndicator() {
    hideTypingIndicator(); // Ensure no duplicate
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble flex justify-start';
    typingDiv.innerHTML = `
        <div class="bg-gray-800/80 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-lg shadow-lg border border-gray-700/50">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span class="text-xs text-gray-400 font-medium">AI is typing...</span>
          </div>
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full typing-indicator"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full typing-indicator" style="animation-delay: 0.2s;"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full typing-indicator" style="animation-delay: 0.4s;"></div>
          </div>
        </div>
      `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userInput.focus();