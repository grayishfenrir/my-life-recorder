document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const saveButton = document.getElementById('saveButton');

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const messageInput = document.getElementById('message');
        const message = messageInput.value.trim();
        if (message === '') return;

        addMessage(message, 'sent');
        messageInput.value = '';

        try {
            const response = await fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (data.success) {
                addMessage(data.response, 'received');
            } else {
                addMessage('Failed to send message.', 'received');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('Error sending message.', 'received');
        }
    });

    const initializeChat = () => {
        const initialConversationsElement = document.getElementById('initial-conversations');

        if (!initialConversationsElement) {
            console.error('Initial conversations element not found.');
            return;
        }

        const initialConversationsText = initialConversationsElement.textContent.trim();

        try {
            // Decode HTML entities and parse JSON
            const decodedText = decodeHtmlEntities(initialConversationsText);
            const initialConversations = JSON.parse(decodedText);

            // Add messages to the chat
            initialConversations.forEach(convo => {
                if (convo.message || convo.response) {
                    addMessageForInit(convo);
                } else {
                    console.error('Invalid conversation item:', convo);
                }
            });
        } catch (error) {
            console.error('Error parsing initial conversations JSON:', error);
        }
    };


    saveButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/save_diary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                window.location.href = '/histories';
            } else {
                alert('Failed to save diary');
            }
        } catch (error) {
            console.error('Error saving diary:', error);
            alert('An error occurred while saving the diary');
        }
    });

    initializeChat();
});

function addMessage(text, type) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.innerHTML = `<div class="content">${text.replace(/\n/g, '<br>')}</div>`;
    messagesContainer.appendChild(messageElement);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

function addMessageForInit(conversation) {
    const messagesContainer = document.getElementById('messages');
    const messageElementQuestion = document.createElement('div');
    const messageElementResponse = document.createElement('div');

    const question = conversation.message
    const response = conversation.response

    if (question) {
        messageElementQuestion.classList.add('message', 'sent');
        messageElementQuestion.innerHTML = `<div class="content">${question.replace(/\n/g, '<br>')}</div>`;
    }

    if (response) {
        messageElementResponse.classList.add('message', 'received');
        messageElementResponse.innerHTML = `<div class="content">${response.replace(/\n/g, '<br>')}</div>`;
    }

    messagesContainer.appendChild(messageElementQuestion);
    messagesContainer.appendChild(messageElementResponse);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function decodeHtmlEntities(text) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}