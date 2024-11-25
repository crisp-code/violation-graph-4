import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const validPayload = payload.find(p => p.value !== null);
    if (!validPayload) return null;

    const isActual = validPayload.dataKey === 'actual';
    
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: 0 }}>{new Date(label).toLocaleDateString()}</p>
        <p style={{ 
          margin: '5px 0 0 0', 
          color: isActual ? '#1f77b4' : '#ff7f0e',
          fontWeight: 'bold' 
        }}>
          {`${isActual ? '실제 위반 건수' : '예측 위반 건수'}: ${validPayload.value}건`}
        </p>
      </div>
    );
  }
  return null;
};

const ExpandedChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart 
      data={data}
      margin={{ top: 10, right: 30, left: 20, bottom: 25 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="date" 
        tickFormatter={(date) => new Date(date).toLocaleDateString()}
        height={25}
        tick={{ fontSize: 11 }}
      />
      <YAxis 
        tick={{ fontSize: 11 }}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend 
        verticalAlign="bottom"
        height={25}
        wrapperStyle={{ 
          bottom: 30,
          fontSize: '11px',
          paddingLeft: '40px'
        }}
      />
      <Area
        type="monotone"
        dataKey="actual"
        name="실제 위반 건수"
        stroke="#1f77b4"
        fill="#1f77b4"
        strokeWidth={1.5}
        dot={false}
        activeDot={{ r: 4 }}
        connectNulls
      />
      <Area
        type="monotone"
        dataKey="predicted"
        name="예측 위반 건수"
        stroke="#ff7f0e"
        fill="#ff7f0e"
        strokeWidth={1.5}
        dot={false}
        activeDot={{ r: 4 }}
        connectNulls
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default ExpandedChart;