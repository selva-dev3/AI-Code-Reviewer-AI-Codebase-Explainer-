'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStream } from '@/hooks/useStream';
import { 
  Database, Plus, Folder, File, Send, Sparkles, BookOpen, 
  HelpCircle, Code2, ArrowLeft, ArrowUpRight, Search, Play, FileCode, Check 
} from 'lucide-react';
import DbIngestion3d from '@/components/ui/DbIngestion3d';

interface Project {
  id: string;
  name: string;
  files: { name: string; content: string }[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ExplainPage() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'demo-proj-1',
      name: 'Procurement Client Portal',
      files: [
        { name: 'app/globals.css', content: '/* Custom CSS variables */\n:root {\n  --bg-primary: #0a0e1a;\n}' },
        { name: 'core/middleware.py', content: 'from django.utils.deprecation import MiddlewareMixin\n# Custom Django user session validation middleware' }
      ]
    }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Uploader States
  const [newProjectName, setNewProjectName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Chat States
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({
    'demo-proj-1': [
      { role: 'assistant', content: 'Hello! I have loaded the Procurement Client Portal repository. Ask me anything about the codebase routing, styling, or database schemas.' }
    ]
  });
  
  // Code Viewer Drawer States
  const [selectedSnippet, setSelectedSnippet] = useState<{ filePath: string; startLine: number; content: string } | null>(null);
  const [isSnippetDrawerOpen, setIsSnippetDrawerOpen] = useState(false);
  
  const { isLoading, askQuestion } = useStream();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeProjectId]);

  const handleCreateProject = () => {
    setIsCreating(true);
    setNewProjectName('');
    setUploadedFiles([]);
  };

  const loadSampleRepo = () => {
    setNewProjectName('Django Codebase Review Project');
    setUploadedFiles([
      {
        name: 'middleware.py',
        content: `from django.shortcuts import redirect\n\nclass LoginRequiredMiddleware:\n    def __init__(self, get_response):\n        self.get_response = get_response\n\n    def __call__(self, request):\n        if not request.user.is_authenticated and not request.path.startswith('/api/auth/'):\n            return redirect('/login')\n        return self.get_response(request)`
      },
      {
        name: 'core/settings.py',
        content: `import os\nfrom pathlib import Path\n\nBASE_DIR = Path(__file__).resolve().parent.parent\nINSTALLED_APPS = [\n    'django.contrib.admin',\n    'django.contrib.auth',\n    'rest_framework',\n    'reviewer',\n]\nDATABASES = {\n    'default': {\n        'ENGINE': 'django.db.backends.postgresql',\n        'NAME': 'code_reviewer_db',\n    }\n}`
      },
      {
        name: 'reviewer/models.py',
        content: `from django.db import models\nfrom django.contrib.auth.models import User\n\nclass Review(models.Model):\n    user = models.ForeignKey(User, on_delete=models.CASCADE)\n    created_at = models.DateTimeField(auto_now_add=True)\n    status = models.CharField(max_length=50, default='pending')\n    result = models.JSONField(null=True, blank=True)`
      }
    ]);
  };

  const handleIndexProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || uploadedFiles.length === 0) return;
    
    setIsIndexing(true);

    try {
      const res = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: newProjectName,
          files: uploadedFiles,
        }),
      });

      if (!res.ok) throw new Error('Indexing failed');
      const data = await res.json();
      
      const newProj: Project = {
        id: data.projectId,
        name: newProjectName,
        files: uploadedFiles
      };

      // Hold loader briefly to show the 3D ingestion completes nicely!
      await new Promise(r => setTimeout(r, 1500));

      setProjects(prev => [...prev, newProj]);
      setChatMessages(prev => ({
        ...prev,
        [data.projectId]: [
          { role: 'assistant', content: `Successfully indexed ${uploadedFiles.length} files in codebase "${newProjectName}". Ask me anything about this repository!` }
        ]
      }));
      
      setActiveProjectId(data.projectId);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
      alert('Error indexing repository files.');
    } finally {
      setIsIndexing(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !activeProjectId || isLoading) return;

    const userQ = question;
    setQuestion('');

    setChatMessages(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), { role: 'user', content: userQ }]
    }));

    setChatMessages(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), { role: 'assistant', content: 'Thinking...' }]
    }));

    await askQuestion(userQ, activeProjectId, (accumulatedAnswer) => {
      setChatMessages(prev => {
        const thread = [...(prev[activeProjectId] || [])];
        if (thread.length > 0) {
          thread[thread.length - 1] = { role: 'assistant', content: accumulatedAnswer };
        }
        return {
          ...prev,
          [activeProjectId]: thread
        };
      });
    });
  };

  const renderMessageContent = (content: string) => {
    const regex = /\[([^\]]+):L(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      const filePath = match[1];
      const lineNum = parseInt(match[2], 10);

      parts.push(
        <button
          key={matchIndex}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-[10px] text-cyan-400 hover:text-white font-mono transition-colors focus:outline-none"
          style={{
            background: 'rgba(10, 15, 30, 0.8)',
            border: '1px solid rgba(6, 182, 212, 0.12)',
          }}
          onClick={() => handleOpenSnippet(filePath, lineNum)}
        >
          <FileCode size={10} />
          <span>{filePath.split('/').pop()}:L{lineNum}</span>
        </button>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <span className="whitespace-pre-wrap">{parts.length > 0 ? parts : content}</span>;
  };

  const handleOpenSnippet = (filePath: string, lineNum: number) => {
    if (!activeProject) return;
    const file = activeProject.files.find(f => f.name === filePath);
    if (file) {
      setSelectedSnippet({
        filePath,
        startLine: lineNum,
        content: file.content
      });
      setIsSnippetDrawerOpen(true);
    } else {
      setSelectedSnippet({
        filePath,
        startLine: lineNum,
        content: `// Source code snippet for ${filePath}\n// Could not load the full file locally.`
      });
      setIsSnippetDrawerOpen(true);
    }
  };

  return (
    <div className="space-y-6 h-full relative">
      {/* Code Drawer Overlay */}
      {isSnippetDrawerOpen && selectedSnippet && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40" onClick={() => setIsSnippetDrawerOpen(false)} />
          <div className="fixed top-0 right-0 w-full max-w-md h-full z-50 flex flex-col shadow-2xl animate-slide-in"
            style={{
              background: 'rgba(10, 15, 30, 0.95)',
              borderLeft: '1px solid rgba(6, 182, 212, 0.1)',
            }}
          >
            <div className="p-4 flex justify-between items-center"
              style={{
                borderBottom: '1px solid rgba(6, 182, 212, 0.08)',
                background: 'rgba(3, 7, 18, 0.3)',
              }}
            >
              <div>
                <h4 className="text-sm font-bold text-slate-100">Snippet Code View</h4>
                <span className="text-[10px] text-slate-500 font-mono">{selectedSnippet.filePath}</span>
              </div>
              <button 
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 transition-colors hover:text-cyan-400"
                style={{
                  background: 'rgba(3, 7, 18, 0.8)',
                  border: '1px solid rgba(6, 182, 212, 0.08)',
                }}
                onClick={() => setIsSnippetDrawerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-slate-350"
              style={{ background: 'rgba(3, 7, 18, 1)' }}
            >
              {selectedSnippet.content.split('\n').map((line, idx) => {
                const currentLine = idx + 1;
                const isHighlight = currentLine >= selectedSnippet.startLine && currentLine < selectedSnippet.startLine + 5;
                return (
                  <div 
                    key={idx}
                    className={`flex items-start ${isHighlight ? 'bg-cyan-500/10 border-l-2 border-cyan-500 pl-2' : 'pl-2.5'}`}
                  >
                    <span className="w-8 text-right pr-3 select-none text-[10px] text-slate-600">{currentLine}</span>
                    <span className="whitespace-pre text-slate-300">{line || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Main Workspace */}
      {!activeProjectId && !isCreating ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-200">Repository Contexts</h3>
            <button className="flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg transition-all shimmer-btn shadow-[0_4px_12px_rgba(6,182,212,0.2)]" onClick={handleCreateProject}>
              <Plus size={14} />
              <span>New Repository</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(proj => (
              <div 
                key={proj.id} 
                className="rounded-xl backdrop-blur-md p-6 transition-all cursor-pointer group neon-border"
                style={{
                  background: 'rgba(10, 15, 30, 0.5)',
                }}
                onClick={() => setActiveProjectId(proj.id)}
              >
                <div className="flex gap-3 items-center mb-6">
                  <div className="p-2 rounded-lg text-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
                    style={{ background: 'rgba(6, 182, 212, 0.08)' }}
                  >
                    <Folder size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{proj.name}</h4>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  <span>{proj.files.length} indexed files</span>
                  <span className="text-cyan-400 flex items-center gap-0.5">RAG <ArrowUpRight size={10} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isCreating ? (
        <form onSubmit={handleIndexProject} className="rounded-xl backdrop-blur-md p-8 max-w-xl mx-auto space-y-6"
          style={{
            background: 'rgba(10, 15, 30, 0.5)',
            border: '1px solid rgba(6, 182, 212, 0.08)',
          }}
        >
          <div className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors" onClick={() => setIsCreating(false)}>
            <ArrowLeft size={14} />
            <span className="text-xs font-bold">Return to projects</span>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-slate-100">Index Repository</h3>
            <p className="text-slate-400 text-xs mt-1">
              Provide project metadata and load source modules for pgvector injection.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Repository Name</label>
            <input
              type="text"
              placeholder="e.g. Auth Gateway microservice"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full rounded-lg p-3 text-xs text-slate-200 outline-none transition-all"
              style={{
                background: 'rgba(3, 7, 18, 0.8)',
                border: '1px solid rgba(6, 182, 212, 0.08)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.08)'}
              required
              disabled={isIndexing}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indexed File Modules ({uploadedFiles.length})</label>
              <button 
                type="button" 
                className="px-3 py-1 rounded text-[10px] text-cyan-400 font-bold transition-colors"
                style={{
                  background: 'rgba(3, 7, 18, 0.8)',
                  border: '1px solid rgba(6, 182, 212, 0.1)',
                }}
                onClick={loadSampleRepo}
                disabled={isIndexing}
              >
                Load Sample Templates
              </button>
            </div>

            {isIndexing ? (
              <DbIngestion3d status="indexing" filesCount={uploadedFiles.length} />
            ) : uploadedFiles.length === 0 ? (
              <div 
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: 'rgba(6, 182, 212, 0.12)',
                  background: 'rgba(3, 7, 18, 0.2)',
                }}
                onClick={loadSampleRepo}
              >
                <Plus size={24} className="text-slate-600 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-400">No files staged</span>
                <p className="text-[10px] text-slate-500 mt-1">Staging creates ~400 token semantic overlaps.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-[160px] overflow-y-auto p-3 rounded-lg space-y-2 font-mono text-[10px] text-slate-400"
                  style={{
                    border: '1px solid rgba(6, 182, 212, 0.06)',
                    background: 'rgba(3, 7, 18, 0.8)',
                  }}
                >
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <File size={12} className="text-cyan-400" />
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
                <DbIngestion3d status="idle" filesCount={uploadedFiles.length} />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full py-3 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shimmer-btn shadow-[0_4px_15px_rgba(6,182,212,0.2)]"
            disabled={isIndexing || !newProjectName.trim() || uploadedFiles.length === 0}
          >
            {isIndexing ? 'Building RAG Embeddings...' : 'Staged Repository Indexing'}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* File Index sidebar */}
          <div className="rounded-xl backdrop-blur-md p-5 flex flex-col space-y-4 max-h-[500px] overflow-y-auto"
            style={{
              background: 'rgba(10, 15, 30, 0.5)',
              border: '1px solid rgba(6, 182, 212, 0.08)',
            }}
          >
            <div className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors" onClick={() => setActiveProjectId(null)}>
              <ArrowLeft size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Leave Context</span>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid rgba(6, 182, 212, 0.06)' }}>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Database size={14} className="text-cyan-400" />
                <span>Context Indexes</span>
              </h4>

              <div className="space-y-1.5">
                {activeProject?.files.map((file, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-mono"
                    style={{
                      background: 'rgba(3, 7, 18, 0.4)',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                    onClick={() => handleOpenSnippet(file.name, 1)}
                  >
                    <File size={12} className="text-slate-500 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3 rounded-xl backdrop-blur-md flex flex-col h-[550px] relative overflow-hidden"
            style={{
              background: 'rgba(10, 15, 30, 0.5)',
              border: '1px solid rgba(6, 182, 212, 0.08)',
            }}
          >
            {/* Header */}
            <div className="h-14 flex items-center px-6 justify-between"
              style={{
                borderBottom: '1px solid rgba(6, 182, 212, 0.06)',
                background: 'rgba(3, 7, 18, 0.2)',
              }}
            >
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{activeProject?.name}</h4>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">Active context query</div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(activeProjectId ? (chatMessages[activeProjectId] || []) : []).map((msg: Message, idx: number) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'text-white font-medium rounded-tr-none shimmer-btn shadow-[0_4px_12px_rgba(6,182,212,0.2)]' 
                        : 'text-slate-300 rounded-tl-none'
                    }`}
                    style={msg.role === 'assistant' ? {
                      background: 'rgba(3, 7, 18, 0.7)',
                      border: '1px solid rgba(6, 182, 212, 0.06)',
                    } : undefined}
                  >
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              ))}
              {isLoading && activeProjectId && (chatMessages[activeProjectId]?.slice(-1)[0]?.content === 'Thinking...') && (
                <div className="flex items-center gap-1.5 p-3 rounded-lg w-fit"
                  style={{
                    background: 'rgba(3, 7, 18, 0.4)',
                    border: '1px solid rgba(6, 182, 212, 0.06)',
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleAskQuestion} className="p-4 flex gap-3"
              style={{
                borderTop: '1px solid rgba(6, 182, 212, 0.06)',
                background: 'rgba(3, 7, 18, 0.2)',
              }}
            >
              <input
                type="text"
                placeholder="Ask about routing architecture, DB schemas..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 rounded-lg px-4 py-3 text-xs text-slate-200 outline-none transition-colors"
                style={{
                  background: 'rgba(3, 7, 18, 0.8)',
                  border: '1px solid rgba(6, 182, 212, 0.08)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.08)'}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="px-4 text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-40 shimmer-btn shadow-[0_4px_12px_rgba(6,182,212,0.2)]"
                disabled={isLoading || !question.trim()}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
