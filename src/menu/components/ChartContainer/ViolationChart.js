import React, { useEffect, useState } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { GridRows, GridColumns } from '@visx/grid';
import { Tooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import PropTypes from 'prop-types';

const LoadingMessage = () => <p>로딩 중...</p>;
const NoDataMessage = () => <p>데이터가 없습니다.</p>;

const margin = { top: 40, right: 30, bottom: 50, left: 50 };

const tooltipStyles = {
  ...defaultStyles,
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: '4px',
  padding: '12px 16px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  fontSize: '14px',
  color: '#333',
  minWidth: '200px',
  whiteSpace: 'nowrap'
};

const ViolationChart = ({ data }) => {
  const [dimensions, setDimensions] = useState({ width: 700, height: 350 });
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formattedData, setFormattedData] = useState({ actual: [], predicted: [] });

  // 데이터 분리
  useEffect(() => {
    if (data) {
      const cutoffDate = new Date('2024-11-21');
      const actual = [];
      const predicted = [];

      data.forEach(item => {
        const date = new Date(item.date);
        if (date <= cutoffDate) {
          actual.push(item);
        } else {
          predicted.push(item);
        }
      });

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
      Math.max(...data.map(d => new Date(d.date)))
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

    // x 좌표가 차트의 오른쪽 끝에 가까워지면 툴팁을 왼쪽으로 이동
    const xPosition = xScale(new Date(d.date)) + margin.left;
    const isNearRightEdge = xPosition > dimensions.width - 200; // 툴팁 너비를 고려

    setTooltipData({
      ...d,
      isActual: new Date(d.date) <= new Date('2024-11-21'),
      xOffset: isNearRightEdge ? -220 : 0 // 오른쪽 끝에 가까우면 왼쪽으로 이동
    });
  };

  const formatTooltipValue = (value) => {
    return `${value}건`;
  };

  if (isLoading) return <LoadingMessage />;
  if (!data || data.length === 0) return <NoDataMessage />;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg width={dimensions.width} height={dimensions.height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={width} strokeDasharray="3,3" stroke="#e0e0e0" />
          <GridColumns scale={xScale} height={height} strokeDasharray="3,3" stroke="#e0e0e0" />
          
          <AxisBottom top={height} scale={xScale} numTicks={5} tickFormat={d => d.toLocaleDateString()} />
          <AxisLeft scale={yScale} />

          {/* 실제 데이터 라인 */}
          <LinePath
            data={formattedData.actual}
            x={d => xScale(new Date(d.date))}
            y={d => yScale(d.violationCount)}
            stroke="#1f77b4"
            strokeWidth={2}
            curve={curveMonotoneX}
          />

          {/* 예측 데이터 라인 */}
          <LinePath
            data={formattedData.predicted}
            x={d => xScale(new Date(d.date))}
            y={d => yScale(d.violationCount)}
            stroke="#ff7f0e"
            strokeWidth={2}
            curve={curveMonotoneX}
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
            <Group left={width / 2 - 130}>
              <circle cx={0} cy={0} r={6} fill="#1f77b4" />
              <text x={15} y={5} fontSize={12}>실제 위반 건수</text>
              <circle cx={120} cy={0} r={6} fill="#ff7f0e" />
              <text x={135} y={5} fontSize={12}>예측 위반 건수</text>
            </Group>
          </Group>
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip
          top={yScale(tooltipData.violationCount) + margin.top - 80}
          left={xScale(new Date(tooltipData.date)) + margin.left + tooltipData.xOffset}
          style={tooltipStyles}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ 
              color: '#666',
              fontSize: '13px',
              marginBottom: '2px'
            }}>
              {new Date(tooltipData.date).toLocaleDateString()}
            </div>
            <div style={{ 
              color: tooltipData.isActual ? '#1f77b4' : '#ff7f0e',
              fontSize: '15px',
              fontWeight: 'bold',
            }}>
              {tooltipData.isActual ? '실제 위반 건수: ' : '예측 위반 건수: '}
              {formatTooltipValue(tooltipData.violationCount)}
            </div>
          </div>
        </Tooltip>
      )}
    </div>
  );
};

ViolationChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    violationCount: PropTypes.number.isRequired
  })).isRequired
};

export default ViolationChart;