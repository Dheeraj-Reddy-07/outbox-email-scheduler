'use client';

import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Italic, Underline, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'span', 'b', 'i'];
const ALLOWED_ATTR = ['style', 'class'];

export default function RichTextEditor({ 
  value, 
  onChange, 
  maxLength = 500000,
  placeholder = 'Write your email content here...' 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    });
  };

  const execCommand = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Focus the editor first
    editor.focus();

    if (command === 'removeFormat') {
      try {
        document.execCommand('removeFormat', false);
      } catch (e) {
        console.error('removeFormat failed:', e);
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString();
          if (selectedText) {
            const textNode = document.createTextNode(selectedText);
            range.deleteContents();
            range.insertNode(textNode);
          }
        }
      }
      const content = editor.innerHTML;
      onChange(sanitizeHtml(content));
      return;
    }

    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.error('execCommand failed:', e);
      if (command === 'bold') {
        applyFormatting('strong');
      } else if (command === 'italic') {
        applyFormatting('em');
      } else if (command === 'underline') {
        applyFormatting('u');
      }
    }

    const content = editor.innerHTML;
    onChange(sanitizeHtml(content));
  };

  const applyFormatting = (tag: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      try {
        document.execCommand(tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : 'underline', false);
      } catch (e) {
        console.error('execCommand failed:', e);
      }
      return;
    }

    try {
      const command = tag === 'strong' ? 'bold' : tag === 'em' ? 'italic' : 'underline';
      document.execCommand(command, false, undefined);
    } catch (e) {
      console.error('execCommand failed:', e);
      const element = document.createElement(tag);
      element.textContent = selectedText;
      
      range.deleteContents();
      range.insertNode(element);
      
      range.setStartAfter(element);
      range.setEndAfter(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleContentChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const content = editor.innerHTML;
    const sanitized = sanitizeHtml(content);
    onChange(sanitized);
  };

  const getCharacterCount = () => {
    const editor = editorRef.current;
    if (!editor) return 0;
    
    return editor.innerText.length;
  };

  // Initialize editor content
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== editor.innerHTML) {
      editor.innerHTML = value;
    }
  }, [value]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+B for bold
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      execCommand('bold');
    }
    // Ctrl+I for italic
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      execCommand('italic');
    }
    // Ctrl+U for underline
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      execCommand('underline');
    }
  };

  return (
    <div className="border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Underline"
        >
          <Underline className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Clear Formatting"
        >
          <Type className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        className="p-3 min-h-[200px] focus:outline-none text-sm text-gray-900 dark:text-white leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-gray-500 empty:before:pointer-events-none"
        style={{ wordWrap: 'break-word' }}
        data-placeholder={placeholder}
      />

      {/* Character count */}
      <div className="flex justify-between items-center px-3 py-2 border-t border-gray-300 dark:border-slate-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Use formatting toolbar above
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getCharacterCount()}/{maxLength}
        </span>
      </div>
    </div>
  );
}