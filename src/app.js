import React from 'react';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto max-w-4xl h-screen">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}

export default App;
