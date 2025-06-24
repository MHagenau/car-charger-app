"use client"; // This directive marks the component as a Client Component, allowing React hooks

import React, { useState, useMemo, useRef } from 'react'; // Import useRef for file input
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Download, Upload } from 'lucide-react'; // Import new icons

// Define TypeScript interfaces for charger and new charger data
interface Charger {
  id: number;
  name: string;
  investment: number;
  subscription: number;
  marginalCost: number;
  pricingType: 'variable' | 'fixed';
  fixedPrice: number | null;
}

interface NewChargerInput {
  name: string;
  investment: string; // Keep as string for input fields to allow empty string
  subscription: string;
  marginalCost: string;
  pricingType: 'variable' | 'fixed';
  fixedPrice: string; // Keep as string for input fields
}

// Define interface for chart data points
interface ChartDataPoint {
  month: number;
  [key: string]: number; // Allows dynamic keys for charger names
}

const CarChargerCalculator: React.FC = () => {
  // State for managing existing chargers, typed with the Charger interface
  const [chargers, setChargers] = useState<Charger[]>([
    {
      id: 1,
      name: 'Basic Wall Charger',
      investment: 3000,
      subscription: 0,
      marginalCost: 0.2,
      pricingType: 'variable',
      fixedPrice: null
    }
  ]);

  // State for global electricity price, typed as number
  const [electricityPrice, setElectricityPrice] = useState<number>(2.5);
  // State for monthly kWh usage, typed as number
  const [monthlyKwh, setMonthlyKwh] = useState<number>(300);
  
  // State for managing the input fields for a new charger, typed with NewChargerInput
  const [newCharger, setNewCharger] = useState<NewChargerInput>({
    name: '',
    investment: '',
    subscription: '',
    marginalCost: '',
    pricingType: 'variable',
    fixedPrice: ''
  });

  // Ref for the file input to programmatically click it
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to add a new charger
  const addCharger = (): void => {
    // Validate required fields before adding
    if (newCharger.name && newCharger.investment !== '' && newCharger.subscription !== '' && newCharger.marginalCost !== '') {
      // If pricing type is fixed, ensure fixedPrice is also provided
      if (newCharger.pricingType === 'fixed' && newCharger.fixedPrice === '') {
        console.warn('Fixed price is required for fixed pricing type.');
        return;
      }
      
      // Add the new charger to the state array, parsing string inputs to numbers
      setChargers([...chargers, {
        id: Date.now(), // Unique ID for the new charger
        name: newCharger.name,
        investment: parseFloat(newCharger.investment),
        subscription: parseFloat(newCharger.subscription),
        marginalCost: parseFloat(newCharger.marginalCost),
        pricingType: newCharger.pricingType,
        // Conditionally set fixedPrice based on pricingType
        fixedPrice: newCharger.pricingType === 'fixed' ? parseFloat(newCharger.fixedPrice) : null
      }]);
      
      // Reset the new charger input fields
      setNewCharger({ name: '', investment: '', subscription: '', marginalCost: '', pricingType: 'variable', fixedPrice: '' });
    } else {
      console.warn('Please fill in all required fields for the new charger.');
    }
  };

  // Function to remove a charger by its ID
  const removeCharger = (id: number): void => {
    setChargers(chargers.filter(c => c.id !== id));
  };

  // Function to export current charging solutions to a JSON file
  const exportChargers = (): void => {
    const dataStr = JSON.stringify(chargers, null, 2); // Convert chargers array to pretty-printed JSON string
    const blob = new Blob([dataStr], { type: 'application/json' }); // Create a Blob from the JSON string
    const url = URL.createObjectURL(blob); // Create a URL for the Blob
    const a = document.createElement('a'); // Create a temporary anchor element
    a.href = url;
    a.download = 'charging_solutions.json'; // Set the download file name
    document.body.appendChild(a); // Append anchor to body (needed for Firefox)
    a.click(); // Programmatically click the anchor to trigger download
    document.body.removeChild(a); // Clean up the temporary anchor
    URL.revokeObjectURL(url); // Revoke the object URL to free up memory
  };

  // Function to handle file import for charging solutions
  const importChargers = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]; // Get the selected file
    if (!file) return; // If no file selected, do nothing

    const reader = new FileReader(); // Create a new FileReader
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string; // Get the file content as a string
        const importedData: Charger[] = JSON.parse(result); // Parse the JSON string
        
        // Basic validation for imported data structure
        if (Array.isArray(importedData) && importedData.every(item => 
          typeof item.id === 'number' &&
          typeof item.name === 'string' &&
          typeof item.investment === 'number' &&
          typeof item.subscription === 'number' &&
          typeof item.marginalCost === 'number' &&
          (item.pricingType === 'variable' || item.pricingType === 'fixed') &&
          (item.fixedPrice === null || typeof item.fixedPrice === 'number')
        )) {
          // Assign new IDs to imported chargers to avoid conflicts if needed, or use existing ones
          // For simplicity, we'll assign new IDs to ensure uniqueness in case of ID clashes
          const chargersWithNewIds = importedData.map(charger => ({
            ...charger,
            id: Date.now() + Math.random() // Ensure unique IDs for imported items
          }));
          setChargers(chargersWithNewIds); // Update the state with imported chargers
          console.log('Successfully imported charging solutions.');
        } else {
          console.error('Import failed: Invalid JSON structure or data format.');
          alert('Import failed: Invalid file format. Please ensure it\'s a valid charging solutions JSON.');
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('Error importing file. Please ensure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file); // Read the file content as text
  };

  // Define an array of colors for the chart lines
  const colors: string[] = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

  // Memoized calculation of chart data to optimize performance
  const chartData = useMemo<ChartDataPoint[]>(() => {
    // Generate an array of months from 0 to 60
    const months = Array.from({ length: 61 }, (_, i) => i);
    
    // Map each month to a data point for the chart
    return months.map(month => {
      const dataPoint: ChartDataPoint = { month }; // Initialize data point with the current month
      
      // Calculate total cost for each charger for the current month
      chargers.forEach((charger) => {
        // Determine the effective electricity price based on pricingType
        const effectivePrice = charger.pricingType === 'fixed' ? (charger.fixedPrice || 0) : electricityPrice;
        
        // Updated calculation for totalCost
        const totalCost = charger.investment + 
                         (charger.subscription * month) + 
                         (charger.marginalCost * monthlyKwh * month) + 
                         (effectivePrice * monthlyKwh * month);
        
        // Add the total cost to the data point, rounded to the nearest integer
        dataPoint[charger.name] = Math.round(totalCost);
      });
      
      return dataPoint;
    });
  }, [chargers, electricityPrice, monthlyKwh]); // Dependencies for memoization

  return (
    // Reduced padding from p-4 to p-2 for smaller margins
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 font-inter">
      <style>{`
        /* Custom styles for the range input thumb */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
        }

        /* Recharts tooltip styles for better visibility */
        .recharts-tooltip-wrapper {
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          overflow: hidden !important;
        }

        .recharts-tooltip-label {
          font-weight: bold;
          color: #333;
          margin-bottom: 4px;
        }

        .recharts-tooltip-item-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .recharts-tooltip-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
          Home Car Charger Cost Calculator
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Compare different charging solutions and see how costs evolve over time
        </p>

        {/* Adjusted grid to 3 columns and applied col-span for 1/3 and 2/3 width */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left section: now takes 1/3 of the width on large screens */}
          <div className="lg:col-span-1 space-y-6">
            {/* Add Charging Solution Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Plus className="mr-2 text-blue-600" size={20} />
                Add Charging Solution
              </h2>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Charger name"
                  value={newCharger.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                
                <input
                  type="number"
                  placeholder="Investment cost (DKK)"
                  value={newCharger.investment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, investment: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                
                <input
                  type="number"
                  placeholder="Monthly subscription (DKK)"
                  value={newCharger.subscription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, subscription: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                
                <input
                  type="number"
                  step="0.01"
                  placeholder="Marginal cost per kWh (DKK)"
                  value={newCharger.marginalCost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, marginalCost: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                
                {/* Electricity Pricing Type Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Electricity Pricing</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pricingType"
                        value="variable"
                        checked={newCharger.pricingType === 'variable'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, pricingType: e.target.value as 'variable' | 'fixed', fixedPrice: ''})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Variable (use slider)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pricingType"
                        value="fixed"
                        checked={newCharger.pricingType === 'fixed'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, pricingType: e.target.value as 'variable' | 'fixed'})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Fixed price</span>
                    </label>
                  </div>
                </div>
                
                {/* Fixed Price Input (conditionally rendered) */}
                {newCharger.pricingType === 'fixed' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Fixed electricity price (DKK/kWh)"
                    value={newCharger.fixedPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCharger({...newCharger, fixedPrice: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                )}
                
                <button
                  onClick={addCharger}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Add Charger
                </button>
              </div>
            </div>

            {/* Electricity Price Slider Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Electricity Price
              </h2>
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {electricityPrice.toFixed(2)} DKK/kWh
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.1"
                  value={electricityPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setElectricityPrice(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>1 DKK</span>
                  <span>6 DKK</span>
                </div>
              </div>
            </div>

            {/* Monthly kWh Usage Slider Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Monthly kWh Usage
              </h2>
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-3xl font-bold text-green-600">
                    {monthlyKwh} kWh
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="10"
                  value={monthlyKwh}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyKwh(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>50 kWh</span>
                  <span>1000 kWh</span>
                </div>
              </div>
            </div>

            {/* Your Charging Solutions List Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Your Charging Solutions
              </h2>
              <div className="space-y-3">
                {chargers.map((charger, index) => (
                  <div key={charger.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3">
                      {/* Color indicator for the charger */}
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-800">{charger.name}</div>
                        <div className="text-sm text-gray-600">
                          {charger.investment} DKK + {charger.subscription} DKK/month + {charger.marginalCost} DKK/kWh
                          {charger.pricingType === 'fixed' ? 
                            ` (Fixed: ${charger.fixedPrice?.toFixed(2) || 'N/A'} DKK/kWh)` : 
                            ' (Variable pricing)'
                          }
                        </div>
                      </div>
                    </div>
                    {/* Remove Charger Button */}
                    <button
                      onClick={() => removeCharger(charger.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                      aria-label={`Remove ${charger.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Export/Import Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={exportChargers}
                  className="w-full flex items-center justify-center bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  <Download size={18} className="mr-2" />
                  Export Solutions
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={importChargers}
                  accept=".json" // Only accept JSON files
                  className="hidden" // Hide the actual file input
                />
                <button
                  onClick={() => fileInputRef.current?.click()} // Trigger click on hidden file input
                  className="w-full flex items-center justify-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  <Upload size={18} className="mr-2" />
                  Import Solutions
                </button>
              </div>
            </div>
          </div>

          {/* Right section: now takes 2/3 of the width on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Total Cost Over Time
              </h2>
              <div className="flex-grow h-96 min-h-[300px]"> {/* min-h for responsiveness */}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    key={`${electricityPrice}-${monthlyKwh}`} // Added key to force re-render
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#666"
                      tickFormatter={(value: number) => `Month ${value}`}
                      label={{ value: 'Months', position: 'insideBottom', offset: -5, fill: '#4a5568', fontSize: 14 }}
                    />
                    <YAxis 
                      stroke="#666"
                      tickFormatter={(value: number) => `${value} DKK`}
                      label={{ value: 'Total Cost (DKK)', angle: -90, position: 'insideLeft', fill: '#4a5568', fontSize: 14 }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value.toFixed(2)} DKK`, name]}
                      labelFormatter={(month: number) => `Month ${month}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        padding: '10px',
                        boxShadow: '0px 0px 10px rgba(0,0,0,0.1)'
                      }}
                      itemStyle={{ color: '#333' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {chargers.map((charger, index) => (
                      <Line
                        key={charger.id}
                        type="monotone"
                        dataKey={charger.name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: colors[index % colors.length], stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 text-sm text-gray-600 space-y-2">
                <p><strong>Formula:</strong> Total cost = Investment + (Monthly subscription &times; months) + (Marginal cost &times; monthly kWh &times; months) + (Effective electricity price &times; monthly kWh &times; months)</p>
                <p>* Chargers with fixed pricing use their set price, others use the variable electricity price from the slider.</p>
                <p>* Adjust both the electricity price and monthly usage sliders to dynamically see how total costs change over time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarChargerCalculator;
