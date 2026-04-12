import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './BookingCalendar.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS = {
  pending:   '#F59E0B',
  approved:  '#10B981',
  booked:    '#10B981',
  completed: '#6366F1',
  cancelled: '#9CA3AF',
  rejected:  '#EF4444',
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * @param {{ bookings: Array, onBookingClick?: (booking) => void, getDisplayStatus?: (b) => string }} props
 */
export default function BookingCalendar({ bookings = [], onBookingClick, getDisplayStatus }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(null);
  };

  // Build calendar grid
  const { cells, bookingsByDate } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const map = {};
    bookings.forEach((b) => {
      const d = new Date(b.eventDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });

    const cells = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, outside: true });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${month}-${d}`;
      cells.push({ day: d, outside: false, bookings: map[key] || [] });
    }

    // Next month leading days to fill 6 rows
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, outside: true });
    }

    return { cells, bookingsByDate: map };
  }, [year, month, bookings]);

  const selectedBookings = useMemo(() => {
    if (!selectedDay) return [];
    const key = `${year}-${month}-${selectedDay}`;
    return bookingsByDate[key] || [];
  }, [selectedDay, year, month, bookingsByDate]);

  const isToday = (day) =>
    !isNaN(day) &&
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  return (
    <div className="bcal">
      {/* Header */}
      <div className="bcal-header">
        <button type="button" className="bcal-nav" onClick={prev}><ChevronLeft size={18} /></button>
        <div className="bcal-month-year">
          <span className="bcal-month">{MONTHS[month]}</span>
          <span className="bcal-year">{year}</span>
        </div>
        <button type="button" className="bcal-today-btn" onClick={goToday}>Today</button>
        <button type="button" className="bcal-nav" onClick={next}><ChevronRight size={18} /></button>
      </div>

      {/* Day headers */}
      <div className="bcal-grid bcal-day-names">
        {DAYS.map((d) => (
          <div key={d} className="bcal-day-name">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="bcal-grid bcal-cells">
        {cells.map((cell, i) => {
          const hasBookings = !cell.outside && cell.bookings?.length > 0;
          const selected = !cell.outside && selectedDay === cell.day;
          return (
            <div
              key={i}
              className={[
                'bcal-cell',
                cell.outside && 'bcal-cell--outside',
                isToday(cell.day) && !cell.outside && 'bcal-cell--today',
                selected && 'bcal-cell--selected',
                hasBookings && 'bcal-cell--has',
              ].filter(Boolean).join(' ')}
              onClick={() => !cell.outside && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
            >
              <span className="bcal-cell-num">{cell.day}</span>
              {hasBookings && (
                <div className="bcal-dots">
                  {cell.bookings.slice(0, 3).map((b, j) => {
                    const status = getDisplayStatus ? getDisplayStatus(b) : b.status;
                    return (
                      <span
                        key={j}
                        className="bcal-dot"
                        style={{ background: STATUS_COLORS[status] || '#9CA3AF' }}
                      />
                    );
                  })}
                  {cell.bookings.length > 3 && (
                    <span className="bcal-dot-more">+{cell.bookings.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="bcal-detail">
          <h4 className="bcal-detail-title">
            {MONTHS[month]} {selectedDay}, {year}
            <span className="bcal-detail-count">{selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}</span>
          </h4>
          {selectedBookings.length === 0 ? (
            <p className="bcal-detail-empty">No bookings on this day.</p>
          ) : (
            <div className="bcal-detail-list">
              {selectedBookings.map((b) => {
                const status = getDisplayStatus ? getDisplayStatus(b) : b.status;
                const color = STATUS_COLORS[status] || '#9CA3AF';
                const name = b.vendor?.businessName || b.user?.name || b.user?.email || 'Booking';
                return (
                  <div
                    key={b._id}
                    className="bcal-detail-item"
                    style={{ '--dot-color': color }}
                    onClick={() => onBookingClick?.(b)}
                  >
                    <span className="bcal-detail-dot" />
                    <div className="bcal-detail-info">
                      <span className="bcal-detail-name">{name}</span>
                      <span className="bcal-detail-meta">
                        {b.eventType && <span className="bcal-detail-type">{b.eventType}</span>}
                        <span className="bcal-detail-status" style={{ color }}>{status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
