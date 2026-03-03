import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');

const PINK       = '#D7385E';
const PINK_LIGHT = '#fce8ec';
const PINK_MED   = '#f4adb8';

export const INTRO_SEEN_KEY = 'vidai_intro_seen';

// ── slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'vendors',
    title: 'Find Trusted Wedding\nServices Near You',
    subtitle: 'Venues, Photographers, Décors, Makeup Artists — all in one place.',
    illustration: 'map',
  },
  {
    key: 'tasks',
    title: 'Keep Track of Tasks',
    subtitle: 'Add tasks, create a personal wedding plan and keep track of upcoming events.',
    illustration: 'tasks',
  },
  {
    key: 'budget',
    title: 'Find Budget Friendly\nVendors',
    subtitle: 'Find every vendor you need for your big day. Shortlist, message or book them directly.',
    illustration: 'budget',
  },
];

// ── decorations ───────────────────────────────────────────────────────────────
function Decoration() {
  return (
    <>
      <View style={[d.blob, { top: -50, left: -50, width: 160, height: 160, borderRadius: 80 }]} />
      <View style={[d.blob, { top: H * 0.2, right: -30, width: 100, height: 100, borderRadius: 50 }]} />
      <View style={[d.dot, { top: H * 0.12, left: W * 0.62 }]} />
      <View style={[d.dot, d.dotSm, { top: H * 0.3, left: W * 0.07 }]} />
      <View style={[d.dot, { bottom: H * 0.3, right: W * 0.07 }]} />
      <View style={[d.dot, d.dotSm, { bottom: H * 0.16, left: W * 0.22 }]} />
    </>
  );
}
const d = StyleSheet.create({
  blob: { position: 'absolute', backgroundColor: PINK_MED, opacity: 0.35 },
  dot: { position: 'absolute', width: 13, height: 13, borderRadius: 7, backgroundColor: PINK, opacity: 0.3 },
  dotSm: { width: 8, height: 8, borderRadius: 4 },
});

// ── Map illustration ──────────────────────────────────────────────────────────
const MAP_PINS = [
  { icon: 'home',           color: '#f59e0b', label: 'Venues',       pos: { top: '10%', left: '8%' } },
  { icon: 'brush',          color: '#ec4899', label: 'Makeup',       pos: { top: '7%',  right: '9%' } },
  { icon: 'camera',         color: PINK,      label: 'Photographers',pos: { top: '40%', left: '26%' } },
  { icon: 'color-palette',  color: '#ef4444', label: 'Décors',       pos: { top: '50%', right: '8%' } },
  { icon: 'restaurant',     color: '#6b7280', label: 'Caterers',     pos: { bottom: '17%', left: '7%' } },
  { icon: 'car',            color: '#6b7280', label: 'Transport',    pos: { bottom: '9%', right: '13%' } },
];
function MapCard() {
  return (
    <View style={il.card}>
      {[0.25, 0.5, 0.75].map((f, i) => (
        <View key={`h${i}`} style={[il.grid, il.gridH, { top: `${f * 100}%` }]} />
      ))}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <View key={`v${i}`} style={[il.grid, il.gridV, { left: `${f * 100}%` }]} />
      ))}
      <View style={[il.road, il.roadH, { top: '38%' }]} />
      <View style={[il.road, il.roadV, { left: '50%' }]} />
      {MAP_PINS.map((p) => (
        <View key={p.label} style={[il.pin, p.pos]}>
          <View style={[il.bubble, { backgroundColor: p.color }]}>
            <Ionicons name={p.icon} size={13} color="#fff" />
          </View>
          <View style={[il.tip, { borderTopColor: p.color }]} />
          <Text style={il.pinLabel}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}
const il = StyleSheet.create({
  card: {
    width: W * 0.76, height: W * 0.68,
    backgroundColor: '#eef2f7', borderRadius: 22, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 8,
  },
  grid: { position: 'absolute', backgroundColor: '#d1d9e3' },
  gridH: { width: '100%', height: 1 },
  gridV: { height: '100%', width: 1 },
  road: { position: 'absolute', backgroundColor: '#c8d2de' },
  roadH: { width: '100%', height: 9 },
  roadV: { height: '100%', width: 9 },
  pin: { position: 'absolute', alignItems: 'center' },
  bubble: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3, elevation: 3,
  },
  tip: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pinLabel: { fontSize: 8, color: '#374151', fontWeight: '600', marginTop: 2, textAlign: 'center' },
});

// ── Tasks illustration ────────────────────────────────────────────────────────
const TASKS = [
  { label: 'Book the venue',          done: true  },
  { label: 'Confirm photographer',    done: true  },
  { label: 'Send invitations',         done: false },
  { label: 'Finalise mehndi artist',  done: false },
  { label: 'Confirm caterer menu',    done: false },
];
function TasksCard() {
  return (
    <View style={tc.card}>
      <LinearGradient colors={[PINK, '#B82A4D']} style={tc.header}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={tc.headerText}>Wedding Checklist</Text>
      </LinearGradient>
      {TASKS.map((item, i) => (
        <View key={i} style={tc.row}>
          <View style={[tc.check, item.done && tc.checkDone]}>
            {item.done && <Ionicons name="checkmark" size={11} color="#fff" />}
          </View>
          <Text style={[tc.itemText, item.done && tc.itemDone]}>{item.label}</Text>
        </View>
      ))}
      <View style={tc.footer}>
        <View style={tc.bar}><View style={[tc.fill, { width: '40%' }]} /></View>
        <Text style={tc.prog}>2 / 5 done</Text>
      </View>
    </View>
  );
}
const tc = StyleSheet.create({
  card: {
    width: W * 0.76, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 13 },
  headerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  check: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: PINK, borderColor: PINK },
  itemText: { fontSize: 12, color: '#374151', flex: 1 },
  itemDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#f3f4f6', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: PINK, borderRadius: 3 },
  prog: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
});

