import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import ChatService from '../services/ChatService';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your Enterprise Compliance and AFS Payment Gateway Assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [useStreaming, setUseStreaming] = useState(true);
  
  const messagesEndRef = useRef(null);
  const chatService = useRef(new ChatService()).current;

  const checkConnection = async () => {
    const isConnected = await chatService.validateConnection();
    const isValidKey = await chatService.validateAPIKey();
    
    if (isConnected && isValidKey) {
      setConnectionStatus('connected');
    } else if (isConnected && !isValidKey) {
      setConnectionStatus('invalid-key');
    } else {
      setConnectionStatus('disconnected');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    checkConnection();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (useStreaming) {
        await handleStreamingResponse(userMessage.content);
      } else {
        await handleSimpleResponse(userMessage.content);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingResponse = async (message) => {
    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, botMessage]);

    try {
      const stream = await chatService.sendMessage(message, true);
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessage.id 
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessage.id 
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

      chatService.addToHistory('user', message);
      const finalMessage = messages.find(msg => msg.id === botMessage.id);
      if (finalMessage) {
        chatService.addToHistory('assistant', finalMessage.content);
      }

      reader.releaseLock();
    } catch (error) {
      console.error('Streaming error:', error);
    }
  };

  const handleSimpleResponse = async (message) => {
    const data = await chatService.sendMessage(message, false);
    
    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: data.response,
      timestamp: new Date(),
      usage: data.usage
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'invalid-key': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected to OpenAI';
      case 'invalid-key': return 'Invalid API Key';
      case 'disconnected': return 'Connection Failed';
      default: return 'Checking connection...';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'invalid-key': return <AlertCircle className="w-4 h-4" />;
      case 'disconnected': return <AlertCircle className="w-4 h-4" />;
      default: return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-between items-center p-4 border-b bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">
          Enterprise Assistant
        </h2>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Stream responses</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.isError
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.isStreaming && (
                <div className="flex items-center mt-2">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  <span className="text-xs opacity-70">Typing...</span>
                </div>
              )}
              {message.usage && (
                <div className="text-xs opacity-70 mt-1">
                  Tokens: {message.usage.total_tokens}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about compliance, AFS payment gateway, or any enterprise question..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows="2"
            disabled={isLoading || connectionStatus !== 'connected'}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim() || connectionStatus !== 'connected'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;