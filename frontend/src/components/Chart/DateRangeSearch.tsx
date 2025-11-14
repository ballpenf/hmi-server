import React, { useState } from 'react';
import type { Shape } from "../../types/shape";

interface DateRangeSearchProps {
    node: Shape & { type: 'dateRangeSearch' };
    onDateRangeChange?: (start: string, end: string) => void;
}

const DateRangeSearch: React.FC<DateRangeSearchProps> = ({ node, onDateRangeChange }) => {   
    const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const getDefaultDates = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        return {
            start: formatDateTime(start),
            end: formatDateTime(end)
        };
    };

    const defaultDates = getDefaultDates();
    const [startDate, setStartDate] = useState(defaultDates.start);
    const [endDate, setEndDate] = useState(defaultDates.end);

    const handleStartDateChange = (newDate: string) => {
        let adjustedEndDate = endDate;
        if (newDate > endDate) {
            adjustedEndDate = newDate;
            setEndDate(newDate);
        }
        setStartDate(newDate);
    };

    const handleEndDateChange = (newDate: string) => {
        let adjustedStartDate = startDate;
        if (newDate < startDate) {
            adjustedStartDate = newDate;
            setStartDate(newDate);
        }
        setEndDate(newDate);
    };

    const handleSearch = () => {
        if (onDateRangeChange) {
            // datetime-local 형식을 ISO 형식으로 변환
            const startISO = new Date(startDate).toISOString();
            const endISO = new Date(endDate).toISOString();
            onDateRangeChange(startISO, endISO);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px',
            backgroundColor: 'transparent',
            border: 'none'
        }}>
            <input
                type="datetime-local"
                value={startDate}
                max={endDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                style={{
                    flex: 1,
                    padding: '4px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    fontSize: '12px'
                }}
            />
            <span>~</span>
            <input
                type="datetime-local"
                value={endDate}
                min={startDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                style={{
                    flex: 1,
                    padding: '4px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    fontSize: '12px'
                }}
            />
            <button
                onClick={handleSearch}
                style={{
                    padding: '4px 12px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                }}
            >
                조회
            </button>
        </div>
    );
};

export default DateRangeSearch;