import React, { useEffect, useState, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { curveNatural } from '@visx/curve';
import { GridRows, GridColumns } from '@visx/grid';
import { Tooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import PropTypes from 'prop-types';

const LoadingMessage = () => <p>로딩 중...</p>;
const NoDataMessage = () => <p>데이터가 없습니다.</p>;

const margin = { top: 40, right: 30, bottom: 50, left: 50 };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const validPayload = payload.find(p => p.value !== null);
    if (!validPayload) return null;

    const date = new Date(label);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const weekNum = Math.ceil(date.getDate() / 7);

    return (
      <div style={{ 
        backgroundColor: 'white',
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        minWidth: '200px',
        fontSize: '14px'
      }}>
        <div style={{ 
          marginBottom: '6px',
          color: '#333',
          fontWeight: '500'
        }}>
          {`${year}년 ${month}월 ${weekNum}주`}
        </div>
        <div style={{ 
          color: payload[0].payload.isActual ? '#1f77b4' : '#ff7f0e',
          fontWeight: '500',
          fontSize: '14px'
        }}>
          {`${payload[0].payload.isActual ? '실제 위반 건수' : '예측 위반 건수'}: ${payload[0].value}건`}
        </div>
      </div>
    );
  }
  return null;
};

const normalizeViolationData = (csv) => {
  // 1. 날짜별 총 위반 건수 계산
  const dailyViolations = csv
    .trim()
    .split('\n')
    .slice(1)
    .map(line => {
      const [date, , , violationCount] = line.split(',');
      return { date, violationCount: parseInt(violationCount, 10) };
    })
    .reduce((acc, { date, violationCount }) => {
      acc[date] = (acc[date] || 0) + violationCount;
      return acc;
    }, {});

  // 2. 2주 단위로 데이터 집계
  const biweeklyViolations = {};
  Object.entries(dailyViolations).forEach(([date, count]) => {
    const currentDate = new Date(date);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const weekNum = Math.ceil(currentDate.getDate() / 7);
    // 2주 단위로 그룹화 (1,2주차 -> 1, 3,4주차 -> 2)
    const biweekNum = Math.ceil(weekNum / 2);
    const biweekKey = `${year}-${month.toString().padStart(2, '0')}-${biweekNum}번째 2주`;
    
    if (!biweeklyViolations[biweekKey]) {
      biweeklyViolations[biweekKey] = {
        count: 0,
        dates: []
      };
    }
    biweeklyViolations[biweekKey].count += count;
    biweeklyViolations[biweekKey].dates.push(date);
  });

  // 3. 최대/최소 위반 건수 찾기
  const counts = Object.values(biweeklyViolations).map(v => v.count);
  const maxViolation = Math.max(...counts);
  const minViolation = Math.min(...counts);
  
  // 4. 편차를 줄이기 위한 스케일 계산 수정
  // 최소값을 20으로, 최대값을 80으로 조정
  const scale = (80 - 20) / (maxViolation - minViolation);
  const normalize = (value) => {
    return 20 + (value - minViolation) * scale;
  };

  // 5. 모든 값을 새로운 스케일에 맞춰 조정하고 날짜 정렬
  const normalizedData = Object.entries(biweeklyViolations)
    .map(([biweekKey, data]) => ({
      date: data.dates[0],
      weekLabel: biweekKey,
      violationCount: Math.round(normalize(data.count))
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return normalizedData;
};

const ViolationChart = () => {
  const [dimensions, setDimensions] = useState({ width: 700, height: 350 });
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formattedData, setFormattedData] = useState({ actual: [], predicted: [] });
  const [data, setData] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/data/cctv_violation_data_20231115_to_20251115_dataset_1.csv');
      const csvText = await response.text();
      const normalizedData = normalizeViolationData(csvText);
      setData(normalizedData);
    } catch (error) {
      console.error('Error fetching CSV data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 데이터 분리
  useEffect(() => {
    if (data.length > 0) {
      const cutoffDate = new Date('2024-11-21');
      const endDate = new Date('2025-02-28');
      const actual = [];
      const predicted = [];

      // 마지막 실제 데이터와 첫 예측 데이터 찾기
      let lastActualData = null;
      let firstPredictedData = null;

      data.forEach(item => {
        const date = new Date(item.date);
        if (date <= cutoffDate) {
          actual.push(item);
          lastActualData = item;
        } else if (date <= endDate) {
          if (!firstPredictedData) {
            firstPredictedData = item;
          }
          predicted.push(item);
        }
      });

      // 전환 지점 데이터 추가
      if (lastActualData && firstPredictedData) {
        // 마지막 실제 데이터를 예측 데이터에도 추가
        predicted.unshift({
          ...lastActualData,
          date: cutoffDate.toISOString().split('T')[0]
        });
      }

      setFormattedData({ actual, predicted });
      setIsLoading(false);
    }
  }, [data]);

  // 반응형 설정
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.chart-section');
      if (container) {
        setDimensions({
          width: container.clientWidth - 30,
          height: container.clientHeight - 40
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;

  const xScale = scaleTime({
    domain: [
      Math.min(...data.map(d => new Date(d.date))),
      new Date('2025-02-28')  // x축 범위를 2025년 2월까지로 제한
    ],
    range: [0, width]
  });

  const yScale = scaleLinear({
    domain: [0, Math.max(...data.map(d => d.violationCount))],
    range: [height, 0],
    nice: true
  });

  const bisectDate = bisector(d => new Date(d.date)).left;
  
  const handleTooltip = (event) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && d1.date) {
      d = x0 - new Date(d0.date) > new Date(d1.date) - x0 ? d1 : d0;
    }

    const xPosition = xScale(new Date(d.date)) + margin.left;
    const yPosition = yScale(d.violationCount);
    
    // 툴팁이 화면을 벗어나는지 확인
    const isNearRightEdge = xPosition > dimensions.width - 100;
    const isNearLeftEdge = xPosition < 100;
    const isNearTop = yPosition < 100;

    let xOffset = 0;
    let yOffset = -80;  // 기본 y 오프셋

    // x축 위치 조정
    if (isNearRightEdge) {
      xOffset = -100;
    } else if (isNearLeftEdge) {
      xOffset = 0;
    }

    // y축 위치 조정
    if (isNearTop) {
      yOffset = 20;  // 팁을 아래로 표시
    }

    setTooltipData({
      ...d,
      isActual: new Date(d.date) <= new Date('2024-11-21'),
      xOffset,
      yOffset
    });
  };

  if (isLoading) return <LoadingMessage />;
  if (!data || data.length === 0) return <NoDataMessage />;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg width={dimensions.width} height={dimensions.height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows 
            scale={yScale} 
            width={width} 
            strokeDasharray="3 3" 
            stroke="#e0e0e0" 
            strokeOpacity={0.2}
          />
          <GridColumns 
            scale={xScale} 
            height={height} 
            strokeDasharray="3,3" 
            stroke="#e0e0e0"
            strokeOpacity={0.3}
          />
          
          <AxisBottom 
            top={height} 
            scale={xScale} 
            numTicks={6} 
            tickFormat={d => {
              const date = new Date(d);
              const month = date.getMonth() + 1;
              return `${month}월`;  // 월만 표시
            }}
            stroke="#a8a8a8"
            tickStroke="#a8a8a8"
            tickLabelProps={() => ({
              fill: '#666',
              fontSize: 12,
              textAnchor: 'middle',
              dy: 8
            })}
          />
          <AxisLeft 
            scale={yScale}
            stroke="#a8a8a8"
            tickStroke="#a8a8a8"
            numTicks={8}
            tickLabelProps={() => ({
              fill: '#666',
              fontSize: 12,
              textAnchor: 'end',
              dx: -8
            })}
          />

          {/* 실제 데이터 라인 */}
          <LinePath
            data={formattedData.actual}
            x={d => xScale(new Date(d.date))}
            y={d => yScale(d.violationCount)}
            stroke="#1f77b4"
            strokeWidth={3}
            curve={curveNatural}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 예측 데이터 라인 */}
          <LinePath
            data={formattedData.predicted}
            x={d => xScale(new Date(d.date))}
            y={d => yScale(d.violationCount)}
            stroke="#ff7f0e"
            strokeWidth={3}
            curve={curveNatural}
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={handleTooltip}
            onMouseLeave={() => setTooltipData(null)}
          />

          {/* 하단 범례 */}
          <Group top={height + 40}>
            <Group left={width / 2 - 100}>
              <circle cx={0} cy={0} r={5} fill="#1f77b4" />
              <text 
                x={12} 
                y={4} 
                fontSize={12} 
                fill="#666"
                style={{ fontWeight: '500' }}
              >
                실제 위반 건수
              </text>
              <circle cx={100} cy={0} r={5} fill="#ff7f0e" />
              <text 
                x={112} 
                y={4} 
                fontSize={12}
                fill="#666"
                style={{ fontWeight: '500' }}
              >
                예측 위반 건수
              </text>
            </Group>
          </Group>
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip
          top={yScale(tooltipData.violationCount) + margin.top + tooltipData.yOffset}
          left={xScale(new Date(tooltipData.date)) + margin.left + tooltipData.xOffset}
          style={{
            ...defaultStyles,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transform: tooltipData.yOffset > 0 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            zIndex: 999,
            pointerEvents: 'none'
          }}
        >
          <CustomTooltip 
            active={true} 
            payload={[{
              payload: tooltipData,
              value: tooltipData.violationCount
            }]} 
            label={tooltipData.date}
          />
        </Tooltip>
      )}
    </div>
  );
};

ViolationChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    violationCount: PropTypes.number.isRequired
  }))
};

export default ViolationChart;