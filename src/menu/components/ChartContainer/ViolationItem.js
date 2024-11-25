import React from 'react';
import { Button } from 'react-bootstrap';
import CompactChart from './CompactChart';
import ExpandedChart from './ExpandedChart';

const ViolationItem = ({ title, data, isExpanded, onToggle }) => {
  return (
    <li style={{ 
      marginBottom: '12px', 
      marginTop: 0,
      height: isExpanded ? '330px' : 'auto',  // 330px로 증가
      transition: 'height 0.3s ease'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span>{title}</span>
        <Button variant="outline-primary" size="sm" onClick={onToggle}>
          {isExpanded ? '-' : '+'}
        </Button>
      </div>
      <div style={{ 
        height: isExpanded ? 'calc(100% - 40px)' : '30px',
        transition: 'height 0.3s ease'
      }}>
        {isExpanded ? (
          <ExpandedChart data={data} />
        ) : (
          <CompactChart data={data} />
        )}
      </div>
    </li>
  );
};

export default ViolationItem;