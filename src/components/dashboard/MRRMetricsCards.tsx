'use client';

import { HelpCircle } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { useState, useRef, useEffect } from 'react';

export function MRRMetricsCards() {
  const { getTotalMRR, customers } = usePipeline();
  const { current: currentMRR, potential: upcomingMRR } = getTotalMRR();
  const [showExitValue, setShowExitValue] = useState(false);
  
  // Timer ref for long press
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Handle mouse down on potential MRR card
  const handlePotentialMRRMouseDown = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Set a new timer - only 1 second now
    timerRef.current = setTimeout(() => {
      setShowExitValue(true);
    }, 1000); // 1 second
  };
  
  // Handle mouse up on potential MRR card
  const handlePotentialMRRMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Hide the exit value when mouse is released
    setShowExitValue(false);
  };
  
  // Handle mouse leave on potential MRR card
  const handlePotentialMRRMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Hide the exit value when mouse leaves
    setShowExitValue(false);
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
          className="cursor-pointer" 
          onMouseDown={handlePotentialMRRMouseDown}
          onMouseUp={handlePotentialMRRMouseUp}
          onMouseLeave={handlePotentialMRRMouseLeave}
          onTouchStart={handlePotentialMRRMouseDown}
          onTouchEnd={handlePotentialMRRMouseUp}
          onTouchCancel={handlePotentialMRRMouseLeave}
        >
          <p className="text-2xl font-bold">{formatCurrency(potentialArtistMRR)}</p>
          <p className="text-xs text-gray-500 mt-1">Hold for 1s to see exit value</p>
        </div>
        
        {/* Exit Value Popup - Simplified version */}
        {showExitValue && (
          <div 
            className="absolute top-0 left-0 right-0 bottom-0 bg-white p-4 rounded-lg shadow-lg z-10 flex flex-col justify-center items-center animate-fade-in"
          >
            <h4 className="text-lg font-bold mb-2">Exit Value</h4>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(potentialArtistMRR * 60)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Based on 5 years of MRR
            </p>
            <p className="text-xs text-gray-400 mt-4">Release to dismiss</p>
          </div>
        )}
      </div>
    </div>
  );
} 