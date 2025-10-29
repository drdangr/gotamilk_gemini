import React, { useState } from 'react';
import { useShoppingList } from '../hooks/useShoppingList';
import { Mic, Send } from 'lucide-react';

const VoiceCommandInput: React.FC = () => {
  const [command, setCommand] = useState('');
  const { processTextCommand, loading } = useShoppingList();

  // In a real app, this would use Speech-to-Text. Here we simulate by typing.
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      await processTextCommand(command.trim());
      setCommand('');
    }
  };

  return (
    <form onSubmit={handleCommandSubmit} className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Mic className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Say: 'Add milk and bread' or 'Remove tomatoes'"
        className="w-full pl-10 pr-12 py-2 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        disabled={loading}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
         <button
            type="submit"
            className="p-1.5 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={loading || !command.trim()}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
};

export default VoiceCommandInput;