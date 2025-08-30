import React, { useState, useRef, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

export default function MarketIntelligenceChat() {
  const [messages, setMessages] = useState([
    { 
      type: 'ai', 
      content: 'Hello! I can answer questions about market intelligence based on curated industry reports and documents. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKnowledgeBase, setHasKnowledgeBase] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if knowledge base exists
  useEffect(() => {
    checkKnowledgeBase();
  }, []);

  const checkKnowledgeBase = async () => {
    try {
      const response = await fetch(`${API_BASE}/market-intelligence/health`);
      setHasKnowledgeBase(response.ok);
    } catch (error) {
      console.error('Error checking knowledge base:', error);
      setHasKnowledgeBase(false);
    }
  };

  const ingestDocuments = async () => {
    setIsIngesting(true);
    try {
      const response = await fetch(`${API_BASE}/market-intelligence/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        setHasKnowledgeBase(true);
        setMessages(prev => [...prev, {
          type: 'ai',
          content: `✅ Knowledge base updated successfully! Processed ${result.documentsProcessed} documents with ${result.chunksCreated} chunks. You can now ask me questions about the uploaded content.`,
          timestamp: new Date()
        }]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          type: 'ai',
          content: `❌ Failed to ingest documents: ${error.error}. Please make sure PDF documents are placed in the backend/data/documents/ folder.`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `❌ Error ingesting documents: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsIngesting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { 
      type: 'user', 
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    const currentInput = input;
    setInput('');

    try {
      const response = await fetch(`${API_BASE}/market-intelligence/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentInput })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Sorry, I encountered an error: ${error.message}. ${!hasKnowledgeBase ? 'Please make sure documents are uploaded to the knowledge base.' : ''}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      { 
        type: 'ai', 
        content: 'Chat cleared. How can I help you with market intelligence today?',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Controls */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Market Intelligence Assistant</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ask questions about market trends, competitor analysis, and industry insights
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Knowledge Base Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasKnowledgeBase ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {hasKnowledgeBase ? 'Knowledge Base Ready' : 'No Knowledge Base'}
              </span>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={ingestDocuments}
                disabled={isIngesting}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isIngesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Ingesting...
                  </>
                ) : (
                  <>📚 Update Knowledge Base</>
                )}
              </button>
              
              <button
                onClick={clearChat}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                🗑️ Clear Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                
                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">📄 Sources:</p>
                    <div className="space-y-2">
                      {message.sources.map((source, idx) => (
                        <div key={idx} className="text-xs bg-blue-50 border border-blue-200 rounded-md p-2">
                          <div className="font-medium text-blue-800">{source.source}</div>
                          <div className="text-gray-600 mt-1 italic">{source.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <div className={`text-xs mt-3 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
        {!hasKnowledgeBase && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <div className="text-amber-600 mr-2">⚠️</div>
              <div className="text-sm text-amber-800">
                <strong>No knowledge base found.</strong> 
                <br />Add PDF documents to <code>backend/data/documents/</code> and click "Update Knowledge Base" to enable AI responses.
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about market trends, competitor analysis, industry insights..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
              rows={2}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !hasKnowledgeBase}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </div>
            ) : (
              '📤 Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
