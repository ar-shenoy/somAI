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

  const cx = "50%";
  const cy = "70%";
  const iR = 60;
  const oR = 80;

  const needleValue = Math.min(Math.max(value, 0), 100);
  // Calculate needle rotation
  const needleAngle = 180 - (needleValue / 100) * 180;

  return (
    // Added min-w-[200px] and min-h to prevent Recharts -1 width calculation error
    <div className="relative h-48 w-full min-w-[200px] flex flex-col items-center justify-center overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={data}
            cx={cx}
            cy={cy}
            innerRadius={iR}
            outerRadius={oR}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.3} stroke={entry.color} strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Needle Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-end justify-center pb-[30%]">
         <div 
           className="w-1 h-16 bg-white origin-bottom transition-transform duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.8)]"
           style={{ transform: `rotate(${needleValue * 1.8 - 90}deg)` }}
         />
         <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      </div>

      <div className="absolute bottom-4 flex flex-col items-center">
        <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          {Math.round(value)}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Risk Score</span>
      </div>
    </div>
  );
};

export default GaugeChart;