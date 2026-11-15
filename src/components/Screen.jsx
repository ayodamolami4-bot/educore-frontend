import React from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useServices } from '../core/ServicesContext';
import { colors } from '../theme/tokens';
export function Screen({ children, title, subtitle, back, code, auth = false, actions }) {
  const services = useServices();
  const wide = useWindowDimensions().width >= 960;
  return (
    <ImageBackground
      source={require('../../assets/school-items.jpg')}
      style={styles.background}
      imageStyle={{ opacity: 0.13 }}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scroll, auth && wide && styles.authScroll]}
          >
            <View style={styles.outer}>
              <View style={styles.top}>
                <View style={styles.brand}>
                  <View style={styles.logo}>
                    <Ionicons name="school" size={24} color={colors.white} />
                  </View>
                  <View>
                    <Text style={styles.brandName}>EduCore</Text>
                    <Text style={styles.brandSub}>A connected school day</Text>
                  </View>
                </View>
                {services.config.demo && (
                  <View style={styles.demo}>
                    <View style={styles.dot} />
                    <Text style={styles.demoText}>Demo workspace</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.layout,
                  auth && wide && { flexDirection: 'row', alignItems: 'center', gap: 70 },
                ]}
              >
                {auth && wide && (
                  <View style={styles.hero}>
                    <Text style={styles.eyebrow}>FOR YOUR SCHOOL COMMUNITY</Text>
                    <Text style={styles.heroTitle}>One school day.</Text>
                    <Text style={styles.heroTitle}>Everyone connected.</Text>
                    <Text style={styles.heroText}>
                      A shared place for teachers, students, parents and the school office.
                    </Text>
                    <View style={styles.heroTiles}>
                      {[
                        ['calendar-outline', 'A clear weekly schedule'],
                        ['people-outline', 'The right information for every role'],
                        ['shield-checkmark-outline', 'Your school. Your permitted records.'],
                      ].map(([icon, label]) => (
                        <View key={label} style={styles.heroTile}>
                          <Ionicons name={icon} size={22} color={colors.primary} />
                          <Text style={styles.heroTileText}>{label}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.heroFoot}>SECONDARY SCHOOLS · JSS1–SSS3</Text>
                  </View>
                )}
                <View style={[styles.content, auth ? styles.authCard : null]}>
                  {back && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Go back"
                      onPress={back}
                      style={styles.back}
                    >
                      <Ionicons name="arrow-back" size={19} color={colors.primary} />
                      <Text style={styles.backText}>Back</Text>
                    </Pressable>
                  )}
                  <View style={styles.headingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eyebrow}>
                        {auth ? 'WELCOME TO EDUCORE' : 'YOUR SCHOOL WORKSPACE'}
                      </Text>
                      <Text accessibilityRole="header" style={styles.title}>
                        {title}
                      </Text>
                      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {actions}
                  </View>
                  <View style={styles.body}>{children}</View>
                  {code && <Text style={styles.pageCode}>{code} · EduCore</Text>}
                </View>
              </View>
              <Text style={styles.footer}>
                {services.config.demo
                  ? 'Fictional demo records · No real payments, email or push delivery'
                  : 'School-managed access · Private, role-based records'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  authScroll: { justifyContent: 'center' },
  outer: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 23, letterSpacing: -0.5, fontWeight: '800', color: colors.ink },
  brandSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 30,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: '#F2DFC4',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#AA7129' },
  demoText: { color: '#8A6028', fontSize: 11, fontWeight: '600' },
  layout: { width: '100%' },
  content: { flex: 1, minWidth: 0, maxWidth: 780, width: '100%', alignSelf: 'center' },
  authCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 25,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 480,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 },
  body: { gap: 16 },
  pageCode: { color: colors.muted, fontSize: 10, marginTop: 24 },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 10,
  },
  backText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 26 },
  hero: { flex: 1, minWidth: 0, maxWidth: 500 },
  heroTitle: {
    color: colors.ink,
    fontSize: 44,
    lineHeight: 55,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  heroText: { fontSize: 17, color: colors.muted, lineHeight: 28, marginTop: 20, maxWidth: 390 },
  heroTiles: { gap: 16, marginTop: 32 },
  heroTile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTileText: { color: colors.text, fontSize: 14 },
  heroFoot: {
    marginTop: 36,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});
