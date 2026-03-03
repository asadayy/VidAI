import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');

const PINK       = '#D7385E';
const PINK_LIGHT = '#f8d7de';
const PINK_MED   = '#f4adb8';

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

// ── decorative floating blobs ─────────────────────────────────────────────────

function Decoration() {
  return (
    <>
      {/* large heart top-left */}
      <View style={[d.heart, d.heartLg, d.topLeft]} />
      {/* medium heart right */}
      <View style={[d.heart, d.heartMd, d.midRight]} />
      {/* small dots */}
      <View style={[d.dot, { top: H * 0.12, left: W * 0.6 }]} />
      <View style={[d.dot, d.dotSm, { top: H * 0.3, left: W * 0.08 }]} />
      <View style={[d.dot, { bottom: H * 0.3, right: W * 0.07 }]} />
      <View style={[d.dot, d.dotSm, { bottom: H * 0.15, left: W * 0.2 }]} />
    </>
  );
}

const d = StyleSheet.create({
  heart: {
    position: 'absolute',
    backgroundColor: PINK_MED,
    opacity: 0.38,
    transform: [{ rotate: '45deg' }],
  },
  heartLg: { width: 140, height: 140, borderRadius: 70 },
  heartMd: { width: 88, height: 88, borderRadius: 44 },
  topLeft: { top: -40, left: -40 },
  midRight: { top: H * 0.22, right: -28 },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PINK,
    opacity: 0.28,
  },
  dotSm: { width: 8, height: 8, borderRadius: 4 },
});

// ── Slide 1 — vendor map card ─────────────────────────────────────────────────

const MAP_VENDORS = [
  { icon: 'home',           color: '#f59e0b', label: 'Venues',        pos: { top: '10%', left: '8%' } },
  { icon: 'brush',          color: '#ec4899', label: 'Makeup',        pos: { top: '8%',  right: '10%' } },
  { icon: 'camera',         color: PINK,      label: 'Photographers', pos: { top: '40%', left: '28%' } },
  { icon: 'color-palette',  color: '#ef4444', label: 'Décors',        pos: { top: '50%', right: '8%' } },
  { icon: 'restaurant',     color: '#6b7280', label: 'Caterers',      pos: { bottom: '18%', left: '8%' } },
  { icon: 'car',            color: '#6b7280', label: 'Transport',     pos: { bottom: '10%', right: '14%' } },
];

function MapIllustration() {
  return (
    <View style={il.mapCard}>
      {/* grid lines */}
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
        <View key={`h${i}`} style={[il.gridLine, il.gridH, { top: `${f * 100}%` }]} />
      ))}
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
        <View key={`v${i}`} style={[il.gridLine, il.gridV, { left: `${f * 100}%` }]} />
      ))}
      {/* road strips */}
      <View style={[il.road, il.roadH, { top: '38%' }]} />
      <View style={[il.road, il.roadV, { left: '50%' }]} />

      {/* pins */}
      {MAP_VENDORS.map((v) => (
        <View key={v.label} style={[il.pin, v.pos]}>
          <View style={[il.pinBubble, { backgroundColor: v.color }]}>
            <Ionicons name={v.icon} size={14} color="#fff" />
          </View>
          <View style={[il.pinTip, { borderTopColor: v.color }]} />
          <Text style={il.pinLabel}>{v.label}</Text>
        </View>
      ))}
    </View>
  );
}

const il = StyleSheet.create({
  mapCard: {
    width: W * 0.78,
    height: W * 0.72,
    backgroundColor: '#eef2f7',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  gridLine: { position: 'absolute', backgroundColor: '#d1d9e3' },
  gridH: { width: '100%', height: 1 },
  gridV: { height: '100%', width: 1 },
  road: { position: 'absolute', backgroundColor: '#c8d2de' },
  roadH: { width: '100%', height: 10 },
  roadV: { height: '100%', width: 10 },
  pin: { position: 'absolute', alignItems: 'center' },
  pinBubble: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3,
  },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  pinLabel: { fontSize: 9, color: '#374151', fontWeight: '600', marginTop: 2, textAlign: 'center' },
});

// ── Slide 2 — tasks illustration ──────────────────────────────────────────────

