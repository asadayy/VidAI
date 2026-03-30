import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../api/client.js';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import ProtectedRoute from '../../components/ProtectedRoute';

const SUGGESTIONS = [
  'What vendors do I need for my wedding?',
  'Help me create a wedding budget plan',
  'How do I choose the perfect venue?',
  'Give me a wedding planning checklist',
];

const INITIAL_MSG = {
  id: '0',
  role: 'assistant',
  content: "Hello! I'm your AI wedding planner 💍 I can help with venues, budgets, vendor selection, timelines, and more. What would you like to plan today?",
  time: new Date(),
};

function fmtTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// -- Typing dots component --
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: false }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: false }),
          Animated.delay(600),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={td.row}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[td.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

const td = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94a3b8' },
});

// -- Markdown renderer for AI messages --
function parseInline(text) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*|\*([^*\s][^*]*)\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      parts.push({ text: match[1], bold: true, italic: false });
    } else {
      parts.push({ text: match[2], bold: false, italic: true });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold: false, italic: false });
  }
  return parts.length ? parts : [{ text, bold: false, italic: false }];
}

function InlineText({ parts, baseStyle }) {
  return (
    <>
      {parts.map((p, i) => (
        <Text
          key={i}
          style={[
            baseStyle,
            p.bold && { fontWeight: 'bold' },
            p.italic && { fontStyle: 'italic' },
          ]}
        >
          {p.text}
        </Text>
      ))}
    </>
  );
}

function MarkdownText({ content, textStyle }) {
  const lines = content.split('\n');
  return (
    <View>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={idx} style={{ height: 4 }} />;

        // Heading: #### / ### / ## / #
        const headingMatch = trimmed.match(/^(#{1,4})\s*(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headText = headingMatch[2].replace(/\*\*/g, '');
          const fontSize = level <= 2 ? 15 : 13;
          return (
            <Text key={idx} style={[textStyle, { fontWeight: 'bold', fontSize, marginTop: 8, marginBottom: 2 }]}>
              {headText}
            </Text>
          );
        }

        // Bullet: * item  or - item  (not **bold**)
        const bulletMatch = trimmed.match(/^[*-]\s+(.+)$/);
        if (bulletMatch) {
          const parts = parseInline(bulletMatch[1]);
          return (
            <View key={idx} style={{ flexDirection: 'row', marginTop: 3, paddingLeft: 4 }}>
              <Text style={[textStyle, { marginRight: 6, lineHeight: 20 }]}>{'\u2022'}</Text>
              <Text style={[textStyle, { flex: 1, lineHeight: 20 }]}>
                <InlineText parts={parts} baseStyle={textStyle} />
              </Text>
            </View>
          );
        }

        // Regular line
        const parts = parseInline(trimmed);
        return (
          <Text key={idx} style={[textStyle, { marginTop: 3, lineHeight: 20 }]}>
            <InlineText parts={parts} baseStyle={textStyle} />
          </Text>
        );
      })}
    </View>
  );
}

// -- main component --
export default function Chat() {
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  const scrollToEnd = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => { scrollToEnd(); }, [messages, isTyping]);

  const handleSend = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await client.post('/ai/chat', {
        message: content,
        conversationHistory: messages,
      });
      const reply =
        response.data.data?.response ||
        response.data.response ||
        "I'm not sure how to respond to that.";
      setMessages(prev => [...prev, { id: Date.now().toString() + 'a', role: 'assistant', content: reply, time: new Date() }]);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to get response from AI assistant' });
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setMessages([{ ...INITIAL_MSG, id: Date.now().toString(), time: new Date() }]);
    setInput('');
  };

  const showSuggestions = messages.length === 1;

  const renderMessage = ({ item: msg }) => {
    const isUser = msg.role === 'user';
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
        {!isUser && (
          <LinearGradient colors={['#D7385E', '#f472b6']} style={styles.avatarAI}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </LinearGradient>
        )}
        <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
          {isUser ? (
            <LinearGradient colors={['#D7385E', '#B82A4D']} style={[styles.bubble, styles.bubbleUser]}>
              <Text style={styles.bubbleUserText}>{msg.content}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleAI]}>
              <MarkdownText content={msg.content} textStyle={styles.bubbleAIText} />
            </View>
          )}
          <Text style={[styles.time, isUser && styles.timeUser]}>{fmtTime(msg.time)}</Text>
        </View>
        {isUser && (
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.avatarUser}>
            <Ionicons name="person" size={14} color="#fff" />
          </LinearGradient>
        )}
      </View>
    );
  };

  return (
    <ProtectedRoute roles="user">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={['#D7385E', '#f472b6']} style={styles.headerAvatar}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>Wedding AI Assistant</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Online &amp; ready to help</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh" size={14} color="#64748b" />
            <Text style={styles.resetBtnText}>New chat</Text>
          </TouchableOpacity>
        </View>

        {/* messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={[styles.row, styles.rowAI]}>
                <LinearGradient colors={['#D7385E', '#f472b6']} style={styles.avatarAI}>
                  <Ionicons name="sparkles" size={14} color="#fff" />
                </LinearGradient>
                <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                  <TypingDots />
                </View>
              </View>
            ) : null
          }
        />

        {/* suggestions */}
        {showSuggestions && (
          <View style={styles.suggestionsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => handleSend(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about venues, budget, vendors…"
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!isTyping}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || isTyping}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={input.trim() && !isTyping ? ['#D7385E', '#B82A4D'] : ['#e2e8f0', '#e2e8f0']}
              style={styles.sendBtn}
            >
              <Ionicons name="send" size={18} color={input.trim() && !isTyping ? '#fff' : '#94a3b8'} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.06)', elevation: 3,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  statusText: { fontSize: 11, color: '#64748b' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  resetBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  // list
  listContent: { padding: 16, paddingBottom: 8, gap: 12 },

  // rows
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  rowAI: { alignSelf: 'flex-start' },
  rowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  // avatars (small, bottom-aligned)
  avatarAI: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarUser: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // bubble wrap
  bubbleWrap: { flexDirection: 'column', gap: 3, alignItems: 'flex-start' },
  bubbleWrapUser: { alignItems: 'flex-end' },

  // bubbles
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAI: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#f1f5f9',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)', elevation: 2,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAIText: { fontSize: 14, color: '#1e293b', lineHeight: 21 },
  bubbleUserText: { fontSize: 14, color: '#fff', lineHeight: 21 },

  // typing
  typingBubble: { paddingHorizontal: 14, paddingVertical: 8 },

  // timestamps
  time: { fontSize: 10, color: '#94a3b8', paddingHorizontal: 2 },
  timeUser: { textAlign: 'right' },

  // suggestions
  suggestionsBar: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 8,
  },
  suggestionsScroll: { paddingHorizontal: 14, gap: 8 },
  chip: {
    backgroundColor: '#fdf2f8', borderWidth: 1, borderColor: '#fce7f3',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: '#B82A4D' },

  // input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});
