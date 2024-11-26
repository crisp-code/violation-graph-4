import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const aggregateDataByTwoWeeks = (data) => {
  const result = [];
  let currentDate = new Date('2023-12-27');  // 시작일
  const endDate = new Date('2025-02-28');    // 종료일
  const transitionDate = new Date('2024-11-21'); // 전환 시점

  const getPeriodicData = (start, end, data) => {
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate < end;
    });
  };

  let lastActualValue = null;

  while (currentDate <= endDate) {
    const twoWeeksLater = new Date(currentDate);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    const periodData = getPeriodicData(currentDate, twoWeeksLater, data);

    if (periodData.length > 0) {
      const avgActual = periodData.reduce((sum, item) => sum + (item.actual || 0), 0) / periodData.length;
      const avgPredicted = periodData.reduce((sum, item) => sum + (item.predicted || 0), 0) / periodData.length;

      // 전환 시점 처리
      if (currentDate <= transitionDate && twoWeeksLater > transitionDate) {
        // 전환 시점의 값 저장
        lastActualValue = Math.round(avgActual);
        result.push({
          date: currentDate.toISOString().split('T')[0],
          actual: lastActualValue,
          predicted: lastActualValue // 전환 시점에서 동일한 값 사용
        });
      } else {
        result.push({
          date: currentDate.toISOString().split('T')[0],
          actual: currentDate < transitionDate ? Math.round(avgActual) : null,
          predicted: currentDate > transitionDate ? Math.round(avgPredicted) : null
        });
      }
    }

    currentDate = twoWeeksLater;
  }
  return result;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const validPayload = payload.find(p => p.value !== null);
    if (!validPayload) return null;

    return (
      <div style={{ 
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 5px 0' }}>{new Date(label).toLocaleDateString()}</p>
        {payload.map((p, i) => (
          p.value !== null && (
            <p key={i} style={{ 
              margin: '3px 0',
              color: p.dataKey === 'actual' ? '#1f77b4' : '#ff7f0e',
              fontWeight: 'bold'
            }}>
              {p.dataKey === 'actual' ? '실제 위반 건수' : '예측 위반 건수'}: {Math.round(p.value)}건
            </p>
          )
        ))}
      </div>
    );
  }
  return null;
};

const ExpandedChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart 
      data={aggregateDataByTwoWeeks(data)}
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
        strokeWidth={2}
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
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
        connectNulls
        strokeDasharray="5 5"
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default ExpandedChart;