function TasksIllustration() {
  const items = [
    { label: 'Book the venue',         done: true },
    { label: 'Confirm photographer',   done: true },
    { label: 'Send invitations',        done: false },
    { label: 'Finalise mehndi artist', done: false },
    { label: 'Confirm caterer menu',   done: false },
  ];
  return (
    <View style={ti.card}>
      <LinearGradient colors={[PINK, '#B82A4D']} style={ti.header}>
        <Ionicons name="checkmark-circle" size={22} color="#fff" />
        <Text style={ti.headerText}>Wedding Checklist</Text>
      </LinearGradient>
      {items.map((item, i) => (
        <View key={i} style={ti.row}>
          <View style={[ti.check, item.done && ti.checkDone]}>
            {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={[ti.itemText, item.done && ti.itemDone]}>{item.label}</Text>
        </View>
      ))}
      <View style={ti.progress}>
        <View style={ti.progressBg}>
          <View style={[ti.progressFill, { width: '40%' }]} />
        </View>
        <Text style={ti.progressText}>2 / 5 done</Text>
      </View>
    </View>
  );
}

const ti = StyleSheet.create({
  card: {
    width: W * 0.78,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  headerText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  check: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: PINK, borderColor: PINK },
  itemText: { fontSize: 13, color: '#374151', flex: 1 },
  itemDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  progress: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  progressBg: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: '#f3f4f6', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: PINK, borderRadius: 3 },
  progressText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
});

// ── Slide 3 — budget illustration ─────────────────────────────────────────────

const BUDGET_ROWS = [
  { label: 'Venue',        pct: 35, color: '#f59e0b', amount: '₨350,000' },
  { label: 'Catering',     pct: 25, color: PINK,      amount: '₨250,000' },
  { label: 'Photography',  pct: 15, color: '#8b5cf6', amount: '₨150,000' },
  { label: 'Décor',        pct: 15, color: '#10b981', amount: '₨150,000' },
  { label: 'Other',        pct: 10, color: '#6b7280', amount: '₨100,000' },
];

function BudgetIllustration() {
  return (
    <View style={bi.card}>
      <View style={bi.topRow}>
        <View>
          <Text style={bi.totalLabel}>Total Budget</Text>
          <Text style={bi.totalAmt}>₨1,000,000</Text>
        </View>
        <LinearGradient colors={[PINK, '#B82A4D']} style={bi.badge}>
          <Ionicons name="wallet" size={18} color="#fff" />
        </LinearGradient>
      </View>
      {/* stacked bar */}
      <View style={bi.bar}>
        {BUDGET_ROWS.map((r, i) => (
          <View key={i} style={[bi.barSeg, { width: `${r.pct}%`, backgroundColor: r.color }]} />
        ))}
      </View>
      {BUDGET_ROWS.map((r, i) => (
        <View key={i} style={bi.row}>
          <View style={[bi.dot, { backgroundColor: r.color }]} />
          <Text style={bi.rowLabel}>{r.label}</Text>
          <Text style={bi.rowPct}>{r.pct}%</Text>
          <Text style={bi.rowAmt}>{r.amount}</Text>
        </View>
      ))}
    </View>
  );
}

const bi = StyleSheet.create({
  card: {
    width: W * 0.78,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  totalLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  totalAmt: { fontSize: 20, fontWeight: '800', color: '#1f2937', marginTop: 2 },
  badge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  barSeg: { height: '100%' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { flex: 1, fontSize: 12, color: '#374151' },
  rowPct: { fontSize: 11, color: '#9ca3af', width: 28 },
  rowAmt: { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'right' },
});

// ── slide illustration switcher ───────────────────────────────────────────────

function Illustration({ type }) {
  if (type === 'map')    return <MapIllustration />;
  if (type === 'tasks')  return <TasksIllustration />;
  if (type === 'budget') return <BudgetIllustration />;
  return null;
}

// ── main component ────────────────────────────────────────────────────────────

export default function Intro() {
  const router  = useRouter();
  const listRef = useRef(null);
  const [active, setActive] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (active < SLIDES.length - 1) {
      const next = active + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActive(next);
    } else {
      router.replace('/(auth)/register');
    }
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActive(idx);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PINK_LIGHT }}>
      <StatusBar barStyle="dark-content" backgroundColor={PINK_LIGHT} />

      {/* full-screen pink background */}
      <View style={s.bg} />

      {/* decorations  */}
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
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={s.slide}>
            {/* illustration area */}
            <View style={s.illustrationWrap}>
              <Illustration type={item.illustration} />
            </View>

            {/* text */}
            <View style={s.textWrap}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* dots + CTA */}
      <View style={s.footer}>
        {/* pagination dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
            const width = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width, opacity }]}
              />
            );
          })}
        </View>

        {/* CTA button */}
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

        {/* login link */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={s.loginRow}>
          <Text style={s.loginText}>
            Already have an account?{'  '}
            <Text style={s.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fce8ec',
  },
  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    maxHeight: H * 0.47,
  },
  textWrap: {
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  /* footer */
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 0,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PINK,
  },
  btn: {
    width: W - 48,
    paddingVertical: 17,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  loginRow: {
    marginTop: 18,
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    color: '#1f2937',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