// ── Budget illustration ───────────────────────────────────────────────────────
const BUDGET = [
  { label: 'Venue',       pct: 35, color: '#f59e0b', amt: '₨350,000' },
  { label: 'Catering',    pct: 25, color: PINK,      amt: '₨250,000' },
  { label: 'Photography', pct: 15, color: '#8b5cf6', amt: '₨150,000' },
  { label: 'Décor',       pct: 15, color: '#10b981', amt: '₨150,000' },
  { label: 'Other',       pct: 10, color: '#6b7280', amt: '₨100,000' },
];
function BudgetCard() {
  return (
    <View style={bc.card}>
      <View style={bc.topRow}>
        <View>
          <Text style={bc.lbl}>Total Budget</Text>
          <Text style={bc.total}>₨1,000,000</Text>
        </View>
        <LinearGradient colors={[PINK, '#B82A4D']} style={bc.badge}>
          <Ionicons name="wallet" size={17} color="#fff" />
        </LinearGradient>
      </View>
      <View style={bc.bar}>
        {BUDGET.map((r, i) => (
          <View key={i} style={[bc.seg, { width: `${r.pct}%`, backgroundColor: r.color }]} />
        ))}
      </View>
      {BUDGET.map((r, i) => (
        <View key={i} style={bc.row}>
          <View style={[bc.dot, { backgroundColor: r.color }]} />
          <Text style={bc.rowLbl}>{r.label}</Text>
          <Text style={bc.rowPct}>{r.pct}%</Text>
          <Text style={bc.rowAmt}>{r.amt}</Text>
        </View>
      ))}
    </View>
  );
}
const bc = StyleSheet.create({
  card: {
    width: W * 0.76, backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 8,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  lbl: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  total: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginTop: 2 },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  seg: { height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  rowLbl: { flex: 1, fontSize: 11, color: '#374151' },
  rowPct: { fontSize: 10, color: '#9ca3af', width: 26 },
  rowAmt: { fontSize: 11, color: '#374151', fontWeight: '600' },
});

// ── main overlay component ────────────────────────────────────────────────────
export default function AppIntro({ onRegister, onLogin }) {
  const listRef  = useRef(null);
  const scrollX  = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(0);

  const markSeen = async () => {
    try { await AsyncStorage.setItem(INTRO_SEEN_KEY, '1'); } catch {}
  };

  const goNext = async () => {
    if (active < SLIDES.length - 1) {
      const next = active + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActive(next);
    } else {
      await markSeen();
      onRegister();
    }
  };

  const handleLogin = async () => {
    await markSeen();
    onLogin();
  };

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActive(idx);
  };

  return (
    <View style={s.overlay}>
      <StatusBar barStyle="dark-content" backgroundColor={PINK_LIGHT} />
      <View style={s.bg} />
      <Decoration />

      {/* slides */}
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View style={s.slide}>
            <View style={s.ilWrap}>
              {item.illustration === 'map'    && <MapCard />}
              {item.illustration === 'tasks'  && <TasksCard />}
              {item.illustration === 'budget' && <BudgetCard />}
            </View>
            <View style={s.textWrap}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* footer */}
      <SafeAreaView style={s.footer}>
        {/* dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 22, 8], extrapolate: 'clamp' });
            const opacity  = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
            return <Animated.View key={i} style={[s.dot, { width: dotWidth, opacity }]} />;
          })}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={goNext}>
          <LinearGradient
            colors={[PINK, '#B82A4D']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.btn}
          >
            <Text style={s.btnText}>
              {active === SLIDES.length - 1 ? 'Get Started' : 'Discover Vendors'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} style={s.loginRow}>
          <Text style={s.loginText}>
            Already have an account?{'  '}
            <Text style={s.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9998 },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: PINK_LIGHT },
  slide: { width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 },
  ilWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, maxHeight: H * 0.46 },
  textWrap: { paddingHorizontal: 28, paddingBottom: 16 },
  title: { fontSize: 25, fontWeight: '800', color: '#1f2937', textAlign: 'center', lineHeight: 33, marginBottom: 10 },
  subtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 21 },
  footer: { paddingHorizontal: 24, paddingBottom: 8, alignItems: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  dot: { height: 8, borderRadius: 4, backgroundColor: PINK },
  btn: { width: W - 48, paddingVertical: 16, borderRadius: 50, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  loginRow: { marginTop: 16, marginBottom: 4 },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { color: '#1f2937', fontWeight: '700', textDecorationLine: 'underline' },
});
