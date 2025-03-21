'use client';

import { HelpCircle } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { useState, useRef, useEffect } from 'react';

export function MRRMetricsCards() {
  const { getTotalMRR, customers } = usePipeline();
  const { current: currentMRR, potential: upcomingMRR } = getTotalMRR();
  const [showExitValue, setShowExitValue] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  
  // Timer ref for long press
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const holdDuration = 1000; // 1 second hold time
  
  // Clear timers and animations on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Animation function to update progress
  const updateProgress = () => {
    if (!startTimeRef.current || !isHolding) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / holdDuration, 1);
    setHoldProgress(progress);
    
    if (progress < 1) {
      // Continue animation
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      // Show exit value when progress reaches 100%
      setShowExitValue(true);
    }
  };
  
  // Handle mouse down on potential MRR card
  const handlePotentialMRRMouseDown = () => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Start tracking hold
    setIsHolding(true);
    startTimeRef.current = Date.now();
    
    // Start progress animation
    animationRef.current = requestAnimationFrame(updateProgress);
    
    // Backup timer in case animation fails
    timerRef.current = setTimeout(() => {
      setShowExitValue(true);
    }, holdDuration);
    
    console.log('Hold started');
  };
  
  // Handle mouse up on potential MRR card
  const handlePotentialMRRMouseUp = () => {
    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Reset state
    setIsHolding(false);
    setHoldProgress(0);
    startTimeRef.current = null;
    
    // Hide the exit value when mouse is released
    setShowExitValue(false);
    
    console.log('Hold ended');
  };
  
  // Handle mouse leave on potential MRR card
  const handlePotentialMRRMouseLeave = () => {
    // Same behavior as mouse up
    handlePotentialMRRMouseUp();
  };
  
  // Calculate Potential MRR
  const calculatePotentialMRR = () => {
    // Get all customers regardless of stage
    const allCustomers = customers;
    
    // Calculate total potential artists across all customers
    const totalPotentialArtists = allCustomers.reduce(
      (sum, customer) => sum + (customer.potential_artists || 0), 
      0
    );
    
    // Calculate potential MRR if all potential artists were paying $99
    const artistPrice = 99; // Price per artist
    
    // Monthly value if all potential artists were paying $99
    return totalPotentialArtists * artistPrice;
  };
  
  const potentialArtistMRR = calculatePotentialMRR();
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Toggle exit value
  const toggleExitValue = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering other handlers
    setShowExitValue(!showExitValue);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {/* Current MRR Card */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-sm font-medium text-gray-700">Current MRR</h3>
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
              Monthly Recurring Revenue currently being generated from paying customers.
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(currentMRR)}</p>
      </div>
      
      {/* Upcoming MRR Card */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-sm font-medium text-gray-700">Upcoming MRR</h3>
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
              Current MRR plus upcoming MRR if free trial customers convert to paying customers.
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(upcomingMRR)}</p>
      </div>
      
      {/* Potential MRR Card */}
      <div className="bg-white p-4 rounded-lg shadow border relative">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-sm font-medium text-gray-700">Potential MRR</h3>
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
              Monthly revenue projection if all potential artists across all customers were paying $99 per artist.
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          </div>
        </div>
        <div 
          className="cursor-pointer relative" 
          onMouseDown={handlePotentialMRRMouseDown}
          onMouseUp={handlePotentialMRRMouseUp}
          onMouseLeave={handlePotentialMRRMouseLeave}
          onTouchStart={handlePotentialMRRMouseDown}
          onTouchEnd={handlePotentialMRRMouseUp}
          onTouchCancel={handlePotentialMRRMouseLeave}
        >
          <div className="flex justify-between items-center">
            <p className="text-2xl font-bold">{formatCurrency(potentialArtistMRR)}</p>
            <button 
              onClick={toggleExitValue}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
              aria-label="Toggle exit value"
            >
              {showExitValue ? 'Hide Value' : 'Show Value'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Hold for 1s to see exit value</p>
          
          {/* Visual progress indicator */}
          {isHolding && holdProgress > 0 && holdProgress < 1 && (
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all" style={{ width: `${holdProgress * 100}%` }}></div>
          )}
        </div>
        
        {/* Exit Value Popup - Simplified version */}
        {showExitValue && (
          <div 
            className="absolute top-0 left-0 right-0 bottom-0 bg-white p-4 rounded-lg shadow-lg z-10 flex flex-col justify-center items-center animate-fade-in"
            onClick={() => setShowExitValue(false)}
          >
            <h4 className="text-lg font-bold mb-2">Exit Value</h4>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(potentialArtistMRR * 60)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Based on 5 years of MRR
            </p>
            <p className="text-xs text-gray-400 mt-4">Tap anywhere to dismiss</p>
          </div>
        )}
      </div>
    </div>
  );
} 