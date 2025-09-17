// ChatService.js - Service to handle OpenAI API calls
class ChatService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.conversationHistory = [];
  }

  async sendMessage(message, useStreaming = true) {
    try {
      if (useStreaming) {
        return await this.sendMessageStreaming(message);
      } else {
        return await this.sendMessageSimple(message);
      }
    } catch (error) {
      console.error('Chat service error:', error);
      throw error;
    }
  }

  async sendMessageStreaming(message) {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory: this.conversationHistory
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.body;
  }

  async sendMessageSimple(message) {
    const response = await fetch(`${this.baseURL}/chat/simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory: this.conversationHistory
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Update conversation history
    this.addToHistory('user', message);
    this.addToHistory('assistant', data.response);
    
    return data;
  }

  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });
    
    // Keep only last 10 exchanges (20 messages)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  async validateConnection() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async validateAPIKey() {
    try {
      const response = await fetch(`${this.baseURL}/validate-key`);
      const data = await response.json();
      return data.valid;
    } catch (error) {
      return false;
    }
  }
}

export default ChatService;
