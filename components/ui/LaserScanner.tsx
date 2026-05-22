'use client';

import React from 'react';

export default function LaserScanner() {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-b-xl">
      {/* Pulse background overlay */}
      <div className="absolute inset-0 bg-indigo-500/5 animate-pulse-glow" />
      
      {/* Sweeping Laser Line */}
      <div 
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-laser"
        style={{
          boxShadow: '0 0 16px #6366f1, 0 0 4px #8b5cf6'
        }}
      />

      {/* Grid overlay to look techy */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
    </div>
  );
}
