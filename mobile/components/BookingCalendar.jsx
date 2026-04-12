import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

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

const CELL_SIZE = Math.floor((Dimensions.get('window').width - 32) / 7);

export default function BookingCalendar({ bookings = [], onBookingPress, getDisplayStatus }) {
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
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${month}-${d}`;
      cells.push({ day: d, outside: false, bookings: map[key] || [] });
    }
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
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prev} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.monthText}>{MONTHS[month]}</Text>
          <Text style={styles.yearText}>{year}</Text>
        </View>
        <TouchableOpacity onPress={goToday} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={next} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day names */}
      <View style={styles.dayNamesRow}>
        {DAYS.map((d) => (
          <View key={d} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {cells.map((cell, i) => {
          const hasBookings = !cell.outside && cell.bookings?.length > 0;
          const selected = !cell.outside && selectedDay === cell.day;
          const todayCell = !cell.outside && isToday(cell.day);

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                cell.outside && styles.cellOutside,
                todayCell && styles.cellToday,
                selected && styles.cellSelected,
              ]}
              onPress={() => !cell.outside && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
              activeOpacity={cell.outside ? 1 : 0.6}
            >
              <Text style={[
                styles.cellNum,
                cell.outside && styles.cellNumOutside,
                todayCell && styles.cellNumToday,
                selected && styles.cellNumSelected,
              ]}>
                {cell.day}
              </Text>
              {hasBookings && (
                <View style={styles.dotsRow}>
                  {cell.bookings.slice(0, 3).map((b, j) => {
                    const status = getDisplayStatus ? getDisplayStatus(b) : b.status;
                    return (
                      <View
                        key={j}
                        style={[styles.dot, { backgroundColor: STATUS_COLORS[status] || '#9CA3AF' }]}
                      />
                    );
                  })}
                  {cell.bookings.length > 3 && (
                    <Text style={styles.dotMore}>+{cell.bookings.length - 3}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Detail panel */}
      {selectedDay !== null && (
        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {MONTHS[month]} {selectedDay}, {year}
            </Text>
            <View style={styles.detailCountBadge}>
              <Text style={styles.detailCountText}>
                {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {selectedBookings.length === 0 ? (
            <Text style={styles.detailEmpty}>No bookings on this day.</Text>
          ) : (
            <ScrollView style={styles.detailList} nestedScrollEnabled>
              {selectedBookings.map((b) => {
                const status = getDisplayStatus ? getDisplayStatus(b) : b.status;
                const color = STATUS_COLORS[status] || '#9CA3AF';
                const name = b.vendor?.businessName || b.user?.name || b.user?.email || 'Booking';
                return (
                  <TouchableOpacity
                    key={b._id}
                    style={styles.detailItem}
                    onPress={() => onBookingPress?.(b)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.detailDot, { backgroundColor: color }]} />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailName} numberOfLines={1}>{name}</Text>
                      <View style={styles.detailMeta}>
                        {b.eventType && (
                          <Text style={styles.detailType}>{b.eventType}</Text>
                        )}
                        <Text style={[styles.detailStatus, { color }]}>{status}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.border} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingLeft: 10,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayNameCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  cellOutside: {
    opacity: 0.3,
  },
  cellToday: {
    backgroundColor: '#fce7f3',
    borderRadius: CELL_SIZE / 2,
  },
  cellSelected: {
    backgroundColor: theme.colors.primary,
    borderRadius: CELL_SIZE / 2,
  },
  cellNum: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  cellNumOutside: {
    color: theme.colors.textSecondary,
  },
  cellNumToday: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cellNumSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotMore: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  detail: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailCountBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  detailEmpty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  detailList: {
    maxHeight: 200,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  detailType: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  detailStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
