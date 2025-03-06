'use client';

import React, { useState } from 'react';
import { Todo } from '@/lib/customerService';
import { Trash2, Plus, Check, Square } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
}

export function TodoList({ todos = [], onChange }: TodoListProps) {
  const [newTodoText, setNewTodoText] = useState('');

  // Generate a unique ID for a new todo
  const generateId = () => {
    return Date.now().toString();
  };

  // Add a new todo
  const addTodo = () => {
    if (newTodoText.trim() === '') return;
    
    const newTodo: Todo = {
      id: generateId(),
      text: newTodoText.trim(),
      completed: false,
      created_at: new Date().toISOString()
    };
    
    onChange([...todos, newTodo]);
    setNewTodoText('');
  };

  // Toggle todo completion status
  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    onChange(updatedTodos);
  };

  // Delete a todo
  const deleteTodo = (id: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    onChange(updatedTodos);
  };

  // Handle key press in the input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new task..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTodo}
          className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Add task"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {todos.map(todo => (
          <li 
            key={todo.id} 
            className="flex items-center justify-between p-2 border border-gray-200 rounded-md group hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2 flex-1">
              <button 
                onClick={() => toggleTodo(todo.id)}
                className="focus:outline-none"
                aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
              >
                {todo.completed ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                {todo.text}
              </span>
            </div>
            <button 
              onClick={() => deleteTodo(todo.id)}
              className="text-gray-400 hover:text-red-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
        {todos.length === 0 && (
          <li className="text-gray-400 text-center py-2">No tasks yet</li>
        )}
      </ul>
    </div>
  );
} 