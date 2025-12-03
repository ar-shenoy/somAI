
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  value: number; // 0 to 100
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value }) => {
  const data = [
    { name: 'Low', value: 40, color: '#00ff80' },
    { name: 'Medium', value: 40, color: '#ffc300' },
    { name: 'High', value: 20, color: '#ff3300' },
  ];

  // --- PIXEL-PERFECT LAYOUT CONFIGURATION ---
  // Using fixed pixels for vertical alignment ensures the HTML overlay 
  // matches the SVG chart exactly, preventing overlap during resizing.
  const chartHeight = 220;
  const centerY = 130; // The pivot point Y-coordinate
  const innerRadius = 70;
  const outerRadius = 90;
  
  // Clamp value
  const safeValue = Math.min(Math.max(value, 0), 100);
  
  // Calculate Rotation:
  // 0 value -> -90deg (Left)
  // 100 value -> 90deg (Right)
  const needleRotation = (safeValue * 1.8) - 90;

  return (
    <div className="w-full relative select-none flex justify-center overflow-hidden" style={{ height: `${chartHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={data}
            cx="50%"
            cy={centerY} // Explicit pixel center
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.3} stroke={entry.color} strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* NEEDLE CONTAINER */}
      {/* Anchored exactly at 'centerY' pixels from the top */}
      <div 
        className="absolute left-1/2 pointer-events-none"
        style={{ 
            top: `${centerY}px`, 
            transform: 'translate(-50%, -50%)',
            zIndex: 10
        }}
      >
         {/* The Needle Bar */}
         <div 
           className="w-1.5 bg-white origin-bottom rounded-t-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
           style={{ 
               height: `${outerRadius}px`, 
               position: 'absolute',
               bottom: '0', 
               left: '-3px', // Center the 6px width (1.5 * 4px)
               transform: `rotate(${needleRotation}deg)`,
               transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)' // Elastic bounce effect
           }}
         />
         {/* Pivot Circle Cap */}
         <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* TEXT CONTAINER */}
      {/* Explicitly positioned below the pivot with a fixed gap */}
      <div 
        className="absolute flex flex-col items-center justify-center pointer-events-none"
        style={{ top: `${centerY + 25}px`, width: '100%' }} 
      >
        <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] leading-none">
          {Math.round(safeValue)}
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold mt-1">
          Risk Score
        </span>
      </div>
    </div>
  );
};

export default GaugeChart;
