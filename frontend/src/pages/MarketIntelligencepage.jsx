import React from 'react';
import MarketIntelligenceChat from '../components/MarketIntelligenceChat';

export default function MarketIntelligencepage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Market Intelligence</h1>
        <p className="mt-1 text-sm text-gray-600">
          AI-powered insights from curated market research and industry reports
        </p>
      </div>

      {/* Chat Interface - Takes remaining space */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
          <MarketIntelligenceChat />
        </div>
      </div>
    </div>
  );
}
